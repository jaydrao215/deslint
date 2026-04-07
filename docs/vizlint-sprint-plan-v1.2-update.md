# Vizlint Sprint Plan v1.2 — Final Update

> Apply ON TOP of v1.0 (vizlint-sprint-plan.txt) + v1.1 (vizlint-sprint-plan-v1.1-update.md).
> This is the last overlay before Sprint 1 begins.

---

## NEW SECTION: Product Architecture — No AI Model Required

**Vizlint does NOT use any AI/LLM API.** All analysis is deterministic static analysis:

- ESLint AST parsing for class extraction
- Regex pattern matching for arbitrary value detection
- Lookup tables for nearest-token suggestions (RGB color distance, spacing scale proximity)
- Config file parsing for design system awareness

This means:
- Zero API costs per scan
- Zero network calls (fully offline capable)
- Zero hallucinations — same input always produces same output
- Zero rate limits — runs as fast as the CPU allows
- No API key management for users
- Works in air-gapped / classified environments

**Vizlint complements AI, it doesn't compete with it.** Claude/GPT generates code. Vizlint validates the output. The MCP integration creates a feedback loop where the AI self-corrects using Vizlint's deterministic analysis.

---

## NEW SECTION: Five-Level User Control Model

Vizlint never overrides user intent. Users control exactly what gets flagged through five levels of granularity, from single-line exceptions to full team profiles.

### Level 1: Inline Ignore (per-instance)

```tsx
{/* vizlint-ignore no-arbitrary-colors -- brand gradient requires exact hex */}
<div className="bg-[#1E3A5F]" />
```

- Suppresses one violation on one line
- The `-- reason` comment is MANDATORY (enforced by Vizlint itself)
- Creates an audit trail of intentional exceptions
- Familiar pattern: identical to `eslint-disable-next-line`

### Level 2: Rule Configuration (per-project)

```json
// .vizlintrc.json → rules section
{
  "rules": {
    "no-arbitrary-colors": ["warn", { "allowlist": ["#1E3A5F", "#FFD700"] }],
    "no-arbitrary-spacing": ["error", { "allow": ["p-[18px]"] }],
    "responsive-required": "off",
    "typography-scale": "warn"
  }
}
```

- Standard ESLint severity model: "error" | "warn" | "off"
- Per-rule options for allowlists, thresholds, exceptions
- Every developer already understands this pattern

### Level 3: Design System Definition (team-wide)

```json
// .vizlintrc.json → designSystem section
{
  "designSystem": {
    "colors": {
      "brand-navy": "#1E3A5F",
      "brand-gold": "#FFD700",
      "brand-cream": "#FFF8E7",
      "error": "#E74C3C",
      "success": "#27AE60"
    },
    "fonts": {
      "body": "Inter",
      "heading": "DM Sans",
      "mono": "JetBrains Mono"
    },
    "spacing": {
      "unit": 6,
      "scale": [0, 6, 12, 18, 24, 30, 36, 48, 60, 72]
    },
    "borderRadius": {
      "default": "8px",
      "scale": ["4px", "8px", "12px", "16px"]
    }
  }
}
```

- Custom colors become recognized tokens — `bg-[#1E3A5F]` is NOT flagged, it's suggested as `bg-brand-navy`
- Custom spacing grid overrides Tailwind defaults — `p-[18px]` is valid on a 6px grid
- Custom font families are enforced — `font-[Roboto]` flagged if only Inter/DM Sans defined
- Auto-imported from `tailwind.config.js` or `@theme` CSS (see Tailwind Auto-Import below)

### Level 4: File/Folder Ignore Patterns

```json
// .vizlintrc.json → ignore section
{
  "ignore": [
    "src/legacy/**",
    "src/emails/**",
    "**/*.stories.tsx",
    "**/*.test.tsx",
    "**/node_modules/**"
  ]
}
```

- Entire directories or file patterns excluded from scanning
- Legacy code, email templates, test files, and generated code not flagged
- Standard glob pattern syntax

