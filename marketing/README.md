# deslint — marketing assets

Visual comparison of real regressions deslint's v0.3.0 autofix could cause in
customer apps, paired with the fix behaviour shipped on branch
`claude/debug-deslint-config-XTlLz`.

## Files

| File | Size | Use |
|---|---|---|
| `output/cli-demo.gif` | 4.7 MB | npm README hero — terminal scan/fix loop |
| `output/cli-demo.webm` | 1.5 MB | High-quality source for docs/site embed |
| `output/social-01-dashboard.mp4` | 1.3 MB · 15s · 1080² | SaaS dashboard gets silently dark-mode'd |
| `output/social-02-ecommerce.mp4` | 800 KB · 15s · 1080² | Add-to-cart toast stuck behind header (z-index clamp) |
| `output/social-03-spinner.mp4` | 940 KB · 15s · 1080² | Loader freezes for reduced-motion users |
| `output/social-0x.gif` (×3) | 2–3 MB each | GIF fallbacks for PR comments / Slack |
| `output/01-dark-mode.png`, `02-zindex.png`, `03-spinner.png` | 100–160 KB | Section crops for release notes |
| `output/full.png` | 420 KB | Composite for the launch blog |
| `output/walkthrough.webm` | 915 KB | Slow scroll — docs hero loop |
| `output/pr-comment.mp4` | 690 KB · 10s · 1200×800 | GitHub Action PR-review teaser (marketplace listing, HN) |
| `output/pr-comment.gif` | 2.3 MB | Drop-in for README / Reddit thread screenshots |
| `output/vscode-squiggle.mp4` | 610 KB · 12s · 1200×800 | VSCode quick-fix teaser (extension marketplace, X/LinkedIn) |
| `output/vscode-squiggle.gif` | 2.1 MB | Slack / Discord preview |
| `output/comparison-table.mp4` | 325 KB · 4s · 1200×675 | "What does safe autofix mean?" typewriter reveal (tweet, HN lead) |
| `output/comparison-table.gif` | 2.3 MB | Same, for pre-Reddit/X static feeds |
| `output/comparison-table.png` | 295 KB | Final-frame tweet card / OG image / blog hero |
| `IDEAS.md` | — | Launch playbook: channels, captions, partnerships |

Each panel is a "before" (what the bad autofix produced) next to an "after"
(what these commits now produce):

1. **Dark-mode autofix** — `dark-mode-coverage` used to rewrite
   `bg-white`/`text-slate-900` into dark-theme equivalents across the whole
   file tree. Light-themed sites shipped as dark ones. Now suggest-only by
   default (opt in via `autofix: true`).
2. **Portal z-index** — `no-arbitrary-zindex` used to clamp `z-[9999]` down
   to `z-50`, leaving modals stuck behind app headers. Portal values (999,
   1000, 9999) are allowlisted by default.
3. **Loading spinner** — `prefers-reduced-motion` used to wrap
   `animate-spin` with `motion-safe:`, leaving reduced-motion users with a
   static circle. `animate-spin` / `animate-ping` are exempt by default
   (their motion IS the signal).

## Reproducing

```bash
# Static before/after gallery + slow-scroll walkthrough
node marketing/capture.mjs

# CLI terminal demo (GIF) + three 15s social clips (MP4 + GIF)
node marketing/capture-social.mjs

# PR-review teaser + VSCode quick-fix teaser + comparison-table reveal
node marketing/capture-followup.mjs
```

Requires `ffmpeg` on `$PATH` (apt: `apt-get install -y ffmpeg`). The
capture scripts resolve Playwright from the globally-installed
`/opt/node22/lib/node_modules/playwright` — no local `devDependency`
needed. If you're on a different machine, drop a local
`pnpm add -D playwright` in the repo root and replace the
`require.resolve(...)` block at the top of each capture script.

## Fixture

`fixtures/before-after.html` is a plain HTML page (Tailwind via CDN). It
hand-renders the visual regressions — we don't round-trip through Tailwind's
compiler because the contrast we're showing is the *effect* of the autofix,
not the lint output itself.
