# S9 Launch — Cowork Execution Index

Each file in this directory is a self-contained Cowork session.
Paste the contents of each file into a new Cowork session on your Mac.
All draft text is embedded — Cowork does not need to look anything up.

---

## Execution order

| File | Task | Auth needed | Dependency |
|------|------|-------------|------------|
| `01-awesome-prs.md` | Open 3 awesome-* PRs (9.1, 9.2, 9.3) | GitHub | None — start here |
| `02-reddit.md` | Reddit Show & Tell posts (9.4) | Reddit | None — can run in parallel |
| `03-devto.md` | Dev.to long-form post (9.5) | Dev.to | None — can run in parallel |
| `04-twitter.md` | Twitter/X soft launch + ADA thread (9.6 + 9.11) | Twitter/X | Ideally after deslint.com is live |
| `05-deploy.md` | Deploy deslint.com (S6 final step) | Vercel + DNS registrar | Unblocks 9.9/9.10/9.12 |

## Items NOT in these docs (blocked)

- **9.7** Enterprise cold outreach — needs `DESLINT-EXECUTION.md §10` from deslint-internal
- **9.8** Anthropic outreach — same
- **9.9** Show HN — needs deslint.com live (`05-deploy.md` first)
- **9.10** Product Hunt — needs deslint.com live
- **9.12** Tech press pitch — needs deslint.com live

## Fastest path to most coverage

Run 01 + 02 + 03 in parallel (three separate Cowork sessions simultaneously).
Then run 04 and 05 after.

---

Repo: https://github.com/jaydrao215/deslint
npm: @deslint/eslint-plugin@0.2.0 (live)
Landing: https://deslint.com (not yet deployed — see 05-deploy.md)