### Level 5: Severity Profiles

```json
// .vizlintrc.json → profiles section
{
  "profiles": {
    "prototype": {
      "description": "Relaxed rules for rapid prototyping and vibe coding",
      "rules": {
        "no-arbitrary-colors": "warn",
        "no-arbitrary-spacing": "warn",
        "typography-scale": "off",
        "responsive-required": "off",
        "consistent-component-spacing": "off",
        "a11y-color-contrast": "warn",
        "dark-mode-coverage": "off"
      }
    },
    "production": {
      "description": "Strict rules for shipping to real users",
      "rules": {
        "no-arbitrary-colors": "error",
        "no-arbitrary-spacing": "error",
        "typography-scale": "error",
        "responsive-required": "error",
        "consistent-component-spacing": "warn",
        "a11y-color-contrast": "error",
        "dark-mode-coverage": "warn"
      }
    },
    "accessibility": {
      "description": "Maximum accessibility enforcement",
      "rules": {
        "a11y-color-contrast": "error",
        "image-alt-text": "error",
        "missing-states": "error",
        "responsive-required": "error"
      }
    }
  }
}
```

- Activate via CLI: `vizlint scan --profile production`
- Same project, different strictness based on context
- Teams define custom profiles matching their workflow stages
- CI/CD uses `production` profile, local dev uses `prototype`

---

## NEW SECTION: Tailwind Config Auto-Import

Vizlint automatically reads the user's existing Tailwind configuration to eliminate manual `.vizlintrc.json` setup.

### How it works

**Tailwind v3:** Reads `tailwind.config.js` or `tailwind.config.ts`
```js
// tailwind.config.js — Vizlint extracts:
module.exports = {
  theme: {
    extend: {
      colors: {
        'brand-navy': '#1E3A5F',     // → designSystem.colors.brand-navy
        'brand-gold': '#FFD700',     // → designSystem.colors.brand-gold
      },
      spacing: {
        '18': '4.5rem',             // → added to designSystem.spacing.scale
      },
      fontFamily: {
        'sans': ['Inter', 'sans-serif'],   // → designSystem.fonts.body
        'heading': ['DM Sans', 'sans-serif'], // → designSystem.fonts.heading
      }
    }
  }
}
```

**Tailwind v4:** Reads `@theme` block in main CSS file
```css
/* app.css — Vizlint extracts: */
@theme {
  --color-brand-navy: #1E3A5F;     /* → designSystem.colors.brand-navy */
  --color-brand-gold: #FFD700;     /* → designSystem.colors.brand-gold */
  --font-sans: "Inter", sans-serif;
  --spacing-18: 4.5rem;
}
```

**CSS Custom Properties:** Reads `:root` blocks
```css
:root {
  --color-primary: #1A5276;        /* → designSystem.colors.primary */
  --color-secondary: #27AE60;      /* → designSystem.colors.secondary */
}
```

### The init experience

```
$ npx vizlint init

  ✓ Detected Tailwind v4 with @theme config in src/app.css
  ✓ Found 12 custom colors
  ✓ Found 8px spacing unit with 13 scale values
  ✓ Found font families: Inter, DM Sans, JetBrains Mono
  ✓ Detected framework: Angular (from @angular/core)

  Generated .vizlintrc.json with your design system tokens.
  Your design system is now the source of truth for Vizlint rules.

  Run vizlint scan to see your Design Health Score.
```

Zero manual configuration for projects with existing Tailwind setup.

---

## SPRINT PLAN CHANGES

### Sprint 1 — Add to VIZ-001: Config Schema

**Add these tasks to VIZ-001 (Monorepo & CI/CD Setup):**

8. Define `.vizlintrc.json` JSON Schema with Zod validation covering all 5 control levels
9. Schema includes: rules (severity + options), designSystem (colors, fonts, spacing, borderRadius), ignore (glob patterns), profiles (named rule sets)
10. Create `@vizlint/shared` package with schema types exported for cross-package use
11. Write schema validation tests including invalid config error messages

