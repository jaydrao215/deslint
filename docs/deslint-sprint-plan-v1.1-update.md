# Deslint Sprint Plan v1.1 — Definitive Update

> Apply this document ON TOP of the original `deslint-sprint-plan.txt`.  
> Every section below either replaces or adds to the original sprint plan.  
> If a section is not mentioned here, the original plan stands unchanged.

---

## GLOBAL CHANGE: Product Model — Three Execution Modes

**This applies to every rule, every sprint, every deliverable.**

Deslint is NOT just a reporter. It is a design quality tool with three modes:

### Mode 1: Scan (default, safe, CI/CD)
```bash
deslint scan
```
- Reports violations with Design Health Score (0–100)
- Changes nothing in the codebase
- Exits with code 1 if below `--min-score` threshold
- This is what runs in CI/CD pipelines and PR checks
- Output formats: text (colored), JSON, SARIF

### Mode 2: Interactive Fix (the differentiator)
```bash
deslint fix --interactive
```
- Walks through each violation one by one
- User decides per-violation: apply, skip, apply-all-similar, ignore-rule, quit
- Skipped items optionally get `// deslint-ignore -- <reason>` comment
- Preserves user intent — never overwrites a deliberate design choice
- This is the "Prettier meets human judgment" UX nobody has built

### Mode 3: Auto-Fix (power users who trust their config)
```bash
deslint fix --all
```
- Applies all safe fixes at once
- Only recommended after configuring `.deslintrc.json` with team design tokens
- Generates a diff summary showing all changes made
- Supports `--dry-run` to preview changes without applying

### Mode 4 (invisible): MCP Real-Time Loop
- AI generates code → Deslint MCP analyzes silently → returns fix suggestions to AI agent → AI self-corrects → user sees clean code on first pass
- User never sees the bad version
- Deslint teaches the AI to fix itself in real-time

**Every rule MUST ship with `fixable: 'code'` and a working auto-fixer from day one.**

---

## GLOBAL CHANGE: ESLint v10 Flat Config Only

Remove ALL legacy `.eslintrc` references from the entire plan.

- Peer dependency: `eslint >= 10.0.0`
- Minimum Node.js: `>= 20.19.0`
- Plugin exports include `meta.name`, `meta.version`, `meta.namespace`
- Use `defineConfig()` helper from `eslint/config`
- Config presets export flat config objects only
- VIZ-008 (npm publish): Remove "legacy (.eslintrc) support" acceptance criterion
- VIZ-017 (init wizard): Generate `eslint.config.js` only

---

## GLOBAL CHANGE: Production-Grade Rule Engineering

Add to **Definition of Done** (Section 3):

- Every ESLint rule body wrapped in try/catch — unhandled exceptions NEVER crash linting
- Rules must NOT require type-aware analysis (no TypeChecker). AST pattern matching only
- Every rule ships with `fixable: 'code'` and working auto-fix logic
- Auto-fix must be idempotent (running fix twice produces same output)
- Performance budget: individual rule < 2ms per file on benchmark
- False positive rate target: < 5% (tracked via community feedback)
- `eslint-rule-benchmark` runs in CI for every rule change
- Rules support inline suppression: `// eslint-disable-next-line deslint/rule-name -- reason`

---

## PHASE 1 CHANGES

### Sprint 1: Updated VIZ-002 — First Rule: no-arbitrary-colors

**Add these tasks to VIZ-002:**

12. Build Tailwind version detection layer (detect `@theme` in CSS = v4, `tailwind.config.js` = v3)
13. Create v3 → v4 class name mapping table (40+ renamed classes)
14. Parse `@theme` CSS blocks for v4 custom design tokens
15. Implement working auto-fixer that replaces arbitrary hex with nearest token
16. Auto-fix must handle: static className strings, template literals, cn()/clsx() wrappers
17. Auto-fix must preserve all non-color classes in the className unchanged
18. Detect hardcoded CSS custom property values that should use design tokens (Buoy competitive parity)

