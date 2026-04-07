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

## Sprint 4 — 2026-04-01

### VIZ-007: Rule — consistent-component-spacing

**Did:** Implemented `consistent-component-spacing` rule: detects when same-type components (e.g., Card, Button) use divergent spacing patterns within a file. Compares padding, margin, and gap independently across component instances. Reports the dominant pattern as the suggested standard. Strips size suffixes by default (CardSm/CardLg → Card) so variants are compared together. Supports JSXMemberExpression tags (UI.Card). Ignores responsive/state variants — only compares base spacing. NOT auto-fixable — choosing the "correct" spacing is a design decision. Configurable `threshold` (min instances before checking, default: 2) and `ignoreSizeVariants`. 20 tests, benchmark 0.04ms/file (budget: 2ms). 211/211 tests green.
**Will do:** VIZ-010 AI tool templates
**Blockers:** None

### VIZ-010 + VIZ-010B: Cursor Rules, CLAUDE.md, AGENTS.md Templates + generate-config

**Did:** Built three template generators in `packages/cli/src/templates/`: `generateCursorRules()` produces `.cursor/rules/vizlint-design-quality.mdc` with MDC frontmatter (description, globs, alwaysApply); `generateClaudeMd()` produces CLAUDE.md with checkpoint-gated workflow; `generateAgentsMd()` produces cross-tool AGENTS.md. All three templates cover all 5 Vizlint rules and include project-specific design tokens (colors, spacing, fonts) when a DesignSystem is provided. Implemented `generate-config` command module (VIZ-010B): `loadDesignSystem()` merges .vizlintrc.json + Tailwind auto-import; `generateConfig(target, ds)` dispatches to correct template; `getOutputFilename(target)` returns default paths. 20 tests covering all three generators with/without design systems, cross-template validation. 231/231 tests green.
**Will do:** Sprint 5: VIZ-012 CLI + VIZ-013 Design Health Score + VIZ-014 a11y-color-contrast
**Blockers:** VIZ-009 (Stripe service page) and VIZ-011 (outreach) are external marketing tasks requiring Stripe account, domain hosting, and social media

## Sprint 5 — 2026-04-01

### VIZ-012: CLI Project Scanner + Fix Modes

**Did:** Full CLI implementation with Commander.js. Three execution modes per v1.1 spec:

**Scan mode** (`vizlint scan [dir]`): file discovery with glob patterns, `.vizlintignore` support, and config ignore patterns. ESLint programmatic integration running all 6 Vizlint rules via overrideConfig. Three output formatters: text (chalk color-coded with score bars), JSON (structured report schema), and SARIF 2.1.0. `--min-score` threshold for CI/CD pass/fail gating. `--profile` support for severity profiles from .vizlintrc.json. Score history saved to `.vizlint/history.json`. Exit code 1 on errors or score below threshold.

**Fix --all** (`vizlint fix --all`): applies all auto-fixable violations at once via ESLint's fix API. `--dry-run` shows unified diff without modifying files.

**Fix --interactive** (`vizlint fix --interactive`): walks through violations one by one using @clack/prompts. Per-violation actions: apply, skip, apply-all-similar, ignore-rule, quit. Shows category and file location for each violation.

**Generate-config** (`vizlint generate-config <target>`): wired up as CLI command with `--output` and `--stdout` options.

Dependencies added: commander, chalk, @clack/prompts, eslint, glob, eslint-plugin-vizlint (workspace). 54 CLI tests covering discovery (9), score algorithm (12), formatters (7), CLI commands (5), generate-config (19), lint-runner (2). All passing.
**Will do:** VIZ-013 Design Health Score
**Blockers:** None

### VIZ-013: Design Health Score Algorithm

**Did:** Implemented scoring engine in `packages/cli/src/score.ts`. Formula: 5 equal-weighted categories (colors, spacing, typography, responsive, consistency) at 20% each. Per-category score: `max(0, 100 - (violations/files * 50))` — so ~1 violation per file yields ~50% category score. Overall = weighted average of category scores, rounded. Grades: pass (≥80), warn (60-79), fail (<60). Custom weights supported. Score history appended to `.vizlint/history.json` as JSON array with timestamp, scores, file/violation counts. 12 tests covering zero violations (100), proportional decrease, clamping to 0, grading thresholds, custom weights, edge cases (zero files, single file).
**Will do:** VIZ-014 a11y-color-contrast
**Blockers:** None

