# Changelog

All notable changes to this project are documented in this file.

## [0.7.0] — 2026-04-21

The verification-layer release. 0.7.0 turns the commit-trailer claim
into a real merge gate, attributes violations back to the agent that
authored them, and ships one-click PR autofixes that are provably
visually lossless.

### Added

- **Sigstore-signed attestations** (`cli`, `action`). `deslint attest`
  can now sign the reproducible `.deslint/attestation.json` with a
  Sigstore bundle (sidecar `.sigstore`). `deslint verify` checks
  bundle integrity. Action gains `require-signed`: when `true`, a
  missing or tampered signature fails the job. Signer identity is
  extracted from the Sigstore cert after verification — we deliberately
  do not embed it in the attestation JSON.
- **Signer-identity policy** (`action`, `cli`). `signer-identity` /
  `signer-issuer` inputs on the Action and matching flags on
  `deslint verify` (`--signer-identity`, `--signer-issuer`,
  `--show-signer`). A rejection surfaces the observed signer plus a
  copy-pasteable accept-regex. Back-compat: any valid Sigstore
  signature passes when both policy fields are unset.
- **Per-agent scorecard** (`action`). `git blame` attributes each
  inline violation to the agent that authored the offending line —
  Claude, Cursor, Codex, Copilot, Windsurf, or a human contributor —
  and renders a table in the PR comment (agent, violations, files,
  top rule). Only PR-authored commits count; pre-existing violations
  the PR merely touched are excluded. Gated by new `agent-scorecard`
  input (default `true`). Shallow-checkout emits a `fetch-depth: 0`
  hint rather than failing the job.
- **Design-token drift diff** (`action`). Diffs `designSystem` tokens
  between the PR base and head so a silent `colors.primary` rename
  can't sneak through review. Renders a before/after markdown table.
  Shallow checkout / malformed config emits a hint rather than failing.
  Gated by new `token-drift` input (default `true`).
- **One-click PR autofixes via GitHub `suggestion` blocks** (`action`).
  When an inline violation has an autofix that is provably visually
  lossless — a color token that resolves to the same hex as the
  arbitrary value it replaces, or a `motion-safe:` wrap that only adds
  a modifier without removing anything — the Action renders the fix as
  a GitHub `suggestion` block so a reviewer can commit the change in
  one click. Opinionated/closest-match fixes render as read-only code
  blocks with a "run `deslint fix` locally" nudge, so a reviewer can
  never one-click-ship a pixel change they never saw. Gated by new
  `suggest-fixes` input (default `true`).
- **`deslint scan --fail-on <level>`** (`cli`). `error` (default,
  matches 0.6 behaviour), `warning` / `any`, or `never` — CI
  integration control for "fail on any violation" vs "never fail,
  just report."
- **`--force` flag for `deslint import-tokens`** (`cli`). Overwrite
  an existing output file when the destructive intent is explicit.
- **v0.7 launch kit** (`chore`). `.github/CODEOWNERS`, PR template,
  Dependabot config, Contributor Covenant 2.1, refreshed SECURITY.md
  (attestation verification section, version support table, GHSA as
  preferred private disclosure), CONTRIBUTING DCO sign-off.

### Fixed

- **`prefers-reduced-motion` over-reporting** (`eslint-plugin`). The
  rule fired once per matched class prefix, turning a three-class
  element into three violations when one `motion-safe:` wrap fixes
  the element. Now emits exactly one violation per element with a
  single autofix that wraps every affected class. Projected impact
  on shadcn-ui: 1978 hits → ~600.
- **`prefers-reduced-motion` false positives on non-motion transitions**
  (`eslint-plugin`). `transition-colors`, `transition-shadow`,
  `transition-opacity`, `transition-background` no longer fire by
  default — WCAG 2.3.3 scopes the rule to motion from interactions.
  New `strictTransitions: true` opt-in for the pre-0.7 interpretation.
  Orphan `duration-*` / `ease-*` / `delay-*` without a paired
  `transition-*` are no longer reported.
- **Design Health Score inflation on non-Tailwind projects** (`cli`,
  `action`, `mcp`). Scanning a pure CSS-in-JS codebase used to return
  `overall: 100` because class-based rules had nothing to comment on.
  A new applicability probe detects when no class/style attributes are
  present and the score is gated to `null` / `'skipped'` rather than a
  fabricated 100. PR comment renders a distinct N/A banner; CLI prints
  a grey "N/A" with the reason; MCP tools expose
  `overallScore: number | null`.
