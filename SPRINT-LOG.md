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

## Sprint 2 — 2026-04-01

### VIZ-003: no-arbitrary-spacing

**Did:** Built spacing scale map (Tailwind default 0→96 scale with px/rem/em conversion). Implemented no-arbitrary-spacing rule with auto-fix: detects p-[13px], m-[7px], gap-[20px], w-[200px] etc. and replaces with nearest scale value. Equidistant values prefer smaller entry. All directional variants (p/m/gap/space/inset/position/sizing — 30+ prefix patterns). Responsive variant preservation. cn()/clsx() wrapper + template literal detection. Allowlist option. Registered in plugin configs (recommended: warn, strict: error). 68 tests, 157/157 green across monorepo.
**Will do:** VIZ-002B Angular template parsing
**Blockers:** None

### VIZ-002B: Angular Template Parsing

**Did:** Created shared createClassVisitor() factory that handles all frameworks: React JSX (className/class), Vue/Svelte/HTML (VAttribute), and Angular (TextAttribute for static class, BoundAttribute for [ngClass] object syntax and [class] bindings). Refactored both rules to use shared visitor — eliminated duplicated AST traversal code. Added @angular-eslint/template-parser as optional peer dependency. 9 cross-framework visitor unit tests covering all selector types, Angular ngClass key extraction, crash safety on unexpected nodes. 166/166 tests green.
**Will do:** VIZ-005
**Blockers:** None

### Gap Audit Fix — Cross-Sprint

**Did:** Full audit against base .docx + v1.1 + v1.2 revealed 13 gaps. Fixed all critical ones: added @vizlint/cli and @vizlint/mcp package scaffolds (VIZ-001 base requirement). Added .nvmrc, LICENSE (MIT), CONTRIBUTING.md, CHANGELOG.md (VIZ-001 base + DoD). Added CSS custom property detection `bg-[var(--random)]` for Buoy competitive parity (VIZ-002 v1.1 requirement). Added customScale option to no-arbitrary-spacing (VIZ-003 base requirement). Added detectFramework() utility with 8 tests — detects Angular/React/Vue/Svelte from package.json (VIZ-002B v1.1 requirement). Added eslint.config.js for self-dogfooding + lint step in CI (DoD requirement). Added rule benchmark script with 2ms budget in CI (v1.1 DoD requirement). Converted .docx to .txt for future reference. 176/176 tests green across 4 packages.
**Will do:** Sprint 3: VIZ-004, VIZ-006, VIZ-008
**Blockers:** None

### VIZ-005: Landing Page v1

**Did:** Scaffolded `apps/docs` as a Next.js 15 static export landing page with full Tailwind CSS and the Vizlint design system (Inter/JetBrains Mono, #1A5276 primary, pass/fail/warn accents). Built all acceptance-criteria sections: Hero with `npx vizlint` install command; Before/After code comparison showing real rule detections with 6 violations and auto-fix output; 3 Feature Blocks (Spacing · Typography · Colors) with examples; CTA section with npm install command; Footer with GitHub, Twitter/X links and MIT badge. Mobile-responsive via Tailwind breakpoints. Static export (`output: 'export'`) for CDN/Framer custom domain hosting. Fixed turbo.json outputs to include `.next/**` and `out/**`. Typecheck clean. 176/176 tests green.
**Will do:** VIZ-006 responsive-required rule
**Blockers:** Domain purchase (vizlint.dev) and Framer/CDN hosting setup are external tasks

## Sprint 3 — 2026-04-01

### VIZ-004: Rule — no-arbitrary-typography

**Did:** Built typography scale utility (`typography-map.ts`) covering font-size (xs→9xl, 13 entries), font-weight (thin→black, 9 entries), line-height px scale (leading-3→10, 8 entries), and letter-spacing (tighter→widest, 6 entries) with `toPxTypo()`, `toMilliEm()`, and `findNearest*()` helpers. Implemented `no-arbitrary-typography` rule: detects `text-[Npx]`, `font-[N]`, `leading-[Npx]`, `tracking-[Nem]` arbitrary values; auto-fixes to nearest scale entry (smaller wins on equidistant ties, per v1.1 spec); responsive/state variants preserved; customScale option for all four sub-scales; try/catch wrapped. 36 tests covering all patterns, equidistant tie-breaking, cn() JSX wrappers, custom scale.
**Will do:** VIZ-006 responsive-required
**Blockers:** None

### VIZ-006: Rule — responsive-required

**Did:** Implemented `responsive-required` rule: detects `w-[Npx]` / `w-[Nrem]` fixed-width arbitrary values in JSX elements without the required responsive breakpoint variants (default: sm + md). Ignores values < 64px (icon/avatar threshold, configurable). NOT auto-fixable per v1.1 spec — guidance is included in the error message. Options: `requiredBreakpoints` (default `['sm','md']`), `iconSizeThreshold` (default 64), `ignoredPrefixes`. 25 tests covering all acceptance criteria. Updated benchmark to include all 4 rules — 0.02ms/file (budget: 2ms). 191 tests green.
**Will do:** VIZ-008 npm publish pipeline
**Blockers:** None

### VIZ-008: npm Publish Pipeline

**Did:** Wrote comprehensive README for `eslint-plugin-vizlint` with all 4 rules documented (description, detect patterns, before/after examples, full options reference, framework support matrix). Created `.github/workflows/release.yml`: tag push (`v*.*.*`) → frozen install → build → test → benchmark → publish `eslint-plugin-vizlint` + `@vizlint/shared` to npm → create GitHub Release from CHANGELOG entry. Follows flat-config-only requirement (v1.1: no legacy .eslintrc mention). 191/191 tests green across all packages.
**Will do:** Sprint 4: VIZ-007 consistent-component-spacing
**Blockers:** npm org @vizlint must be created and NPM_TOKEN secret added to GitHub repo before first publish