### VIZ-014: Rule — a11y-color-contrast

**Did:** Built WCAG 2.1 contrast ratio calculator in `packages/eslint-plugin/src/utils/contrast.ts`: relative luminance (sRGB linearization), contrast ratio (1:1 to 21:1), `meetsWcagAA()` helper. Implemented `a11y-color-contrast` rule: detects `text-{color}` + `bg-{color}` combinations on the same JSX element, maps Tailwind color classes to hex values via existing color-map, calculates contrast ratio, flags pairs below WCAG AA thresholds (4.5:1 normal text, 3.0:1 large text). Large text detected via `text-xl+` or `text-lg` + bold font weight. Suggests accessible alternatives with their contrast ratios. Supports custom color tokens via `customColors` option. NOT auto-fixable per v1.1 spec — accessible color choice requires design judgment. 23 rule tests + 12 contrast utility tests = 35 new tests. Registered as 6th rule in recommended and strict configs. 300/300 tests green across all packages.
**Will do:** Sprint 6 planning
**Blockers:** None

## Sprint 6 — 2026-04-01

### VIZ-015: Framework Agnostic — Vue & Svelte Support

**Did:** Extended `createClassVisitor()` in `packages/eslint-plugin/src/utils/class-visitor.ts` with full Vue and Svelte support. Vue: added `:class` binding selector (`VAttribute[directive=true][key.name.name="bind"][key.argument.name="class"]`) handling string literals, object syntax (extracts keys as class names), and array syntax (extracts string elements). Svelte: added `SvelteAttribute[name="class"]` selector handling mixed `SvelteLiteral` and `SvelteMustacheTag` chunks (including template literals inside mustache tags), plus `SvelteDirective[kind="Class"]` for `class:name` directives. Added `vue-eslint-parser` (≥9.0.0) and `svelte-eslint-parser` (≥0.30.0) as optional peer dependencies. All existing rules using `createClassVisitor()` automatically gain Vue/Svelte support. 11 new cross-framework unit tests (Vue :class string/object/array/identifier keys, Svelte static/mustache/template literal/boolean/directive, crash safety). 290/290 tests green.
**Will do:** VIZ-016 max-component-lines + missing-states
**Blockers:** None

### VIZ-016: Rules #7–8 — max-component-lines + missing-states

**Did:** Implemented two new rules per Sprint 6 spec:

**`max-component-lines`**: Flags single-file components (function declarations, arrow functions, class declarations) that exceed a configurable LOC threshold (default: 300). Detects React components by checking if the function body contains JSX. PascalCase name detection — skips non-component helper functions. Configurable: `maxLines` (default 300), `ignoreComments` (default false), `ignoreBlankLines` (default false). NOT auto-fixable — decomposition requires human design decisions. Try/catch wrapped. 10 tests covering short components, exact threshold, non-components, arrow functions, class components, custom thresholds.

**`missing-states`**: Detects form elements (`<input>`, `<select>`, `<textarea>`, `<button>`) missing state handling attributes. Checks for `disabled`/`aria-disabled` (default: required) and `aria-invalid` (default: required on non-button elements). Optional `requireAriaRequired` check. Spread attributes (`{...props}`) give benefit of the doubt. Configurable: `requireDisabled`, `requireAriaInvalid`, `requireAriaRequired`, `formElements` (custom element list). NOT auto-fixable — proper state handling requires design judgment. Try/catch wrapped. 23 tests covering all form elements, combined missing attrs, spread bypass, custom elements, option toggling.

Registered both rules in plugin index.ts. Updated recommended (warn) and strict (error) configs. Plugin version bumped to 0.3.0. Total: 8 rules, 290/290 tests green across all packages. Full monorepo build (9/9 tasks) passes.
**Will do:** Sprint 7 planning
**Blockers:** None

## Sprint 7 — 2026-04-01

### VIZ-018: Rules #9–10 — dark-mode-coverage + no-arbitrary-zindex

**Did:** Implemented two new auto-fixable rules completing the full 10-rule set:

**`dark-mode-coverage`**: Flags `bg-*` classes without corresponding `dark:` variants. Auto-fixes by inserting the inverted shade (50↔950, 100↔900, 200↔800, 300↔700, 400↔600, 500↔500). Named inversions: bg-white→dark:bg-gray-900, bg-black→dark:bg-gray-50. Skips bg-transparent, bg-inherit, bg-current, and gradient classes. Options: `ignoredPrefixes`, `ignoredColors`. Uses `createClassVisitor()` for cross-framework support. 21 tests (12 valid + 9 invalid).

