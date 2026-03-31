# Sprint Log

## Sprint 1 — 2026-04-01

### VIZ-001: Monorepo & CI/CD Setup + Config Schema

**Did:** Fixed eslint-plugin build errors (exported 3 unused constants), fixed 2 broken test assertions (missing suggestions/output properties), added .gitignore, confirmed pnpm install/build/test all work cleanly. Created @vizlint/shared package with .vizlintrc.json Zod schema covering all 5 user control levels (rules, designSystem, ignore, profiles, $schema). 15 schema validation tests passing. Added GitHub Actions CI workflow (Node 20+22, build/typecheck/test). 28/28 tests green across 2 packages.
**Will do:** VIZ-001B Tailwind config auto-import utility
**Blockers:** None

### VIZ-001B: Tailwind Config Auto-Import Utility

**Did:** Built Tailwind v3 config reader (parses theme.extend for colors, fonts, spacing, borderRadius with nested color flattening). Built Tailwind v4 @theme CSS parser (extracts --color-*, --font-*, --spacing-*, --radius-* tokens). Built CSS :root custom property parser as fallback. Merge logic ensures manual .vizlintrc.json overrides auto-imported tokens. Auto-detection searches standard config file locations (tailwind.config.ts/js/mjs/cjs + common CSS entry points). Exported importTailwindConfig() from @vizlint/shared. 21 new tests against real v3/v4 fixtures. 49/49 tests green across monorepo.
**Will do:** VIZ-002 first rule: no-arbitrary-colors with full v4 support and auto-fix
**Blockers:** None

### VIZ-002: First Rule — no-arbitrary-colors + Tailwind v4 + Auto-Fix

**Did:** Expanded v3→v4 class name mapping to 40+ entries. Expanded Tailwind color palette to all 22 families (slate through rose) with 950 shades. Added rgb/rgba/hsl/hsla arbitrary color detection with auto-fix. Added 8-digit hex (alpha) support. Full coverage of all 11 color utility prefixes (bg, text, border, ring, outline, shadow, fill, stroke, caret, accent, decoration, placeholder, divide). Detects colors in cn()/clsx()/cva()/twMerge() wrappers, template literals, expression containers. Custom token support via customTokens option. Responsive/state variant detection. Auto-fix preserves non-color classes, fix is idempotent. Try/catch wrapped — malformed className never crashes. 53 rule tests + 36 shared tests = 89/89 green.
**Will do:** Sprint 2 planning
**Blockers:** None
