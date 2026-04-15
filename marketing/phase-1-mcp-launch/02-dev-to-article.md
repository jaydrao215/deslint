# Post — dev.to article

**Where to post:** https://dev.to/new
**Best window:** Day 1 of launch, 09:00–11:00 US/Eastern (highest dev.to
traffic on weekday mornings).
**Format:** paste everything between the `--- BEGIN POST ---` and
`--- END POST ---` markers into the dev.to editor. The frontmatter at the
top gets rendered correctly by dev.to's markdown editor (cover_image,
tags, canonical_url).

## dev.to guideline compliance

- **Tags:** 4 max. Using `#ai`, `#eslint`, `#webdev`, `#opensource`. Dev.to
  de-prioritizes posts with more than 4 tags or with unrelated tags.
- **Cover image:** dev.to recommends 1000×420. We're pointing at
  `deslint.com/og/mcp-loop.png` — verify that OG image exists before
  posting; if not, remove the `cover_image` line.
- **Canonical URL:** set to the repo README so SEO signal consolidates
  there. Remove it if you later publish to deslint.com/blog first.
- **Code of conduct:** https://dev.to/code-of-conduct — the article is
  a technical teardown, not a sales pitch, which is the dev.to-friendly
  form.
- **No emojis in the title** — dev.to's feed readability guide
  discourages this for technical posts.

## Body (paste verbatim)

--- BEGIN POST ---