**Add these acceptance criteria:**
- `.vizlintrc.json` validates against Zod schema with clear error messages for invalid config
- Schema supports all 5 control levels documented above
- Shared types importable from `@vizlint/shared` in all packages

**Story points impact:** +2 (from 5 to 7)

---

### Sprint 1 — Add VIZ-001B: Tailwind Config Auto-Import

#### VIZ-001B: Tailwind Config Auto-Import Utility (5 points)

**As a** developer with an existing Tailwind project,
**I want** Vizlint to automatically read my Tailwind config and know my design system,
**so that** I get accurate suggestions without any manual configuration.

**Acceptance Criteria:**
- Reads `tailwind.config.js` / `tailwind.config.ts` for v3 projects
- Reads `@theme` CSS blocks for v4 projects
- Reads `:root` CSS custom properties as fallback
- Extracts: custom colors, spacing scale, font families, border radius
- Auto-detection: looks for tailwind config in standard locations
- Produces valid `.vizlintrc.json` designSystem section
- Merged with any manually defined config (manual overrides auto-imported)

**Tasks:**
1. Build Tailwind v3 config reader (import and parse JS/TS config)
2. Build Tailwind v4 `@theme` CSS parser (regex + PostCSS for robustness)
3. Build CSS custom property parser for `:root` blocks
4. Build merge logic: auto-imported tokens + manual overrides
5. Create auto-detection: search for tailwind config files in project root
6. Write tests against real Tailwind v3 and v4 project fixtures
7. Export `importTailwindConfig()` from `@vizlint/shared` for use in init wizard and rules

**Test Cases:**
- TEST: Reads custom colors from `tailwind.config.js` `theme.extend.colors`
- TEST: Reads custom colors from `@theme { --color-brand: #1E3A5F }` in CSS
- TEST: Reads CSS custom properties from `:root` block
- TEST: Manual `.vizlintrc.json` colors override auto-imported colors
- TEST: Returns empty designSystem gracefully if no Tailwind config found
- TEST: Handles `tailwind.config.ts` (TypeScript config) correctly

---

### Sprint 1 Revised Total

| Story | Points | Status |
|-------|:---:|--------|
| VIZ-001 (Monorepo + Schema) | 7 | Updated (+2) |
| VIZ-001B (Tailwind Auto-Import) | 5 | NEW |
| VIZ-002 (no-arbitrary-colors + Tailwind v4) | 11 | From v1.1 |
| **Sprint 1 Total** | **23** | High velocity sprint — foundation week |

This is aggressive for Week 1. If VIZ-001B slips, it moves to Sprint 2 without blocking anything — rules work with manual config until auto-import is ready.

---

### Sprint 7 — Updated VIZ-017: Init Wizard with Profiles

**Add to VIZ-017 acceptance criteria:**

- Init wizard asks "How strict should Vizlint be?" with three options:
  - Prototype (relaxed — ideal for vibe coding and rapid iteration)
  - Production (strict — for shipping to real users)
  - Custom (configure each rule individually)
- Selected profile written to `.vizlintrc.json` as active profile
- Init wizard runs Tailwind auto-import and shows discovered tokens
- Init wizard shows estimated Design Health Score preview: "Based on a quick scan, your project scores ~72/100"

**Add task:**
8. Integrate Tailwind auto-import into init flow
9. Add profile selection prompt
10. Add quick-scan preview (scan first 20 files for instant score estimate)

---

## NEW SECTION: Why Vizlint Survives AI Model Improvement

This section documents the strategic positioning for investor/advisor conversations and the landing page.

### What AI models CAN do (and will get better at):
- Generate cleaner Tailwind code with fewer arbitrary values
- Follow design system instructions when given in the prompt
- Produce more consistent spacing and typography over time

### What AI models CANNOT do (structural limitations):

1. **Know your design system permanently.** Every prompt starts fresh. Vizlint's `.vizlintrc.json` persists across every developer, every tool, every CI run.

