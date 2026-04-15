# Post — Reddit r/cursor

**Where to post:** https://www.reddit.com/r/cursor/submit
**Best window:** Day 0, 14:00–16:00 US/Eastern (2 hours after the
r/ClaudeAI post so they don't look coordinated).
**Required:** verify subreddit rules in the sidebar. r/cursor is
stricter about self-promo than r/ClaudeAI — the 9:1 content:promo
ratio applies.

## Subreddit rules — compliance notes

Read https://www.reddit.com/r/cursor/about/rules before posting. As
of April 2026:

- Self-promo allowed only for tools that directly benefit Cursor
  users. Deslint qualifies (one-click install button, works via MCP).
- Must have at least 9 non-promotional posts/comments in r/cursor
  before posting a tool showcase. If your account is new, spend a
  week commenting on other people's posts before submitting this.
- Paid tools must be clearly marked. Deslint's OSS surfaces are MIT
  and free — disclosure is straightforward.
- No link-only posts. Body must explain what the tool is and why a
  Cursor user would care.

**Flair to select:** `Resources and Tips` or `Showcase`, whichever
is current.

## Title (paste verbatim)

```
Deslint MCP — drop-in linter that catches design drift in Cursor's AI output before you review it
```

97 chars, descriptive, Cursor-specific hook. No "!", no emojis.

## Body (paste verbatim)

--- BEGIN POST ---

I've been running Cursor daily for the last few months and kept
running into the same frustration: the AI writes the component I
asked for, then I spend the review cycle fixing the same class of
problems — arbitrary hex colors next to my token palette, off-scale
padding, dark: variants missing, ARIA attributes forgotten. Stuff
that shouldn't require a human to catch.

So I built (and this week finished modernizing) an MCP server that
Cursor can call during generation. The AI sees the linter's output
— rule IDs, line numbers, WCAG mapping, commit-ready fixes — and
corrects its own code before the review.

Free, MIT, local-only, no telemetry.

**One-click install in Cursor**

The repo README has a one-click install button that adds this to
your Cursor MCP config:

```json
{
  "mcpServers": {
    "deslint": {
      "command": "npx",
      "args": ["-y", "@deslint/mcp", "serve"]
    }
  }
}
```

Or paste the above into `~/.cursor/mcp.json` manually. First run
takes a few seconds to cache `@deslint/mcp`; after that it's
instant.

**What changes in your Cursor workflow**

Once it's registered, Cursor Composer and Agent mode can call:

- `analyze_file` — lint a file Cursor just wrote
- `analyze_and_fix` — get the fixed version back (Cursor applies it)
- `analyze_project` — score the whole codebase for context

The tools are flagged `readOnlyHint: true` and `idempotentHint: true`
in their annotations, which means Cursor won't interrupt your flow
with "approve this tool call?" every time. It just runs.

**What it catches**

33 rules across colors, spacing, typography, responsive, and a11y.
Things like:

- Arbitrary `text-[#hex]` when you have design tokens
- `p-[13px]` / `gap-[7px]` on an 8-point grid
- Missing dark: variants on interactive elements
- `<div onClick>` without keyboard handling
- Heading hierarchy breaks, missing alt/lang/label

Tested on 3,998 real OSS files across React, Next.js, Vue, Nuxt,
Angular, and plain HTML. 3,313 real violations caught, 0 false
positives, 0 crashes. Every rule is try/catch-wrapped so a bad rule
can't take down your lint run.

**Why I care about zero false positives**

A linter with even a 1% FP rate gets turned off within a week.
Devs ignore the noise, then ignore the signal. I cut seven rules
during development that couldn't pass that gate, and the ones that
ship are the ones that are wrong every time, deterministically.

**The non-MCP surfaces are also MIT**

Not everyone wants to lint inside Cursor. Same rules run:

- As a standard ESLint v10 flat-config plugin
- Via a CLI for whole-project scans + self-contained HTML
  compliance reports
- In a GitHub Action that posts inline PR review comments

Configure once, same engine everywhere. No duplicated rules.

**What I'd like feedback on**

1. Does Cursor's Composer proactively call the linter, or does it
   need to be told? I'm iterating on the tool descriptions.
2. For Cursor Agent mode specifically — is there a better tool
   granularity than the current 6? Thinking about whether to split
   `analyze_project` into `score_project` + `list_violations`.
3. Any rule categories you'd want that I don't have?

Repo: https://github.com/jaydrao215/deslint

I'll be in the thread for the next few hours — happy to answer
anything.

--- END POST ---

## After posting

- If the post sits under 10 upvotes after an hour, don't rescue. The
  r/cursor audience is smaller than r/ClaudeAI and the algorithm
  favors posts that hit fast or not at all.
- Every comment about the install flow — reply immediately. That's
  where the conversion lives.
- Don't mention HN, Twitter, or LinkedIn in replies. Reddit audience
  reads cross-platform mentions as spam behavior.

## Common pushback

- **"Does it work with Cursor's rules.md?"** — yes, the ESLint rules
  config is orthogonal to Cursor's user rules. They compose.
- **"Does MCP work in Cursor Composer / Agent Mode?"** — yes in
  both; the stdio transport is the same.
- **"Is this gonna slow my Cursor down?"** — server warm time is
  ~200 ms, per-file analyze is sub-100 ms for typical components.
  Not noticeable in a human loop, sometimes noticeable in an
  agentic loop where the LLM is waiting on every call. If latency
  matters, point the agent at `analyze_file` (single file) rather
  than `analyze_project` (whole tree) during the generation loop.
