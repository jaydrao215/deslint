# CLAUDE.md — Vizlint Development Guidelines

## IMPORTANT: Read ROADMAP.md FIRST, then VIZLINT-EXECUTION.md

`ROADMAP.md` is the active planning document. It captures live state, the current sprint, decisions, and the prioritized backlog. **Read it before assuming anything.** It supersedes chat history, auto-memory, and (for sprint-level sequencing) VIZLINT-EXECUTION.md. Where ROADMAP.md and any other doc conflict on "what's next," ROADMAP.md wins.

`VIZLINT-EXECUTION.md` is the strategic doc — stages, KPMG moats, architectural decisions, trust metrics. Read it for context about WHY things are sequenced the way they are. It's slower-moving than ROADMAP.md.

**Update discipline:** Every meaningful commit updates ROADMAP.md Section 1 (live state) and Section 2 (in-flight work). Sprint completions update Section 3. Decisions get appended to Section 7. This is non-negotiable — it's how we avoid drift between conversations.

## Project Overview
Vizlint is the design quality infrastructure layer for the AI code generation era. It validates design quality — spacing consistency, typography hierarchy, color token adherence, responsive coverage, accessibility, and dark mode — in AI-generated frontend code across any framework.

**Product levels:** ESLint plugin (L1) → CLI with Design Health Score (L2) → MCP AI self-correction loop (L3) → Design system compliance engine with Figma/W3C token import (L4) → Embeddable API for platforms like Lovable/Bolt/v0 (L5).

TypeScript monorepo via Turborepo + pnpm workspaces. Local-first, deterministic, zero cloud dependency.

**Positioning:** "Visual regression tools tell you the screenshot looks wrong. Vizlint tells you why — and fixes it."

## Planning documents (READ IN THIS ORDER)
1. **ROADMAP.md** — Live planning surface. READ FIRST. Live state, active sprint, decisions, backlog, won't-do. Updated on every commit.
2. **VIZLINT-EXECUTION.md** — Strategic execution plan. Stages, KPMG 7-moat tracker (Section 15), trust metrics (Section 5), architectural non-negotiables. Slower-moving than ROADMAP.md.
3. **SPRINT-LOG.md** — Append-only history of what shipped. Skim only the most recent 3-5 entries for context; the rest is archive.
4. docs/vizlint-sprint-plan.docx — Original 16-sprint plan with user stories (background only — superseded by ROADMAP.md + VIZLINT-EXECUTION.md for sequencing)
5. docs/sprint-plan-v1.1-changes.md
6. docs/vizlint-sprint-plan-v1.1-update.md — Three-mode model, fixers, Angular
7. docs/vizlint-sprint-plan-v1.2-update.md — User control model, no-AI architecture, L3-L5 vision, strategic positioning
8. docs/vizlint-sprint-plan-v1.3-kpmg-moats.md — KPMG 7-moat defensibility overlay (Phase 1 ✅ shipped VIZ-026→VIZ-030, Phase 2/3 scheduled)

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
  eslint-plugin/  — ESLint rules + configs (npm: @vizlint/eslint-plugin)
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