2. **Enforce consistency across a team.** Developer A uses Claude, Developer B uses Cursor, Developer C uses Copilot. Each gets different output. Vizlint is the single source of truth that normalizes all of them.

3. **Run deterministically in CI/CD.** You can't put "ask Claude if this PR looks good" in a GitHub Action. Vizlint is a binary pass/fail gate — reproducible, no API costs, no rate limits.

4. **Prevent drift over time.** After 50 prompts, AI-generated code drifts from the original design system. Vizlint catches drift on every commit.

5. **Provide an audit trail.** Regulated industries need evidence that design standards were checked. Vizlint produces SARIF reports, Design Health Score history, and inline ignore comments with mandatory reasons.

### The positioning:

```
AI models improve generation quality (input side)
Vizlint ensures output quality (output side)

Better AI = better first drafts
Vizlint = guarantee that the final output meets YOUR standards

They are complementary. Better AI doesn't eliminate Vizlint —
it makes Vizlint's job easier (fewer violations to catch)
while the need for enforcement remains permanent.
```

### Analogy for the landing page:

"TypeScript didn't kill the need for unit tests. Better code generators don't kill the need for quality gates. Vizlint is the design quality gate that ensures every component — whether written by a human, Claude, Cursor, or Copilot — meets your team's standards."

---

## REVISED COMPETITIVE POSITIONING TABLE

| Capability | Vizlint | Claude/GPT | Buoy.design | eslint-plugin-tailwindcss | CodeRabbit |
|------------|:---:|:---:|:---:|:---:|:---:|
| Knows YOUR design system | ✅ (config) | ❌ (per-prompt) | ✅ (config) | ❌ | ❌ |
| Deterministic (same result every time) | ✅ | ❌ | ✅ | ✅ | ❌ |
| Works offline / air-gapped | ✅ | ❌ | ✅ | ✅ | ❌ |
| Zero API costs | ✅ | ❌ ($$$) | ✅ | ✅ | ❌ |
| CI/CD quality gate | ✅ | ❌ | ✅ | ❌ | ✅ |
| Auto-fix violations | ✅ (8/14 rules) | N/A | ❌ | ❌ | ❌ |
| Interactive fix mode | ✅ | N/A | ❌ | ❌ | ❌ |
| MCP real-time loop | ✅ | N/A (IS the generator) | ❌ | ❌ | ❌ |
| Spacing consistency | ✅ | ❌ | ❌ | ❌ | ❌ |
| Typography hierarchy | ✅ | ❌ | ❌ | ❌ | ❌ |
| Color contrast (a11y) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Responsive coverage | ✅ | ❌ | ❌ | ❌ | ❌ |
| Dark mode coverage | ✅ | ❌ | ❌ | ❌ | ❌ |
| 5-level user control | ✅ | ❌ | Partial | Partial | Partial |
| Tailwind auto-import | ✅ | N/A | Unknown | N/A | N/A |
| Framework agnostic | ✅ | ✅ | Partial | React only | All (code, not design) |
| Design Health Score | ✅ | ❌ | ✅ | ❌ | ❌ |
| Severity profiles | ✅ | ❌ | ❌ | ❌ | ❌ |
| Audit trail | ✅ | ❌ | Partial | ❌ | ✅ |

---

## NEW SECTION: Product Vision — Beyond a Linter (v1.2 Strategic Expansion)

> Added April 2026 based on market research and strategic analysis.
> This section expands Vizlint's scope from "ESLint plugin" to "design quality infrastructure."
> See VIZLINT-EXECUTION.md for implementation staging and gating criteria.

### The Market Opportunity (April 2026)