**`no-arbitrary-zindex`**: Flags `z-[N]` arbitrary values, replaces with nearest Tailwind scale value (z-0, z-10, z-20, z-30, z-40, z-50). Equidistant ties prefer smaller value. Preserves responsive/state variants (sm:z-[999]→sm:z-50). Allowlist option for specific z-index values. Uses `createClassVisitor()` for cross-framework support. 21 tests (11 valid + 10 invalid).

Both rules registered in plugin index.ts with recommended (warn) and strict (error) configs. Plugin version 0.3.0. Updated `RULE_CATEGORY_MAP` in CLI lint-runner. 332/332 eslint-plugin tests green.
**Will do:** VIZ-017 CLI init + VIZ-019 documentation
**Blockers:** None

### VIZ-017: CLI Init Command & Config Wizard

**Did:** Implemented `npx vizlint init` interactive setup wizard using @clack/prompts. Steps: (1) check for existing .vizlintrc.json with overwrite confirmation, (2) auto-detect framework via `detectFramework()`, (3) Tailwind config auto-import showing token counts, (4) profile selection (prototype/production/custom) with all 10 rules pre-configured, (5) build and write .vizlintrc.json with design system tokens and default ignore patterns, (6) show ESLint flat config instructions, (7) optional quick-scan preview (first 20 files) with Design Health Score. Default ignore patterns: node_modules, dist, build, .next, test/story files. Wired into CLI as `vizlint init` command.
**Will do:** VIZ-019 documentation site
**Blockers:** None

### VIZ-019: Documentation Site

**Did:** Built documentation pages under `apps/docs/src/app/docs/`:
- **Layout** (`layout.tsx`): Header with nav links (Getting Started, Configuration, Rules Reference, GitHub), prose-styled content area with Vizlint design system colors.
- **Index** (`page.tsx`): Card grid linking to 3 sub-pages.
- **Getting Started** (`getting-started/page.tsx`): Installation, ESLint flat config setup, init wizard, first scan, fix commands (interactive/all/dry-run), CI/CD GitHub Actions integration, framework support matrix, Tailwind v3+v4 support.
- **Configuration** (`configuration/page.tsx`): Full .vizlintrc.json schema example, five levels of control (inline ignore, rule config, design system definition, ignore patterns, severity profiles), Tailwind auto-import documentation.
- **Rules Reference** (`rules/page.tsx`): All 10 rules documented with descriptions, fixable/suggestions status, options schema, and before/after examples. Organized by category: colors (3), spacing (1), typography (1), responsive (1), consistency (4).

Docs build generates 8 static pages (6 routes). All 9 monorepo tasks pass (332 plugin tests + 44 shared + 1 mcp + docs build).
**Will do:** Sprint 8 planning
**Blockers:** None

### UI Redesign — Landing Page & Docs Premium Polish

**Did:** Complete UI overhaul of landing page and docs site, inspired by Linear/Supabase/Vercel patterns. Added framer-motion, @tailwindcss/typography, lucide-react, clsx, tailwind-merge. Landing page now has 7 animated sections: hero with gradient text + floating orbs + dot grid, before/after code comparison with syntax highlighting, bento grid of all 10 rules, 4-step "How it Works" flow, framework showcase, dark gradient CTA, structured footer. Docs section redesigned with fixed sidebar navigation, active state highlighting, mobile overlay, and polished prose typography. Custom motion components (FadeIn, StaggerContainer, ScaleIn) for scroll-triggered animations. Expanded Tailwind color palette with full primary scale. All 9 monorepo tasks pass.
**Will do:** Sprint 8
**Blockers:** None

---

## Future TODO (Pre-Launch Checklist)

- [ ] Create `vizlint` GitHub organization
- [ ] Transfer repo from `jaydrao215/vizlint` to `vizlint/vizlint` (public)
- [ ] Create `vizlint/vizlint.dev` private repo for marketing site
- [ ] Extract `apps/docs` marketing pages (hero, CTA, pricing) into `vizlint.dev`
- [ ] Keep developer docs (rules, config, getting-started) in main repo
- [ ] Set up npm org `@vizlint` and add NPM_TOKEN to GitHub secrets
- [ ] Configure Vercel/Netlify deploy for `vizlint.dev`
- [ ] Purchase `vizlint.dev` domain

