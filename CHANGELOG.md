# Changelog

## [Unreleased]

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
