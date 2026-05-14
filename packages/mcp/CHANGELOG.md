# @deslint/mcp

## 0.10.0

### Minor Changes

- Agent Action Firewall — `verify_shell_exec` pre-execution gate. Agent
  passes a candidate command; server reads `.deslint/policy.yml` and
  returns deterministic `allow` / `warn` / `deny` + reason + matched
  pattern. Built-in detection for `rm -rf /`, `curl | sh`, reverse
  shells, history rewrites, miners, sudo, process substitution.
  Sub-1 ms warm; identical-command cache hit instant.
- Production-grade hardening: `safe-regex2` validates user policy
  regex patterns at load (ReDoS guard); soft 2-second verify budget
  with structured stderr telemetry on slow paths; `slowVerifyCount`
  exposed via `get_server_stats`. EventEmitter limits raised so
  parallel agent calls don't trip `MaxListenersExceededWarning`.
- YAML policy parsing via `js-yaml` (now a direct dep — the previous
  optional-peer-dep dance silently no-op'd YAML policies on a fresh
  install).
- Total tool count: 12 (was 11). All 12 exercised by a tarball-install
  release-gate integration script run before each publish.

## 0.9.0

### Minor Changes

- MCP performance pass: in-process `Linter.verify` fast path (no temp
  file, no engine spin-up), preloaded on startup, with module-level
  result + config caches. Cold ~1 s; warm 3-7 ms; identical-content
  cache hit ~0.05 ms with `cached: true`.
- `quick_check` for the "is this even worth a full verify?" decision
  (200-byte payload); `scan_diff` for diff-scoped linting;
  `get_server_stats` for per-session telemetry.
- The `/deslint-fix` prompt template hard-caps verify at twice per
  file per turn — never an indefinite retry loop.

## 0.8.0

### Minor Changes

- f33e48d: Launch-check command + 3 frontend-safety rules + better-tuned dangerouslySetInnerHTML detection.

  ## New: `npx deslint launch-check`

  A new CLI command aliased to `scan` with a launch-readiness banner ("Frontend Launch Readiness: NN/100" instead of "Design Health Score"). Same engine, same flags, same exit codes — designed as the one-command entry point for indie devs shipping AI-built frontends. The "Next:" hint points to the new `share` command for clean runs.

  ## New: `npx deslint share`

  Runs a scan and emits a 3-line markdown scorecard, copying it to the system clipboard via `pbcopy` / `clip` / `wl-copy` / `xclip` / `xsel`, with a graceful stdout-only fallback when no clipboard tool is installed. No new npm dependency — uses native binaries. Indie-friendly share loop without telemetry.

  ## New rules (3) — Frontend safety

  All three follow the existing element-visitor pattern, ride under the `consistency` scoring category, and are enabled at `warn` in `recommended` / `error` in `strict`:
  - **`no-dangerous-html`** — flags `dangerouslySetInnerHTML` on JSX elements. Whitelists known-safe patterns: `<script type="application/ld+json">` (Schema.org structured data), `<style>` (CSS injection has a different threat model), and `<Script>` (the Next.js component for inline scripts). Validated against shadcn-ui/ui — false-positive count went from 36 → 11, with all 11 remaining being real surfaces.
  - **`safe-external-links`** — flags `<a target="_blank">` missing `rel="noopener noreferrer"`. Autofixable on JSX — inserts both required tokens.
  - **`iframe-sandbox`** — flags `<iframe>` without a `sandbox` attribute. Suggestion only; the right sandbox value is intent-dependent.

  ## Fix: report HTML emits both rel tokens

  `packages/cli/src/report-html/template.ts` previously emitted `rel="noopener"` only on every external link in the generated `.deslint/report.html`. Now emits `rel="noopener noreferrer"` so every report passes its own ruleset.

  ## Side fixes
  - `formatters.ts` exposes a `ScanMode` type so `format()` can branch the "Design Health Score" / "Frontend Launch Readiness" banner without duplicating the renderer.
  - README rule counts brought back in sync (was 33 / 11 fixable, actually 34 / 13; now 37 / 14 with the three new rules).
  - `scan` itself is unchanged — same banner, same output, same exit codes. Existing pipelines are not affected.

### Patch Changes

- Updated dependencies [f33e48d]
  - @deslint/eslint-plugin@0.8.0
  - @deslint/shared@0.8.0
  - @deslint/cli@0.8.0
