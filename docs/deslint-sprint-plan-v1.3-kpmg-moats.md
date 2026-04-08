# Deslint Sprint Plan v1.3 — KPMG 7-Moat Defensibility Overlay

> **Apply ON TOP of** v1.0 (`deslint-sprint-plan.txt`) + v1.1 (`deslint-sprint-plan-v1.1-update.md`) + v1.2 (`deslint-sprint-plan-v1.2-update.md`).
> **Effective:** 2026-04-07
> **Status:** Active — this overlay integrates the KPMG-audit defensibility strategy into sprint planning so no work is lost.
> **Authoritative status tracker:** `DESLINT-EXECUTION.md` Section 15.

---

## Context

In April 2026 a "KPMG-style" defensibility audit raised the objection: *"14 ESLint rules are trivially copyable. SonarQube could add design rules in a sprint. CodeRabbit's LLM could learn design awareness overnight. There's no moat."*

The objection is correct about the **rules**. It is wrong about the **platform**. SonarQube isn't a $500M+ company because of its 5,000 rules — it's because of quality gates, historical tracking, technical-debt estimation, and enterprise compliance workflows wrapped around them. This overlay wires the same pattern into Deslint's sprint plan as **seven compounding moats**, organized in three phases.

The full rationale, competitor analysis, and market sizing live in the approved plan `kind-giggling-moler.md`. This doc only captures the sprint-plan integration so execution stays anchored in sprint history.

---

## The Seven Moats (compressed)

| # | Moat | Category | Threat |
|---|------|----------|--------|
| 1 | Cross-File Design Intelligence Engine | Analysis depth | CodeRabbit (per-PR), SonarQube (no design semantics) |
| 2 | Design Debt Scoring | Enterprise positioning | SonarQube's "technical debt" for a new domain |
| 3 | Quality Gates (opt-in CI enforcement) | Enterprise lock-in | SonarQube gate parity; CodeRabbit has no design gate |
| 4 | Design-to-Code Alignment (Figma bridge) | Partnership | Figma (they provide tokens; we verify usage) |
| 5 | Trend Intelligence & Regression Detection | Historical moat | Switching costs — history can't migrate |
| 6 | AI Code Attribution | Data flywheel | Network effect — first-mover corpus |
| 7 | Platform Embedding (`@deslint/core`) | Strategic endgame | Embedded in Lovable/Bolt/v0 generation pipelines |

---

## Phase 1 — Enterprise Foundation (✅ COMPLETE 2026-04-07)

**Goal:** Make the KPMG consultant say *"OK, this is SonarQube for design."*

| Story | Feature | Moat | Status | Location |
|-------|---------|------|--------|----------|
| **VIZ-026** | Design Debt Scoring (hours per violation, top contributors) | 2 | ✅ | `packages/shared/src/debt-table.ts`, `packages/cli/src/debt.ts` |
| **VIZ-027** | Quality Gates (opt-in threshold enforcement) | 3 | ✅ | `packages/shared/src/quality-gate.ts`, `action/src/index.ts` |
| **VIZ-028** | `deslint trend` command (history, deltas, regression alerts) | 5 | ✅ | `packages/cli/src/trend.ts` |
| **VIZ-029** | W3C Design Tokens (DTCG) import | 4 | ✅ | `packages/shared/src/tokens/` |
| **VIZ-030** | WCAG 2.2 compliance report export (HTML/JSON/text) | 2 + 5 | ✅ | `packages/shared/src/compliance.ts`, `packages/cli/src/compliance-report.ts` |

**Safety model (every Phase 1 feature):**

1. Design Debt — additive metadata on scan output. No breaking change.
2. Quality Gates — `enforce` defaults to `false`; failures are warn-only until the user explicitly opts in via `.deslintrc.json → qualityGate.enforce: true`.
3. Trend — read-only new command over existing `.deslint/history.json`. Zero writes to new files.
4. W3C Tokens — opt-in via file presence. Projects without `.tokens.json` see no change. Malformed files are swallowed and fall through to Tailwind/manual sources.
5. Compliance Report — net-new `deslint compliance` command. Existing scan/fix/trend output untouched.

**Exit criteria (met):** A team can install Deslint, set a quality gate, track trends, import W3C tokens, and export a WCAG compliance report — all without breaking existing v0.1.0 users. Full repo test suite green (82 shared + 102 CLI + plugin + action + mcp).

---

## Phase 2 — Intelligence Layer (NEXT)

**Goal:** Create capabilities CodeRabbit can't replicate.

