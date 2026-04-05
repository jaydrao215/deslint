# VIZLINT-EXECUTION.md

## Trust-First Execution Reset

> **Status:** ACTIVE — this document overrides sprint plan sequencing for all work after VIZ-025.
> **Effective:** April 2026
> **Supersedes:** Expansion-first assumptions in sprint plan v1.0/v1.1/v1.2 where they conflict with trust, precision, or market validation.

---

## 1. Current State of the Product

### What is built (VIZ-001 through VIZ-025)

All work through Sprint 10 / VIZ-025 lives on the feature/development branch. Tests pass. The following capabilities exist:

- Turborepo monorepo with packages: eslint-plugin, cli, mcp, shared
- ESLint v10 flat config support (no legacy .eslintrc)
- TypeScript strict mode across all packages
- GitHub Actions CI pipeline
- `.vizlintrc.json` config schema with Zod validation
- Tailwind v3/v4 class extraction and detection
- Framework-agnostic class parsing (React, Vue, Svelte, Angular, HTML)
- Design system configuration (custom colors, spacing, fonts, border-radius)
- Tailwind config auto-import (tailwind.config.js, @theme CSS, :root custom properties)
- ~15 ESLint rules with auto-fixers where appropriate
- CLI with scan, fix --interactive, fix --all modes
- Design Health Score algorithm (0-100 composite score)
- MCP server architecture (analyze_file, analyze_project, analyze_and_fix)
- GitHub Action for PR design review
- Rule expansion through VIZ-025
- npm publish pipeline
- Documentation site structure

### What has NOT been validated

- Zero rules have been tested against a real codebase (only fixture tests)
- False positive rate is unmeasured
- No developer outside the founder has used the plugin
- No real-world crash testing has been performed
- Auto-fix output has not been reviewed on real project code
- Performance on a 500+ file project has not been benchmarked
- The Vintor Angular codebase has not been used as a validation target

### Known pending manual tasks

Some VIZ stories had manual tasks that were skipped or deferred during Claude Code implementation. Before proceeding with any new work, Claude Code should ask the user to identify which specific tasks remain incomplete and resolve them first.

---

## 2. The Core Mandate

**Do not build any new features. Validate what exists.**

The highest risk to Vizlint is not missing features. It is:

1. Rules that produce false positives and annoy developers into uninstalling
2. Auto-fixers that break working code
3. Setup friction that prevents first successful scan
4. Performance that slows down editor or CI feedback loops
5. Rules that crash on unexpected AST patterns in real codebases

Every hour spent building new surfaces (dashboard, licensing, paid CLI, team features) before these risks are resolved is wasted effort.

---

## 3. Immediate Priority: Real-World Validation Sprint

### 3A. Validate on Vintor (founder's own Angular project)

This is the most important single task. Run every Vizlint rule against the Vintor frontend codebase.

**Steps:**