**Add these acceptance criteria:**
- Auto-fix correctly replaces `bg-[#3B82F6]` with `bg-blue-500` via `eslint --fix`
- Auto-fix does NOT modify classes that aren't color violations
- Rules produce zero false positives on a Tailwind v4.1+ project
- Rule detects violations in both Tailwind v3 and v4 class naming conventions

**Add these test cases:**
- TEST: `eslint --fix` transforms `bg-[#3B82F6]` → `bg-blue-500` in source file
- TEST: `eslint --fix` preserves `p-4 m-2` when fixing `bg-[#FF0000]` in same className
- TEST: Does NOT flag `bg-linear-to-r` as arbitrary (valid v4 class)
- TEST: Reads custom color tokens from `@theme` block in v4 projects
- TEST: Fix is idempotent (running twice produces same output)

**Story points:** 11 (was 8)

---

### Sprint 2: Replace VIZ-004 with VIZ-002B — Angular Template Parsing

Move `typography-scale` (VIZ-004) to Sprint 3. Add Angular support here.

#### VIZ-002B: Angular Template Parsing (5 points)

**As a** Angular developer using AI tools,  
**I want** Deslint to parse my Angular templates,  
**so that** I get design quality feedback on Angular projects including Vintor.

**Acceptance Criteria:**
- Rules parse Angular template `class` attributes in `.html` template files
- Rules handle `[ngClass]` bindings (object and array syntax)
- Rules handle `[class.name]="condition"` bindings
- `@angular-eslint/template-parser` integrated as optional peer dependency
- Component `styleUrls` CSS/SCSS files parsed by CSS-level rules
- All existing rules produce identical results across React, Vue, Svelte, Angular, HTML
- Deslint runs successfully against the Vintor frontend codebase

**Tasks:**
1. Add `@angular-eslint/template-parser` as optional peer dependency
2. Create Angular template class extractor (parallel to React JSX extractor)
3. Handle `[ngClass]="{'bg-[#FF0000]': isActive}"` object syntax
4. Handle `[class.bg-red-500]="condition"` syntax
5. Update framework auto-detection: `@angular/core` in package.json → Angular
6. Extend the framework-agnostic class extractor abstraction layer
7. Write cross-framework test suite with Angular `.html` template fixtures
8. Run Deslint against Vintor's actual codebase — document results

**Test Cases:**
- TEST: Detects `bg-[#FF0000]` in Angular template `class="bg-[#FF0000]"`
- TEST: Detects arbitrary color inside `[ngClass]="{'bg-[#FF0000]': true}"`
- TEST: Does NOT flag standard Tailwind classes in Angular templates
- TEST: Framework auto-detection identifies Angular from `@angular/core`
- TEST: Deslint produces a Design Health Score for Vintor's frontend

**Sprint 2 revised total:** VIZ-003 (5) + VIZ-002B (5) + VIZ-005 (3) = **13 points**

---

### Sprint 2: Updated VIZ-003 — no-arbitrary-spacing

**Add auto-fix requirements:**
- Auto-fixer replaces `p-[13px]` with nearest scale value (`p-3` at 12px or `p-3.5` at 14px)
- Fixer chooses the nearest value; if equidistant, prefers the smaller value
- Fixer handles all directional variants (pt, pb, pl, pr, px, py, mt, mb, mx, my, etc.)
- `fixable: 'code'` set in rule meta

**Add test cases:**
- TEST: `eslint --fix` transforms `p-[13px]` → `p-3` in source file
- TEST: Fix preserves responsive variants: `sm:p-[13px]` → `sm:p-3`

---

### Sprint 3: Revised Content

Sprint 3 now includes VIZ-004 (moved from Sprint 2) + VIZ-006 + VIZ-008.

#### Updated VIZ-004 — typography-scale
**Add auto-fix requirements:**
- Fixer replaces `text-[17px]` with `text-base` (16px) or `text-lg` (18px)
- Fixer replaces `font-[450]` with `font-normal` (400) or `font-medium` (500)
- `fixable: 'code'` set in rule meta

