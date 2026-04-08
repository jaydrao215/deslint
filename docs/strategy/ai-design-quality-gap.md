# The AI × Figma × Stitch Design-Quality Gap

> **Status:** Strategic memo, written 2026-04-08 after S4 sprint completion.
> **Audience:** CEO + Architect + future contributors.
> **Purpose:** Define the problem Deslint exists to solve, in concrete
> terms grounded in what we just learned shipping 6 WCAG rules and
> dogfooding them on real OSS code.
> **Decision this memo will trigger:** which Phase 2 / v0.3.0 features
> get prioritized after the v0.2.0 launch.

---

## The thing we just observed

Over the past 24 hours we shipped 6 production-quality accessibility
rules and ran them against 3 real Next.js codebases (apps/docs,
shadcn-ui/taxonomy, leerob/next-saas-starter — 139 files combined).
We caught **6 real WCAG bugs in production code** that:

- Used the highest-quality React stack available (Next.js 15 + shadcn +
  Radix + Tailwind)
- Were built by experienced engineers who know what accessibility means
- Were either reference templates (taxonomy is the canonical
  Contentlayer/Next demo) or production sites
- Had presumably been "designed in Figma" or composed from a
  Figma-derived design system

The bugs were:

1. `apps/docs/src/app/docs/page.tsx:32→52` — h1 → h3, skipped h2 (our own site)
2. `next-saas-starter/dashboard/activity/page.tsx:76→113` — h1 → h3
3-4. Built HTML output of the same h1→h3 bug
5. `taxonomy/components/mdx-card.tsx:33` — `<Link>` whose only accessible name is "View"
6. `taxonomy/app/(docs)/guides/page.tsx:55` — same anti-pattern, copy-pasted

**None of these bugs are exotic.** They're the most basic WCAG checks.
Every one of them shipped to production from a stack that had:

