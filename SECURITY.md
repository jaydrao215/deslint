# Security Policy

## Supported Versions

We ship security fixes for the latest `0.x` minor and the one
immediately preceding it. Everything older is best-effort.

| Version | Supported          |
| ------- | ------------------ |
| 0.7.x   | :white_check_mark: |
| 0.6.x   | :white_check_mark: |
| < 0.6   | :x:                |

Once Deslint reaches 1.0, this table will shift to "latest major +
previous minor".

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Please choose one of these private channels:

- **Preferred:**
  [Open a private security advisory](https://github.com/jaydrao215/deslint/security/advisories/new)
  on GitHub. This keeps the report, discussion, and patch linked to
  the repository.
- Email **security@deslint.com** with the same information.

Include the following in your report:

1. A description of the vulnerability and the affected component
   (eslint-plugin / CLI / Action / MCP / shared / attestation).
2. Minimal steps to reproduce, ideally with a short repo or inline
   snippet.
3. Impact assessment — what can an attacker do, and in what
   environment (developer workstation, CI runner, merge gate)?
4. Any suggested remediation.

We acknowledge receipt within 48 hours and aim for a substantive
response (triaged severity, rough timeline) within 7 days. Fixes
for critical issues ship as patch releases; lower-severity issues
batch into the next minor.

## Security Design Principles

Deslint's architecture is built around these principles:

- **Local-first.** All analysis runs locally. Source code never
  leaves the developer's machine.
- **No runtime network I/O.** The ESLint plugin, CLI, MCP server,
  and shared utilities make no outbound network requests while
  scanning. The only network access is the `@deslint/docs` build-time
  GitHub stars fetch.
- **No LLM / AI APIs.** Every rule is pure deterministic static
  analysis — same input, same output.
- **No code execution.** Deslint reads and analyzes code. It never
  evaluates, requires, or executes user code at scan time.
- **Small dependency surface.** The dependency tree is kept
  deliberately narrow to reduce supply-chain risk.
- **No secrets handling.** Deslint does not read, store, or transmit
  credentials, tokens, or environment secrets at scan time.

## Attestation + Signature Verification

Since v0.7, `deslint attest` emits a byte-reproducible
`.deslint/attestation.json` and, when
`DESLINT_ATTEST_SIGNER=sigstore` is set, an accompanying Sigstore
bundle sidecar (`.sigstore`). The GitHub Action's
`require-signed: true` input rejects PRs whose attestation lacks a
verifiable signature or whose signature does not match the payload.

Signing uses OIDC via Fulcio (keyless). Identity comes from the
runner's workload identity token — `ACTIONS_ID_TOKEN_REQUEST_TOKEN`
in GitHub Actions, or an explicit `SIGSTORE_ID_TOKEN` override. The
authoritative signer identity lives in the bundle certificate SAN,
not the attestation JSON.

If you believe the signing pipeline or verification logic can be
tricked into accepting a forged attestation, please report it
through the channels above.

## Scope

The following are in scope for security reports:

- `@deslint/eslint-plugin` — rule implementations and visitors.
- `@deslint/cli` — scan, fix, attest, verify, report commands.
- `@deslint/action` — PR-level design review and merge-gate checks.
- `@deslint/mcp` — MCP server exposing deslint to agents.
- `@deslint/shared` — types, schemas, compliance mapping, trailer
  computation.

The documentation site (`@deslint/docs`) is out of scope unless the
vulnerability affects end users or the published site itself.

## Out of Scope

- Vulnerabilities that require an already-compromised developer
  workstation.
- Denial-of-service via a deliberately pathological source file
  (ESLint itself is the relevant upstream).
- Issues in unsupported versions (see table above).
- Bugs in third-party tools that Deslint integrates with
  (ESLint core, Sigstore public-good infrastructure, GitHub Actions
  runtime) — please report those upstream.
