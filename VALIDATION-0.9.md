# Validation — 0.9.0 release

> What we ran before cutting the 0.9.0 tag and announcing on X.
> Every number here comes from a test in this repo; nothing is
> hand-counted. Cite this file in PRs and external posts so claims
> are auditable.

## Headline numbers

| Surface | Result |
|---|---|
| Plugin unit + integration tests | **1,735 passing**, 1 skipped, 0 failures |
| MCP server tests | **96 passing**, 0 failures (boots cleanly via stdio; demo runs end-to-end in ~1s) |
| Shared utilities tests | **270 passing**, 0 failures |
| CLI tests | 294 passing, 2 failing (sandbox-only git-commit-signing failure on `git-diff.test.ts` — also fails on `main`, unrelated to this branch) |
| Workspace build | Clean across all 5 packages and the docs site |

## Real-OSS coverage matrix

Cloned at pinned tags via the integration-test suite. Rules run via
`@deslint/eslint-plugin`'s `recommended` preset on every applicable
file. **Zero parse errors, zero rule crashes** across all three.

### `expressjs/express@4.21.2` — backend / Node

- `lib/` and `examples/` — every applicable backend-safety rule asserted to fire **zero false positives** in `tests/integration/backend-rules-real-world.test.ts`.
- Rules validated: `no-hardcoded-secrets`, `no-sql-injection`, `no-shell-injection`, `no-weak-crypto`, `safe-redirect`, `no-path-traversal`, `no-ssrf`, `secure-cookies`, `no-permissive-cors`, `no-eval`, `no-disabled-tls`, `require-jwt-expiry`, `no-floating-promise-handler`, `no-unsafe-mass-assignment`, `no-placeholder-code`, `no-hardcoded-localhost`, `no-empty-catch`, `no-leaked-stack-trace`, `no-mock-data-in-prod`.
- Three real false-positives surfaced and fixed during integration: `User.all(callback)` was being misclassified as a SQL call; `RegExp.exec` was being misclassified as `child_process.exec`; `res.redirect('/user/' + req.user.id)` was being misclassified as an open redirect on a server-loaded resource. The fixes are documented in the rule docstrings.

### `withastro/astro@4.16.18` — Astro

