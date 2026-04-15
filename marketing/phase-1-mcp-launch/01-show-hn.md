# Post — Hacker News (Show HN)

**Where to post:** https://news.ycombinator.com/submit
**Best window:** Tue / Wed / Thu, 08:00–09:30 US/Eastern.
**Account requirement:** your HN account must be ≥ 1 week old with ≥ 10
karma, or the post gets auto-flagged for review.

## Title (paste verbatim)

```
Show HN: Deslint – A deterministic design linter for AI-generated code
```

Title is 60 chars, under HN's 80-char cap. Starts with `Show HN:` per
guidelines. No exclamation marks, no caps, no "[free]" — HN mods strip
those.

## URL field

```
https://deslint.com
```

## Text field (paste verbatim, between the markers)

--- BEGIN POST ---

Hi HN, I'm the author of Deslint.

Short version: AI coding assistants are great at writing code fast and bad
at keeping it consistent. Hex colors sneak in next to design tokens.
`p-[13px]` appears next to `p-3`. Dark mode gets forgotten on half the
components. You can catch this manually, but nobody does, and the drift
compounds.

Deslint is an ESLint plugin (flat config, v10) that catches 33 classes of
design drift and fixes 11 of them automatically. It works in every
ESLint-aware editor, in CI via the GitHub Action, and — the new part — as
an MCP server that Claude Code, Cursor, and other MCP-aware agents call
during generation so the AI self-corrects before you ever see the output.

The MCP server is 6 tools: analyze_file, analyze_project, analyze_and_fix,
compliance_check, get_rule_details, suggest_fix_strategy. All stdio
transport, all local — no network, no telemetry, no cloud. Deslint itself
runs zero LLMs; it's the deterministic check in the loop, not another
model in the stack.

What I'd love feedback on:

1. Does the MCP loop framing read as useful or as a gimmick? I'm hedging
   between "this is the unlock for AI-era design consistency" and "this
   is just autofix with extra steps."
2. The eslint-plugin has been tested on 3,998 files across React, Vue,
   Angular, and plain HTML OSS projects — 0 false positives, 0 crashes
   in that set. Try it on your stack; I want the ones I missed.
3. Pricing page has a Teams tier on waitlist. If you'd actually pay for
   a cross-repo "what AI-design-debt did our PRs ship this week"
   dashboard, tell me what you'd want in it.

Install:

- ESLint plugin: `npm install -D @deslint/eslint-plugin`
- CLI: `npx @deslint/cli scan`
- MCP server (Claude Code): `claude mcp add deslint -- npx -y @deslint/mcp serve`
- MCP server (Cursor): one-click button on the README

Everything is MIT. Repo: https://github.com/jaydrao215/deslint

Happy to answer anything.

--- END POST ---

## First comment (post this ~2 minutes after the submission)

Don't put the backstory in the post body — HN convention is to post it as
the first reply so it's collapsible and the post body stays scannable.

--- BEGIN FIRST COMMENT ---

Backstory for anyone curious: I started this after shipping three
Tailwind apps where the AI assistant was great at writing new components
but kept reintroducing arbitrary hex values and off-scale spacing in
files I hadn't touched. Design review was catching it; it was slow and
inconsistent. Autofix felt obvious, but naïvely autofixing was worse —
I had a bug in v0.3 where `dark-mode-coverage` would rewrite a
light-themed SaaS dashboard into a dark-themed one on the next `--fix`.
That regression taught me the rules matter more than the autofixer:
every rule has to be "is this actually wrong, deterministically, every
time?" The current ruleset is what survived that filter.

Two non-obvious design calls:

- Every rule is try/catch-wrapped at the call site so a bug in one rule
  can never crash the whole lint run. Costs ~5% in ESLint perf; worth
  it to avoid the failure mode where a bad release takes down your CI.
- The MCP server returns structured content (Zod outputSchema, typed
  Record<string, unknown>) in addition to the stringified-JSON content
  block. Anthropic's spec supports both; a lot of older MCP servers
  only return the text block, which means agents have to regex-parse
  stringified JSON. Structured content is 5× faster on the parse side
  and far more robust to formatting drift.

Everything's open; the engine is the same across plugin/CLI/Action/MCP,
so if you only use one surface you still benefit from every rule
improvement.

--- END FIRST COMMENT ---

## During the first two hours

- Refresh the thread every ~10 min. Reply to every top-level comment
  **even if they're wrong** — engagement velocity is what gets you onto
  the front page.
- Don't get defensive. If someone says "this is just stylelint++", the
  good answer is "here's specifically what stylelint can't catch" with
  a link to a rule file.
- Don't say "thanks for the feedback!" to every comment. HN downweights
  sycophantic threads.
- If you get rate-limited (HN throttles new accounts) just wait.
- **Do not ask for upvotes anywhere — HN will kill the submission.**

## If the post dies

HN's algorithm will deprioritize any Show HN that doesn't get ~5 upvotes
in the first hour. If it's dead on arrival:

- Don't resubmit within 24 h from the same account — that's a flag.
- Post from a different angle tomorrow (e.g., "Show HN: I shipped an
  MCP server and here's what I learned about the protocol"). Different
  story, same product; this works.
- The dev.to article (file 02) is your fallback distribution.
