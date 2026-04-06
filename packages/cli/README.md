# @vizlint/cli

> Design quality CLI with scan, fix, and Design Health Score.

## Installation

```bash
npm install -g @vizlint/cli
# or use directly
npx vizlint scan
```

**Requirements:** Node.js v20+

## Commands

### `vizlint scan [dir]`

Scan a project and report the Design Health Score.

```bash
vizlint scan                     # scan current directory
vizlint scan ./src               # scan specific directory
vizlint scan --output json       # JSON output
vizlint scan --output sarif      # SARIF format (for CI integration)
vizlint scan --profile strict    # use strict profile
```

**Output:** Design Health Score (0-100), per-category breakdown, violation list.

### `vizlint fix [dir]`

Auto-fix design quality violations.

```bash
vizlint fix --all                # fix all auto-fixable violations
vizlint fix --interactive        # review each fix before applying
vizlint fix --dry-run            # show what would be fixed
```

### `vizlint init`

Interactive setup wizard. Generates `eslint.config.js`, `.vizlintrc.json`, and adds npm scripts.

```bash
npx vizlint init
# Detects framework (React/Vue/Svelte/Angular)
# Generates config with correct parser
# Adds `vizlint` and `vizlint:fix` scripts to package.json
```

### `vizlint generate-config <target>`

Generate configuration for AI coding tools.

```bash
vizlint generate-config cursor   # .cursorrules
vizlint generate-config claude   # CLAUDE.md instructions
vizlint generate-config agents   # AGENTS.md configuration
```

### `vizlint suggest-tokens`

Analyze arbitrary values and suggest design token replacements.

```bash
vizlint suggest-tokens
# Near-miss: max-w-[800px] → closest: max-w-3xl (32px difference)
# Repeated custom: w-[480px] — appears in 2 files, consider naming
# One-off: max-w-[120px] — review intent
```

## Output Formats

| Format | Flag | Use Case |
|--------|------|----------|
| Text | `--output text` (default) | Terminal, human-readable |
| JSON | `--output json` | Programmatic consumption |
| SARIF | `--output sarif` | GitHub Code Scanning, CI/CD |
| HTML | `--output html` | Shareable reports |

## Configuration

The CLI reads `.vizlintrc.json` from the project root:

```json
{
  "rules": {
    "no-arbitrary-spacing": "warn",
    "dark-mode-coverage": "off"
  },
  "designSystem": {
    "colors": { "primary": "#1A5276" }
  },
  "ignore": ["**/node_modules/**", "**/dist/**"],
  "tailwind": { "autoImport": true }
}
```

## Performance

| Project Size | Scan Time |
|-------------:|---------:|
| 74 files | 0.45s |
| 1,838 files | 3.05s |

## License

MIT