- 92% of US developers use AI coding tools daily. 41-42% of all new code is AI-generated.
- AI-generated PRs have 1.7x more issues, 3x readability problems, 2.74x security vulnerabilities.
- Developer trust in AI code has collapsed: favorability dropped from 77% → 60%.
- The AI code review market is $12.8B. CodeRabbit ($88M raised), Qodo ($70M raised), Anthropic Code Review — all focus on logic/security. **Nobody owns design quality.**
- eslint-plugin-tailwindcss (5.9M downloads/month) has stalled on Tailwind v4. eslint-plugin-jsx-a11y (123M downloads/month) is React-only.
- No existing tool combines design system enforcement + accessibility + responsiveness + framework-agnostic linting in a single, local-first ESLint plugin.

### Five-Level Product Hierarchy

| Level | What | For Whom |
|-------|------|----------|
| **L1: ESLint Plugin** | Rules that catch design quality violations | Individual developers |
| **L2: Design Quality CLI** | Scan + Score + Fix for whole projects | Teams using CI/CD |
| **L3: AI Code Quality Gate** | MCP server + Hooks + AI self-correction loop | AI tool users |
| **L4: Design System Compliance Engine** | Token import (Figma/W3C/Tailwind) + cross-file analysis + design debt + compliance reports | Enterprise design system teams |
| **L5: Embeddable Design Quality API** | Core engine as a library for platform integration | AI code generation platforms |

L1-L2 are built. L3-L5 are the path from "nice linter" to "acquisition-worthy infrastructure."

### What Each Target Company Needs

**Anthropic / Claude Code:**
- Code Review (March 2026) explicitly ignores style. `frontend-design` skill is guidance-only. IBM research says LLM review + deterministic static analysis = optimal.
- Vizlint = the deterministic design quality enforcement layer. Hook-integrated (auto-lint after edits). MCP Apps UI (live score in chat). "Skills + Enforcement" pair.

**Figma:**
- MCP server provides tokens TO code generation but has zero output validation. No "enforcement" story. Design-code drift is undetected.
- Vizlint = the verification layer completing their pipeline. Figma MCP → AI generates → Vizlint validates. Design-code alignment metric.

**Lovable / Bolt / v0 / Google Stitch:**
- Users burn credits in debugging loops from design quality problems. Lovable: security incidents. Bolt: 31% enterprise success rate. Stitch: "falls apart in existing design systems."
- Vizlint = built-in quality gate reducing credit waste. AI self-corrects before user sees bad version. Design Quality Score as a product feature.

**Enterprise Design System Teams:**
- Every enterprise builds bespoke ESLint rules. Design debt measured via manual audits. Component usage tracked but quality is not.
- Vizlint = general-purpose compliance linter. Design debt as a number. Component quality analytics. DORA-equivalent metrics for design.

### Positioning

> "Visual regression tools tell you the screenshot looks wrong. Vizlint tells you why — and fixes it."

Screenshot diffing (Applitools, Percy, Chromatic) is a $500M+ category that operates at the pixel level.
Code-level design quality enforcement is a **zero-player category** — no one owns it yet.

---

## NEW SECTION: Expanded Capability Roadmap

These capabilities are staged per VIZLINT-EXECUTION.md Stages 2-4. They do NOT override the trust-first validation approach.

### Stage 2 Capabilities (Post-Validation)

#### Accessibility Expansion (6-9 new rules)

Target: Cover the automatable WCAG 2.1 AA criteria that AI code consistently gets wrong. All rules framework-agnostic (React + Vue + Svelte + Angular + HTML).

| Rule | What It Catches | WCAG Criteria |
|------|----------------|---------------|
| `heading-hierarchy` | h3 used before h1, skipped levels | 1.3.1 Info & Relationships |
| `keyboard-navigation` | Interactive elements without keyboard handlers | 2.1.1 Keyboard |
| `focus-indicators` | `outline-none` without visible replacement | 2.4.7 Focus Visible |
| `aria-validation` | Misused roles, redundant ARIA, missing required attrs | 4.1.2 Name, Role, Value |
| `semantic-html` | div used instead of nav/main/aside/dialog/section | 1.3.1 Info & Relationships |
| `skip-navigation` | No "skip to content" link on layouts | 2.4.1 Bypass Blocks |
| `form-labels` | Inputs without associated label elements | 1.3.1 / 3.3.2 Labels |
| `touch-target-size` | Tap targets smaller than 24x24 CSS px | 2.5.8 Target Size |
| `prefers-reduced-motion` | Animations without `prefers-reduced-motion` check | 2.3.3 Animation from Interactions |

