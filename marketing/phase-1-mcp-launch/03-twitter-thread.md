# Post — X / Twitter thread

**Where to post:** https://x.com/compose/post
**Best window:** within 15 minutes of the Show HN submission going live,
to capture the audience that comes from HN to your profile and vice
versa.
**Prerequisite:** confirm the HN URL for tweet 7. Replace `<HN-URL>`
before posting.

## Thread structure

7 tweets. Each under the 280-char limit. One asset per tweet max
(Twitter/X deprioritizes tweets with multiple cards). Thread using
Twitter's native "add another tweet" — do NOT use an external thread
tool, X demotes those.

## Guideline compliance

- No shortened URLs (bit.ly, t.co from third parties). X's algorithm
  deprioritizes non-native shorteners.
- One asset per tweet maximum.
- No "drop a ❤️ if you want this" — engagement bait is demoted by X's
  ranking model.
- `@anthropic` and `@cursor_ai` mentions are fair because Deslint
  actually ships to their ecosystems (MCP). Keep it factual.
- No ALL CAPS sentences (algorithmic penalty).

## Asset placement

| Tweet | Asset |
|---|---|
| 1 | `marketing/output/vscode-squiggle.mp4` OR the compliance report screenshot |
| 2 | — (text only) |
| 3 | `marketing/output/cli-demo.gif` |
| 4 | — (text only) |
| 5 | `marketing/output/pr-comment.mp4` |
| 6 | — (text only, MCP recording will stream via deslint.com link) |
| 7 | — (text + HN link) |

Upload each asset to X directly — don't link to marketing/output/ paths
(those are only visible to repo viewers).

## Thread (paste tweet by tweet)

--- BEGIN TWEET 1 ---

AI assistants write components fast. They also ship design drift fast.

text-[#1a5276] sitting next to text-primary. p-[13px] next to p-3. Dark
mode forgotten on half the components.

I built a deterministic linter to catch that. Open source, MIT, works
in every editor.

[attach: vscode-squiggle.mp4]

--- END TWEET 1 ---

--- BEGIN TWEET 2 ---

33 rules across color / spacing / typography / responsive / a11y.

Tested on 3,998 real-world OSS files from React, Next.js, Vue, Nuxt,
Angular, and plain HTML projects.

3,313 real violations caught. 0 false positives. 0 crashes.

The 0 false positives matters more than the 3,313.

--- END TWEET 2 ---

--- BEGIN TWEET 3 ---

One ESLint plugin, same rules everywhere:

• IDE (Cursor, VS Code, WebStorm, anything ESLint-aware)
• CLI for whole-project scans + compliance reports
• GitHub Action for inline PR review comments
• MCP server for Claude Code / Cursor agent loops

Zero cloud. Zero telemetry.

[attach: cli-demo.gif]

--- END TWEET 3 ---

--- BEGIN TWEET 4 ---

The MCP part is the new piece.

@deslint/mcp is 6 tools: analyze_file, analyze_project, analyze_and_fix,
compliance_check, get_rule_details, suggest_fix_strategy.

Your agent calls them during generation. It sees rule IDs + fixes. It
corrects its own output before you ever see it.

--- END TWEET 4 ---

--- BEGIN TWEET 5 ---

In PRs, the GitHub Action comments inline with the rule ID, the WCAG
criterion, and a commit-ready suggestion.

Fails the check when your Design Health Score drops below your
threshold. Same engine as local. Same config. No divergence.

[attach: pr-comment.mp4]

--- END TWEET 5 ---

--- BEGIN TWEET 6 ---

The part I keep arguing about:

Deslint itself runs zero LLMs. Pure AST pattern matching. Same input,
same output, every time.

The LLM is whatever agent you're already using — @anthropic Claude,
Cursor, whatever. Deslint is the deterministic check in that loop, not
another model in the stack.

--- END TWEET 6 ---

--- BEGIN TWEET 7 ---

Install in 30 seconds:

# ESLint plugin
npm i -D @deslint/eslint-plugin

# MCP in Claude Code
claude mcp add deslint -- npx -y @deslint/mcp serve

Repo: github.com/jaydrao215/deslint
Discussion on HN: <HN-URL>

Happy to answer anything — I'm in both threads.

--- END TWEET 7 ---

## After posting

- Quote-tweet your own tweet 1 four hours later with "if you missed
  this earlier today" and a fresh angle. Twitter's algorithm rewards
  tweets that get attention at two different points in the day.
- Reply to every comment on tweets 1 and 3 — those are where newcomers
  land.
- If tweet 1 clears 1k impressions in the first hour, pin the thread.
- If tweet 1 dies under 500 impressions, don't force a rescue. The HN
  thread is the primary distribution; X is amplification.

## Don't do

- Don't quote-tweet the HN submission URL tagging @dang or any HN
  personality. Reads as vote-solicitation.
- Don't post the same asset you posted on LinkedIn. Platform-specific
  framing means platform-specific content.
- Don't auto-retweet from alt accounts. X detects this and demotes.