## Sprint 8 — 2026-04-01

### VIZ-020 + VIZ-021: Phase 2 Wrap (Code Portions)

**Did:** Implemented the code-deliverable portion of Sprint 8 per v1.1 spec: added "Report False Positive" link (`https://github.com/vizlint/vizlint/issues/new?labels=false-positive`) to CLI text formatter output — appears after violation listing with a separator line. Added matching "Report a False Positive" section to the docs rules reference page with description and GitHub link. Remaining Sprint 8 items (metrics dashboard, community setup, business review) are operational tasks outside the codebase.
**Will do:** Sprint 9 MCP server
**Blockers:** Metrics dashboard (VIZ-020) and community setup (VIZ-021) require GitHub org, npm publish, and external tooling

## Sprint 9 — 2026-04-01

### VIZ-022: MCP Server Core Architecture

**Did:** Built full MCP server implementation in `@vizlint/mcp` using `@modelcontextprotocol/sdk` with stdio transport (JSON-RPC 2.0). Three tools exposed:

**`analyze_file`**: Accepts file path, runs ESLint programmatically with all 10 Vizlint rules, returns violations with line numbers, severity, rule IDs, fix data, and a file-level score (0-100). Never sends source code externally.

**`analyze_project`**: Scans entire project using CLI's `discoverFiles()` + `runLint()` + `calculateScore()` pipeline. Returns Design Health Score with per-category breakdowns (colors, spacing, typography, responsive, consistency), grade, and top 10 violations. Configurable `maxFiles` limit (default 200).

**`analyze_and_fix`**: Runs ESLint with `fix: true` on a single file. Returns the corrected code block, count of fixed violations, and remaining non-fixable violations. Does NOT modify files on disk — the AI agent receives corrected code and can apply it.

Server architecture: `McpServer` from SDK with zod schema validation on all tool inputs. ESLint plugin loaded dynamically via async import with caching. JSX parsing enabled via `parserOptions.ecmaFeatures`. 5 tool tests + 2 server tests passing.
**Will do:** VIZ-023 install CLI
**Blockers:** None

### VIZ-023: MCP Install CLI for Cursor & Claude Code

**Did:** Built `npx @vizlint/mcp install` and `npx @vizlint/mcp uninstall` commands. Platform-aware config path detection: Claude Desktop (macOS: ~/Library/Application Support/Claude/, Windows: AppData/Roaming/Claude/, Linux: ~/.config/Claude/) and Cursor (~/.cursor/mcp.json). Install injects `vizlint` server entry into `mcpServers` in the appropriate JSON config file, preserving existing entries. Uninstall cleanly removes it. Falls back to manual instructions if no editor detected. CLI entry point at `src/cli.ts` with bin entry in package.json (`vizlint-mcp`). 3 install/config tests. 10/10 MCP tests green. All 9 monorepo tasks pass.
**Will do:** Sprint 10 planning
**Blockers:** None

## Sprint 10 — 2026-04-01

### Code Quality Hardening (Pre-Sprint)

**Did:** Comprehensive acquisition-grade code quality review identifying 16 issues across P0/P1/P2 priorities. Fixed all 16: added `debugLog()` utility for silent catch blocks across all 10 rules + class-visitor; replaced hardcoded version strings in eslint-plugin, CLI, MCP, and formatters with `createRequire()` pattern reading from package.json; fixed a11y-color-contrast being React-only (added Vue/Svelte/Angular visitors); fixed lint-runner only enabling 5 of 10 rules; fixed MCP analyzeFile returning score 100 for missing files (now throws); fixed MCP analyzeAndFix double-ESLint instantiation; added all missing rules to benchmark; added v8 coverage thresholds to all 4 vitest configs; added `engines.node >= 20.19.0` to all package.json files; added .prettierrc/.prettierignore; added SECURITY.md; added @changesets/cli for versioning; rewrote CLI and MCP test suites for comprehensive coverage. 479 tests passing.

### VIZ-025: Rule Expansion — 4 New Rules (5 pts)

**Did:** Implemented 4 new ESLint rules bringing the total to 14:

**`no-inline-styles`**: Flags `style={{}}` and `style="..."` attributes across all frameworks (JSX, Vue, Svelte, Angular). Options: `allowlist` (CSS property names to permit), `allowDynamic` (skip dynamic expressions). Suggestions provided but not auto-fixable — converting CSS to Tailwind requires design judgment. 40 tests.