| Story | Feature | Moat | Effort | Notes |
|-------|---------|------|--------|-------|
| **P2-1** | Cross-File Design Graph (component pattern analysis across codebase) | 1 | 3 weeks | New `packages/core` analysis engine. Parse all files → build component map → detect pattern deviations. |
| **P2-2** | AI Code Attribution (detect AI-generated patterns, per-tool violation rates) | 6 | 4 weeks | Heuristic v1 first; ML later with corpus. |
| **P2-3** | Embeddable `@deslint/core` pure-function API | 7 | 3 weeks | Extract analysis logic from CLI into pure functions. No CLI deps, no filesystem deps. |
| **P2-4** | Design System Marketplace (shadcn, MUI, Chakra, Radix presets) | network | 2 weeks | Reduces false positives; community flywheel. |
| **P2-5** | 6+ new WCAG 2.2 a11y rules | depth | 3 weeks | focus-visible, heading-order, aria-labels, form labels, keyboard nav, skip-links. Ties into existing compliance report (VIZ-030). |
| **P2-6** | Design-code alignment % metric | 4 | 1 week | Completes Moat 4 using the W3C parser already shipped in VIZ-029. |

**Exit criteria:** Deslint can analyze a 2,000-file project, detect cross-file inconsistencies, attribute violations to AI generation, and produce a report that enterprise design teams act on.

---

## Phase 3 — Platform Play (LATER)

**Goal:** Be embedded in AI code generation platforms. Create the data flywheel.

| Story | Feature | Moat |
|-------|---------|------|
| **P3-1** | Figma Variables API import (direct sync) | 4 |
| **P3-2** | VS Code extension (inline violations, score panel, fix preview) | distribution |
| **P3-3** | Platform SDK (embeddable in Lovable/Bolt/v0, webhooks) | 7 |
| **P3-4** | AI Self-Correction Loop (Claude Code hooks, MCP Apps UI, auto-lint on edit) | 6 + 7 |
| **P3-5** | Web Dashboard (team view, trends, per-developer metrics, design debt board) | enterprise |

**Exit criteria:** Embedded in ≥1 AI code gen platform; web dashboard shows team trends; paid tier generating revenue.

---

## Relationship to Previous Sprint Plans

This overlay does **not** replace v1.0 / v1.1 / v1.2. It extends them:

- **Stage 2 items in `DESLINT-EXECUTION.md` Section 11** (HTML parser fix, Angular rule parity, MCP live validation, accessibility expansion, CSS scanning, Figma Variables, cross-file engine) remain valid. KPMG Phase 2 absorbs the cross-file engine and Figma import items; the a11y expansion becomes P2-5.
- **Stage 3 items in `docs/deslint-sprint-plan-v1.2-update.md`** — Design Debt Scoring, Trend API, HTML/PDF compliance report, WCAG conformance mapping — have all been **pulled forward into KPMG Phase 1** and are ✅ shipped.
- **Stage 3 items still pending** — Claude Code hooks, MCP Apps UI, component library presets, VS Code extension, embeddable core engine, design-code alignment metric — are rescheduled into KPMG Phase 2/3.

**Authoritative status tracker:** `DESLINT-EXECUTION.md` Section 15 has the live mapping between moats, phases, story IDs, and shipped-vs-pending status. Whenever this doc and Section 15 disagree, Section 15 wins.

---

## Non-negotiables (carry forward unchanged from v1.0/v1.1/v1.2)

1. No AI/LLM API calls — deterministic static analysis only
2. Local-first — zero code leaves the user's machine without explicit opt-in
3. Every new feature ships opt-in or additive — never breaks existing v0.1.0 users
4. Every rule is try/catch wrapped; no unhandled crashes
5. All new code has tests; full repo test suite must stay green
6. Tailwind v3 + v4 support; framework-agnostic (React, Vue, Svelte, Angular, HTML)
7. ESLint v10 flat config only; Node ≥20.19.0; TypeScript strict

---

## Document Hierarchy After v1.3

1. **`DESLINT-EXECUTION.md`** (authoritative, trust-first execution plan, KPMG status tracker in Section 15)
2. `SPRINT-LOG.md` (per-story "Did / Will do / Blockers" history)
3. `docs/deslint-sprint-plan.txt` (v1.0 base plan)
4. `docs/sprint-plan-v1.1-changes.md` (v1.1 delta)
5. `docs/deslint-sprint-plan-v1.1-update.md` (v1.1 full overlay)
6. `docs/deslint-sprint-plan-v1.2-update.md` (v1.2 full overlay — L3-L5 vision)
7. **`docs/deslint-sprint-plan-v1.3-kpmg-moats.md`** (this doc — KPMG defensibility overlay)

When they conflict, higher-numbered layers win. `DESLINT-EXECUTION.md` overrides all sprint plans for sequencing.
