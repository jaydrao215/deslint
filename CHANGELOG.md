# Changelog

## [0.1.0] — 2026-04-06

### Added
- **eslint-plugin-vizlint** — 14 ESLint rules for design quality
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
- **@vizlint/shared**
  - `.vizlintrc.json` Zod schema covering 5 user control levels
  - Tailwind v3 config reader (`tailwind.config.js/ts`)
  - Tailwind v4 `@theme` CSS parser
  - CSS `:root` custom property parser
  - Design system merge logic (manual overrides auto-imported)
  - `importTailwindConfig()` auto-detection utility
- **@vizlint/cli**
  - `vizlint scan` — scan with Design Health Score (0-100)
  - `vizlint fix --all` / `vizlint fix --interactive` — auto-fix modes
  - `vizlint init` — interactive setup wizard
  - `vizlint generate-config` — generate Cursor/Claude/Agents configs
  - `vizlint suggest-tokens` — analyze arbitrary values and suggest replacements
  - Output formats: text, JSON, SARIF, HTML
  - Grouped violation formatter (deduplicates repeated patterns)
- **@vizlint/mcp** — MCP server for AI self-correction
  - `analyze_file` — lint single file, return violations + score
  - `analyze_project` — scan project, return score + top violations
  - `analyze_and_fix` — analyze and apply fixes in one step
  - Auto-install for Cursor and Claude Code
- **@vizlint/action** — GitHub Action for PR design reviews
  - Posts Design Health Score comment on PRs with category breakdown
  - Comment deduplication (find-and-update pattern)
  - Configurable `min-score` threshold for pass/fail check status
- GitHub Actions CI workflow (Node 20 + 22)
- Monorepo setup: Turborepo + pnpm workspaces
- 715 tests across all packages

### Changed
- All silent catch blocks use `debugLog()` utility (zero-overhead in production)
- Version strings read from package.json via `createRequire()` — no more hardcoded versions
- `a11y-color-contrast` rule now framework-agnostic (was React-only)
- CLI lint-runner enables all 14 rules by default
- MCP `analyzeFile` throws on missing files (was returning score 100)
- Coverage thresholds enforced in CI (v8 provider, 95% lines / 90% branches for eslint-plugin)
- `engines.node >= 20.19.0` added to all package.json files

### Fixed
- Angular template parser not wired in lint-runner — all .html silently failed (P0)
- Angular template nodes crash auto-fix due to missing `range` — implemented `safeGetRange()` fallback (P0)
- TypeScript parser missing from lint-runner — all .tsx/.ts failed to parse (P0)
- Scan command not passing cwd to lint-runner — "outside base path" errors (P0)
- Vue parser not loaded in CLI — all .vue files failed with parse errors (P0)
- `no-arbitrary-colors` flagging legitimate CSS variable references — added `allowCssVariables` option (P1)
- `dark-mode-coverage` too broad on semantic tokens, gradients, opacity — added family whitelist + function filters (P1)
- Third-party ESLint rule violations leaking into Vizlint results — filter to vizlint/* rules only (P1)
- `no-magic-numbers-layout` regex boundary issue — fr_ pattern not matched (P1)
- `consistent-component-spacing` comparing different margin axes — split into axis-specific categories (P1)
- `no-inline-styles` flagging dynamic template literals — added `allowDynamic: true` default (P1)
- `no-magic-numbers-layout` crashing on complex grid templates — skip CSS functions (P2)
- `no-arbitrary-typography` wrong suggestions for non-exact matches — added tolerance (P2)
- `no-magic-numbers-layout` rem units not parsed, fractional scale incomplete (P3)
- `dark-mode-coverage` default changed from `warn` to `off` in recommended config — too noisy on non-dark projects (P1)

### Validated
- 7 real-world projects: Cal.com, Dub.co, Elk, Vintor, saas-starter, taxonomy, Vintor re-run
- 4,061 files scanned, 3,395 true violations, 0 false positives, 0 crashes
- Performance: 602 files/sec on 1,838-file project (25x under 15s/500-file budget)
- Auto-fix correctness: 14/14 verified correct on JSX, 0 regressions
- 15 bugs found and fixed during validation