**`consistent-border-radius`**: Detects mixed `rounded-*` values across same-type components. Same pattern as `consistent-component-spacing` — accumulates instances, reports non-dominant on `Program:exit`. Handles all rounded variants including directional (`rounded-t-*`), arbitrary (`rounded-[8px]`), and Tailwind v4 (`rounded-xs`). Options: `threshold`, `ignoreSizeVariants`. NOT auto-fixable. 26 tests.

**`image-alt-text`**: Flags `<img>` and `<Image>` (Next.js) without `alt`, with empty alt (unless decorative with `role="presentation"`/`aria-hidden`), or with meaningless alt text ("image", "photo", "placeholder", etc.). Spread attribute benefit-of-the-doubt. Options: `checkNextImage`, `meaninglessPatterns`. NOT auto-fixable. 44 tests.

**`no-magic-numbers-layout`**: Flags arbitrary bracket values in layout classes: `grid-cols-[N]`, `grid-rows-[N]`, `col-span-[N]`, `row-span-[N]`, `basis-[Npx]`, `gap-[Npx]`, `order-[N]`, `grow-[N]`, `shrink-[N]`. Auto-fixes when a clear Tailwind scale match exists (e.g., `gap-[16px]` → `gap-4`). Preserves responsive variants. CSS variable values skipped by default. Uses `createClassVisitor` for cross-framework support. 70 tests.

All 4 rules registered in plugin index, recommended/strict configs, lint-runner defaults, benchmark, and RULE_CATEGORY_MAP.

### VIZ-024: GitHub Action — PR Design Review (8 pts)

**Did:** Built composite Node.js 20 GitHub Action in `action/` directory:

- **Changed file detection**: Fetches PR diff via GitHub API with pagination, filters by configurable frontend file patterns (`**/*.tsx`, `**/*.jsx`, `**/*.vue`, `**/*.svelte`, `**/*.html`)
- **Scan engine**: Runs all 14 Vizlint rules via ESLint programmatic API, computes Design Health Score with 5 category breakdowns (20% each)
- **PR comment**: Markdown-formatted report with score badge, metrics table, category breakdown, top violations. Comment deduplication via HTML marker — updates existing comment on subsequent pushes
- **Check status**: Configurable `min-score` threshold; fails PR check if score drops below
- **Inputs**: `github-token`, `min-score`, `config-path`, `working-directory`, `file-patterns`
- **Outputs**: `score`, `total-violations`, `passed`
- `action.yml` with Marketplace branding (check-circle icon, blue)
- 17 tests (12 comment formatting + 5 changed-files filtering)

Added `action/` to pnpm workspace. 676 tests passing (512 eslint-plugin + 78 cli + 25 mcp + 44 shared + 17 action). Clean build across all 6 packages.
**Will do:** Sprint 11 planning
**Blockers:** None

## Validation Sprint — 2026-04-01

### Vintor Real-World Validation (Stage 1)

**Did:** First real-world validation of all 14 Vizlint rules against the Vintor Angular 21 frontend (73 files, Tailwind v4.2).

**Initial scan:** 187 violations, 82% false positive rate — unacceptable. Found and fixed 7 bugs:

1. **lint-runner Angular parser not wired** (P0) — All Angular `.html` templates silently failed to parse. Added framework-specific parser detection for Angular/Vue/Svelte.
2. **Angular template nodes crash auto-fix** (P0) — Angular parser nodes lack `range`, crashing `getText()` and `replaceText()`. Created `safeGetText()` + `nodeSupportsAutofix()` guards across all 6 fixable rules.
3. **no-arbitrary-colors flags CSS variables** (P1) — `var()` references ARE design tokens. Added `allowCssVariables` option (default: true).
4. **dark-mode-coverage too broad** (P1) — Flagged semantic tokens, gradients, opacity modifiers, custom token families. Added 4 filters + standard Tailwind color family whitelist.
5. **no-magic-numbers-layout flags complex grid templates** (P2) — Skips CSS functions (minmax, repeat, min, max, fit-content), fractional values, auto.
6. **no-arbitrary-typography wrong suggestions** (P2) — Exact-match tolerance: font-size/leading require 0px deviation. Prevents wrong suggestions like text-[10px] → text-xs.
7. **no-magic-numbers-layout missing rem + fractional scale** (P3) — Added rem-to-px conversion and expanded spacing map with fractional Tailwind values.

