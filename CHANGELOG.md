# Changelog

## [Unreleased]

### Added
- **eslint-plugin-vizlint**
  - `no-inline-styles` rule: flags `style={{}}` attributes across React/Vue/Svelte/Angular
  - `consistent-border-radius` rule: detects mixed `rounded-*` values across same-type components
  - `image-alt-text` rule: flags `<img>` without alt or with meaningless alt text
  - `no-magic-numbers-layout` rule: flags arbitrary numbers in grid/flex layout with auto-fix
  - Total rules: 14 (up from 10)
- **@vizlint/action** — GitHub Action for PR design reviews
  - Posts Design Health Score comment on PRs with category breakdown
  - Comment deduplication (find-and-update pattern)
  - Configurable `min-score` threshold for pass/fail check status
  - `action.yml` with documented inputs/outputs for GitHub Marketplace

### Changed
- All silent catch blocks now use `debugLog()` utility (zero-overhead in production)
- Version strings read from package.json via `createRequire()` — no more hardcoded versions
- `a11y-color-contrast` rule now framework-agnostic (was React-only)
- CLI lint-runner enables all 14 rules by default (was only 5)
- MCP `analyzeFile` throws on missing files (was returning score 100)
- MCP `analyzeAndFix` reordered passes to eliminate redundant re-parse
- Coverage thresholds enforced in CI (v8 provider, 95% lines / 90% branches for eslint-plugin)
- `engines.node >= 20.19.0` added to all package.json files

### Fixed
- Benchmark now includes all rules (was missing 6)

---

## [0.3.0] — 2026-04-01

### Added
- **eslint-plugin-vizlint**
  - `no-arbitrary-colors` rule: detects hex/rgb/rgba/hsl/hsla arbitrary colors in Tailwind classes with auto-fix
  - `no-arbitrary-spacing` rule: detects arbitrary spacing values with auto-fix to nearest scale value
  - Framework support: React, Vue, Svelte, Angular, HTML via shared `createClassVisitor()`
  - Tailwind v3 + v4 support with 40+ class name mappings
  - Full color palette (22 families, 50-950 shades)
  - `recommended` and `strict` config presets
- **@vizlint/shared**
  - `.vizlintrc.json` Zod schema covering 5 user control levels
  - Tailwind v3 config reader (`tailwind.config.js/ts`)
  - Tailwind v4 `@theme` CSS parser
  - CSS `:root` custom property parser
  - Design system merge logic (manual overrides auto-imported)
  - `importTailwindConfig()` auto-detection utility
- **@vizlint/cli** — package scaffold (implementation in Sprint 5)
- **@vizlint/mcp** — package scaffold (implementation in Sprint 9)
- GitHub Actions CI workflow (Node 20 + 22)
- Monorepo setup: Turborepo + pnpm workspaces
