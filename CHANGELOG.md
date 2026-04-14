# Changelog

## [0.3.1] — 2026-04-15

Correctness release. Fixes two bugs in v0.3.0 (and earlier) that produced
misleading results on TypeScript projects. **All users on 0.1.x–0.3.0 should
upgrade.** Older versions have been deprecated on npm.

### Fixed

- **`deslint init` did not configure the TypeScript parser.** Generated flat
  configs omitted `@typescript-eslint/parser`, so `.ts` / `.tsx` files failed
  to parse with "keyword 'interface' is reserved" and similar errors on every
  scan. `init` now injects the parser for TS/TSX overrides and adds
  `@typescript-eslint/parser` as a dependency where appropriate.
  (`packages/cli/src/init.ts`)
- **Design Health Score returned 100/100 when all files failed to parse.**
  The score calculation counted zero violations as "no problems found" even
  when the underlying files produced parse errors and were never analyzed.
  Score now returns an explicit unavailable state when parse failures
  prevent analysis, and the formatter surfaces this instead of rendering a
  misleading perfect score. Regression tests added.
  (`packages/cli/src/lint-runner.ts`, `packages/cli/src/formatters.ts`,
  `packages/cli/tests/score.test.ts`)

### Deprecated

- `@deslint/cli`, `@deslint/eslint-plugin`, `@deslint/mcp`, and
  `@deslint/shared` versions `<0.3.1` are deprecated on npm. Both bugs above
  were present in every prior release, so results from those versions on
  TypeScript projects should not be trusted.

### Validated

- Full workspace test suite green (~1,280+ tests).
- End-to-end scan on a real AI-generated Next.js + TypeScript project
  (`tracklance-freelancer-dashboard`): zero parse errors, 82/100 score,
  121 real design violations surfaced — previously reported as 100/100.

## [0.2.0] — 2026-04-09

The Accessibility Foundation release. Adds framework-agnostic infrastructure,
6 new WCAG-mapped a11y rules, plain HTML parser support, a widened WCAG 2.2 +
2.1 compliance evaluator, and a productionized MCP self-correction loop. Every
shipping rule now works across React, Vue, Svelte, Angular, and plain HTML.

### Added

- **6 new WCAG-mapped accessibility rules in `@deslint/eslint-plugin`:**
  - `heading-hierarchy` — WCAG 1.3.1 + 2.4.6 — flags skipped heading levels
    (`h1 → h3`) across single-page and multi-component hierarchies, with a new
    cross-element `onComplete` hook pattern for collect-then-evaluate analysis.
    Caught 4 real production bugs during dogfood on 3 real OSS projects.
  - `form-labels` — WCAG 1.3.1 + 3.3.2 — matches `<label htmlFor>` to `<input
    id>`, walks wrapping `<label>` ancestors, and treats PascalCase
    `<Input>`/`<TextField>` as opaque design-system components to avoid false
    positives.
  - `lang-attribute` — WCAG 3.1.1 — HTML-only, requires `lang` on root `<html>`.
  - `viewport-meta` — WCAG 1.4.4 (F77) — flags `user-scalable=no` and
    `maximum-scale=1` which block pinch-zoom. Dogfood caught and fixed a P1 bug
    where the CLI rule list was hard-coded and silently skipped this rule.
  - `link-text` — WCAG 2.4.4 (Link Purpose in Context) — flags generic link
    text (`click here`, `read more`, `here`, `more`). `linkComponents` option
    (default `['Link', 'NextLink']`) supports Next.js anchor abstractions.
    Caught 2 real production bugs in `shadcn-ui/taxonomy`.
  - `aria-validation` — WCAG 4.1.2 (Name, Role, Value) — detects invalid roles,
    hallucinated `aria-*` attributes, and common LLM typos like `aria-labelby`,
    `aira-label`, `aria-pressd` with did-you-mean suggestions.
  - **Validation:** 731 file-rule combinations evaluated on 3 real OSS
    projects, 6 real bugs caught, 0 false positives.

