# @deslint/shared

## 0.10.0

### Minor Changes

- New `policy-schema.ts` — Zod schema + helpers for the Agent Action
  Firewall policy DSL. Exports `FirewallPolicySchema`,
  `ShellExecPolicySchema`, `parsePolicy`, `safeParsePolicy`,
  `compileMatchers`, `validatePatterns`, `resolveSeverity`. Sections
  reserved for all five interceptor families (`shellExec`,
  `outboundRequest`, `fileRead`, `secretAccess`, `gitOp`) so users
  can author the whole policy now and the firewall progressively
  enforces each section as the corresponding interceptor lands.
- `safe-regex2` added as a dependency. `compileMatchers` rejects
  catastrophic-backtracking patterns silently (firewall stays up on
  a misconfigured policy); `validatePatterns` surfaces them with a
  descriptive error for `deslint policy validate` to print.

## 0.9.0

### Minor Changes

- Shared package bumped alongside MCP 0.9 to unblock the workspace
  dependency chain after the MCP fast-path work.

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
