# deslint — before/after marketing assets

Visual comparison of real regressions deslint's v0.3.0 autofix could cause in
customer apps, paired with the fix behaviour shipped on branch
`claude/debug-deslint-config-XTlLz`.

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
node marketing/capture.mjs
```

Outputs to `marketing/output/`:

| File | Purpose |
|---|---|
| `full.png` | Composite full-page screenshot |
| `01-dark-mode.png` | Section 1 crop |
| `02-zindex.png` | Section 2 crop |
| `03-spinner.png` | Section 3 crop (static image; spinner animation only shows in the video) |
| `walkthrough.webm` | Slow scroll walkthrough recorded in Chromium |

The capture script resolves Playwright from the globally-installed
`/opt/node22/lib/node_modules/playwright` — no local `devDependency`
needed. If you're on a different machine, drop a local
`pnpm add -D playwright` in the repo root and replace the
`require.resolve(...)` block at the top of `capture.mjs`.

## Fixture

`fixtures/before-after.html` is a plain HTML page (Tailwind via CDN). It
hand-renders the visual regressions — we don't round-trip through Tailwind's
compiler because the contrast we're showing is the *effect* of the autofix,
not the lint output itself.