1. Install eslint-plugin-vizlint in the Vintor project (local link via pnpm)
2. Configure eslint.config.js with vizlint.configs.recommended
3. Create a .vizlintrc.json with Vintor's actual design system:
   - Colors: Slate Blue (#1A5276-ish), Forest Green, Sage White (get exact values from Vintor's codebase)
   - Fonts: Inter (body), DM Sans (headings), JetBrains Mono (code)
   - Spacing: whatever Vintor uses
   - Border radius: 8px (Vintor's strict rule)
4. Run `vizlint scan` (or eslint with vizlint plugin) on the entire frontend
5. For EVERY violation reported, classify it:
   - TRUE POSITIVE: real design quality issue → keep the rule as-is
   - FALSE POSITIVE: legitimate design choice flagged incorrectly → fix the rule or add to known limitations
   - CRASH: rule threw an error on unexpected input → fix immediately
   - NOISE: technically correct but not useful → adjust severity or add configuration option
6. Record results in `validation/vintor-results.md`

**Success criteria:**
- Zero crashes
- False positive rate < 10% (< 5% is the target but 10% is acceptable for first validation)
- At least 5 true positive findings that would genuinely improve Vintor's code
- Auto-fix output reviewed manually for every fixable violation — no broken code

### 3B. Validate on 2-3 open-source Tailwind projects

Pick real projects from GitHub. Suggested targets:

- A Next.js + Tailwind + shadcn/ui project (this is what most AI tools generate)
- A Vue + Tailwind project (tests Vue parser in the wild)
- A large Tailwind project (500+ files, tests performance)

For each project:

1. Clone the repo
2. Install and configure Vizlint with default recommended rules
3. Run scan
4. Classify every violation (same categories as Vintor)
5. Record results in `validation/{project-name}-results.md`

**Success criteria per project:**
- Zero crashes
- Scan completes in < 30 seconds for projects under 500 files
- False positive rate < 15% on default config (strangers' codebases will have more noise than your own)
- At least 3 true positive findings per project

### 3C. Create a validation summary

After all validations, create `validation/SUMMARY.md` with:

- Total violations across all projects
- True positive count and rate
- False positive count and rate (with specific patterns that cause FPs)
- Crash count (must be 0)
- Performance numbers (time to scan each project)
- Top 3 rules that need tuning
- Top 3 rules that work well
- Auto-fix success rate (fixes that produce valid, correct code)

---

## 4. What to Fix Based on Validation

After the validation sprint, the next work is exclusively fixing problems found. In priority order:

### Priority 1: Fix crashes
Any rule that throws an unhandled error on real code is a P0 bug. Wrap in try/catch, add the failing pattern as a test fixture, and fix the root cause.

### Priority 2: Fix false positives
For each false positive pattern:
- If the rule logic is wrong → fix the detection
- If the rule is too aggressive → add a configuration option or adjust the default threshold
- If the pattern is an edge case → add to known limitations in docs and create an inline ignore example

### Priority 3: Fix auto-fixers
For each auto-fix that produces incorrect code:
- If the fix logic is wrong → fix it
- If the fix is ambiguous (multiple valid replacements) → downgrade from auto-fix to suggestion-only
- Test that fix is idempotent (running twice produces same output)

### Priority 4: Fix performance
If any project takes > 30 seconds to scan:
- Profile individual rules to find the slow one
- Check for O(n²) patterns in rule logic
- Ensure no rules accidentally trigger type-aware analysis

### Priority 5: Improve documentation honesty
After validation, update the README and docs:
- List which frameworks are TESTED (not just theoretically supported)
- List known limitations and edge cases
- Remove any "platform" language — describe what the plugin actually does today
- Add a "Current Support" section with honest framework/feature matrix

---

## 5. Trust Metrics That Gate All Expansion

Do NOT proceed to any new feature work (dashboard, paid CLI, team features, new rules beyond the current set, MCP server improvements, GitHub Action improvements) until ALL of these metrics are met:

| Metric | Minimum Threshold | How to Measure |
|--------|:-:|---|
| False positive rate | < 5% on tracked real-project results | validation/SUMMARY.md |
| Crash rate | 0 unhandled crashes across all validation projects | validation/SUMMARY.md |
| Performance | < 15 seconds for 500-file project | Timed scan in validation |
| Auto-fix correctness | 100% of fixes produce valid code | Manual review of every fix |
| Vintor dogfood | Plugin stays enabled in Vintor's daily development for 1 week | Founder confirms |

When these are met, record the date in this document and proceed to Stage 2.

**Trust metrics met on:** _______________ (fill in when achieved)

**Vintor dogfood started:** 2026-04-02 — plugin linked, eslint.config.js + .vizlintrc.json in place, `npm run vizlint` working. Dogfood ends: 2026-04-09.

---

## 6. What is Explicitly Deferred

Claude Code must NOT build or work on any of the following until trust metrics are met AND the user explicitly requests it:

**Deferred until Stage 2 (post-validation):**
- ❌ New accessibility rules (heading-hierarchy, keyboard-nav, focus-indicators, aria-validation, semantic-html, skip-navigation, form-labels, touch-target-size, prefers-reduced-motion)
- ❌ Plain HTML parser support (currently broken — credibility gap)
- ❌ Angular rule parity (7/14 rules are JSX-only, produce 0 results on Angular)
- ❌ MCP server live validation in Cursor + Claude Code workflows
- ❌ GitHub Action validation on a real PR pipeline
- ❌ CSS/SCSS file scanning (design token violations in stylesheets)
- ❌ W3C Design Tokens (`.tokens.json` / DTCG format) import
- ❌ Figma Variables API import
- ❌ Cross-file consistency engine (project-wide component analysis)

**Deferred until Stage 3 (post-adoption):**
- ❌ Embeddable core engine (pure function API for platform integration)
- ❌ Claude Code hooks integration (auto-lint after file edits)
- ❌ MCP Apps UI rendering (live score dashboard in chat)
- ❌ Component library presets (shadcn/ui, MUI, Chakra, Radix)
- ❌ Design debt scoring algorithm
- ❌ HTML/PDF compliance report export
- ❌ WCAG conformance mapping in report output
- ❌ VS Code extension (score panel, token picker, fix preview)
- ❌ Design-code alignment metric (% token usage vs. hardcoded)
- ❌ Trend API (score over time, regression alerts)

**Deferred until Stage 4 (post-revenue signal):**
- ❌ Web dashboard (app.vizlint.dev)
- ❌ Paid CLI tier / license key system
- ❌ Stripe integration / billing
- ❌ Team subscriptions / member management
- ❌ Enterprise features (SSO, audit exports, SLA)
- ❌ Product Hunt launch preparation
- ❌ Marketing campaigns / growth outreach
- ❌ Landing page redesign

These are all valid features. They are deferred, not cancelled. They resume when the product earns trust and the prior stage's exit criteria are met.

---

## 7. What Remains Valid from All Previous Planning

These architectural decisions and completed work are correct and should not be changed:

- ✅ Local-first architecture (zero code leaves the machine)
- ✅ No AI/LLM API dependency (deterministic static analysis)
- ✅ ESLint v10 flat config only
- ✅ Framework-agnostic design (React, Vue, Svelte, Angular, HTML)
- ✅ Tailwind v3 + v4 support
- ✅ Five-level user control model (inline ignore → rule config → design system → file ignore → profiles)
- ✅ Three execution modes (scan / fix --interactive / fix --all)
- ✅ Auto-fix with user control (never blind auto-fix)
- ✅ Open-core model (free plugin, paid team features later)
- ✅ TypeScript monorepo with Turborepo
- ✅ The competitive positioning (Vizlint validates output, AI generates input)
- ✅ All code built through VIZ-025

---

## 8. Revised Definition of Done (Trust-First)

Every story, bug fix, or improvement must meet ALL of these before marking complete:

1. Code compiles with zero TypeScript errors
2. All existing tests still pass (no regressions)
3. New code has tests covering the change
4. Rule logic wrapped in try/catch (no unhandled exceptions)
5. No type-aware analysis (AST pattern matching only)
6. Tested on at least one real-world fixture (not just synthetic test cases)
7. False positives reviewed: if the change could introduce FPs, validate on Vintor
8. Auto-fix output manually reviewed for correctness (if applicable)
9. Performance: rule stays under 2ms/file budget
10. Documentation updated to honestly reflect what works and what doesn't
11. Commit with conventional commit message

A story is NOT done because it shipped. It is done when a user could trust it.

---

## 9. Product Vision Hierarchy

Vizlint is not just a linter. It is the **design quality infrastructure layer for the AI code generation era.** Every tool in the ecosystem handles one piece — Figma handles design intent, AI tools handle code generation, visual regression tools handle screenshot comparison, ESLint handles code correctness. **Nobody handles: "Does the generated code actually implement the design system correctly, at the code level, deterministically, across every framework, in real-time?"**

The product operates at five levels:

| Level | What | For Whom | Value |
|-------|------|----------|-------|
| **L1: ESLint Plugin** | 14+ rules that catch design quality violations | Individual developers | Foundation (commodity) |
| **L2: Design Quality CLI** | Scan + Score + Fix for whole projects | Teams using CI/CD | Medium |
| **L3: AI Code Quality Gate** | MCP server + Hooks + self-correction loop | AI tool users (Cursor, Claude Code, Copilot) | **High** (differentiated) |
| **L4: Design System Compliance Engine** | Token import (Figma/W3C/Tailwind) + cross-file analysis + design debt scoring + compliance reports | Enterprise design system teams | **Very High** (acquisition-worthy) |
| **L5: Embeddable Design Quality API** | Core engine as a library that Lovable/Bolt/v0/Stitch integrate into their product | AI code generation platforms | **Strategic** (platform play) |

L1-L2 are built. L3-L5 are the path to making Vizlint indispensable.

### The one-line positioning:

> "Visual regression tools tell you the screenshot looks wrong. Vizlint tells you why — and fixes it."

---

## 10. Strategic Integration Targets

### For Anthropic / Claude Code
- **Their gap:** Code Review (March 2026) explicitly ignores style/design quality. The `frontend-design` skill is guidance-only — no enforcement. IBM research they cite says LLM review + deterministic static analysis = optimal.
- **What Vizlint is for them:** The deterministic design quality enforcement layer in the agent loop. Hook-integrated (auto-lint after every file edit). MCP Apps UI (live score in chat). "Skills + Enforcement" pair: guidance before generation, validation after.
- **Build:** Claude Code hooks config, MCP Apps UI, fix-loop protocol, first-class Claude Code workflow docs.

### For Figma
- **Their gap:** MCP server provides tokens TO code generation but has zero validation on the output side. Code Connect maps components but doesn't validate usage. No "enforcement" story. Two sources of truth (Figma variables + code) drift apart with no detection.
- **What Vizlint is for them:** The verification layer that completes their pipeline. Figma MCP → AI generates → Vizlint validates. "Design-code alignment" metric: what % of code uses design tokens vs. hardcoded values. This is design system adoption measured from code.
- **Build:** Figma Variables API import, W3C Design Tokens import, CSS file scanning, design-code alignment metric.

### For Lovable / Bolt.new / v0 / Google Stitch
- **Their gap:** Users burn credits in debugging loops because AI generates code with design quality problems. Lovable: 1.5-star Trustpilot, security incidents. Bolt: 31% success rate on enterprise features. v0: quality declining. Stitch: "falls apart once you drop it into an existing design system."
- **What Vizlint is for them:** A built-in quality gate that reduces credit waste. AI self-corrects before user sees the bad version. Design Quality Score on every generated output as a product feature. Trust metric these platforms can claim.
- **Build:** Embeddable core engine (`analyze(code, config) → violations[]`), score badge/widget, API surface for integration partners.

### For Enterprise Design System Teams (Microsoft, Atlassian, Salesforce scale)
- **Their gap:** Every enterprise builds bespoke ESLint rules from scratch. Design debt is measured via manual audits. Component usage is tracked (Omlet) but component quality is not. No "design quality DORA metric."
- **What Vizlint is for them:** General-purpose design system compliance linter replacing bespoke internal tools. Design debt as a trackable number. Component quality analytics. WCAG compliance artifact generation. The design equivalent of DORA metrics.
- **Build:** Trend API, design debt scoring, component quality analysis, WCAG report mapping, PDF/HTML export.

---

## 11. Execution Stages Going Forward

### Stage 1: Validation (NOW — ends when dogfood week completes)
Run Vizlint on real codebases. Measure false positives, crashes, performance. Fix everything found. Update docs honestly. Dogfood on Vintor for 1 week minimum.

**Exit criteria:** Trust metrics in Section 5 all met.

### Stage 2: Adoption Readiness + Foundation Gaps (NEXT)
Publish to npm as v0.1.0. Fix the credibility gaps. Validate the differentiation story.

**2A — Ship & Fix (immediate after validation):**
- Publish to npm as v0.1.0 with honest docs and known limitations
- Fix Plain HTML parser support (credibility gap — claimed but broken)
- Fix Angular rule parity (7/14 rules JSX-only — founder's own framework gets half value)
- Basic landing page (what it does, install command, rule list)

**2B — Validate the MCP story (the killer differentiator):**
- Test MCP server in live Cursor workflow: record AI generates → Vizlint flags → AI self-corrects
- Test MCP server in live Claude Code workflow: same loop
- Test GitHub Action on a real PR with the Action installed
- Document latency, token usage, failure modes, before/after quality scores
- If the loop works: this becomes the #1 marketing story. If it doesn't: fix it until it does.

**2C — Accessibility expansion (legal pressure = budget):**
- Add 6-9 accessibility rules: heading-hierarchy, keyboard-navigation, focus-indicators, aria-validation, semantic-html, skip-navigation, form-labels, touch-target-size, prefers-reduced-motion
- All rules framework-agnostic (not just React like jsx-a11y)
- WCAG success criteria mapping in violation metadata
- ADA Title II deadline is April 26, 2026 — this is time-sensitive

**2D — Design system input expansion:**
- W3C Design Tokens (`.tokens.json` / DTCG format) import — connects to Figma → Tokens Studio → Style Dictionary pipeline
- Figma Variables API import (REST API or via MCP `get_variable_defs`)
- CSS/SCSS file scanning for design token violations (not just Tailwind classes)

**2E — Cross-file consistency engine:**
- Project-wide component analysis: "47 Button instances across 23 files, here's how they diverge"
- Design token usage map: "These 12 files use non-standard colors"
- This is what nobody else has — the #1 AI code problem at scale

**Exit criteria:** 5+ developers have used it on real projects. MCP self-correction loop demonstrated and documented. Accessibility rules cover the automatable WCAG 2.1 AA criteria AI code gets wrong. W3C Design Tokens import working.

### Stage 3: Growth + Platform Integration (LATER)
Make Vizlint indispensable for AI tool workflows and enterprise teams.

**3A — AI tool integration depth:**
- Claude Code hooks integration (auto-lint after every file edit via lifecycle hooks)
- MCP Apps UI rendering (live Design Health Score dashboard in chat window)
- "Fix loop" protocol: AI iterates until scan passes, then presents clean code
- Component library presets (shadcn/ui, MUI, Chakra, Radix) to reduce false positives

**3B — Enterprise capabilities:**
- Design debt scoring algorithm (like Design Health Score but for debt accumulation/trend)
- Trend API: score over time, regression detection per PR, alerts
- Component quality analytics: per-component compliance across the codebase
- HTML/PDF compliance report export (for agencies, investors, legal teams)
- WCAG conformance mapping in report output (maps to specific success criteria)
- Design-code alignment metric: "72% of values use design tokens, 28% are hardcoded"

**3C — Distribution:**
- VS Code extension (score in status bar, fix preview panel, token picker, trending sidebar)
- Embeddable core engine: `analyze(code, config) → violations[]` as a pure function library
- API surface for integration partners (Lovable, Bolt, v0, Stitch)

**3D — Community & content:**
- Productized audit service for customer discovery
- Content marketing (before/after examples, technical blog posts)
- Community building (awesome-cursorrules PR, .cursorrules templates)
- Expand rule set based on validated user demand

**Exit criteria:** Consistent organic installs. Users report keeping the plugin enabled. At least 2 teams using it in CI. MCP integration demonstrated with at least 2 AI tools. One AI platform (Lovable/Bolt/v0/Stitch) evaluating integration.

### Stage 4: Monetization (LATER STILL)
Only when teams actively request: CI enforcement, shared config, historical reporting, audit trail.

**4A — Open core revenue:**
- Team dashboard with shared configs, trend visualization, Slack/Teams alerts
- Pro tier: $15-25/dev/month (unlimited repos, team dashboards, trend analytics)
- Enterprise tier: SSO, RBAC, compliance exports, self-hosted option, SLA
- Stripe integration, license key system

**4B — Platform partnerships:**
- AI tool integrations as co-marketing (featured in Cursor/Claude Code/Copilot marketplaces)
- Enterprise design system platform partnerships (Supernova, zeroheight, Knapsack)

**Exit criteria:** Revenue. $100K ARR = validation. $1M ARR = growth. Acquisition-interesting at $1-5M ARR with 30%+ growth.

---

## 12. Known Gaps in Current Implementation

These gaps were identified during strategic review (April 2026) and must be addressed across Stages 2-3:

| Gap | Current State | Impact | Stage |
|-----|--------------|--------|-------|
| **Accessibility too thin** | 3 rules (contrast, alt-text, missing-states) | Critical — legal deadlines, $800M+ market, no framework-agnostic competitor | 2C |
| **Plain HTML broken** | Validation shows "Plain HTML: No" but docs claim support | Medium — credibility gap | 2A |
| **7/14 rules JSX-only** | Angular gets 0 violations from a11y, missing-states, consistency, responsive, max-lines | High — founder's own framework | 2A |
| **CSS files not scanned** | Only Tailwind classes in templates | High — non-Tailwind projects, CSS Modules, design tokens in CSS | 2D |
| **No W3C Design Tokens** | Only reads tailwind.config.js, @theme, :root | High — standard token format, Figma pipeline | 2D |
| **No Figma integration** | No Variables API import | High — completes Figma enforcement story | 2D |
| **No cross-file analysis** | Consistency rules are per-file only | Critical — #1 AI code problem at scale | 2E |
| **MCP unvalidated** | Built but never tested in real AI workflow | Critical — the differentiating story | 2B |
| **GitHub Action unvalidated** | Built but never run on real PR | Medium — CI/CD credibility | 2B |
| **No VS Code extension** | Works via ESLint extension only | High — distribution, DX | 3C |
| **No component library awareness** | Doesn't know about shadcn/ui, MUI, etc. | High — false positive reduction | 3A |
| **No report export** | SARIF/JSON/text only | High — enterprise/agency monetization | 3B |
| **No embeddable engine** | CLI/ESLint/MCP only | Strategic — platform integration | 3C |
| **suggest-tokens undercooked** | Spacing only | Medium — design system extraction onboarding | 2E |

---

## 13. Instructions for Claude Code

When working on Vizlint, follow these rules in order of priority:

1. **Read this document first.** It overrides sprint plan sequencing.
2. **Do not build new features** unless explicitly asked by the user.
3. **The next task is always validation** until trust metrics are met.
4. **When fixing a rule,** add the real-world pattern that exposed the bug as a test fixture.
5. **When uncertain about a fix,** prefer making the rule less aggressive (fewer false positives) over more comprehensive (more true positives). Precision beats recall.
6. **Never remove try/catch from rule bodies.** If a rule crashes, fix the root cause inside the try block.
7. **Auto-fix must be safe.** If a fix could produce incorrect code in edge cases, downgrade to suggestion-only. Users trust tools that don't break their code.
8. **Documentation must be honest.** If a rule doesn't work well on Vue yet, say so. Don't claim broad support that hasn't been validated.
9. **Ask the user** before making architectural changes, adding dependencies, or modifying the build pipeline.
10. **Commit frequently** with descriptive conventional commit messages.

---

## 14. Pending Manual Tasks

Before proceeding with validation, the user should identify and resolve any manual tasks from VIZ-001 through VIZ-025 that were skipped during Claude Code implementation. Common examples include:

- Domain purchase (vizlint.dev)
- npm organization setup (@vizlint)
- GitHub repository creation
- Stripe account setup (deferred per this document)
- Framer landing page (deferred per this document)
- Community outreach posts (deferred per this document)

Claude Code should ask the user which of these are complete and which are still needed before starting the validation sprint.

---

## Appendix: How CLAUDE.md Should Reference This Document

Add this block to the top of CLAUDE.md:

```markdown
## IMPORTANT: Read VIZLINT-EXECUTION.md before any work

VIZLINT-EXECUTION.md contains the active execution plan.
It overrides sprint plan sequencing for all work after VIZ-025.
The current priority is VALIDATION, not new features.
Read it before starting any task.
```
