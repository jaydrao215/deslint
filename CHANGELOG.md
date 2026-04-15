# Changelog

## [0.6.0] — 2026-04-15

The **Foundation + Agent-loop closure** release. Four additive workstreams
make Deslint adoptable in any repo (brownfield-friendly), gated with error
budgets instead of zero-tolerance, impossible for coding agents to bypass
without a verified claim, and audit-ready with a Git-native attestation.

No existing output, score math, or 0.5.0 exit-code behavior changes; every
v0.6 feature is opt-in.

### Added

- **`deslint scan --diff <ref>`** (and dedicated `scan --diff` filter) —
  scope a scan to lines changed since `<ref>` (e.g. `origin/main`,
  `HEAD~1`). Brownfield repos with thousands of pre-existing violations
  can now adopt Deslint without declaring bankruptcy on them.
  (`packages/cli/src/git-diff.ts`, `packages/cli/src/index.ts`)
- **`.deslint/budget.yml` error budgets + `scan --budget <path>`** —
  replace "fail on any violation" with per-category, per-rule, and
  regression-delta caps. Zod-validated, lazily loads `js-yaml` only when
  a `.yml`/`.yaml` file is encountered. `enforce: true` flips the budget
  from warn-only into a CI gate.
  (`packages/shared/src/budget-schema.ts`,
  `packages/shared/src/budget-loader.ts`,
  `packages/shared/src/budget-eval.ts`)
- **`deslint attest`** — emits a byte-reproducible, committable
  `deslint.attestation/v1` JSON with sha256 file manifest, ruleset
  hash, score breakdown, and optional budget block. OSS output is
  unsigned in v0.6; signing moves to the Teams tier in v0.7 without
  schema change. `DESLINT_ATTEST_NOW` overrides the timestamp for
  deterministic builds.
  (`packages/cli/src/attest.ts`)
- **MCP `enforce_budget` tool** — pre-write agent veto. Returns
  `{ allowed, reasons, suggestedEdits, score, trailer }` so an agent
  can self-correct before declaring a task complete. Annotated
  read-only per the MCP 2025-06-18 spec.
  (`packages/mcp/src/tools.ts`, `packages/mcp/src/server.ts`)
- **`Deslint-Compliance:` commit-trailer + Action verification** —
  agents emit `Deslint-Compliance: <sha16>.<score>.<fileCount>` as a
  claim after running `compliance_check` / `enforce_budget`; the GitHub
  Action always re-scans and acts as the judge. Trailer hashes
  user-declared rules only so it survives default-severity drift
  between packages. New `strict-trailer` Action input (default `false`)
  fails the job on missing / mismatched / malformed trailers.
  (`packages/shared/src/trailer.ts`, `action/src/trailer.ts`,
  `action/action.yml`, `action/src/index.ts`)

### Infrastructure

- Shared package gains `budget-schema`, `budget-loader`, `budget-eval`,
  and `trailer` modules so the CLI, Action, and MCP server share a
  single source of truth for budget evaluation and trailer hashing.
- New dependency: `js-yaml` (`packages/shared`), loaded lazily. No
  other new runtime deps — zero-cloud positioning preserved.

### Deferred to future releases

- DTCG round-trip + `tokens diff` (v0.7)
- Sigstore/cosign signing of `deslint attest` output (v0.7 Teams tier)
- Component-profile sidecar / intent rules (v0.7+)

### Validated

- Full workspace test suite green: **1,571 tests** across shared (184),
  eslint-plugin (1,140), cli (185), mcp (34), and action (28). +91 new
  tests vs. the 1,480-test 0.5.0 baseline; zero pre-existing tests
  turned red.
- Build, typecheck, and lint clean workspace-wide.
- Compiled-binary smoke: `scan`, `scan --diff`, `scan --budget` (pass
  and breach exit codes), `attest --stdout` byte-reproducibility across
  two runs, and the MCP `self-correction-loop.mjs` demo all verified
  end-to-end.

PLACEHOLDER_TRUNCATED_FOR_LENGTH_CHECK