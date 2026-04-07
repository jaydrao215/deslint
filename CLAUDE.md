# CLAUDE.md — Vizlint Development Guidelines
## IMPORTANT: Read VIZLINT-EXECUTION.md before any work

VIZLINT-EXECUTION.md contains the active execution plan.
It overrides sprint plan sequencing for all work after VIZ-025.
The current priority is VALIDATION, not new features.
Read it before starting any task.

## Project Overview
Vizlint is the design quality infrastructure layer for the AI code generation era. It validates design quality — spacing consistency, typography hierarchy, color token adherence, responsive coverage, accessibility, and dark mode — in AI-generated frontend code across any framework.

**Product levels:** ESLint plugin (L1) → CLI with Design Health Score (L2) → MCP AI self-correction loop (L3) → Design system compliance engine with Figma/W3C token import (L4) → Embeddable API for platforms like Lovable/Bolt/v0 (L5).

TypeScript monorepo via Turborepo + pnpm workspaces. Local-first, deterministic, zero cloud dependency.

**Positioning:** "Visual regression tools tell you the screenshot looks wrong. Vizlint tells you why — and fixes it."

## Planning documents (READ IN THIS ORDER)
1. **VIZLINT-EXECUTION.md** — Active execution plan. READ FIRST. Overrides all other sequencing. Section 15 = authoritative KPMG 7-moat status tracker.
2. docs/vizlint-sprint-plan.docx — Full 16-sprint plan with user stories
3. docs/sprint-plan-v1.1-changes.md
4. docs/vizlint-sprint-plan-v1.1-update.md — Three-mode model, fixers, Angular
5. docs/vizlint-sprint-plan-v1.2-update.md — User control model, no-AI architecture, L3-L5 vision, strategic positioning
6. docs/vizlint-sprint-plan-v1.3-kpmg-moats.md — KPMG 7-moat defensibility overlay (Phase 1 ✅ shipped VIZ-026→VIZ-030, Phase 2/3 scheduled)

## Architecture Rules
- **ESLint v10+ flat config ONLY.** No legacy .eslintrc support anywhere.
- **Node.js ≥20.19.0** minimum.
- **No type-aware ESLint rules.** All rules use AST pattern matching only (no TypeChecker access). This keeps performance fast.
- **Every rule wrapped in try/catch.** An unhandled exception crashes linting for the entire file. Never let that happen.
- **Tailwind v3 AND v4 support.** Use the class mapping in `utils/class-extractor.ts`. Never assume v3-only class names.
- **Framework-agnostic.** Rules must work with React JSX, Vue SFC, Svelte, Angular templates, and plain HTML.
- No AI/LLM API calls. Pure deterministic static analysis.
- Every rule: try/catch wrapped, fixable: 'code' where appropriate, Tailwind v3+v4 support
- Framework agnostic: React, Vue, Svelte, Angular, HTML
- Zero code leaves the user's machine (local-first)
- Design system inputs: Tailwind config, W3C Design Tokens (.tokens.json), Figma Variables (planned), CSS :root
- MCP server enables AI self-correction loop (Cursor, Claude Code, Copilot)

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
  core/           — (planned) Embeddable analysis engine for platform integration
apps/
  docs/           — Documentation site
action/           — GitHub Action for PR design review
validation/       — Real-world validation results (Vintor, OSS projects)
```

## Strategic Context
- Target acquirers/partners: Anthropic (Claude Code integration), Figma (design-code enforcement), Microsoft (VS Code/Copilot), AI code gen platforms (Lovable, Bolt, v0, Stitch)
- No existing tool combines design system enforcement + accessibility + responsiveness + framework-agnostic linting, local-first
- eslint-plugin-jsx-a11y (123M/mo) is React-only. eslint-plugin-tailwindcss (5.9M/mo) stalled on v4. Vizlint occupies the gap.
- See VIZLINT-EXECUTION.md Section 10 for full strategic integration analysis