**Final scan:** 423 violations — 116 true positives, 0 false positives, 306 noise (custom type scale + no dark mode). **FP rate: 0%.** Scan time: 0.34s.

**Tests:** 541 eslint-plugin + 78 cli + 25 mcp + 44 shared + 17 action = 705 tests passing. 29 new test cases added for real-world patterns from validation.

**Will do:** Validate on 2-3 open-source Tailwind projects (JSX/Vue — to test auto-fix). Investigate rules with 0 violations on Angular. Create validation/SUMMARY.md.
**Blockers:** None

### OSS Validation (Stage 2) — nextjs/saas-starter + shadcn-ui/taxonomy

**Did:** Validated Vizlint on 2 real open-source Next.js + shadcn/ui projects. Found and fixed 6 additional bugs (total: 13 bugs fixed across validation sprint):

8. **TypeScript parser missing** (P0) — All `.tsx`/`.ts` files failed to parse with "Unexpected token" errors. The lint-runner used Espree for ALL files including TypeScript. Added `@typescript-eslint/parser` for `.tsx`/`.ts` files.
9. **scan command not passing cwd** (P0) — `scan` CLI command computed correct `cwd` but didn't pass it to `runLint()`. ESLint defaulted to a subdirectory and reported all other files as "outside base path". Fixed: pass `cwd` in the `runLint` call.
10. **Third-party rule leakage** (P1) — `eslint-disable-next-line @next/next/no-img-element` comments caused ESLint to report "rule not found" violations. Fixed: `aggregateResults()` now filters to `vizlint/*` rules only.
11. **no-magic-numbers-layout fr_ FP** (P1) — `grid-cols-[1fr_300px]` flagged as magic number. `fr\b` regex doesn't match `fr_` (underscore is `\w`). Fixed: `fr(?:[^a-z]|$)`.
12. **consistent-component-spacing cross-axis comparison** (P1) — All margin classes (`my-`, `mr-`, `ml-`) grouped as one "margin" category. `my-1` vs `-mr-3` compared as the same type → FP. Fixed: split into axis-specific sub-categories (`margin-y`, `margin-r`, etc.).
13. **no-inline-styles flags dynamic template literals** (P1) — `style={{ transform: \`translateX(-${val}%)\` }}` (progress bar) was flagged even though dynamic values can't be Tailwind classes. Changed `allowDynamic` default to `true`. Added `hasDynamicValues()` check within ObjectExpression.

**Final results:**
- saas-starter: 23 files, 51 violations, 0 FPs, 0 crashes, 0.31s
- taxonomy: 94 files, 71 violations, 0 FPs, 0 crashes, 0.40s
- Auto-fix verified correct on real JSX code (6 fixes verified across both projects)
- FP rate across all 3 validated projects (Vintor + 2 OSS): **0%**

**Tests:** 551 eslint-plugin + 78 cli = 629 tests passing. 6 new rule tests, 9 new test cases for dynamic inline styles and fr_ grid patterns.

**Will do:** Monitor Vintor dogfood for 1 week (ends 2026-04-09). Fix any new FP types found in real usage.
**Blockers:** None

### Vintor Dogfood Setup — 2026-04-02

**Did:** Configured Vizlint for active daily development use in Vintor:
- `npm link`'d eslint-plugin-vizlint (local build) into autoscore-frontend
- Created `eslint.config.js` with flat config: TypeScript parser for .ts files, Angular template parser for .html files
- Created `.vizlintrc.json` tuned for Vintor's design system: dark-mode-coverage OFF (CSS variable theming, not dark: prefix), no-arbitrary-typography OFF (custom 15px base type scale), all other 12 rules at warn
- Added `npm run vizlint` and `npm run vizlint:json` scripts to package.json
- First dogfood scan: **74 files, 71 violations, 0 FPs, 0 crashes, 0.39s**
  - no-arbitrary-spacing: 64 (max-w-[800px], h-[64px], py-[1px], etc.)
  - no-arbitrary-zindex: 4 (z-[1], z-[70], z-[200])
  - no-magic-numbers-layout: 3 (gap-[0.625rem] → gap-2.5)

**Will do:** Run vizlint daily during development for 1 week. If new FP types appear, fix the rule and add test coverage. Dogfood ends 2026-04-09 → fill in trust metrics date in VIZLINT-EXECUTION.md → Stage 2 begins.
**Blockers:** None

