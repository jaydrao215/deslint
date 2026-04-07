# @vizlint/mcp

> MCP server for AI self-correction of design quality violations.

Enables Cursor, Claude Code, and other MCP-compatible AI tools to analyze and fix design quality issues in real-time during code generation.

## Installation

```bash
# Auto-configure for Cursor
npx vizlint-mcp install cursor

# Auto-configure for Claude Code
npx vizlint-mcp install claude
```

Or run the server directly:

```bash
npx vizlint-mcp serve
```

**Requirements:** Node.js v20+

## Tools

### `analyze_file`

Lint a single file and return violations with a Design Health Score.

**Parameters:**
- `filePath` (string, required) — path to the file to analyze
- `projectDir` (string, optional) — project root for config resolution

**Returns:** violations array, score (0-100), category breakdown

### `analyze_project`

Scan an entire project directory.

**Parameters:**
- `projectDir` (string, required) — project root to scan
- `maxFiles` (number, optional) — limit files scanned

**Returns:** Design Health Score, top violations, category breakdown, file count

### `analyze_and_fix`

Analyze a file and apply auto-fixes in one step.

**Parameters:**
- `filePath` (string, required) — path to the file
- `projectDir` (string, optional) — project root

**Returns:** fixed violations, remaining violations (unfixable), updated score

## How It Works

The MCP server runs locally via stdio (JSON-RPC 2.0). All analysis happens on your machine — no code leaves your environment.

**AI self-correction loop:**
1. AI generates code
2. MCP tool analyzes the file for design violations
3. AI receives violation details (rule, message, fix suggestion)
4. AI corrects the code
5. Re-analyze to confirm fixes

## Manual Configuration

If auto-install doesn't work, add to your MCP config:

**Cursor** (`~/.cursor/mcp.json`):
```json
{
  "mcpServers": {
    "vizlint": {
      "command": "npx",
      "args": ["vizlint-mcp", "serve"]
    }
  }
}
```

**Claude Code** (`~/.claude/mcp.json`):
```json
{
  "mcpServers": {
    "vizlint": {
      "command": "npx",
      "args": ["vizlint-mcp", "serve"]
    }
  }
}
```

## License

MIT
