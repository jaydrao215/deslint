# @deslint/mcp

> The verification layer for AI-generated code — MCP server.

[![MCP](https://img.shields.io/badge/MCP-2025--06--18-blue)](https://modelcontextprotocol.io) [![npm](https://img.shields.io/npm/v/@deslint/mcp.svg)](https://www.npmjs.com/package/@deslint/mcp) [![license](https://img.shields.io/npm/l/@deslint/mcp.svg)](./LICENSE)

Local-first Model Context Protocol server that lets Claude Code, Cursor,
Claude Desktop, Windsurf, and any MCP-compatible client verify and auto-fix
AI-generated code in real time — before it writes the file. Pure local
static analysis. Zero LLM in the hot path. Zero code leaves your machine.

<p align="center">
  <img src="https://deslint.com/demo/mcp-loop.gif" alt="Deslint MCP self-correction loop: analyze_file returns structured violations, analyze_and_fix returns autofixed code, all over stdio in under a second" width="720">
</p>

## Install

Pick the flow that matches your editor. All of them end up configuring the
same `@deslint/mcp` binary as an MCP server — choose whatever is least
friction on your machine.

### Claude Code (recommended)

```bash
claude mcp add deslint -- npx -y @deslint/mcp serve
```

### Cursor — one-click install

[![Install in Cursor](https://img.shields.io/badge/Install%20in-Cursor-black?logo=cursor)](cursor://anysphere.cursor-deeplink/mcp/install?name=deslint&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyIteSIsIkBkZXNsaW50L21jcCIsInNlcnZlIl19)

### Auto-detect every supported editor

```bash
# Writes config for Cursor + Claude Desktop on macOS, Linux, and Windows
npx @deslint/mcp install
```

Remove the configuration at any time with `npx @deslint/mcp uninstall`.

### Manual JSON

If auto-install doesn't work, add to your MCP config:

```json
{
  "mcpServers": {
    "deslint": {
      "command": "npx",
      "args": ["-y", "@deslint/mcp", "serve"]
    }
  }
}
```

Typical config locations:

| Client | Path |
| --- | --- |
| Claude Code | `~/.claude/mcp.json` |
| Cursor | `~/.cursor/mcp.json` |
| Claude Desktop (macOS) | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Claude Desktop (Windows) | `%APPDATA%\Claude\claude_desktop_config.json` |

**Requirements:** Node.js v20+

## Tools

Every tool is declared with MCP `annotations` and returns typed
`structuredContent` in addition to a human-readable text block, so agents
can parse results without scraping stringified JSON.

### `verify_before_write` ★

**The pre-write gate.** Lint candidate code BEFORE the agent writes it
to disk. The agent passes the proposed content; the server runs ESLint's
`Linter.verify` in-process (no temp file, no engine spin-up), returns
pass/fail + violations + a one-line `recommendedAction`.

**Performance.** Cold start ~1s (one-time plugin/parser-import cost,
preloaded on server startup). Warm fresh-content calls 3–7ms.
Identical-content re-calls hit the in-memory result cache and return in
~0.05ms with `cached: true` — agents in retry loops should short-circuit
on that signal.

- **Inputs:** `filePath` (required, may or may not exist on disk yet),
  `proposedContent` (required, max 10 MB), `projectDir` (optional),
  `strict` (optional, promotes warns to errors), `severityFloor`
  (optional, `'error' | 'warn'`), `categories` (optional rule-category
  allowlist, e.g. `['backend-safety','ai-coding']`)
- **Returns:** `passed`, `violations[]`, `score`, `totalErrors`,
  `totalWarnings`, `recommendedAction` (`'ok-to-write' |
  'ok-with-warnings' | 'fix-and-retry' | 'consult-user'`),
  `durationMs`, `cached`

`recommendedAction` semantics — **ship-it vs. retry, designed to NOT
slow the user down**:

| Value | Meaning |
|---|---|
| `ok-to-write` | Zero violations. Write the file. |
| `ok-with-warnings` | Passed all hard blockers; only advisory warnings. **Write the file.** Do NOT retry. |
| `fix-and-retry` | At least one error-severity violation. Apply corrections and call again — but at most ONCE. |
| `consult-user` | Token-decision violation the agent can't resolve alone (e.g. "use `bg-primary` or `bg-brand-navy`?"). Surface to the user; don't guess. |

> **Why this is the killer feature.** Without it, agents call
> `analyze_file` AFTER writing — too late; the bad code is already in
> the diff. `verify_before_write` flips the moment of truth: agent
> proposes → we verify → agent writes (or doesn't). The fast path makes
> calling it on every write essentially free.

### `quick_check`

Sub-200-byte yes/no lint check. Returns just
`{ clean, errorCount, warningCount, durationMs, cached }` — no
enumerated violations, fixed payload size regardless of file content.

- **Inputs:** same as `verify_before_write` minus `severityFloor` and
  `categories`
- **Returns:** `clean: boolean`, `errorCount`, `warningCount`,
  `durationMs`, `cached`

**Use this first.** Agent's "is this even worth a full verify?"
decision. Shares the result cache with `verify_before_write` — calling
both for the same content is free; the second call hits the cache.

### `get_server_stats`

Per-session telemetry. Returns
`{ totalVerifyCalls, totalVerifyMs, cacheHits, cacheMisses,
cacheHitRate, avgVerifyMs }`. The `/deslint-fix` prompt asks the agent
to surface this in its final response so the user sees deslint's
overhead is small.

### `scan_diff`

Lint only files changed against a base ref. Separates `newViolations`
(introduced by this branch) from `preExisting` (also fire on the base
ref's version of the same file), so the merge gate can hard-block on new
failures without re-litigating legacy ones.

- **Inputs:** `projectDir` (optional), `baseRef` (optional, default
  `origin/main`), `maxFiles` (optional, default 200)
- **Returns:** `totalChangedFiles`, `totalNewViolations`,
  `totalPreExistingViolations`, `newViolations[]`, `preExisting[]`
- **Requires:** `git` in PATH and the base ref to be fetched

### `analyze_file`

Lint a single existing file and return violations with a file-level score.

- **Inputs:** `filePath` (required), `projectDir` (optional, defaults to cwd),
  `strict` (optional — promote warns to errors, recommended when the
  caller is an AI agent)
- **Returns:** `violations[]`, `score` (0–100), `totalErrors`, `totalWarnings`

### `analyze_project`

Scan an entire project for design-quality violations.

- **Inputs:** `projectDir` (optional), `maxFiles` (optional, default 200, max 5000)
- **Returns:** `overallScore` (0–100), `grade`, per-category breakdown
  (colors, spacing, typography, responsive, consistency), `topViolations[]`

### `analyze_and_fix`

Analyze a file and return the auto-fixed version. **Never modifies the file
on disk** — the agent decides whether to apply `fixedCode`.

- **Inputs:** `filePath` (required), `projectDir` (optional)
- **Returns:** `fixedCode`, `fixedViolations` count, `remainingViolations[]`,
  `hasChanges` boolean

### `compliance_check`

Run a WCAG 2.2 compliance evaluation on a project.

- **Inputs:** `projectDir` (optional), `maxFiles` (optional)
- **Returns:** `levelReached` (A/AA/AAA/none), `wcag21LevelReached`
  (ADA Title II legal floor), per-criterion pass/fail status

### `get_rule_details`

Get metadata for a specific Deslint rule — category, auto-fix capability,
remediation effort, WCAG mapping, documentation URL.

- **Inputs:** `ruleId` (required; accepts either `no-arbitrary-colors` or
  `deslint/no-arbitrary-colors`)

### `suggest_fix_strategy`

Suggest which design violations to fix first, ordered by impact-per-effort.

- **Inputs:** `projectDir` (optional), `maxFiles` (optional),
  `maxSuggestions` (optional, default 10, max 100)
- **Returns:** Suggestions ranked by `impactScore`, with per-rule effort
  estimates and actionable recommendations.

## Resources

MCP resources are read-only data sources an agent can fetch up front and
cache between tool calls. Two are exposed:

### `deslint://rules`

JSON index of every Deslint rule — id, category, default severity,
auto-fix support, WCAG mapping, docs URL. Fetch once per session and
cache; the rule taxonomy is stable within a deslint release. Backed by
the same engine `get_rule_details` uses.

### `deslint://rules/{slug}`

Per-rule documentation. Replace `{slug}` with a rule id
(e.g. `deslint://rules/no-arbitrary-colors`). Returns the same shape as
`get_rule_details`.

## Prompts

### `/deslint-fix`

A templated `analyze → fix → verify` workflow that appears as a slash
command in MCP-aware UIs (Claude Desktop, Cursor, Windsurf). Takes a
`filePath` (required) and an optional `strict` flag; primes the agent
to call `analyze_file`, consult the matching `deslint://rules/{slug}`
resource per violation, apply fixes, and call `verify_before_write`
before committing — with a max-3-retries cap and a "consult-user"
escape hatch for token-decision violations.

## How it works

Runs locally via stdio (JSON-RPC 2.0). All analysis happens on your machine
— no code leaves your environment.

**AI self-correction loop:**

1. AI generates code
2. MCP tool analyzes the file for design violations
3. AI receives violation details (rule, message, fix suggestion)
4. AI corrects the code
5. Re-analyze to confirm fixes

## See it in action

This repo ships a real JSON-RPC client you can run against the compiled
server to watch the loop end-to-end — no mock, no LLM, no cloud:

```bash
pnpm --filter @deslint/mcp build
node packages/mcp/demo/self-correction-loop.mjs
```

The script spawns `@deslint/mcp` over stdio, runs `initialize` →
`tools/list` → `analyze_file` → `analyze_and_fix` against a deliberately
broken `Button.tsx`, and pretty-prints every protocol beat. The same
recording powers the "Real terminal session" tab on
[deslint.com](https://deslint.com).

## Security

- **Local-only.** The stdio transport runs as a subprocess of your editor;
  no HTTP listener, no remote endpoints.
- **Path traversal guarded.** All file paths are resolved relative to the
  declared `projectDir`; the containment check is cross-platform (uses
  `path.relative` rather than separator-string prefix).
- **File-size cap.** Files larger than 10 MB are rejected to prevent memory
  exhaustion.
- **Scan-count cap.** `analyze_project`, `compliance_check`, and
  `suggest_fix_strategy` clamp `maxFiles` to ≤ 5000 per request.
- **No source code ever leaves the machine.** Rules run through the local
  ESLint engine; nothing is sent over the network.

## Compatibility

- **MCP protocol:** 2025-06-18 (stdio transport)
- **SDK:** `@modelcontextprotocol/sdk ^1.29`
- **Node:** ≥ 20.19

## License

MIT