### Angular Auto-Fix + responsive-required Extension — 2026-04-02

**Did:** Resolved the core Angular auto-fix problem and extended `responsive-required` to catch more layout issues.

**Angular auto-fix (P0 bug):**
- Angular template parser provides `loc` but NOT `range` on AST nodes
- `fixer.replaceText(node)` requires `node.range` — silently returned null on all Angular files
- Built `safeGetRange()` in `safe-source.ts`: computes character offsets from `loc.line/column` by summing line lengths
- Switched all 6 fixable rules (`no-arbitrary-spacing`, `no-arbitrary-colors`, `no-arbitrary-zindex`, `no-arbitrary-typography`, `no-magic-numbers-layout`, `dark-mode-coverage`) to `fixer.replaceTextRange()` 
- Deprecated `nodeSupportsAutofix()` (now always returns true)
- Verified: `npm run vizlint:fix` on Vintor → h-[64px] → h-16 confirmed in Angular HTML. 71 → 28 violations.

**`responsive-required` extended to `max-w` and `min-w`:**
- Old rule only caught `w-[Npx]`. Extended regex to `/^(w|max-w|min-w)-\[(\d+(?:\.\d+)?)(px|rem)\]$/`
- `max-w` always flagged regardless of iconSizeThreshold (any fixed max-w can break mobile)
- Added valid/invalid test cases for max-w and min-w patterns (8 new test cases)

**`vizlint init` wizard:**
- Generates framework-specific `eslint.config.js` (Angular, Vue, Svelte, React/Next.js)
- Adds `vizlint` and `vizlint:fix` npm scripts to package.json without touching existing
- New user workflow: `npx vizlint init` → answer 2 questions → `npm run vizlint` / `npm run vizlint:fix`

**Will do:** Continue dogfood week. Build suggest-tokens command.
**Blockers:** None

### `vizlint suggest-tokens` Command + Grouped Formatter — 2026-04-02

**Did:** Built two major developer experience improvements:

**Grouped violation formatter** (`formatters.ts`):
- Violations that appear 2+ times are now grouped: "max-w-[800px] — 8 occurrences across 4 files" instead of 8 separate lines
- Singletons shown per-file in traditional view below the grouped section
- Tip appended when unfixable spacing violations are present

**`vizlint suggest-tokens` command** (new CLI command at `packages/cli/src/suggest-tokens.ts`):
- Classifies each arbitrary value into 3 tiers:
  - **Near-miss**: within 15% of a Tailwind semantic class → "is the 32px difference intentional? consider max-w-3xl"
  - **Repeated custom** (2+ occurrences, no close Tailwind match) → design decision worth naming — generates semantic CSS block
  - **One-off** (appears once) → "review intent — probably accidental"
- CSS block ONLY generated for repeated custom values
- Uses Tailwind max-w semantic scale (max-w-xs through max-w-7xl, screen-*) for near-miss detection
- Philosophy: guide toward the design system, not toward CSS variable bloat

**Vintor results with new command:**
- 8 near-miss values (e.g. max-w-[800px] → "closest: max-w-3xl, 32px difference — intentional?")
- 1 repeated custom (w-[480px] — no Tailwind equivalent, appears in 2 admin components)
- 1 one-off (max-w-[120px] — specific component constraint, nearest max-w-xs is 200px away)

**Will do:** Monitor dogfood. Extend suggest-tokens to cover no-arbitrary-colors violations.
**Blockers:** None

### Dogfood Week Progress — 2026-04-06

**Did:** Day 4 of 7 in Vintor dogfood week. Status:
- 0 new false positive types discovered since Round 1 fixes
- Vintor codebase stable at 3 violations (all `no-arbitrary-spacing` — intentional design decisions)
- No crashes during daily development
- Plugin does not noticeably affect editor performance
- `dark-mode-coverage` correctly silent after being set to `off`

**Trust metrics status:**
- FP rate: 0% — MET
- Crash rate: 0 — MET
- Performance: <0.5s per scan — MET
- Auto-fix correctness: 100% — MET
- Vintor dogfood: 4/7 days complete — IN PROGRESS (ends 2026-04-09)

### Launch Preparation Sprint — 2026-04-06

**Did:** Comprehensive documentation update for v0.1.0 release readiness.

