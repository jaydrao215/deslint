# CLAUDE.md — Vizlint Development Guidelines

## Project Overview
Vizlint is a design quality gate for AI-generated frontend code. ESLint plugin + CLI + MCP server.
TypeScript monorepo via Turborepo + pnpm workspaces.

## Sprint plan documents (READ THESE FIRST)
- docs/vizlint-sprint-plan.docx — Full 16-sprint plan with user stories
- docs/sprint-plan-v1.1-changes.md 
- docs/vizlint-sprint-plan-v1.1-update.md — Three-mode model, fixers, Angular
- docs/vizlint-sprint-plan-v1.2-update.md — User control model, no-AI architecture

## Architecture Rules
- **ESLint v10+ flat config ONLY.** No legacy .eslintrc support anywhere.
- **Node.js ≥20.19.0** minimum.
- **No type-aware ESLint rules.** All rules use AST pattern matching only (no TypeChecker access). This keeps performance fast.
- **Every rule wrapped in try/catch.** An unhandled exception crashes linting for the entire file. Never let that happen.
- **Tailwind v3 AND v4 support.** Use the class mapping in `utils/class-extractor.ts`. Never assume v3-only class names.
- **Framework-agnostic.** Rules must work with React JSX, Vue SFC, Svelte, Angular templates, and plain HTML.
- No AI/LLM API calls. Pure deterministic static analysis.
- Every rule: try/catch wrapped, fixable: 'code', Tailwind v3+v4 support
- Framework agnostic: React, Vue, Svelte, Angular, HTML
- Zero code leaves the user's machine (local-first)

## Code Style
- TypeScript strict mode everywhere.
- No `any` types except in ESLint AST node handlers (where the types are genuinely complex).
- Prefer `const` over `let`. Never use `var`.
- Name rules in kebab-case: `no-arbitrary-colors`, `typography-scale`.
- Name utilities in camelCase: `extractClassesFromString`, `findNearestColor`.

## Testing Standards
- Every rule needs: valid cases, invalid cases, autofix tests, edge case tests.
- Target 95% line coverage, 90% branch coverage.
- Test with real-world class patterns from v0, Lovable, Bolt, Claude Code output.
- Use `@typescript-eslint/rule-tester` with Vitest.

## Performance Budgets
- Individual rule: < 2ms per file on benchmark.
- Full scan (500 files): < 15 seconds cold, < 5 seconds cached.
- Use `eslint-rule-benchmark` in CI.

## Design System (for Vizlint's own UI/docs)
- Fonts: Inter (body), JetBrains Mono (code)
- Primary: #1A5276 (deep blue)
- Accent: #27AE60 (green for pass), #E74C3C (red for fail), #F39C12 (amber for warn)
- Background: #FFFFFF, #F8F9FA (light gray)

## Package Structure
```
packages/
  eslint-plugin/  — ESLint rules + configs (npm: eslint-plugin-vizlint)
  cli/            — Commander.js CLI (npm: @vizlint/cli)  
  mcp/            — MCP server for Cursor/Claude Code (npm: @vizlint/mcp)
  shared/         — Shared types and utilities
apps/
  docs/           — Documentation site
```
