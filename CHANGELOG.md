# Changelog

## [0.1.1] — 2026-04-08

Inaugural public release of the `@deslint/*` packages on npm:

- `@deslint/eslint-plugin`
- `@deslint/cli`
- `@deslint/mcp`
- `@deslint/shared`

### Added

- **`@deslint/eslint-plugin`** — 14 ESLint rules for design quality
  - `no-arbitrary-colors`: detects hex/rgb/rgba/hsl/hsla arbitrary colors with auto-fix
  - `no-arbitrary-spacing`: detects arbitrary spacing values with auto-fix
  - `no-arbitrary-typography`: detects arbitrary font size, weight, leading, tracking with auto-fix
  - `no-arbitrary-zindex`: detects arbitrary z-index values with auto-fix
  - `no-inline-styles`: flags `style={{}}` attributes across React/Vue/Svelte/Angular
  - `no-magic-numbers-layout`: flags arbitrary numbers in grid/flex layout with auto-fix
  - `consistent-component-spacing`: detects spacing divergence across components
  - `consistent-border-radius`: detects mixed `rounded-*` values across same-type components
  - `responsive-required`: requires responsive breakpoints on fixed-width containers
  - `missing-states`: flags interactive elements missing hover/focus/disabled states
  - `dark-mode-coverage`: flags elements missing dark mode variants (off by default)
  - `a11y-color-contrast`: checks WCAG AA contrast ratios
  - `image-alt-text`: flags `<img>` without alt or with meaningless alt text
  - `max-component-lines`: flags overly large components
  - Framework support: React, Vue, Svelte, Angular, HTML via shared `createClassVisitor()`
  - Tailwind v3 + v4 support with 40+ class name mappings
  - `recommended` and `strict` config presets
- **`@deslint/shared`**
  - `.deslintrc.json` Zod schema covering 5 user control levels
  - Tailwind v3 config reader (`tailwind.config.js/ts`)
  - Tailwind v4 `@theme` CSS parser
  - CSS `:root` custom property parser
  - Design system merge logic (manual overrides auto-imported)
  - `importTailwindConfig()` auto-detection utility
  - W3C Design Tokens (DTCG) import
- **`@deslint/cli`**
  - `deslint scan` — scan with Design Health Score (0-100)
  - `deslint fix --all` / `deslint fix --interactive` — auto-fix modes
  - `deslint init` — interactive setup wizard
  - `deslint generate-config` — generate Cursor/Claude/Agents configs
  - `deslint suggest-tokens` — analyze arbitrary values and suggest replacements
  - `deslint trend` — track Design Health Score over time
  - Design Debt scoring
  - Quality Gates (configurable pass/fail thresholds)
  - WCAG 2.2 compliance report export (HTML)
  - Output formats: text, JSON, SARIF, HTML
  - Grouped violation formatter (deduplicates repeated patterns)
- **`@deslint/mcp`** — MCP server for AI self-correction
  - `analyze_file` — lint single file, return violations + score
  - `analyze_project` — scan project, return score + top violations
  - `analyze_and_fix` — analyze and apply fixes in one step
  - Auto-install for Cursor and Claude Code
- **`@deslint/action`** — GitHub Action for PR design reviews
  - Posts Design Health Score comment on PRs with category breakdown
  - Comment deduplication (find-and-update pattern)
  - Configurable `min-score` threshold for pass/fail check status

### Engineering

- Monorepo: Turborepo + pnpm workspaces
- ESLint v10 flat config only (no legacy `.eslintrc` support anywhere)
- Node.js ≥20.19.0 minimum, enforced in every `package.json`
- 792 tests across all packages, all green on Node 20 + 22
- Coverage thresholds enforced in CI (v8 provider, 86% lines / 75% branches for `@deslint/eslint-plugin`)
- Every rule wrapped in try/catch — an unhandled exception never crashes lint for the entire file
- All silent catch blocks use `debugLog()` (zero-overhead in production)
- Per-rule benchmark in CI via `eslint-rule-benchmark`

### Validated

- 7 real-world projects: Cal.com, Dub.co, Elk, Vintor, saas-starter, taxonomy, Vintor re-run
- 4,061 files scanned, 3,395 true violations, **0 false positives, 0 crashes**
- Performance: 602 files/sec on 1,838-file project (25× under the 15s/500-file budget)
- Auto-fix correctness: 14/14 verified correct on JSX, 0 regressions