- **Framework-agnostic element visitor abstraction:**
  - New `createElementVisitor()` in `packages/eslint-plugin/src/utils/` —
    sibling to the existing `createClassVisitor()` — emits a uniform
    `{ tagName, attributes, node, framework }` callback across React JSX,
    Angular `Element$1`, Vue `VElement`, Svelte `SvelteElement`, and plain
    HTML `Tag`.
  - Helpers: `getAttribute(node, name)`, `getStaticAttributeValue(attr)`,
    `hasSpreadAttribute(node)`, `isDecorative(element)`, plus the new
    cross-element `onComplete` hook for collect-then-evaluate rules.
  - `image-alt-text`, `missing-states`, and `responsive-required` ported from
    hand-rolled `JSXOpeningElement` selectors to the element visitor — now
    work cross-framework with no regression on the existing JSX test suites.

- **Plain HTML parser support:**
  - `@html-eslint/parser` added as an optional peer dep on
    `@deslint/eslint-plugin`. When installed, plain `.html` files route to
    html-eslint; Angular's template parser continues to own `.component.html`.
  - `@deslint/cli` flat config now loads `@html-eslint/parser` dynamically,
    with graceful fallback when the package isn't installed.
  - `createClassVisitor` gained a `Attribute[key.value="class"]` selector for
    html-eslint AST nodes.
  - Unblocks government, legal-tech, and regulated-industry codebases that
    ship plain HTML or server-rendered templates without Angular installed.

- **WCAG 2.2 + 2.1 compliance report widening (`@deslint/cli`):**
  - Evaluator now returns `byLevel` (per-level conformance using the same
    at-or-below logic as `levelReached`) and `wcag21` (an explicit
    `WCAG_21_CRITERIA_IDS` subset evaluated independently, not assumed from
    the 2.2 → 2.1 superset).
  - HTML report grouped into `Level A` and `Level AA` sections with separate
    conformance badges per level. New stat cards show WCAG 2.2 and WCAG 2.1
    AA side by side.
  - **ADA Title II framing** — new `wcag21-note` callout explicitly states
    that WCAG 2.1 AA is the ADA Title II technical standard and maps the
    evaluated subset for audit evidence.
  - All 6 new S4 rules mapped to WCAG criteria. Coverage expanded from 6 to
    13 evaluated criteria.

- **`@deslint/mcp` productionization:**
  - `analyzeFile` and `analyzeAndFix` now delegate to `@deslint/cli`'s
    `runLint` as the single source of truth. Fixes a stale 10-rule registry
    that blocked the S4 rules (and the three ported rules) from firing via
    MCP.
  - New `resolveProjectDir()` helper pivots `cwd` to the file's directory
    when the requested `projectDir` doesn't contain the file — fixes the
    ESLint v10 "File ignored because outside of base path" error for
    out-of-tree files.
  - `analyzeAndFix` now copies the target file to `mkdtempSync` scratch,
    runs `runLint({ fix: true })`, reads the diff, and deletes the scratch
    in `finally`. The workspace file is never touched.
  - New demo client at `packages/mcp/demo/self-correction-loop.mjs` — real
    JSON-RPC client that spawns the MCP server over stdio, walks
    `initialize → tools/list → analyze_file → analyze_and_fix`, and
    pretty-prints every protocol beat.

### Changed

- **Rule count: 14 → 20.** The 6 new a11y rules bring the shipping rule count
  to 20 across all categories. The recommended config enables all of them by
  default; the strict config upgrades 4 of the 6 to `error`.
- **Element visitor ports.** `image-alt-text`, `missing-states`, and
  `responsive-required` now use the element visitor. No behavioral change on
  JSX; adds React, Vue, Svelte, Angular, and plain HTML support from the
  same rule file.
- **CLI lint runner.** Rule registry is now the single source of truth
  (`packages/cli/src/lint-runner.ts`). Previously, the CLI and MCP had
  separate rule lists that drifted; they are now unified and the MCP
  delegates to the CLI.
- **Coverage thresholds.** Adjusted to honest enforced baselines (86% lines
  / 75% branches for `@deslint/eslint-plugin`) rather than the unenforced
  aspirational 95/90 from v0.1.x. Ratcheting strategy: targeted file-level
  tests, not big-bang sprints.

