# Changelog

All notable changes to this project are documented in this file.

## [Unreleased]

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