- **Parser errors inflating the Action's violation count** (`action`).
  `.ts` / `.tsx` files that Espree can't parse used to flow into the
  aggregate as `rule=unknown` severity=2 entries ("13 errors, score 99,
  rule=unknown"). The Action now bundles `@typescript-eslint/parser`
  (previously `importOptional`, which never resolved inside the
  esbuild binary) and segregates `parseErrors` / `filesWithParseErrors`
  into their own fields. Parse failures render as a distinct "⚠️ N
  files couldn't be analyzed" banner and never touch the score or
  Top Violations.
- **`deslint import-tokens` silent clobber** (`cli`). Every importer
  (Figma / Style Dictionary / Stitch) wrote output via a naked
  `writeFileSync`. `--output .deslintrc.json --format deslintrc` used
  to silently replace the user's full config with a designSystem-only
  fragment; `--output tokens.json` silently erased a hand-authored
  file. Now refuses `.deslintrc.json` unconditionally (the emitted
  fragment is always incomplete) and refuses any existing path
  without `--force`.
- **`@deslint/mcp install` non-atomic write** (`mcp`). A crash or
  disk-full mid-write used to leave `claude_desktop_config.json` or
  `.cursor/mcp.json` partially written and invalid, and the editor
  failed to start. Writes now route through a temp sibling +
  `renameSync` so replacement is atomic on POSIX and Windows NTFS.
- **MCP tools now honor `.deslintrc.json`** (`mcp`). `analyze_file`,
  `analyze_project`, `analyze_and_fix`, `compliance_check`, and
  `suggest_fix_strategy` used to call `runLint` without loading the
  project's config, so an MCP-driven agent would flag violations for
  rules the user had turned off — a silent CLI/MCP divergence. All
  five handlers now load `.deslintrc.json` through the same path
  `enforce_budget` already used and pass `ruleOverrides` into the
  lint engine.
- **MCP fix preview no longer drops project context** (`mcp`).
  `analyze_and_fix` used to copy the file's basename into a
  `mkdtempSync` scratch directory and run the fix pass there; that
  kept the workspace untouched but lost the user's `.deslintrc.json`
  and any path-based parser heuristics. Now runs the fix pass in the
  real project directory with `writeFixes: false` — ESLint returns
  the fixed source on `result.output` without writing to disk. A new
  test pins the on-disk contract: the source file must be
  byte-identical after the preview.
- **MCP returns `null` / `skipped` on zero-file scans** (`mcp`). The
  documented type on `AnalyzeProjectResult.overallScore` has been
  `number | null` (with `null` meaning "no applicable input") since
  0.6, but the zero-file early return in `analyze_project` and
  `suggest_fix_strategy` returned a hardcoded `100` — which let a
  backend-only monorepo subdir look "perfect" to a governance
  dashboard. Both handlers now return `overallScore: null` and
  `grade: 'skipped'` when no scannable files are discovered.

### Changed

- **Positioning.** Homepage, pricing, MCP hub, docs intro, OG image,
  README, and package descriptions now frame Deslint as "the
  verification layer for AI-generated code." Three proof pillars
  (verify against your standards / prove it, don't claim it / works
  where AI writes) are the single source of truth in
  `apps/docs/src/lib/positioning.ts`.
- **Docs: surfaces are peers, not sequential steps.** `/docs`
  overview gains a "Choose your surface" grid (MCP / ESLint plugin /
  CLI / GitHub Action) with one-line "Use if" guidance per surface.
  `/docs/getting-started` preamble states "you don't need all four"
  with jump-links to each surface's install step. Hero + sidebar
  quick-install now lead with `npx @deslint/mcp install` rather than
  the ESLint plugin.

## [0.6.0] — 2026-04-18

### Added

- Shared budget primitives: budget schema, loader, evaluator, and
  `Deslint-Compliance` trailer helpers in `@deslint/shared`.
- CLI support for diff-scoped scans (`scan --diff <ref>`), budget checks
  (`scan --budget <path>`), and reproducible attestations
  (`deslint attest`).
- GitHub Action trailer verification controls:
  `strict-trailer`, `trailer-verified`, and `trailer-status`.
- MCP `enforce_budget` plus the supporting agent-loop budget/trailer flow.
- `scripts/validate-published-packages.sh` — reproducible harness that
  builds, packs, rewrites `workspace:*`, installs tarballs into a sandbox
  runner, and exercises every surface (CLI scan / `--budget` / `--diff` /
  `attest`, ESLint flat-config, MCP `initialize` + `tools/list` +
  `enforce_budget`) against real open-source projects.

### Changed

- GitHub Action trailer verification now checks the head commit trailer
  against a full-project re-scan instead of the PR-changed-files subset.
- `scan --diff <ref>` now scopes added lines from the merge-base with
  `<ref>`, avoiding false positives caused by unrelated changes on the
  base branch.
- Trailer hashing now preserves structured rule options instead of
  collapsing nested configs to the same stringified value.
- Action scan logic is aligned with the CLI defaults and scoring model so
  server-side judgement matches local scans.

## [0.5.0] — 2026-04-15

### Added

- MCP server updated to the current MCP tool-registration model with
  typed structured responses.
- MCP tool annotations and `server.json` manifest for registry-friendly
  installation.

### Changed

- Hardened MCP path containment checks to use `path.relative`.
- Added resource caps for large files and large project scans.

## [0.4.0] — 2026-04-15

### Fixed

- Multi-fix application in the CLI now replays edits safely instead of
  corrupting files across repeated fixes.
- `fixAll` / `fixInteractive` now forward `cwd` correctly.
- Config lookup now works from monorepo leaf directories.
- `deslint init` merges into existing `eslint.config.js` instead of
  overwriting it.

### Changed

- Safer autofix defaults for rules where silent rewrites were too risky:
  `dark-mode-coverage`, `icon-accessibility`, `lang-attribute`,
  `responsive-image-optimization`, `focus-trap-patterns`,
  `no-arbitrary-colors`, `no-arbitrary-zindex`, and
  `prefers-reduced-motion`.
- `ProfileSchema` now rejects unknown keys instead of silently ignoring
  them.

## [0.3.1] — 2026-04-15

### Fixed

- `deslint init` now configures the TypeScript parser for generated flat
  configs.
- Design Health Score no longer reports `100/100` when files failed to
  parse and were never analyzed.

## [0.2.0] — 2026-04-09

### Added

- Six WCAG-mapped accessibility rules:
  `heading-hierarchy`, `form-labels`, `lang-attribute`,
  `viewport-meta`, `link-text`, and `aria-validation`.
- Cross-framework element visitor utilities covering React, Vue,
  Svelte, Angular, and plain HTML.
- Plain HTML parser support and broader WCAG compliance evaluation.
