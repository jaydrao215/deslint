# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in Deslint, please report it responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, please email security@deslint.com with:

1. A description of the vulnerability
2. Steps to reproduce
3. Potential impact assessment
4. Suggested fix (if any)

We will acknowledge receipt within 48 hours and provide a detailed response within 7 days.

## Security Design Principles

Deslint follows these security principles by design:

- **Local-first**: All analysis runs locally. Zero code leaves the user's machine.
- **No network calls**: The ESLint plugin, CLI, and MCP server make no outbound network requests.
- **No AI/LLM APIs**: Pure deterministic static analysis only.
- **No code execution**: Deslint reads and analyzes code — it never evaluates or executes user code.
- **Minimal dependencies**: We keep the dependency tree small to reduce supply chain risk.
- **No secrets handling**: Deslint does not process, store, or transmit credentials or secrets.

## Scope

The following are in scope for security reports:

- ESLint plugin (`@deslint/eslint-plugin`)
- CLI tool (`@deslint/cli`)
- MCP server (`@deslint/mcp`)
- Shared utilities (`@deslint/shared`)

The documentation site (`@deslint/docs`) is out of scope unless the vulnerability affects end users.
