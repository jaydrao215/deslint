# Changelog

All notable changes to this project are documented in this file.

## [0.8.0] — unreleased

Launch-readiness scoring + three new frontend-safety rules. `npx deslint
launch-check` is the new one-command entry point for indie devs shipping
apps built with Cursor, Claude Code, Codex, or Windsurf.

### Added (`@deslint/cli`)

- **`deslint launch-check`** — alias of `scan` with a launch-readiness
  banner ("Frontend Launch Readiness: NN/100" instead of "Design Health
  Score") and a "Next:" hint pointing to `deslint share` for clean runs.
  Same engine, same flags, same exit codes — designed as the indie-
  facing zero-install entry point. Existing `scan` output is unchanged.
- **`deslint share`** — runs a scan and emits a 3-line markdown
  scorecard, copying it to the system clipboard. Goes through `pbcopy`
  on macOS, `clip` on Windows, and `wl-copy` → `xclip` → `xsel` on
  Linux, with a graceful stdout-only fallback when no clipboard binary
  is installed. No new npm dependency.

### Added (`@deslint/eslint-plugin`)

Three new rules under a new "Frontend Safety" category. All three ride
under the existing `consistency` scoring category, are enabled at `warn`
in `recommended` / `error` in `strict`, and follow the existing element-
visitor pattern.

- **`no-dangerous-html`** — flags `dangerouslySetInnerHTML` on JSX
  elements. The most common XSS path in AI-generated React code.
  Whitelists three well-known safe patterns: `<script type="application/ld+json">`
  (Schema.org structured data), `<style dangerouslySetInnerHTML>` (CSS
  injection has a different threat model than HTML/XSS), and
  `<Script dangerouslySetInnerHTML>` (the Next.js `<Script>` component
  for inline scripts via the framework's loading strategy). Validated
  against shadcn-ui/ui — the whitelist cut false positives from 36 → 11,
  with the 11 remaining all being real surfaces.
- **`safe-external-links`** — flags `<a target="_blank">` missing
  `rel="noopener noreferrer"`. Autofixable on JSX — inserts both
  required tokens.
- **`iframe-sandbox`** — flags `<iframe>` without a `sandbox` attribute.
  Suggestion only; the right sandbox value is intent-dependent.

### Fixed (`@deslint/cli`)

- **`packages/cli/src/report-html/template.ts`** previously emitted
  `rel="noopener"` only on every external link in the generated
  `.deslint/report.html`. Now emits `rel="noopener noreferrer"` so every
  generated report passes its own ruleset (the same `safe-external-links`
  rule introduced above).

### Notes

- All four publishable packages (`@deslint/eslint-plugin`,
  `@deslint/shared`, `@deslint/cli`, `@deslint/mcp`) bump from 0.7.2 to
  0.8.0 in lockstep — the changeset config keeps these linked. The
  `@deslint/action` private package bumps to 0.1.2 for its workspace
  dependency update; not published to npm.
- README rule counts brought back in sync (lead-paragraph said 34 / 13
  fixable while the rule table said 33 — actually 34 / 13 before this
  release, now 37 / 14 with the three new safety rules and the
  previously-undocumented `no-arbitrary-border-radius`).
- Validated end-to-end against shadcn-ui/ui (3,110 .tsx files): 92/100
  score, 0 parse errors, 0 crashes, 21s scan time. New rules fire on
  real shadcn-ui code (14 `safe-external-links`, 4 `iframe-sandbox`,
  11 true-positive `no-dangerous-html` after the whitelist fix).

## [0.7.2] — unreleased

Release-safety hardening across the CLI's filesystem boundary.

### Fixed (`@deslint/cli`)

- **`deslint import-tokens --output` now refuses paths outside the
  project directory.** The 0.7.1 `writeOutputFile` guard refused
  overwriting `.deslintrc.json` and refused existing files without
  `--force`, but did not constrain the destination to the working
  tree. A resolved output path that escapes the current working
  directory is now rejected regardless of `--force`.
- **Skip oversized files at scan discovery.** Files above 2 MB are
  now skipped with a visible stderr notice pointing at
  `.deslintignore` as the workaround. Very large single files could
  exhaust the ESLint parser's memory budget and abort the scan;
  most real source files are well under the cap, and generated
  bundles that exceed it belong on an ignore list rather than in
  the design-linter pass.
- **Symlinks are no longer followed at scan discovery.** The glob
  call now runs with `follow: false`, so symlinks inside the
  project are listed but never resolved to their target. Scans that
  intentionally want to follow a symlink should point the glob at
  the target directly.

### Notes

- All four publishable packages bump to 0.7.2 in lockstep so the
  release-tag validator passes. `@deslint/cli` carries the
  behaviour changes above; `@deslint/eslint-plugin`,
  `@deslint/mcp`, and `@deslint/shared` ship as 0.7.2 republishes
  with no code changes.
- Users running 0.7.1 are advised to upgrade.

## [0.7.1] — 2026-04-22

First-run onboarding for the MCP install flow. `0.7.0` gave users
access to the Deslint MCP tools after `npx @deslint/mcp install`, but
whether the tools were actually useful depended on three side-conditions
no one was told to set up: a scan to see what Deslint catches, a
`.deslintrc.json` seeded with the project's design tokens, and a
nudge telling the agent to call Deslint after UI edits. Without those,
a first-time user installed the MCP server and saw nothing change —
the tool shipped passive and churned.

### Added (`@deslint/mcp`)

- **Opt-in post-install onboarding.** After the MCP config is wired,
  `npx @deslint/mcp install` now runs up to three prompts against a
  TTY. Each is independent and skipped silently on CI / piped / Docker
  installs (`process.stdin.isTTY === false`):
  1. **Scan preview.** Runs a local scan of the current directory and
     prints the Design Health Score plus the top three rules by hit
     count. First concrete proof the tool does something.
  2. **Tailwind token seed.** When a `tailwind.config.{js,ts}` or v4
     `@theme {}` block is detected and no `.deslintrc.json` exists,
     offers to import the project's design tokens into a fresh
     `.deslintrc.json`. Turns generic "use the color scale" advice
     into concrete "use `bg-primary`" suggestions.
  3. **Agent-rules nudge.** For each agent the install step wired up
     (Claude Code, Cursor, Codex, Windsurf), offers to append a short
     section to the project-level rules file (`CLAUDE.md`,
     `.cursorrules`, `AGENTS.md`, or `.windsurfrules` — picks the
     first existing file per agent, creates the primary name when
     none exist). Section tells the agent to call
     `mcp__deslint__analyze_file` after UI edits and apply the
     `analyze_and_fix` result. Idempotent: a second install skips
     the append when the marker is already present.
- Non-project CWDs (no `package.json` or no frontend source files
  within 3 levels) short-circuit the onboarding entirely — running
  `npx @deslint/mcp install` from a home directory or a scratch dir
  keeps the pre-0.7.1 behaviour.
- Both the scan preview and the Tailwind seed reuse the CLI's
  `runLint`, `calculateScore`, and `@deslint/shared`'s
  `importTailwindConfig` — no duplicate logic between the MCP
  onboarding and the CLI's `deslint init`.

### Changed (`@deslint/mcp`)

- `install()` is now `async`. The CLI entry (`packages/mcp/src/cli.ts`)
  already chained through `.then(...)`, so this is backward-compatible
  at every existing call site.

### Notes

- The onboarding prompts the user for consent before touching any
  file outside the MCP config, matching the release-safety principle
  from `0.7.0` (no destructive writes without explicit opt-in).
- Only `@deslint/mcp` has behaviour changes in `0.7.1`. `@deslint/cli`,
  `@deslint/eslint-plugin`, and `@deslint/shared` ship as `0.7.1`
  republishes with no code changes, so the monorepo's packages stay
  in version lockstep and the release tag validator (which requires
  every publishable `package.json` to match the tag) passes.

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
