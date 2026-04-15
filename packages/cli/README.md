# @deslint/cli

> Design quality CLI with scan, fix, and Design Health Score.

<p align="center">
  <img src="https://deslint.com/demo/cli-demo.gif" alt="deslint scan producing a Design Health Score with per-category breakdown and violation list" width="720">
</p>

## Installation

```bash
npm install -g @deslint/cli
# or use directly
npx deslint scan
```

**Requirements:** Node.js v20+

## Commands

### `deslint scan [dir]`

Scan a project and report the Design Health Score.

```bash
deslint scan                     # scan current directory
deslint scan ./src               # scan specific directory
deslint scan --format json       # JSON output
deslint scan --format sarif      # SARIF format (for CI integration)
deslint scan --profile strict    # use strict profile
```

**Output:** Design Health Score (0-100), per-category breakdown, violation list.

### `deslint fix [dir]`

Auto-fix design quality violations.

```bash
deslint fix --all                # fix all auto-fixable violations
deslint fix --interactive        # review each fix before applying
deslint fix --dry-run            # show what would be fixed
```

### `deslint init`

Interactive setup wizard. Generates `eslint.config.js`, `.deslintrc.json`, and adds npm scripts.

```bash
npx deslint init
# Detects framework (React/Vue/Svelte/Angular)
# Generates config with correct parser
# Adds `deslint` and `deslint:fix` scripts to package.json
```

### `deslint generate-config <target>`

Generate configuration for AI coding tools.

```bash
deslint generate-config cursor   # .cursorrules
deslint generate-config claude   # CLAUDE.md instructions
deslint generate-config agents   # AGENTS.md configuration
```

### `deslint suggest-tokens`

Analyze arbitrary values and suggest design token replacements.

```bash
deslint suggest-tokens
# Near-miss: max-w-[800px] → closest: max-w-3xl (32px difference)
# Repeated custom: w-[480px] — appears in 2 files, consider naming
# One-off: max-w-[120px] — review intent
```

### `deslint trend`

Show Design Health Score trend over time from `.deslint/history.json` (populated automatically by `deslint scan`).

```bash
deslint trend                          # text chart of last 10 entries
deslint trend --limit 30               # 30 most recent entries
deslint trend --format json            # JSON for dashboards
deslint trend --alert-threshold 3      # flag >= 3-point drops
```

Exits with code 1 when regressions are detected (opt-in CI hook).

### `deslint compliance`

Generate a WCAG 2.2 conformance report from the current scan.

```bash
deslint compliance                     # writes .deslint/compliance.html
deslint compliance --format json       # machine-readable artifact
deslint compliance --format text       # terminal summary only
deslint compliance -o reports/wcag.html
```

### `deslint report`

Open the latest HTML report (produced by `deslint scan`) in your default browser.

```bash
deslint report
```

## Output Formats

| Format | Flag | Use Case |
|--------|------|----------|
| Text | `--format text` (default) | Terminal, human-readable |
| JSON | `--format json` | Programmatic consumption |
| SARIF | `--format sarif` | GitHub Code Scanning, CI/CD |
| HTML | auto-written to `.deslint/report.html` | Shareable reports |

## Configuration

The CLI reads `.deslintrc.json` from the project root:

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
