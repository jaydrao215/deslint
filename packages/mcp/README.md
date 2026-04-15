# @deslint/mcp

> Local-first MCP server for AI self-correction of design-quality violations.

[![MCP](https://img.shields.io/badge/MCP-2025--06--18-blue)](https://modelcontextprotocol.io) [![npm](https://img.shields.io/npm/v/@deslint/mcp.svg)](https://www.npmjs.com/package/@deslint/mcp) [![license](https://img.shields.io/npm/l/@deslint/mcp.svg)](./LICENSE)

Enables Claude Code, Cursor, Claude Desktop, and any MCP-compatible client to
analyze and fix design-quality issues in real time during code generation.
Pure local static analysis — zero network calls, no source code leaves your
machine.

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

Every tool is declared with MCP `annotations`
(`readOnlyHint: true`, `destructiveHint: false`, `idempotentHint: true`,
`openWorldHint: false`) and returns typed `structuredContent` in addition to
a human-readable text block, so agents can parse results without scraping
stringified JSON.

### `analyze_file`

Lint a single file and return violations with a file-level score.

- **Inputs:** `filePath` (required), `projectDir` (optional, defaults to cwd)
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