#### Updated VIZ-006 — responsive-required
- This rule is NOT auto-fixable (adding responsive variants requires design decisions)
- `fixable` is NOT set — this is report-only with suggestions
- Suggestions show: "Consider adding `sm:w-full` or `md:w-1/2` for responsive behavior"

**Sprint 3 revised total:** VIZ-004 (5) + VIZ-006 (5) + VIZ-008 (3) = **13 points**

---

### Sprint 4: Updated VIZ-007 + Revised Sprint

VIZ-007 (consistent-component-spacing) moves here from Sprint 3.

#### Updated VIZ-007 — consistent-component-spacing
- This rule is NOT auto-fixable (choosing the "standard" pattern requires judgment)
- Reports the most common pattern as suggestion: "3 of 5 Card components use `p-4`. Consider standardizing."
- `fixable` is NOT set

#### Updated VIZ-011 — Launch Outreach
**Add Buoy.design competitive positioning:**
- All outreach materials include positioning: "Buoy catches token drift. Deslint catches token drift + spacing + typography + responsive + accessibility — with auto-fix."
- Landing page includes "How Deslint compares" section
- First blog post: "I built Deslint because linting design quality shouldn't require a dashboard"

#### VIZ-010B: Generate AI Tool Configs from .deslintrc.json
deslint generate-config --target claude    # outputs CLAUDE.md design section
deslint generate-config --target cursor    # outputs .cursorrules design rules  
deslint generate-config --target agents    # outputs AGENTS.md design section

- Single source of truth → feeds every AI tool → Deslint verifies output. This makes Deslint the hub of the design quality workflow, not just a checker at the end. Teams configure their design system once in .deslintrc.json, and Deslint distributes it to every tool and verifies every output.
**Sprint 4 revised total:** VIZ-007 (5) + VIZ-009 (5) + VIZ-010 (3) + VIZ-011 (2) = **15 points**

---

## PHASE 2 CHANGES

### Sprint 5: Updated VIZ-012 — CLI with Interactive Fix Mode

**Replace the original VIZ-012 acceptance criteria with:**

- `deslint scan` runs project-wide analysis, outputs Design Health Score, changes nothing
- `deslint fix --interactive` walks through violations one-by-one with user prompts
- `deslint fix --all` applies all auto-fixable violations at once
- `deslint fix --dry-run` shows what would change without modifying files
- Interactive mode supports: [a]pply, [s]kip, apply [A]ll similar, [i]gnore rule, [q]uit
- Skipped violations optionally receive inline `// deslint-ignore` comment
- `--format json | text | sarif` for scan output
- Exit code 1 if below `--min-score` threshold (scan mode only)
- Respects `.deslintrc.json` configuration
- Performance: 500-file project scans in < 15 seconds
- Supports `--concurrency=auto` for ESLint v10 multithreaded linting

**Add these tasks:**
1. Implement `scan` command (existing plan)
2. Implement `fix --interactive` with @clack/prompts for beautiful terminal UX
3. Implement `fix --all` wrapping ESLint's `--fix` programmatic API
4. Implement `fix --dry-run` showing unified diff output
5. Build `deslint-ignore` comment injector for skipped violations
6. Add `--concurrency=auto` flag

**Add these test cases:**
- TEST: `deslint scan` produces score without modifying any files
- TEST: `deslint fix --all` applies all fixable violations
- TEST: `deslint fix --dry-run` shows changes without applying them
- TEST: `deslint fix --all` is idempotent (running twice = same result)
- TEST: Interactive mode `[s]kip` does not modify the file
- TEST: Interactive mode `[a]pply` modifies only the selected violation

**Story points:** 11 (was 8)

---

### Sprint 6: Updated VIZ-014 — a11y-color-contrast