- Sparse-checkout of `examples/blog` + `examples/basics`. Every rule run via the `astro-eslint-parser` configured override.
- Validates the wave-shipped Astro support: `class:list={[...]}` syntax (was a silent false-negative source pre-fix), `set:html={...}` (Astro's `dangerouslySetInnerHTML` equivalent, now flagged by `no-dangerous-html`), and frontmatter (`---`) ESM treated as regular JS by every backend-safety rule.

### `shadcn-ui/ui@shadcn@4.7.0` — React + Tailwind (NEW for 0.9.0)

- Sparse-checkout of `apps/v4/registry/new-york-v4` (the canonical components every user pastes into their own project).
- **485 `.tsx`/`.jsx` files linted with the `recommended` preset.** Test: `tests/integration/release-gate-shadcn-ui.test.ts`.
- **0 parse errors, 0 rule crashes.**
- **0 false positives** from the backend-safety / AI-coding rule families on a pure UI library (asserted by name in the test).
- **Per-rule fire counts snapshotted** so any future commit that drifts the noise level on a real codebase fails the test loudly. Current snapshot:

  | Rule | Fires |
  |---|---:|
  | `no-arbitrary-spacing` | 91 |
  | `responsive-required` | 59 |
  | `prefers-reduced-motion` | 48 |
  | `autocomplete-attribute` | 39 |
  | `icon-accessibility` | 34 |
  | `focus-visible-style` | 13 |
  | `responsive-image-optimization` | 8 |
  | `no-arbitrary-border-radius` | 6 |
  | `prefer-semantic-html` | 5 |
  | `image-alt-text` | 4 |
  | `link-text` | 3 |
  | `no-arbitrary-typography` | 2 |
  | `a11y-color-contrast` | 1 |
  | `no-arbitrary-zindex` | 1 |
  | `no-magic-numbers-layout` | 1 |
  | `no-prod-console` | 1 |

  These are real signals shadcn's authors might intentionally accept (e.g. arbitrary spacing on low-level primitives), but the snapshot locks them as a regression baseline. A change in any count requires a deliberate `--update` from a maintainer.

## Tarball install verification

Test: `tests/integration/release-gate-tarball-install.test.ts`. The most
important pre-publish check we run.

1. **`pnpm pack`** runs against `packages/eslint-plugin` to produce a real npm tarball.
2. A fresh tmp project is bootstrapped (its own `package.json`, no workspace links).
3. **`npm install <tarball> eslint@^10 @typescript-eslint/parser@^8`** in the tmp dir. This is the literal install path the README tells external users to follow.
4. The installed package's `dist/index.js` and `dist/index.d.ts` are asserted to exist (catches missing `package.json#files` entries).
5. A spawned `node` subprocess `import`s the package via the project's own `node_modules` and asserts `plugin.rules` has 60+ entries and `plugin.configs` has `recommended`/`strict`/`backend`/`nextjs` keys (catches broken `exports` map).
6. A real `Linter.verify` run against a fixture with two known violations (`bg-[#FF0000]`, `p-[13px]`) asserts both `deslint/no-arbitrary-colors` and `deslint/no-arbitrary-spacing` fire (catches broken peer-dep declaration / missing rule files in the tarball).

This catches the "dist not in `files[]`" / "exports map points to wrong path" / "peer-dep range too narrow" class of bugs that would otherwise ship to npm and only surface from a Twitter user's complaint.

## MCP server verification

Beyond the unit tests:

- **Stdio handshake** — `initialize` returns the right protocol version and capabilities (tools, resources, prompts).
- **`tools/list` returns 11 tools**: `analyze_file`, `verify_before_write`, `quick_check`, `get_server_stats`, `scan_diff`, `analyze_project`, `analyze_and_fix`, `compliance_check`, `get_rule_details`, `enforce_budget`, `suggest_fix_strategy`.
- **Demo end-to-end** — `node packages/mcp/demo/self-correction-loop.mjs` spawns the server, runs the full self-correction flow, completes in ~1s.
- **Performance** — `verify_before_write` cold start ~985 ms (down from ~6.6 s pre-0.9 via fast-path refactor), warm fresh content 3-7 ms, identical-content cache hit ~0.05 ms with `cached: true`.

## What changed since 0.8.0

- **+25 rules.** 5 backend safety (wave 1), 9 backend + Next.js (wave 2), 6 AI-coding hygiene (wave 3), 5 quality-gate (wave 4). Total 62 rules across 11 categories.
- **First-class Astro support.** `astro-eslint-parser` peer dep, `class:list` and `set:html` recognition. Closes a major source of silent false-negatives on Astro frontends.
- **MCP fast path.** `verify_before_write` switched from temp-file + ESLint engine to in-process `Linter.verify` with module-level caches. Cold start cut by ~85%, warm calls ~50% faster, identical-content re-calls effectively free.
- **MCP cost-aware prompt.** `/deslint-fix` rewritten with a hard cap of 2 verify calls per file per turn. New `'ok-with-warnings'` recommendedAction explicitly tells agents NOT to retry on advisory drift. New `quick_check` and `get_server_stats` tools so agents can decide cheaply and surface their own cost.
- **3 new MCP tools, 2 resources, 1 prompt.** `verify_before_write`, `scan_diff`, `quick_check`, `get_server_stats`, `deslint://rules`, `deslint://rules/{slug}`, `/deslint-fix`.
- **Marketing site refresh.** `WhatItCatches`, `ComparisonStrip`, JSON-LD, `llms.txt`, `/cli`, `/launch-check`, `/pricing`, `/docs`, `/compare/deslint-vs-stylelint`, `apps/docs/src/lib/rules.ts`. All "37 rules" / "57 rules" references updated to 62. Hero deliberately untouched.

## Known limitations

- **`shadcn-ui` snapshot includes `react/no-children-prop` (9 fires).** This is not a deslint rule — it's coming from somewhere in the test runner's global config and shows up in the snapshot. Tracking down its origin is a follow-up; the snapshot still serves as a regression baseline for everything we DO own.
- **CLI git-diff tests fail in sandboxed environments** that block GPG signing. Reproduces on `main`. Will pass in normal CI.
- **No release-gate test against a real Vue or Next.js app yet.** Express + Astro + shadcn covers React/Tailwind/Astro/Node, which is most of the user base. A Vue real-app test is a follow-up.

## How to re-run before tagging

```sh
# Workspace build + per-package tests (the parts that pass cleanly)
pnpm -r build
pnpm --filter @deslint/eslint-plugin test
pnpm --filter @deslint/mcp test
pnpm --filter @deslint/shared test

# MCP boot smoke test
node packages/mcp/demo/self-correction-loop.mjs

# Real-OSS release gate (clones shadcn-ui, expects internet)
pnpm --filter @deslint/eslint-plugin test -- tests/integration/release-gate-shadcn-ui.test.ts

# Tarball install verification (packs + installs into tmp)
pnpm --filter @deslint/eslint-plugin test -- tests/integration/release-gate-tarball-install.test.ts
```

If all of these pass with the same numbers as the headline section, the
0.9.0 tag is good to push and the X-post is good to publish.
