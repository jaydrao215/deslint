# Deslint Sprint Plan v1.1 — Critical Changes from Validation

> Apply this document ON TOP of the original `deslint-sprint-plan.txt`.  
> Every section below either replaces or adds to the original sprint plan.  
> If a section is not mentioned here, the original plan stands unchanged.

## Change 1: ESLint v10 Flat Config Only

**Remove all legacy .eslintrc references from the entire plan.**

- Sprint 1 (VIZ-001): Target ESLint ≥10.0.0 as peer dependency, Node.js ≥20.19.0
- Sprint 3 (VIZ-008): Remove "legacy (.eslintrc) support" from acceptance criteria — flat config ONLY
- Sprint 7 (VIZ-017): Init wizard generates `eslint.config.js` only, no `.eslintrc` option
- Plugin exports must include `meta.name`, `meta.version`, `meta.namespace`
- Use `defineConfig()` helper from `eslint/config`

## Change 2: Tailwind v4 Support from Day 1

**Add to Sprint 1 (VIZ-002) — new task block:**

- Build a Tailwind version detection layer (check for `@theme` in CSS = v4, `tailwind.config.js` = v3)
- Create class-name mapping table: v3 names → v4 equivalents (e.g., `bg-gradient-to-r` → `bg-linear-to-r`, `flex-shrink-0` → `shrink-0`)
- Parse `@theme` CSS blocks for v4 custom design tokens
- All rules must handle BOTH v3 and v4 class conventions
- New acceptance criterion: "Rules produce zero false positives on a Tailwind v4.1+ project"
- New test cases:
  - TEST: Detects `bg-[#FF0000]` in Tailwind v4 project
  - TEST: Does NOT flag `bg-linear-to-r` as arbitrary (it's valid v4)
  - TEST: Reads design tokens from `@theme` block

**Story points impact:** +3 to VIZ-002 (from 8 to 11)

## Change 3: Angular Support in Sprint 1

**Add new story VIZ-002B to Sprint 2 (shift typography-scale to Sprint 3):**

### VIZ-002B: Angular Template Parsing

**As a** Angular developer using AI tools, **I want** Deslint to parse my Angular templates, **so that** I get design quality feedback on Angular projects.

**Acceptance Criteria:**
- Rules parse Angular template `class` attributes
- Rules handle `[ngClass]` bindings (object and array syntax)
- Rules handle `[class.name]="condition"` bindings
- angular-eslint template parser integrated as optional peer dependency
- Component `styleUrls` CSS/SCSS files parsed by CSS rules
- All existing rules work identically on Angular .html templates

**Tasks:**
1. Add `@angular-eslint/template-parser` as optional peer dependency
2. Create Angular template class extractor (parallel to React JSX extractor)
3. Handle `[ngClass]` object syntax: `[ngClass]="{'bg-[#FF0000]': isActive}"`
4. Handle `[class.bg-red-500]="condition"` syntax
5. Update framework auto-detection to recognize Angular from `@angular/core` in package.json
6. Write cross-framework test suite including Angular .html templates
7. Test against Vintor codebase as real-world validation

**Test Cases:**
- TEST: Detects `bg-[#FF0000]` in Angular template class attribute
- TEST: Detects arbitrary color inside `[ngClass]` object
- TEST: Does NOT flag standard Tailwind classes in Angular templates
- TEST: Framework auto-detection identifies Angular project correctly
- TEST: Deslint runs successfully against Vintor's frontend codebase

**Story Points:** 5

## Change 4: Buoy.design Competitive Coverage

**Add to Sprint 1 (VIZ-002) acceptance criteria:**
- Rule also detects hardcoded CSS custom property values that should use design tokens (Buoy's core feature)
- Example: flags `color: var(--some-random-thing)` when it should be `color: var(--color-primary)`

**Add to Sprint 4 (VIZ-011) outreach:**
- Position against Buoy explicitly: "Buoy catches token drift. Deslint catches token drift + spacing + typography + responsive + accessibility — inside your ESLint workflow."
- Add Buoy comparison section to landing page

## Change 5: Sprint Rebalancing

Sprint 2 becomes heavier with Angular support. Rebalance:

| Sprint | Original | Updated |
|--------|----------|---------|
| Sprint 1 | VIZ-001 (5pts) + VIZ-002 (8pts) = 13 | VIZ-001 (5pts) + VIZ-002 (11pts) = **16** |
| Sprint 2 | VIZ-003 (5pts) + VIZ-004 (5pts) + VIZ-005 (3pts) = 13 | VIZ-003 (5pts) + VIZ-002B Angular (5pts) + VIZ-005 (3pts) = **13** |
| Sprint 3 | VIZ-006 (5pts) + VIZ-007 (5pts) + VIZ-008 (3pts) = 13 | VIZ-004 typography (5pts) + VIZ-006 (5pts) + VIZ-007 (5pts) + VIZ-008 (3pts) = **18** → split VIZ-007 to Sprint 4 |

**Revised Sprint 3:** VIZ-004 (5) + VIZ-006 (5) + VIZ-008 (3) = **13**
**Revised Sprint 4:** VIZ-007 (5) + VIZ-009 (5) + VIZ-010 (3) + VIZ-011 (2) = **15**

## Change 6: Production-Grade Additions

**Add to Definition of Done:**
- Every ESLint rule wrapped in try/catch — unhandled exceptions never crash linting
- Rules must NOT require type-aware analysis (no TypeChecker access) — AST pattern matching only
- Performance budget: individual rule < 2ms per file on benchmark suite
- False positive rate target: < 5% (tracked via community feedback)
- `eslint-rule-benchmark` runs in CI for every rule change

**Add to Sprint 5 (VIZ-012 CLI):**
- Support `--concurrency=auto` flag leveraging ESLint v10 multithreaded linting
- Performance target: 500-file project scans in < 15 seconds

**Add to Sprint 8 (VIZ-020 Metrics):**
- Track false positive reports as a first-class metric
- Add "Report False Positive" link in CLI output and docs
