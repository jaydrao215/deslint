# Post — Reddit r/ClaudeAI

**Where to post:** https://www.reddit.com/r/ClaudeAI/submit
**Best window:** Day 0, 12:00–14:00 US/Eastern. r/ClaudeAI sees its
biggest spike during US afternoon (mix of US and EU evening traffic).
**Required:** account age ≥ 30 days, ≥ 50 comment karma (the
subreddit's minimum threshold for self-posts as of April 2026; verify
the sidebar before posting).

## Subreddit rules — compliance notes

Read the pinned rules at https://www.reddit.com/r/ClaudeAI/about/rules
before posting. As of this writing:

- Self-promo is allowed **only if** tagged with `[Projects]` flair and
  the post is tool-showcase (not a pure "check out my thing" link).
- Must include "what it does + how it works + how you can try it" —
  low-effort "here's my thing" posts are removed.
- Must disclose if the tool is paid / has a waitlist / monetizes user
  data. We're MIT + free + no telemetry, so a clean one-line
  disclosure is sufficient.
- No vote manipulation. Do not ask friends to upvote.
- No cross-posting the same link within 24 h of posting elsewhere.
  Don't mention HN / Twitter in the body.

**Flair to select:** `[Projects]` (or `[Showcase]` if Projects is
retired — check the sidebar).

## Title (paste verbatim)

```
I built an MCP server that lets Claude Code self-correct design-quality issues before the developer ever sees them
```

99 chars, under Reddit's 300-char cap, descriptive without being
clickbait. No emojis (r/ClaudeAI discourages them in Projects posts).

## Body (paste verbatim)

--- BEGIN POST ---

Hey r/ClaudeAI,

TL;DR: I built an MCP server (`@deslint/mcp`) that Claude Code calls
during code generation to catch and fix design-quality drift — things
like arbitrary hex colors sneaking in next to design tokens, off-scale
spacing, missing a11y attributes, dark mode gaps. The server is
local-only, runs zero LLMs itself, and returns structured violations
with rule IDs and autofixes. Claude sees them and corrects its own
output before the developer reviews.

MIT, free, no telemetry, no cloud. Posted here because I wanted
feedback from people actually running Claude Code day-to-day.

---

**What it does**

Registers 6 tools over stdio:

- `analyze_file` — lint a file, get violations with line numbers and
  rule IDs
- `analyze_project` — whole-project scan with a 0–100 design health
  score
- `analyze_and_fix` — get the autofixed version of a file (server
  never writes to disk, Claude decides whether to apply it)
- `compliance_check` — WCAG 2.2 evaluation
- `get_rule_details` — metadata for a specific rule (description,
  category, effort estimate, WCAG mapping)
- `suggest_fix_strategy` — ranks which violations to fix first by
  impact per effort

All tools declare `readOnlyHint: true` + `idempotentHint: true` so
Claude Code doesn't interrupt the loop with "approve this tool call?"
prompts every time.

**What it catches**

33 rules across 5 categories — colors, spacing, typography,
responsive, a11y. Things like:

- `text-[#1a5276]` next to a design token palette
- `p-[13px]` when your Tailwind config is on a 4px grid
- `dark:` variants forgotten on half the components
- Missing `alt`, `aria-label`, `lang` attributes
- `<div onClick>` without keyboard handlers

Tested on 3,998 files across React, Next.js, Vue, Nuxt, Angular, and
plain HTML OSS projects. 3,313 real violations, 0 false positives, 0
crashes. Every rule is try/catch-wrapped so one bad rule can't nuke
the whole lint run.

**Why zero LLMs in the server itself**

This is the part that sometimes confuses people. The MCP server
itself runs no model. It's an AST parser and a rule engine. The LLM
is Claude (or whatever agent you're using). Claude does the creative
work; the server is the deterministic check.

Putting an LLM inside the linter means every lint run gives a
slightly different answer. That breaks CI, breaks audits, and breaks
the trust that makes anyone leave the autofix on.

**Install in Claude Code**

```bash
claude mcp add deslint -- npx -y @deslint/mcp serve
```

After that, Claude Code discovers the tools automatically and calls
them when relevant. Worth opening `~/.claude/mcp.json` once to confirm
the server registered.

**What I'd like feedback on**

1. Does Claude Code call the tools often enough in your sessions, or
   does it need a nudge? I'm still figuring out how to write the tool
   descriptions so Claude proactively uses them.
2. Is the `suggest_fix_strategy` output useful or does it feel like
   scope creep? I'm considering cutting it if nobody uses it.
3. Any rule categories missing for your codebase?

Repo + source + the `server.json` I submitted to the MCP Registry:
https://github.com/jaydrao215/deslint

Happy to answer anything in the thread.

--- END POST ---

## After posting

- First-hour engagement on r/ClaudeAI matters but less than on HN.
  Reply within 15 min to any top-level comment.
- Reddit downvotes anything that smells commercial. Lean into
  "MIT + free + no telemetry" when someone asks about monetization.
- Do NOT edit the post to add "EDIT: thanks for the responses!" —
  that's low-signal and Reddit readers hate it.
- If the post is downvoted to 0 in the first hour, don't try to
  rescue it. Move on; r/cursor post (file 06) is your next shot.

## Common pushback and how to answer

- **"ESLint already has all this"** — partly true, but no ESLint
  rule set specifically targets AI-generated design drift. Share a
  link to a specific rule file showing a check that a generic ESLint
  config doesn't make.
- **"Why not just train the AI to not do this"** — fine-tuning a
  frontier model is not an option for individual developers. A
  deterministic linter is.
- **"Is this gonna be paywalled later?"** — no, the MCP server, the
  ESLint plugin, the CLI, and the GitHub Action are all MIT and
  will stay that way. The planned paid tier is cross-repo
  dashboards, not existing features.