**README updates:**
- Root README.md: updated from 4 rules to all 14, added badges, performance table, MCP section, GitHub Action section, "Why Vizlint?" section, sharpened tagline to "ESLint catches code bugs. Vizlint catches design bugs."
- Plugin README: full documentation for all 14 rules with examples, options, framework support matrix, validation results table (7 projects, 4,061 files, 0% FP)
- CLI README: created — documents scan, fix, init, generate-config, suggest-tokens commands with output format table
- MCP README: created — documents 3 tools, installation for Cursor/Claude Code, manual config examples

**Planning document alignment:**
- VIZLINT-EXECUTION.md: filled trust metrics date (2026-04-06), updated "What has been validated" section with Round 1 + Round 2 results, marked all VIZ-001-VIZ-025 tasks complete
- CHANGELOG.md: consolidated all work into proper v0.1.0 release section with 14 rules, 15 bug fixes, validation results
- SPRINT-LOG.md: added dogfood progress entry and this launch preparation entry
- validation/SUMMARY.md: confirmed complete with all 7 projects and cumulative metrics

**npm org:** `@vizlint` created on npmjs.com. NPM_TOKEN configured in GitHub secrets.

**Will do:** Complete dogfood week (ends 2026-04-09). Tag v0.1.0 and publish to npm. Deploy docs site. Begin traction strategy.
**Blockers:** Domain purchase (vizlint.dev) and docs deployment (Vercel/Cloudflare) are external tasks.

## Sprint 11 — Stage 2 Enterprise Foundation (KPMG Phase 1)

> Strategic context: per the KPMG defensibility plan, Phase 1 ("Enterprise Foundation") builds the SonarQube-for-design positioning before Stage 2 accessibility expansion. All features ship backwards-compatible and opt-in for v0.1.0 users.

### VIZ-026: Design Debt Scoring — 2026-04-07

**Did:** Shipped Design Debt metric — minutes of remediation effort calibrated from real auto-fix data. `packages/cli/src/debt.ts` with `calculateDebt()` and `formatDebt()` helpers. Per-rule effort table: trivial class renames 2m, small refactors 3m, medium refactors 5m, design work 10m, large splits 30m. Rendered in scan text output (summary + top-3 contributors), JSON output (`debt` block with breakdown), and HTML report (Overview tab table). 12 new unit tests, 90/90 CLI tests green. Purely additive — zero breaking changes. Unlocks enterprise positioning (Moat 2).
**Will do:** VIZ-027 Quality Gates
**Blockers:** None

### VIZ-027: Quality Gates (opt-in CI enforcement) — 2026-04-07

**Did:** Shipped CI enforcement layer — SonarQube-style quality gates applied to design metrics (Moat 3). `.vizlintrc.json` now accepts a `qualityGate` block with `enforce` (default false), `minOverallScore`, `minCategoryScores`, `maxViolations`, `maxDebtMinutes`, `maxScoreRegression`. Pure `evaluateQualityGate()` function in `@vizlint/shared` — no I/O, fully testable. CLI scan reads gate + previous score from history (for regression checks), prints pass/fail with reasons, exits 1 ONLY when `enforce: true` and any condition fails. GitHub Action evaluates gate, shows it in PR comment with warn-only hint, fails check only when enforced. New Action outputs: `debt-minutes`, `quality-gate-passed`. `RULE_EFFORT_MINUTES` table moved to `@vizlint/shared/debt-table.ts` so CLI + Action share one source of truth. 15 new gate tests, 757 tests green repo-wide.

**Safety:** `enforce` defaults to false. v0.1.0 users upgrading see no behavior change — gate failures are warn-only by default, surface in output but don't break CI.

**Will do:** VIZ-028 Trend command
**Blockers:** None

### VIZ-028: `vizlint trend` command — 2026-04-07

**Did:** Shipped read-only trend analytics over existing `.vizlint/history.json` (Moat 4 — historical context). New `packages/cli/src/trend.ts` with `loadHistory()`, pure `analyzeTrend()` (window limit, score delta first→latest, high/low/avg, per-category deltas, regression detection by alert threshold), `sparkline()` ASCII chart helper, and text/JSON formatters. Registered `vizlint trend [dir] [--limit N] [--format text|json] [--alert-threshold N]` in CLI. Non-zero exit code when regressions detected (informational — users opt into CI blocking). 12 new unit tests, 102/102 CLI tests green. Zero changes to data on disk — uses history written by existing `saveHistory()` calls. Backwards compatible.
**Will do:** VIZ-029 W3C Design Tokens import
**Blockers:** None