Why now: ADA Title II deadline April 26, 2026. EAA enforceable since June 2025. 5,100+ federal lawsuits in 2025 (+37% YoY). eslint-plugin-jsx-a11y is React-only. No framework-agnostic competitor exists.

#### Design System Input Expansion

| Source | Format | What It Unlocks |
|--------|--------|-----------------|
| **W3C Design Tokens** | `.tokens.json` (DTCG spec 2025.10) | Standard format — connects to Figma → Tokens Studio → Style Dictionary pipeline |
| **Figma Variables API** | REST API / MCP `get_variable_defs` | Direct Figma sync — no middleware needed |
| **CSS/SCSS files** | `.css`, `.scss`, `.module.css` | Catch design token violations in stylesheets, not just Tailwind classes |
| **Style Dictionary output** | Generated CSS variables | Auto-detect Style Dictionary builds |

#### Cross-File Consistency Engine

Per-file linting is commodity. Project-wide analysis is the differentiator:

- **Component inventory:** "47 Button instances across 23 files. Here's how they diverge."
- **Token usage map:** "These 12 files use non-standard colors."
- **Consistency score:** "83% of Card components use p-4. 17% use p-6 or p-[18px]."
- **Design drift detection:** "14 new arbitrary values introduced this week."

### Stage 3 Capabilities (Post-Adoption)

> **Update 2026-04-07:** The KPMG 7-Moat defensibility strategy pulled
> five of the items below forward into **Phase 1 (Enterprise Foundation)**
> which is now ✅ complete. Shipped: Design Debt Scoring (VIZ-026),
> Quality Gates (VIZ-027), Trend Command (VIZ-028), W3C Design Tokens
> import (VIZ-029), WCAG 2.2 Compliance Report (VIZ-030). All were
> shipped opt-in / additive — zero breaking changes for v0.1.0 users.
> See `VIZLINT-EXECUTION.md` Section 15 for the full 7-moat plan and
> Phase 2/3 scheduling.


#### Claude Code Hooks Integration
```json
// .claude/settings.json
{
  "hooks": {
    "PostToolUse": [{
      "matcher": "Edit|Write",
      "command": "npx vizlint scan --format json --quiet"
    }]
  }
}
```
Auto-validates after every file edit. Claude sees violations and self-corrects before presenting to developer.

#### MCP Apps UI
Render a live Design Health Score dashboard inside Claude Code / Cursor chat window using the MCP Apps extension (SEP-1865, January 2026). Score updates in real-time as AI generates code.

#### Embeddable Core Engine
```typescript
import { analyze } from '@vizlint/core';

const result = analyze(sourceCode, {
  framework: 'react',
  designSystem: myTokens,
  rules: { 'no-arbitrary-colors': 'error' }
});
// → { violations: [...], score: 87, fixes: [...] }
```
Pure function API for platforms (Lovable, Bolt, v0, Stitch) to integrate into their generation pipeline.

#### Component Library Presets
```json
// .vizlintrc.json
{
  "extends": ["vizlint:shadcn-ui"]
}
```
Reduces false positives by knowing which classes come from the library vs. custom code. Presets for: shadcn/ui, MUI, Chakra, Radix, Ant Design.

#### Enterprise Reports
- **HTML report:** Shareable, branded design quality summary
- **PDF report:** For compliance teams, investors, client handoffs
- **WCAG conformance mapping:** Violations mapped to specific WCAG success criteria
- **VPAT-compatible export:** For enterprise procurement / Section 508

#### Design Debt Scoring
```
Design Debt Score: 34 (was 28 last month)
Primary contributor: 47 new arbitrary colors in checkout module
Trend: ↑ 21% over 4 weeks — design system adoption is declining
```