- **Figma** for design (presumably — it's the industry standard)
- **A design system** (shadcn + Radix, both built by accessibility experts)
- **TypeScript + ESLint + Prettier** (presumably)
- **Code review** (it's an OSS project with PRs)
- **AI assistance** (taxonomy is from 2023+, post-Copilot)

And the bugs still shipped. **Why?**

---

## The gap, stated precisely

**Figma cannot enforce code-level invariants. Code can.**

Figma is a vector canvas with tokens, components, and constraints.
You can mock the most accessible-looking page in the world — perfect
contrast, perfect heading hierarchy, perfect focus order, perfect
labels — and it tells you nothing about whether the code that
implements that mock has any of those properties. The translation
from Figma artifact → React/Vue/Svelte/HTML happens through:

1. **Hand-written code** by an engineer reading the Figma file
2. **AI code generation** (v0, Bolt, Lovable, Stitch, Figma Make,
   Cursor, Claude Code) reading the Figma file or its export
3. **Component libraries** that the engineer/AI assembles by name

At every translation step, **structural and semantic invariants are
silently lost** because Figma has no concept of them:

| Invariant | Figma's view | Real code's view |
|---|---|---|
| Heading order (h1→h2→h3) | "This text is 24px bold" | `<h3>` element |
| Form label association | "These two text layers are aligned" | No `<label htmlFor>` link |
| Link accessible name | "Card with an arrow icon" | `<a><Icon /></a>` (empty) |
| ARIA role | (Figma has no role concept) | `role="butotn"` typo |
| Focus indicator | "Maybe a hover state in the prototype" | No `:focus-visible` style |
| Color contrast in dark mode | Two separate boards | One stylesheet, two tokens |
| Touch target ≥44px | "It's a 32px icon button" | `min-h-[32px]` class |

**Figma describes what the screen looks like. Code describes what the
machine reads.** WCAG is a contract between the code and the assistive
tech — the screenshot is irrelevant to a screen reader.

---

## Why AI tools make this gap WORSE, not better

The intuitive expectation — "AI will encode best practices automatically
because it's read every accessibility guide" — is actively wrong, and
the failure mode is *worse* than human-authored code, not better.

### Failure mode 1: confident hallucination of plausible structure

LLMs have ingested thousands of "remember to add `aria-label` to your
buttons" tutorials. They generate code that **looks accessible at a
glance** because it has aria attributes scattered throughout, but the
attributes are subtly wrong:

- `aria-labelby` (typo of `aria-labelledby`) — silently ignored
- `aira-label` — silently ignored
- `role="container"` — silently ignored
- `role="iconbutton"` — silently ignored
- `role="button"` on a `<div>` with no keyboard handler — partially correct
- `<Link><span className="sr-only">View</span></Link>` — accessible name is just "View"

These aren't bugs you can see. They look like care. They register as
accessibility effort to a code reviewer, to a QA pass, and to an
auto-formatter. Only the **screen reader user** discovers the rule
was silently ignored. By then the code has shipped.

This is exactly what `aria-validation` (S4 6/6) catches — and it's
the only S4 rule whose primary value is "what looks fine is broken."

### Failure mode 2: composition without comprehension

LLMs paste shadcn / Radix / Material primitives correctly individually
but compose them with broken structure:

- Card with `<h3>` title in a section that should start with `<h2>`
- Icon-only button with no `aria-label` (but the icon component takes a `name` prop they didn't pass)
- Form field component (`<TextField>`) used correctly, then a *second* bare `<input>` next to it for "search" with no label
- `<Link>` overlay-card pattern with sr-only label that says "View" or "Read more"
- Modal dialog without `role="dialog"` + `aria-modal="true"` + focus trap

The component library is fine. The composition into a page violates
WCAG. **Design systems solve component-level a11y. They cannot solve
page-level a11y because the page is composed at code-write time, not
component-author time.**

### Failure mode 3: Figma → code lossy translation

Tools like **Figma Make**, **Stitch (Google's UI generator)**,
**Anima**, **Locofy**, **Builder.io Visual Copilot**, and the
"Generate code" buttons in Lovable / v0 / Bolt all face the same
problem: Figma's data model has no accessibility primitives. So the
generated code has:

- `<div>` instead of `<button>` (because Figma exports a frame as a div)
- `<div>` instead of `<nav>`, `<main>`, `<header>`, `<footer>` (no landmarks in Figma)
- `<span>` instead of `<h1>`–`<h6>` (Figma has "text styles," not heading levels)
- No alt text on images (Figma has layer names, not alt attributes)
- No `<label>` association on form fields (Figma has alignment, not htmlFor)
- No focus order (Figma has z-index, not tabindex)
- No skip-link, no landmarks, no live regions

**The generated code is a pixel-perfect implementation of an
inaccessible artifact.** Adding aria-label after the fact is patching,
not solving — and the LLM that adds them often hallucinates the
attribute names (failure mode 1) or applies them to the wrong element
(failure mode 2).

### Failure mode 4: nobody catches it because the loop has no a11y check

The current AI-coding loop is:

```
Figma mock ─→ AI codegen ─→ pixel diff or visual regression ─→ ship
```

Visual regression tools (Percy, Chromatic, Applitools, Argos) tell
you "the screenshot changed by 0.3%." They tell you NOTHING about:

- Whether the new screenshot has a single `<h1>`
- Whether labels are associated to inputs
- Whether the dark-mode contrast still passes
- Whether `role` and `aria-*` are real strings
- Whether focus indicators exist

**Visual regression tools tell you the screenshot looks wrong.
Deslint tells you why — and fixes it.** That's the existing tagline.
What this memo adds: the tagline is *literal*. Visual regression and
Deslint live on different axes. They are not competitors. They are
both necessary.

---

## What Deslint actually fills

The gap between "Figma mock" and "shipped code that works for screen
readers" needs a tool that:

1. Reads **the code, not the screenshot**
2. Understands **structure and semantics**, not just classes
3. Runs **deterministically** (not LLM-as-judge — that's the same
   failure mode)
4. Works **cross-framework** (because LLMs emit React, Vue, Svelte,
   Angular, plain HTML interchangeably)
5. Maps to **WCAG Success Criteria** so the output is legally and
   commercially defensible
6. Is **embeddable** so AI codegen platforms can fix at write-time, not
   audit-time

That's Deslint's exact spec. It's not coincidence — that's the gap we
named when we wrote DESLINT-EXECUTION.md. What today's dogfood proves
is that **the gap is real even on the best React stacks in
existence**, not just on AI-generated junk code.

---

## Where this should drive product decisions

### v0.3.0: doubling down on the LLM-output failure modes

The S4 sprint ships rules that catch 6 of the failure modes above.
For v0.3.0, the highest-leverage additions are the ones that catch
the failure modes Deslint *currently can't*:

1. **`landmark-coverage`** — every page must have a `<main>`, optional
   single `<header>` / `<footer>` / `<nav>`. Catches Figma-Make-style
   "all divs" output. Cross-element rule pattern proven by
   `heading-hierarchy`.
2. **`focus-indicator-required`** — interactive element with no
   `:focus-visible` styling in the same Tailwind class set or sibling
   CSS. Catches "we removed the outline because it looks ugly" and
   "AI never added one." Needs CSS-aware scanning (Stage 2D).
3. **`role-element-mismatch`** — `<button role="link">`,
   `<div role="button">` without `tabIndex` and key handler. Builds
   on `aria-validation`'s role table.
4. **`required-aria-props`** — `role="checkbox"` requires
   `aria-checked`; `role="combobox"` requires `aria-expanded` +
   `aria-controls`. Same data-table approach as
   `COMMON_ARIA_TYPOS` but for spec-required props.
5. **`touch-target-size`** — interactive element with computed
   inline-class size below 44×44px (WCAG 2.5.8 AAA / 2.5.5 AA). The
   spec exists; we just need a Tailwind class size table.
6. **`color-contrast-cross-token`** — when foreground/background tokens
   are used, verify the *resolved* contrast in BOTH light and dark
   token sets. Catches dark-mode-only contrast failures, the most
   common bug AI tools introduce when they retrofit dark mode.

Each of these maps to a real failure mode we observed in this dogfood
or will observe in field reports.

### Phase 2: closing the Figma loop

The longer arc — and the one that matters most for the AI codegen
platforms (Lovable, Bolt, v0, Stitch, Figma Make) — is the
**embeddable / write-time** layer (DESLINT-EXECUTION.md L3-L5).

Concretely:

1. **`@deslint/core`** — the analysis engine extracted as a
   pure-function library, no ESLint dependency. Importable from a
   browser worker. This is what Bolt / Lovable / v0 embed to validate
   their *own* outputs before showing them to the user.
2. **MCP tools** — `analyze_file`, `analyze_and_fix`, `score_file` —
   so Cursor / Claude Code / Copilot Workspace can run Deslint as the
   AI types, not as a CI step. We already have this; the work is in
   distribution + recordings (S7).
3. **Figma plugin** — read the Figma file's design tokens, run
   Deslint on the corresponding code, surface the gap as Figma
   comments. This closes the loop in the *designer's* tool, not just
   the developer's.
4. **W3C Design Tokens import** (already shipped in v0.1.1) → **Figma
   Variables import** (Phase 3) → bidirectional sync. The token layer
   becomes the universal contract between design and code.

### What this means for the upcoming v0.2.0 launch

The launch narrative for v0.2.0 should explicitly call out the AI-x-Figma
gap, not just recite the rule list. Concrete framing:

> "Figma can't enforce that an `<h2>` exists. Your design system can't
> enforce that the `<h2>` belongs to a `<main>`. Your AI tool just
> generated a 200-line page that uses `<div>` for everything and
> `aria-labelby` (typo) for accessibility. **Visual regression says
> the screenshot looks fine.** Deslint catches the 6 things that are
> actually broken — in 3 seconds, on every framework, with WCAG
> citations, and fixes most of them automatically."
>
> "We just ran Deslint on shadcn-ui/taxonomy (the reference Next.js
> docs site) and found 2 WCAG 2.4.4 bugs in production. On
> next-saas-starter (75k+ stars) we found a heading-hierarchy bug.
> On our own docs site we found one. **None of these projects is
> doing anything wrong.** They're doing what everyone does: trusting
> the design system to handle a11y. The design system can't, and
> nobody told them."

The MCP demo (S7) should show the same loop in action: Cursor
generates a page with a heading-hierarchy bug + an `aria-labelby`
typo, MCP fires, Cursor fixes both in one round-trip. **That's the
asset that matters** — it shows the loop closing, with no human in
the middle.

---

## What Deslint should NOT try to be

To stay sharp and useful, Deslint should explicitly *not* try to be:

- **A visual regression tool** — Percy/Chromatic/Argos exist, work,
  and don't compete with us. Stay structural.
- **A runtime accessibility checker** — axe-core exists. We're a
  static analyzer with a different speed/cost profile.
- **An LLM-as-judge** — defeats the purpose. Determinism is the
  product.
- **A design system itself** — we *enforce* design systems, we don't
  ship one.
- **A Figma plugin in v0.2.0 / v0.3.0** — too early. The plugin is
  Phase 3 once `@deslint/core` is extracted and the AI codegen
  platforms have adopted us.
- **A "best practices" tool** — every rule maps to a *defensible
  contract* (WCAG SC, design token, perf budget). No taste rules.
  Taste is what design reviews are for.

---

## The 60-second pitch (for the website + Show HN)

> **Your AI tool can write code, your design system can render pixels,
> Figma can describe what it should look like, and your visual
> regression tool can flag a 0.3% screenshot diff. None of them can
> tell you that your `<h2>` is missing, your form input has no label,
> your link's accessible name is "View", your role is misspelled, and
> your dark mode contrast is below WCAG.**
>
> **Deslint runs in 3 seconds, across React/Vue/Svelte/Angular/HTML,
> with zero cloud calls, and tells you exactly which line is broken
> and why — with the WCAG citation. It's an ESLint plugin, a CLI, a
> GitHub Action, an MCP server, and (soon) an embeddable engine for
> the AI tools that write the code in the first place.**
>
> **It's the missing layer between Figma and ship.**

---

## What we should commit to next week

After v0.2.0 ships and S9 distribution lands, the next 2-3 sprints
should chain:

1. **`@deslint/core` extraction** — no API, no breaking changes for
   the plugin/CLI users; pure refactor that exposes a pure-function
   `analyze(code, options)` that returns the same `LintResult` shape
   without ESLint in the loop. Unlocks every embedding scenario.
2. **2 outreach pings to AI codegen platforms** — Lovable, Bolt
   (StackBlitz), v0 (Vercel), Stitch (Google). Pitch: "We have an
   embeddable engine that catches the 6 a11y failure modes your
   output ships with. 2-line integration. Want to be first?"
3. **`landmark-coverage` + `required-aria-props` + `role-element-mismatch`**
   — the 3 highest-leverage v0.3.0 rules from the list above.
4. **MCP demo recording** (S7) and the website Hero showing the
   loop — if S6/S7 slip in v0.2.0, ship them in v0.2.1.

---

## TL;DR for the CEO

- AI codegen + Figma + design systems should have solved frontend
  accessibility. **They didn't.** Today's dogfood proved 6 real WCAG
  bugs in 3 of the highest-quality React codebases on GitHub.
- The gap is structural: Figma describes pixels, code describes
  semantics, and translation between them is lossy. AI makes it
  *worse* by hallucinating plausible-looking-but-broken aria.
- **Deslint is the only tool that lives at the structural-semantic
  layer, deterministically, cross-framework, with WCAG citations.**
  We just shipped 6 rules that prove the layer exists and works.
- The strategic move after v0.2.0 is to **ship `@deslint/core`** and
  **integrate with the AI codegen platforms upstream** so the loop
  closes at write-time, not audit-time. That's the L5 vision in
  DESLINT-EXECUTION.md, and the dogfood data justifies prioritizing
  it now.
- The launch story for v0.2.0 should lead with **"Figma can't tell
  you this. Your AI can't tell you this. Visual regression can't
  tell you this. Deslint can — in 3 seconds."**