**Add auto-fix clarification:**
- This rule is NOT auto-fixable (choosing accessible color alternatives requires design judgment)
- Provides suggestions: "Contrast ratio 2.1:1 fails WCAG AA (needs 4.5:1). Try `text-gray-900` on `bg-white` (ratio 17.4:1)"
- `fixable` is NOT set

---

### Sprint 7: Updated VIZ-018 — Rules #9-10

**dark-mode-coverage:**
- Auto-fixable: YES — adds `dark:` variant with inverted shade (e.g., `bg-blue-500` → adds `dark:bg-blue-900`)
- Fixer uses a shade inversion map: 50↔950, 100↔900, 200↔800, 300↔700, 400↔600, 500↔500
- `fixable: 'code'` set

**no-arbitrary-zindex:**
- Auto-fixable: YES — replaces `z-[999]` with nearest scale value (`z-50`)
- `fixable: 'code'` set

---

## PHASE 3 CHANGES

### Sprint 9: Updated VIZ-022 — MCP Server Core

**Replace `suggest_fixes` tool with `analyze_and_fix` tool:**

The MCP server exposes 3 tools:
1. `analyze_file` — accepts file path, returns violations + Design Health sub-score
2. `analyze_project` — accepts directory, returns aggregate score + hotspot files
3. `analyze_and_fix` — accepts file path + violation ID, returns the corrected code block

**Critical behavior for `analyze_and_fix`:**
- Returns the FIXED version of the code as a string
- The AI agent (Claude Code, Cursor) receives the corrected code and can apply it
- User sees clean code on first generation — the "invisible quality loop"
- Only structured results sent to LLM — never raw source code
- Violation metadata includes: rule name, severity, line/column, original value, suggested replacement, confidence score

**Add acceptance criteria:**
- MCP `analyze_and_fix` returns corrected code block for fixable violations
- MCP returns "not auto-fixable" status for report-only rules (with suggestion text)
- AI agent successfully uses fix output to self-correct generated code
- The fix output is identical to what `deslint fix --all` would produce

---

### Sprint 10: Updated VIZ-025 — Rule Expansion

**For each new rule, specify fixability:**

| Rule | Auto-fixable? | Reason |
|------|:---:|--------|
| no-inline-styles | YES | Replace `style={{marginTop: '8px'}}` → `className="mt-2"` |
| consistent-border-radius | NO | Choosing the standard radius requires team consensus |
| image-alt-text | NO | Writing meaningful alt text requires human judgment |
| no-magic-numbers-layout | YES | Replace `cols-[7]` → `grid-cols-7` (if valid Tailwind class exists) |

---

## PHASE 4 — NO CHANGES

Phase 4 (Sprints 13–16) remains as originally planned. Dashboard, team features, security hardening, and v1.0 release are unaffected by the three-mode model changes.

---

## FIXABILITY MATRIX — Complete Reference

Every rule in the plan with its fixability status:

| # | Rule | Auto-fixable | Ships in | Fix behavior |
|---|------|:---:|:---:|---|
| 1 | no-arbitrary-colors | ✅ YES | Sprint 1 | Replace hex with nearest Tailwind token |
| 2 | no-arbitrary-spacing | ✅ YES | Sprint 2 | Replace px value with nearest scale class |
| 3 | typography-scale | ✅ YES | Sprint 3 | Replace arbitrary size with nearest type class |
| 4 | responsive-required | ❌ NO | Sprint 3 | Suggest responsive variants (human decides) |
| 5 | consistent-component-spacing | ❌ NO | Sprint 4 | Report dominant pattern as suggestion |
| 6 | a11y-color-contrast | ❌ NO | Sprint 6 | Suggest accessible alternatives with ratios |
| 7 | max-component-lines | ❌ NO | Sprint 6 | Report only (decomposition needs human design) |
| 8 | missing-states | ❌ NO | Sprint 6 | Suggest missing attributes |
| 9 | dark-mode-coverage | ✅ YES | Sprint 7 | Add dark: variant with inverted shade |
| 10 | no-arbitrary-zindex | ✅ YES | Sprint 7 | Replace z-[N] with nearest scale value |
| 11 | no-inline-styles | ✅ YES | Sprint 10 | Convert style object to Tailwind classes |
| 12 | consistent-border-radius | ❌ NO | Sprint 10 | Report dominant pattern |
| 13 | image-alt-text | ❌ NO | Sprint 10 | Flag missing, cannot write meaningful alt |
| 14 | no-magic-numbers-layout | ✅ YES | Sprint 10 | Replace with standard Tailwind grid/flex class |