---

## UPDATED COMPETITIVE POSITIONING TABLE (April 2026)

| Capability | Vizlint | jsx-a11y (123M/mo) | tailwindcss plugin (5.9M/mo) | CodeRabbit ($88M) | Qodo ($70M) | Applitools/Percy |
|------------|:---:|:---:|:---:|:---:|:---:|:---:|
| Design token enforcement | ✅ | ❌ | Partial | ❌ | ❌ | ❌ |
| Accessibility (WCAG) | ✅ (expanding) | ✅ (React only) | ❌ | ❌ | ❌ | ❌ |
| Framework agnostic | ✅ (5 frameworks) | ❌ (React) | ❌ (React) | ✅ | ✅ | ✅ |
| Spacing/typography/z-index | ✅ | ❌ | Partial | ❌ | ❌ | ❌ |
| Responsive coverage | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Dark mode coverage | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Design Health Score | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Auto-fix | ✅ (8/14 rules) | ❌ | ❌ | ❌ | ❌ | ❌ |
| MCP AI self-correction | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Cross-file consistency | 🔜 Stage 2 | ❌ | ❌ | ❌ | ❌ | ❌ |
| W3C Design Tokens | 🔜 Stage 2 | ❌ | ❌ | ❌ | ❌ | ❌ |
| Figma token import | 🔜 Stage 2 | ❌ | ❌ | ❌ | ❌ | ❌ |
| CSS file scanning | 🔜 Stage 2 | ❌ | ✅ | ❌ | ❌ | ❌ |
| Compliance reports | 🔜 Stage 3 | ❌ | ❌ | ❌ | ❌ | ❌ |
| Embeddable engine | 🔜 Stage 3 | ❌ | ❌ | ❌ | ❌ | ❌ |
| Local-first / offline | ✅ | ✅ | ✅ | ❌ (cloud) | ❌ (cloud) | ❌ (cloud) |
| Deterministic | ✅ | ✅ | ✅ | ❌ (LLM) | ❌ (LLM) | ✅ |
| CI/CD gate | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ |

---

## UPDATED STORY POINTS SUMMARY

| Phase | v1.0 | v1.1 | v1.2 | Notes |
|-------|:---:|:---:|:---:|:---:|
| Phase 1 (Sprints 1–4) | 49 | 54 | 61 | Foundation — COMPLETE |
| Phase 2 (Sprints 5–8) | 47 | 50 | 50 | CLI & Score — COMPLETE |
| Phase 3 (Sprints 9–12) | 47 | 47 | 47 | MCP & CI/CD — COMPLETE |
| Phase 4 (Sprints 13–16) | 44 | 44 | 44 | Deferred per VIZLINT-EXECUTION.md |
| **Stage 2 new work** | — | — | ~65 | A11y + tokens + cross-file + MCP validation |
| **Stage 3 new work** | — | — | ~80 | Hooks + embeddable + reports + VS Code |
| **Total built** | — | — | **202** | Sprints 1-12 complete |
| **Total remaining** | — | — | **~189** | Stages 2-4 (estimate) |

---

## DOCUMENT HIERARCHY

Your complete implementation reference is these documents read in order:

1. **VIZLINT-EXECUTION.md** — **READ FIRST.** Active execution plan. Overrides all sprint plan sequencing. Contains product vision, staging, gating criteria.
2. **vizlint-sprint-plan.docx** — Original 16-sprint plan with all user stories (Sprints 1-12 complete)
3. **vizlint-sprint-plan-v1.1-update.md** — Three-mode model, ESLint v10, Tailwind v4, Angular, fixability matrix
4. **vizlint-sprint-plan-v1.2-update.md** (this document) — Five-level user control, no-AI architecture, Tailwind auto-import, L3-L5 product vision, strategic positioning, expanded roadmap

The trust-first approach remains: validate first, expand second. But the expansion now has a clear destination — L3-L5 capabilities that make Vizlint acquisition-worthy.
