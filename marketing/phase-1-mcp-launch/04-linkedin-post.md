# Post — LinkedIn

**Where to post:** https://www.linkedin.com/feed/ → "Start a post"
**Best window:** 10:00–11:00 US/Eastern on a weekday. LinkedIn's feed
engagement peaks during weekday mornings.
**Format:** single post with one attached asset (video).

## LinkedIn guideline compliance

- https://www.linkedin.com/help/linkedin/answer/a1340696
- Professional Content Policy — no exaggerated claims, no sensational
  framing.
- 3,000-character soft limit. The body below is ~1,950 chars (fits
  comfortably).
- First 3 lines matter most — they're what shows in the feed before
  "…see more". Lead with an observation, not a product name.
- Hashtags allowed but LinkedIn deprioritizes posts with >5. Using 3.
- Don't tag people who haven't agreed to be tagged. No random
  @-mentions of company CEOs or VCs.

## Asset

`marketing/output/vscode-squiggle.mp4` (12s, 1200×800, shows a real
violation + autofix in VS Code).

Upload directly — do not link to the marketing/ path.

## Body (paste verbatim)

--- BEGIN POST ---

Three lessons from shipping design-linter rules against 3,998 real-world
files.

1. The zero-false-positive bar is not optional. A design linter with
   even a 1% FP rate gets turned off within a week — developers
   ignore the noise, then ignore the signal. Every rule has to pass
   "is this wrong, deterministically, every time?" before it ships.
   Seven rules in my ruleset got cut at that gate.

2. Autofix that rewrites intent is worse than no autofix. My v0.3 had
   a `dark-mode-coverage` rule that silently rewrote light-themed
   SaaS dashboards into dark ones on the next --fix. The rule was
   "correct." The autofix was destructive. v0.4 made every potentially
   intent-changing fix suggest-only. Adoption went up.

3. AI assistants need the linter running in the loop, not after the
   fact. A developer catches 30% of drift on review. An agent that
   can call the linter during generation catches 100% — but only if
   you give it structured output (rule ID + fix suggestion + WCAG
   mapping) rather than a string dump.

I spent the last few weeks modernizing the MCP server (@deslint/mcp)
against the current Anthropic MCP spec — registerTool API, tool
annotations, structured content, Zod output schemas. The result:
Claude Code and Cursor now call the linter during code generation and
self-correct before the developer ever sees the output. No network
calls, no telemetry — the server is a local stdio process, the
deterministic check in an otherwise non-deterministic loop.

Open source, MIT. Works as ESLint plugin, CLI, GitHub Action, and MCP
server. Same engine everywhere.

Trying it on your codebase: github.com/jaydrao215/deslint

Interested in feedback from anyone running design systems at scale —
especially the "we have a token library but enforcement is manual"
case. That's the wedge the MCP loop is built to close.

#DeveloperTools #DesignSystems #OpenSource

--- END POST ---

## After posting

- LinkedIn shows reach metrics on your post after ~2 hours. If
  impressions are under 500 by then, the algorithm has buried it;
  don't boost, don't edit the post (editing resets reach).
- Reply to every comment. LinkedIn's algorithm rewards comment depth
  more than comment count — a two-turn exchange beats ten one-word
  replies.
- If a connection asks "can we hop on a call" in the comments, take
  it to DM immediately. That's a design-partner signal.
- Do NOT pay to boost this post. LinkedIn boost spend does not return
  on technical developer-tool content; the boosted reach is mostly
  non-developer.

## Don't do

- Don't cross-post the HN URL in the body. LinkedIn's algorithm
  demotes posts with external links above the fold. Put the GitHub
  URL in the last line only.
- Don't use the "LinkedIn newsletter" feature for this — that's for
  multi-post series.
- Don't tag Anthropic / Cursor company pages unless someone from the
  team has asked to be looped in. Unsolicited tagging reads as
  attention-seeking on LinkedIn.