```markdown
---
title: "Shipping an MCP server that makes AI self-correct its own design drift"
published: true
tags: ai, eslint, webdev, opensource
canonical_url: https://github.com/jaydrao215/deslint#readme
cover_image: https://deslint.com/og/mcp-loop.png
---

AI coding assistants write code fast. They also ship design drift fast —
a `text-[#1a5276]` where your design tokens say `text-primary`, a
`p-[13px]` next to `p-3`, a dark mode forgotten on half the components.

I've been maintaining an ESLint plugin that catches 33 classes of this
drift across React, Vue, Svelte, Angular, and plain HTML. Useful, but
after the fact — you still have to run it, see the errors, paste them
back to the AI, get a revision, re-run. The loop is manual.

Last month I shipped an MCP server — `@deslint/mcp` — that closes that
loop. This post is what I learned: the three protocol decisions that
turned out to matter, the one path-traversal bug that only surfaces on
Windows, and how to wire the tools so Claude Code and Cursor actually
use them without being told to.

## The loop, in concrete terms

Here's what actually happens when Claude Code calls the server to
validate a component it just wrote:

```
[agent]  → initialize                     (protocol handshake, once)
[agent]  → tools/list                     (discovers 6 tools)
[agent]  → tools/call analyze_file        (passes filePath + projectDir)
[server] ← {violations: [...], score: 62}
[agent]  → tools/call analyze_and_fix     (same file)
[server] ← {fixedCode: "...", remainingViolations: [...]}
[agent]  (applies fixedCode itself — the server never writes to disk)
```

Total round trip in my measurements: ~800ms on a cold Node boot,
~200ms warm. The server is stdio-only, no HTTP listener, no network.
The agent decides whether to apply the fix; the server only previews.

## Three protocol decisions that actually mattered

### 1. Use `registerTool`, not `server.tool`

The `@modelcontextprotocol/sdk` has two tool registration APIs. The
older `server.tool(name, schema, handler)` shape is still supported but
deprecated. The newer `server.registerTool(name, { ...config }, handler)`
shape lets you declare:

- `title` — a human-readable label for MCP-aware UIs.
- `annotations` — `readOnlyHint`, `destructiveHint`, `idempotentHint`,
  `openWorldHint`. These let clients skip confirmation prompts for
  repeated calls during an agent loop. Without them, Claude Code
  interrupts the loop with "this tool wants to run — approve?" every
  single time.
- `outputSchema` — a Zod schema of the response, which gets mirrored
  into `structuredContent` on the reply so agents parse typed objects
  instead of regex-ing stringified JSON.

The annotations matter most. For a linter that's going to be called
dozens of times per session, skipping the confirmation prompt is the
difference between "the assistant uses this" and "the user turns it
off after one session."

```ts
server.registerTool(
  'analyze_file',
  {
    title: 'Analyze File for Design Violations',
    description: 'Lint a single file for design-quality violations...',
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: { filePath: z.string(), projectDir: z.string().optional() },
    outputSchema: {
      violations: z.array(violationSchema),
      score: z.number(),
      // ...
    },
  },
  async (params) => {
    const result = await analyzeFile(params);
    return ok(result); // returns { content: [...], structuredContent: result }
  },
);
```

### 2. Return structured content AND a text content block

The spec lets you return just a text content block (pretty-printed JSON
stringified into a string) OR a typed `structuredContent` object OR
both. Return both.

- `content[0].text` — pretty-printed JSON, for agents that haven't
  implemented structured content parsing yet. Older MCP clients fall
  back to this.
- `structuredContent` — the typed payload, matching your `outputSchema`.
  Claude Code and Cursor prefer this; it's ~5× faster to parse and
  robust to JSON formatting drift.

Returning only the text block means newer clients do JSON.parse + schema
validate on a string that could be malformed. Returning only structured
content means older clients fall through to a useless empty response.

### 3. Handle errors with a structured payload too

When a tool call fails, return:

```ts
{
  content: [{ type: 'text', text: JSON.stringify({ error: message }) }],
  structuredContent: { error: message },
  isError: true,
}
```

Not `throw`. Throwing surfaces as a protocol-level error that the agent
treats as "this tool is broken, stop using it." A structured error
payload lets the agent say "I can't analyze that file because <reason>,
let me fix it and retry."

## The Windows bug

I had this in my path-containment check:

```ts
// Reject paths that escape projectDir
if (!absPath.startsWith(requestedDir)) throw new Error('outside project');
```

Works on macOS and Linux. Fails on Windows, silently, because
`startsWith` does a string prefix check and Windows paths can mix
separators — `C:\Users\x\project` vs `C:/Users/x/project` — and a
`/` inside `projectDir` could sneak past. The fix is `path.relative`:

```ts
const rel = relative(requestedDir, absPath);
const insideRequested =
  rel === '' ||
  (!rel.startsWith('..' + sep) && rel !== '..' && !isAbsolute(rel));
if (!insideRequested) throw new Error('outside project');
```

Cross-platform and handles the edge case where `rel` is `..`, which
`startsWith('..' + sep)` misses because there's no trailing separator.

If you're writing an MCP server that takes file paths from the agent,
test your containment check on Windows before shipping. The agent WILL
hand you malformed paths.

## Why zero LLMs in the server itself

This is the part that surprises people. Deslint is an MCP server that
Claude Code and Cursor call during code generation, but the server
itself runs no LLM, calls no API, sends nothing over the network. It's
an AST parser and a rule engine.

The split matters: the agent is non-deterministic (creative, fast,
good at writing). The linter is deterministic (rules you wrote, same
input → same output). Putting an LLM inside the linter means every
lint run gives you a slightly different answer, which breaks CI,
breaks audits, and breaks the trust that makes devs actually leave the
autofix on.

So the MCP server is the deterministic check in the agent loop — not
another model in the stack.

## The results so far

On 3,998 files across React, Next.js, Vue, Nuxt, Angular, and plain
HTML OSS projects: 3,313 real violations, 0 false positives, 0 crashes.

I care more about the zero false positives than the 3,313. Design
linters with even a 1% FP rate get turned off within a week, because
the fix-or-ignore decision fatigue outweighs the benefit. If you try
Deslint and hit a false positive, it's a P0 bug and I want the issue.

## Try it

```bash
# ESLint plugin
npm install -D @deslint/eslint-plugin

# CLI
npx @deslint/cli scan

# MCP server in Claude Code
claude mcp add deslint -- npx -y @deslint/mcp serve

# MCP server in Cursor — one-click button on the repo README
```

Everything is MIT. Repo: https://github.com/jaydrao215/deslint

If you're building an MCP server, the audit commits in the repo (the
`registerTool` migration, the Windows fix, the `server.json` registry
submission) are a decent reference for what current spec compliance
looks like in April 2026.

---

Questions I'm still working on:

- Best heuristic for when the agent should proactively call the linter
  vs. wait for the user to ask.
- Whether to expose a `watch_project` tool that streams violations as
  files change, or keep it request-response.
- How to surface the design-token config to the agent so it writes
  token-correct code on the first try, not the third.

Happy to talk about any of it. If you're running an agent loop against
a design system in production, I'd especially like to hear what breaks.
```

--- END POST ---

## Post-submission checklist

- Verify the cover image renders in the dev.to preview. If it doesn't,
  remove the `cover_image:` line and re-save.
- Dev.to sometimes shows tags as "invalid" if they're too new. The four
  tags in the frontmatter are all established (each has >10k posts as
  of this writing) — but verify in the editor.
- Add a cross-post link back to the HN submission URL in your dev.to
  profile bio for 48 hours. Directs the dev.to reader to the other
  high-intent thread.

## Follow-up comment strategy

Dev.to discussion is slower than HN. Expect 2–5 comments in the first
24 hours. Reply to every one, especially:

- Questions about rules — link to the rule file on GitHub with a
  specific line number.
- "How does this compare to X" — answer specifically. Dev.to readers
  Google these comparisons, so your reply becomes SEO.
- Pushback on the "zero LLMs in the server" claim — this is the most
  common misunderstanding. Explain the agent-vs-linter split once,
  clearly, and link back for repeats.