**8 of 14 rules are auto-fixable (57%).** This means `deslint fix --all` will resolve the majority of violations automatically, while the remaining 43% are reported with actionable suggestions for human decision.

---

## REVISED STORY POINTS SUMMARY

| Phase | Original | Revised | Delta |
|-------|:---:|:---:|:---:|
| Phase 1 (Sprints 1–4) | 49 | 54 | +5 (Tailwind v4 + Angular) |
| Phase 2 (Sprints 5–8) | 47 | 50 | +3 (interactive fix mode) |
| Phase 3 (Sprints 9–12) | 47 | 47 | 0 |
| Phase 4 (Sprints 13–16) | 44 | 44 | 0 |
| **Total** | **187** | **195** | **+8** |

The +8 points are absorbed by the efficiency gains from ESLint v10 (no legacy config work) and dropping CSS-in-JS support.

---

## VINTOR DOGFOODING CHECKLIST

Before end of Sprint 2, Deslint must pass this test:

1. ☐ `deslint scan` runs on Vintor's Angular frontend without errors
2. ☐ Detects arbitrary colors in Vintor's templates (if any exist)
3. ☐ Detects arbitrary spacing in Vintor's templates (if any exist)
4. ☐ Produces a Design Health Score for Vintor
5. ☐ `deslint fix --interactive` shows fixable violations in Vintor
6. ☐ Vintor's design system (Inter/DM Sans/JetBrains Mono, Slate Blue/Forest Green/Sage White) is encodable in `.deslintrc.json`
7. ☐ No false positives on Vintor's intentional design choices

This is the first external validation. If Deslint can't improve its creator's own project, the product thesis fails.

---

## COMPETITIVE POSITIONING SUMMARY

| Feature | Deslint | Buoy.design | eslint-plugin-tailwindcss | CodeRabbit |
|---------|:---:|:---:|:---:|:---:|
| Token compliance | ✅ | ✅ | ❌ | ❌ |
| Spacing consistency | ✅ | ❌ | ❌ | ❌ |
| Typography hierarchy | ✅ | ❌ | ❌ | ❌ |
| Color contrast (a11y) | ✅ | ❌ | ❌ | ❌ |
| Responsive coverage | ✅ | ❌ | ❌ | ❌ |
| Dark mode coverage | ✅ | ❌ | ❌ | ❌ |
| Auto-fix | ✅ (8/14 rules) | ❌ | ❌ | ❌ (suggestions only) |
| Interactive fix mode | ✅ | ❌ | ❌ | ❌ |
| MCP server (AI loop) | ✅ | ❌ | ❌ | ❌ |
| ESLint integration | ✅ | ❌ (standalone) | ✅ | ❌ |
| Design Health Score | ✅ | ✅ | ❌ | ❌ |
| CI/CD gate | ✅ | ✅ | ❌ | ✅ |
| Framework agnostic | ✅ (React/Vue/Svelte/Angular/HTML) | Partial | React only | All (code, not design) |
| Local-first / no code upload | ✅ | ✅ | ✅ | ❌ (cloud) |
| Tailwind v3 + v4 | ✅ | Unknown | ✅ | N/A |
| Team dashboard | ✅ (Phase 4) | ✅ | ❌ | ✅ |

**Deslint's unique positioning: The only tool that both detects AND fixes design quality issues in AI-generated code, across all major frameworks, inside the developer's existing ESLint workflow, with zero code leaving the machine.**
