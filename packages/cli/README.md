# @deslint/cli

> The verification layer for AI-generated code — CLI: scan, fix, attest, and Design Health Score.

Scan a project, verify it against your design-system and accessibility standards, auto-fix what is safe, and emit a byte-reproducible attestation your merge gate can re-verify. Zero LLM in the hot path. Zero code leaves your machine.

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

Scan a project, report the Design Health Score, and print a prioritized Fix Plan.

```bash
deslint scan                     # scan current directory
deslint scan ./src               # scan specific directory
deslint scan --format json       # JSON output
deslint scan --format sarif      # SARIF format (for CI integration)
deslint scan --profile strict    # use strict profile
deslint scan --fail-on warning   # fail on any warning-or-error
deslint scan --fail-on never     # always exit 0 (advisory mode)
```

**Output:** Design Health Score (0-100), per-category breakdown, Fix Plan,
violation list, and `.deslint/report.html`.

The Fix Plan separates auto-fixable drift, design-token decisions,
WCAG-mapped accessibility risks, and the highest design-debt rules so teams
know what to do next instead of reading a raw lint dump.

**Exit codes:**

| Code | Meaning |
|------|---------|
| `0`  | Success — no gate tripped and no violations matched `--fail-on` |
| `1`  | At least one gate tripped: `--min-score`, `--budget`, a qualityGate failure, or a violation of the severity level set by `--fail-on` |

**`--fail-on` severity gate (CI contract):**

| Value     | Fails exit 1 when…                                    |
|-----------|--------------------------------------------------------|
| `error`   | any violation has `severity: "error"` (default)        |
| `warning` | any violation of error **or** warning severity exists  |
| `any`     | alias for `warning`                                    |
| `never`   | never — `--min-score`, budget, and quality gate still apply |

The default is `error` to match the behavior shipped in v0.6. Set
`--fail-on never` for advisory-only CI jobs, or `--fail-on warning` to
block a PR on any violation regardless of severity.

**Score N/A:** when the scan has no applicable input (e.g. a pure
CSS-in-JS codebase where class-based rules can't evaluate anything),
`overall` is reported as `N/A` and `--min-score` is skipped rather
than failing the job.

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

### `deslint attest`

Emit a byte-reproducible attestation JSON (`.deslint/attestation.json`). Set `DESLINT_ATTEST_SIGNER=sigstore` to also write a Sigstore sidecar the merge gate can verify.

```bash
deslint attest                              # write .deslint/attestation.json
deslint attest --stdout                     # print to stdout
DESLINT_ATTEST_SIGNER=sigstore deslint attest   # + .deslint/attestation.json.sigstore
```

Sigstore signing needs an OIDC token: automatic in GitHub Actions with `permissions: id-token: write`, or set `SIGSTORE_ID_TOKEN` locally. Interactive local signing lands in v0.7.1.

### `deslint verify`

Verify the Sigstore sidecar against the attestation. Exits 0 on a valid signature, non-zero on mismatch, tamper, or missing sidecar.

```bash
deslint verify                              # .deslint/attestation.json + .sigstore
deslint verify --attestation path/to/a.json # custom location
deslint verify --show-signer                # print observed subject/issuer, skip policy
deslint verify \
  --signer-identity '^https://github\.com/acme/app/\.github/workflows/.+$' \
  --signer-issuer 'https://token.actions.githubusercontent.com'
```

**Signer-identity policy.** A cryptographically valid Sigstore signature
proves *someone* signed the bytes, not that a *trusted* principal did.
Without `--signer-identity`, `deslint verify` (and the GitHub Action
with `require-signed: true`) will accept any valid signature — including
one an attacker generated from a fork or an unrelated Fulcio-accepted
issuer. Pin the expected signer:

- `--signer-identity <regex>` — regex the cert SAN must match. Typical
  GitHub Actions value: `^https://github\.com/<owner>/<repo>/\.github/workflows/.+$`.
- `--signer-issuer <url>` — exact-match OIDC issuer, usually
  `https://token.actions.githubusercontent.com`.

When the policy rejects, the error prints the **observed** signer and
a copy-pasteable `--signer-identity` value that would accept it — you
just decide whether to trust the signer shown. Use `--show-signer` once
per repo to discover the correct `--signer-identity` value for your
attestation.

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