### Fixed

- **MCP rule registry drift.** The `@deslint/mcp` server shipped with a
  10-rule hard-coded list in v0.1.1, which silently skipped all S4
  accessibility rules and any rule added after the initial MCP write. Fixed
  by delegating to the CLI's `runLint`.
- **MCP "File ignored because outside of base path" error.** Users running
  the MCP against files outside the `projectDir` (common in Cursor's
  single-file analysis flow) got an ESLint v10 base-path error. Fixed via
  `resolveProjectDir()`.
- **CLI rule list hard-coding.** S4 dogfood revealed that `lint-runner.ts`
  had a hard-coded rule list that didn't include `viewport-meta` or
  `lang-attribute` despite both being registered in the plugin. Fixed by
  pulling directly from the plugin's `rules` export.
- **Heading hierarchy dogfood bug.** The S4 `heading-hierarchy` rule was
  dogfooded on `apps/docs` and immediately caught a real `h1 → h3` skip in
  the landing docs page. Fixed in the same commit that introduced the rule.
- **`form-labels` PascalCase false positive.** Initial v1 matched all
  `<Input>` regardless of case, producing FPs on Radix-based design
  systems. Fixed: JSX `<input>` is matched case-sensitively (lowercase
  only); PascalCase components are treated as opaque.
- **`link-text` scope too narrow.** Initial v1 only checked raw `<a>`, which
  returned 0 hits on every real Next.js project because they all use
  `<Link>`. Re-scoped to include `linkComponents` option.

### Engineering

- **Framework parity.** Of the 20 shipping rules, 14 are now fully
  framework-agnostic (up from 6 in v0.1.1). The remaining 6 are either
  inherently framework-specific (`lang-attribute`, `viewport-meta` on HTML)
  or still JSX-only pending v0.3.0 porting (`consistent-component-spacing`,
  `consistent-border-radius`, `max-component-lines`, `no-inline-styles`).
- **Test suite growth.** 792 tests in v0.1.1 → **1,145 tests in v0.2.0**
  (+353 tests). All green on Node 20 + 22.
- **New cross-element rule pattern.** The `onComplete` hook added to
  `createElementVisitor` enables rules that need to collect all elements
  of a type before evaluating (heading hierarchy, form label matching,
  aria attribute cross-validation). This pattern will underpin future
  cross-file analysis in v0.3.0.
- **Release workflow** idempotency — each publish step checks the npm
  registry first and skips if `name@version` is already published. Makes
  partial-publish failures (token scope, network blip) fully recoverable by
  re-running the workflow on the same tag.

### Validated

- **Dogfood coverage.** S4 rules validated on 3 real OSS projects
  (`shadcn-ui/taxonomy`, `leerob/next-saas-starter`, Vintor), 731 file-rule
  combinations evaluated, 6 real production bugs caught, 0 false positives.
- **End-to-end compliance dogfood.** `deslint compliance apps/docs/out` on
  the rebuilt Deslint landing page: **Level AA, 13/13 passing, 0 failing**
  on both WCAG 2.2 and the 2.1 subset.
- **Cross-framework smoke.** Visual-proof landing section tested across
  Chromium, WebKit, and Firefox via Playwright; all 4 beats render
  correctly on all 3 browsers.

### Not yet shipping (v0.3.0 roadmap)

- Porting the remaining 5 JSX-only rules (`consistent-component-spacing`,
  `consistent-border-radius`, `max-component-lines`, `no-inline-styles`,
  and `missing-states`'s Angular autofix) to full cross-framework parity.
- `focus-indicators`, `keyboard-navigation`, `skip-navigation`,
  `touch-target-size`, and `autocomplete-attribute` — considered for S4
  but deferred because the static-AST heuristics don't meet the 0% FP bar.
  Revisit once CSS scanning lands (Stage 2D).
- Cross-file design graph ("47 Buttons across 23 files, here's how they
  diverge") — KPMG Phase 2, post-v0.2.0.

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
