# Phase 1 launch kit — MCP-era repositioning

Copy-paste-ready posts for the post-audit relaunch. Each file in this folder
is **one asset for one channel**. Open the file, copy the body between the
`--- BEGIN POST ---` and `--- END POST ---` markers, paste into the target
app, hit submit. Nothing in this folder needs editing before posting unless
flagged explicitly at the top of the file.

## Pre-launch prerequisites (do these first)

Marketing content references the modernized MCP server (v0.5.0 on npm), the
MCP Registry listing, and the reframed landing page. Those must ship first:

1. **Merge `claude/audit-mcp-server-IeR8L` → `main`.** This publishes:
   - `@deslint/mcp` v0.5.0 (modernized, annotations, structured content)
   - Reframed landing page + pricing page
2. **Publish to npm.** `cd packages/mcp && npm publish --access public`
3. **Submit `packages/mcp/server.json` to the MCP Registry.** See
   [`07-mcp-registry-submission.md`](./07-mcp-registry-submission.md).
4. **Verify the demo cast renders on deslint.com.** Asciinema recording at
   `apps/docs/public/demo/mcp-self-correction.cast` must play in the "Real
   terminal session" tab.

If any of the above is not green, **do not post** — the call-to-action in
every asset is "install it right now," and a broken install sinks the
launch.

## Posting order & timing

| Day | Channel | File | Window (US/ET) |
|---|---|---|---|
| T-1 | MCP Registry | `07-mcp-registry-submission.md` | any |
| Day 0 | **Show HN** | `01-show-hn.md` | **08:00–09:30 Tue/Wed/Thu** |
| Day 0 +15 min | X / Twitter | `03-twitter-thread.md` | same window |
| Day 0 +2 h | LinkedIn | `04-linkedin-post.md` | 10:00–11:00 |
| Day 0 +4 h | Reddit r/ClaudeAI | `05-reddit-r-ClaudeAI.md` | 12:00–14:00 |
| Day 0 +6 h | Reddit r/cursor | `06-reddit-r-cursor.md` | 14:00–16:00 |
| Day 1 | dev.to | `02-dev-to-article.md` | 09:00 |

Rationale: HN leads because its first-hour ranking is the whole game. The
Twitter thread follows with the exact HN URL so the network effect
compounds. LinkedIn is professional audience so mid-morning. Reddit
communities hate anything that smells like cross-post, so space them
across the day and don't mention other channels. dev.to trails a day
because a "here's what I learned shipping X on HN yesterday" angle works
better than a cold launch.

**Weekday rule:** never launch Mon (HN is saturated with weekend catchup),
never Fri (HN dies after lunch), never during a US federal holiday.

## Channels not on the list, and why

- **r/programming** — strict no-self-promo policy. A solo-dev launch would
  be removed and flag the account. Skip.
- **Reddit r/webdev, r/reactjs** — allowed but only with a content-first
  post (e.g. "what I learned from 3,998 real-world scans"). Save these
  for follow-up once we have a second story to tell.
- **Product Hunt** — worth doing but requires a coordinated day-of push.
  Phase 2, once we have a signed-up user network to ping.
- **Bluesky** — low volume for dev tools right now; skip unless our
  network is already there.
- **Discord communities (Next.js, Shadcn, Radix)** — DO NOT cold-post.
  Only bring up Deslint when responding to a relevant question. Their
  self-promo rules are strict and enforcement is immediate.

## Guideline compliance — per channel

Every asset in this folder has been drafted against the most-recent
public guidelines for its target platform. The highlights:

### Hacker News (Show HN)
- https://news.ycombinator.com/showhn.html
- https://news.ycombinator.com/showhnhelp.html
- Title: `Show HN: <plain one-liner>` — no caps-lock, no "!", no "[free]",
  no emojis.
- First comment is used for backstory / why / what's missing — NOT the
  post body.
- Don't ask for upvotes, don't cross-post, don't disappear. **Stay in
  the thread for the first 2 hours** to answer questions.
- What gets the post killed: marketing language, URLs to a landing page
  with a mailing-list modal, "enterprise" framing, "revolutionary".

### dev.to
- https://dev.to/code-of-conduct
- Max 4 tags. Use `canonical_url` if cross-posting from a blog.
- Lead with a hook, not a product name. Share what you learned.
- No pure marketing posts — dev.to removes them. The article in this
  folder is a teardown + tutorial, not a product announcement.

### X / Twitter
- Plain text, no shortened links (X deprioritizes t.co wrappers from
  third parties), full URL OK.
- One video/asset per tweet max.
- No "drop a ❤️ if you want early access" — that's engagement bait and
  is demoted.
- Don't @-mention Anthropic / Cursor unless the product was actually
  shipped to their ecosystem (MCP is, so the @ is fair).

### LinkedIn
- Professional content policy — no sensational claims.
- 3,000-char soft limit per post. The file respects this.
- First three lines matter most (they're what shows in the feed). Lead
  with an observation, not a product.

### Reddit (r/ClaudeAI, r/cursor)
- Read the subreddit rules before posting. Each sub has a pinned
  "self-promo allowed?" thread. Current state (April 2026):
  - r/ClaudeAI: tool showcases allowed with `[Projects]` tag
  - r/cursor: self-promo allowed if ratio of content posts > promo posts
- Mention the free/open-source status explicitly — Reddit downvotes
  anything that smells commercial.
- Don't delete downvoted comments, don't edit the post to add "EDIT: to
  the downvoters" text. Let it breathe.

### MCP Registry
- https://github.com/modelcontextprotocol/registry
- Name format: `io.github.<owner>/<name>`. Ours is
  `io.github.jaydrao215/deslint`.
- Registry review is manual. Expect 1–3 days to approve.

## Assets referenced by the posts

Every asset lives in `marketing/output/` on this branch. None of the posts
rely on assets that don't exist yet. Specifically:

- CLI demo GIF: `marketing/output/cli-demo.gif`
- PR review MP4/GIF: `marketing/output/pr-comment.{mp4,gif}`
- VS Code squiggle: `marketing/output/vscode-squiggle.{mp4,gif}`
- Social 15s clips: `marketing/output/social-0{1,2,3}-*.{mp4,gif}`
- MCP self-correction cast: `apps/docs/public/demo/mcp-self-correction.cast`

If you add new visuals, drop them in `marketing/output/` and reference
from the posts — keep this folder text-only.

## After the launch

Log what worked. Create `marketing/phase-1-mcp-launch/results.md` once
the dust settles and capture:
- HN rank peak + comment volume
- npm download delta (@deslint/mcp, @deslint/eslint-plugin)
- GitHub star delta
- MCP Registry install count
- Tier-1 inbound (design-partner inquiries via the pricing waitlist)

That informs Phase 2 — the content-engine posts ("I lint my own lint
bugs in public" from the `IDEAS.md` playbook).
