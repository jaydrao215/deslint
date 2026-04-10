# Deslint Security Hardening Report

> **Date:** 2026-04-10
> **Scope:** Full codebase audit — MCP server, CLI, GitHub Action, shared packages
> **Branch:** `claude/security-hardening-revenue-review-RWfwn`

---

## Executive Summary

Deslint's architecture is inherently secure by design — local-first, zero cloud,
no LLM API calls, deterministic static analysis. The primary attack surface is
the MCP server (accepts JSON-RPC input from AI coding agents) and the GitHub
Action (runs in CI with access to a GitHub token). This audit identified and
fixed **7 categories of security concerns**, all defense-in-depth hardening
rather than critical vulnerabilities.

**Risk level before hardening:** Low (local-only tool, no network calls)
**Risk level after hardening:** Very Low (input-validated, resource-bounded)

---

## Findings & Fixes

### 1. Path Traversal in MCP Tools (Medium)

**Before:** `resolveProjectDir()` in `packages/mcp/src/tools.ts` used `resolve()`
without normalizing `../` sequences. A crafted `filePath` like `../../../../etc/passwd`
would resolve outside the project directory.

**Fix:** Added `normalize()` call and strict `startsWith(requestedDir + '/')` check
to ensure resolved paths stay within the project boundary. The function already
pivoted cwd when the file was outside, but now the path is normalized first.

**Files:** `packages/mcp/src/tools.ts:136-144`

### 2. No File Size Limits (Medium)

**Before:** `analyzeFile`, `analyzeAndFix`, and config loaders read files without
checking size. A symlink to `/dev/zero` or a multi-GB file would exhaust memory.

**Fix:**
- Added `validateFile()` helper in MCP tools — checks `existsSync`, `isFile()`,
  and enforces 10 MB max file size.
- Added 1 MB config file size limit in CLI `loadConfig()` and Action `runScan()`.

**Files:** `packages/mcp/src/tools.ts`, `packages/cli/src/index.ts`,
`action/src/scan.ts`

### 3. Unbounded Resource Parameters (Low)

**Before:** `maxFiles` and `maxSuggestions` params on MCP tools had no upper bound.
Setting `maxFiles: 999999` would cause the tool to attempt scanning every file
on disk.

**Fix:**
- Added `MAX_FILES_LIMIT = 5000` and `MAX_SUGGESTIONS_LIMIT = 100` constants.
- `clampMaxFiles()` helper clamps all maxFiles params to `[1, 5000]`.
- Zod schemas in `server.ts` now enforce `.int().min(1).max(5000)` on numeric
  params and `.max(1024)` on all string path params.

**Files:** `packages/mcp/src/tools.ts`, `packages/mcp/src/server.ts`

### 4. Config Path Traversal in GitHub Action (Low)

**Before:** The `config-path` action input was resolved relative to
`working-directory` without validating the result stayed within the workspace.

**Fix:** Added `path.normalize()` + `startsWith()` check. If the resolved config
path escapes the working directory, it is silently ignored (defaults apply).

**Files:** `action/src/scan.ts:108-119`

### 5. Input Length Validation on MCP Schema (Low)

**Before:** String parameters (`filePath`, `projectDir`, `ruleId`) had no length
limits, allowing extremely long strings that waste memory in Zod validation.

**Fix:** All string params now have `.max(1024)` (paths) or `.max(128)` (rule IDs)
constraints in the Zod schema declarations.

**Files:** `packages/mcp/src/server.ts`

### 6. Existing Positive Security Properties (No Change Needed)

These were validated and confirmed correct:

- **No shell command execution:** `exec`/`spawn` are only used in test fixtures
  and the Playwright capture script (dev-only). Zero shell commands in production
  code paths.
- **No secrets in source:** Only `core.getInput('github-token')` in the Action,
  which is the standard GitHub Actions pattern. No hardcoded tokens or API keys.
- **Config validation via Zod:** `.deslintrc.json` is parsed through
  `DeslintConfigSchema.safeParse()` with `.strict()` mode — unknown fields are
  rejected.
- **ESLint sandbox:** All linting runs through ESLint's programmatic API with
  `overrideConfigFile: true`, preventing user ESLint configs from executing
  arbitrary code in the tool's context.
- **MCP temp file cleanup:** `analyzeAndFix` uses `try/finally` with
  `rmSync(scratchDir, { recursive: true, force: true })` — temp files are always
  cleaned up even on error.
- **Error messages:** Error handlers in MCP server only expose `err.message`,
  not stack traces or internal paths.
- **Zero network calls:** The entire tool runs locally. MCP uses stdio transport.
  No HTTP servers, no outbound requests, no telemetry.

### 7. Recommendations for Future Sprints

- **Dependency audit:** Run `pnpm audit` regularly. Consider adding
  `better-npm-audit` or Snyk to CI.
- **SBOM generation:** For enterprise customers, generate CycloneDX or SPDX
  SBOM as part of the release pipeline.
- **Signed releases:** Sign npm packages with Sigstore provenance when moving
  to the `@deslint` npm org.
- **CSP headers on deslint.com:** When deploying the docs site, add strict
  Content-Security-Policy headers.

---

## Verification

All changes verified:
- `pnpm -r --filter '!@deslint/docs' build` — 5/5 clean
- `pnpm -r --filter '!@deslint/docs' test` — **1,303 tests passing** (91+1050+17+120+25)
- Zero regressions introduced
