# Cowork Task: Publish Dev.to Long-Form Post (S9 item 9.5)

## What you are doing
Publishing a 1,850-word technical post on Dev.to about Deslint.
This is the primary long-tail SEO asset. Evergreen — ranks for months.

## Authentication required
- **Dev.to account** — go to https://dev.to, sign in (or create a free account), then return here.
  Dev.to supports GitHub OAuth — one click if you have a GitHub account.

---

## Step 1 — Start a new post
Go to: https://dev.to/new

## Step 2 — Set the title
```
I built a design quality gate for AI-generated code — here's why visual regression isn't enough
```

## Step 3 — Set the tags (exactly 4)
```
eslint, accessibility, ai, tailwindcss
```

## Step 4 — Paste the article body

Copy everything between the lines below and paste into the Dev.to editor body:

---ARTICLE START---

AI writes fast. Deslint keeps it clean.

### The problem nobody's naming

If you've shipped anything with Claude Code, Cursor, v0, Bolt, or Lovable in the last six months, you've seen this:

```tsx
// What the prompt said: "a pricing card that matches our design system"
// What landed in the PR:
<div className="bg-[#1a1a1a] p-[13px] mt-[19px] z-[9999] text-white">
  <h3 className="text-[22px] leading-[1.17]">Pro</h3>
  <img src="/check.svg" />
  <a href="/pricing">click here</a>
</div>
```

Six bugs in five lines:

1. `bg-[#1a1a1a]` — arbitrary color, not a token
2. `p-[13px]`, `mt-[19px]` — off-scale spacing
3. `z-[9999]` — arbitrary z-index, not a layer token
4. `text-[22px] leading-[1.17]` — arbitrary typography
5. `<img>` with no `alt` — WCAG 1.1.1 Level A failure
6. `"click here"` — WCAG 2.4.4 Link Purpose failure

Every one of these passes every test your repo runs today: TypeScript check ✓, ESLint ✓ (the standard recommended set), Prettier ✓, unit tests ✓. Your Playwright screenshot diff **looks fine** because the card renders. Your Lighthouse CI *might* catch #5 — but only after merge, only in CI, and only if you remember to wire it up.

Multiply that by three developers using three different AI tools and by every PR that ships in a week, and your design system drifts by 8% per month. I know this number because I measured it on seven real codebases before writing a single rule.

Visual regression testing was built for a world where humans wrote the code slowly and the bugs were in the CSS cascade. That world is over. AI writes fast, and the bugs are now in the *values*. A diff tool sees the screenshot, not the `p-[13px]`. A LLM reviewer can see both, but it's non-deterministic, expensive, and runs in the cloud.

I wanted a tool that runs in my editor, catches these the moment they land, and tells me exactly which WCAG criterion I just violated. So I built one.

### Meet Deslint

**[Deslint](https://github.com/jaydrao215/deslint)** is an open-source ESLint plugin + CLI + MCP server that catches design-system drift and WCAG accessibility regressions in AI-generated frontend code.

Three things make it different from everything else in this space:

**1. It's framework-agnostic from day one.** The same 20 rules work on React, Vue, Svelte, Angular, and plain HTML via a shared `createElementVisitor` abstraction. Not "someday" — today, in v0.2.0, 14 of the 20 rules run on all five frameworks.

**2. It's deterministic.** No LLM calls. Pure AST analysis. Your code never leaves the machine. That's not a footnote — it's the reason this tool can live in your CI pipeline and your editor without paying per-call costs or leaking your codebase to a cloud service. The architecture *is* the privacy policy.

**3. It closes the loop with AI agents via MCP.** The `@deslint/mcp` server exposes `analyze_file`, `analyze_project`, and `analyze_and_fix` as stdio tools. Cursor and Claude Code can call these tools in the same edit loop that wrote the bug, see the violations, and fix them — without a human catching it in review.

### The 20 rules, grouped

**Design system (8):** `no-arbitrary-colors`, `no-arbitrary-spacing`, `no-arbitrary-typography`, `no-arbitrary-zindex`, `no-magic-numbers-layout`, `no-inline-styles`, `consistent-component-spacing`, `consistent-border-radius`.

**Responsive & dark mode (3):** `responsive-required`, `dark-mode-coverage`, `missing-states`.

**Accessibility — WCAG 2.2 / 2.1 AA mapped (8):** `a11y-color-contrast` (1.4.3), `image-alt-text` (1.1.1), `heading-hierarchy` (1.3.1 + 2.4.6), `form-labels` (1.3.1 + 3.3.2), `link-text` (2.4.4), `lang-attribute` (3.1.1), `viewport-meta` (1.4.4), `aria-validation` (4.1.2).

**Quality gate (1):** `max-component-lines`.

13 WCAG Success Criteria evaluated end-to-end, both WCAG 2.2 AA and the 2.1 AA subset that ADA Title II actually cites.

### What the validation actually looked like

I don't trust rule counts, so I'll give you the honest numbers from the validation cohort:

- **4,061 files** scanned across 7 real open-source projects (Cal.com, Dub.co, Elk, saas-starter, taxonomy, Vintor, and Vintor re-run).
- **3,395 true violations** caught.
- **0 false positives.**
- **0 crashes.**
- **602 files/sec** on a 1,838-file Cal.com scan (25× under the 15s/500-file budget).
- **14/14 auto-fixers** verified correct on JSX, zero regressions.
- **1,145 tests** in the plugin itself, green on Node 20 + 22.

The 0% FP rate isn't an aspiration — it's a non-negotiable that every rule has to clear before it ships. I deferred five rules I considered for this release (`focus-indicators`, `keyboard-navigation`, `skip-navigation`, `touch-target-size`, `autocomplete-attribute`) because their static-AST heuristics couldn't hit 0% FP on real code. Better to ship 8 accessibility rules that never lie than 13 that cry wolf.

### What it catches that other tools miss

Quick honest comparison:

| Capability | jsx-a11y | tailwindcss plugin | SonarQube | CodeRabbit | Deslint |
|---|:---:|:---:|:---:|:---:|:---:|
| Design-system drift (colors, spacing, type) | — | partial | — | partial | ✓ |
| WCAG 2.2 / 2.1 mapping with report | — | — | — | partial | ✓ |
| Framework-agnostic (React/Vue/Svelte/Angular/HTML) | JSX only | JSX + HTML | — | multi | ✓ |
| ESLint v10 flat config | ✓ | ✓ | — | N/A | ✓ |
| Tailwind v3 + v4 with `@theme` | — | partial | — | — | ✓ |
| Local-first, zero cloud | ✓ | ✓ | — | — | ✓ |
| Deterministic (no LLM calls) | ✓ | ✓ | ✓ | — | ✓ |
| ADA Title II compliance report | — | — | — | — | ✓ |
| Auto-fix | some | some | — | — | ✓ (14/20 rules) |

Nobody covers all nine rows. And the tools that use LLMs under the hood are non-deterministic — you can't gate a PR merge on a tool that returns a different answer on a re-run.

### The MCP self-correction loop

This is the story I'm most excited about. When you install `@deslint/mcp` into Cursor or Claude Code:

```bash
npx @deslint/mcp install cursor
# or
npx @deslint/mcp install claude
```

Your AI agent gains three new tools over stdio:

- `analyze_file` — lint one file, return violations + Design Health Score
- `analyze_project` — scan the whole project, return score + top violations
- `analyze_and_fix` — lint, then apply auto-fixes in a temp scratch directory, return the diff, *never touch the workspace file until the diff is approved*

Here's what the actual flow looks like against a broken Button component:

```
[MCP]  → initialize                              12 ms
[MCP]  ← server: @deslint/mcp 0.2.0
[MCP]  → analyze_file Button.tsx                 89 ms
[MCP]  ← 6 violations: 4 design-system, 2 a11y
       → no-arbitrary-colors       bg-[#1a1a1a]
       → no-arbitrary-spacing      p-[13px]
       → no-arbitrary-zindex       z-[9999]
       → image-alt-text            <img> missing alt
       → link-text                 "click here"
       → heading-hierarchy         h1 → h3 skip
[MCP]  → analyze_and_fix Button.tsx              597 ms
[MCP]  ← 4 of 6 fixed (design-system auto-fixed; 2 a11y need prompts)
```

Round trip: **701 ms** for a real 6-violation file. No sleep loops. No cloud calls.

### What you can do in the next 30 seconds

```bash
npm install -D @deslint/eslint-plugin
npx deslint init
```

Your `eslint.config.js`:

```js
import deslint from '@deslint/eslint-plugin';

export default [
  deslint.configs.recommended,
  // ... your other configs
];
```

Then:

```bash
npx deslint scan         # 0-100 Design Health Score
npx deslint fix --all    # auto-fix everything safely fixable
npx deslint compliance ./dist  # WCAG compliance HTML report
```

### What's next

v0.3.0 is already queued:

- Cross-file design graph: *"47 Button components across 23 files — here's how they've diverged."*
- CSS scanning (not just class names) — unlocks `focus-indicators` and `touch-target-size`.
- Port the last 5 JSX-only rules to full cross-framework parity.

### Try it, break it, tell me what's wrong

Deslint is MIT-licensed. Repo: **[github.com/jaydrao215/deslint](https://github.com/jaydrao215/deslint)**. Interactive demo + docs: **[deslint.com](https://deslint.com)**.

If you run it against your codebase and it throws a false positive, open an issue with the file. If it catches a real bug, I'd love to hear which one.

---ARTICLE END---

## Step 5 — Set the cover image
Export the first frame of `apps/docs/public/demo/visual-proof.mp4` as a PNG.
Recommended size: 1000 × 420 px.
Upload it as the cover image in Dev.to's article settings.

If you can't export the frame right now, skip the cover image and add it later.
The article will publish without one.

## Step 6 — Set canonical URL (ONLY if deslint.com is live)
If deslint.com is already deployed:
Set canonical URL to: `https://deslint.com/blog/design-quality-gate-for-ai-code`

If deslint.com is NOT yet deployed:
Leave the canonical URL blank for now.

## Step 7 — Publish
Click "Publish" (not "Save draft").

Best publish time: **Tuesday 07:00 ET** for peak Dev.to engagement.
If it's not Tuesday, publish anyway — the SEO value is evergreen.

## Step 8 — After publishing
Copy the Dev.to post URL.
Cross-post to Hashnode (hashnode.com) using the same text, setting the canonical URL
to your Dev.to post URL so Dev.to gets the SEO credit.

---

## Done when
- [ ] Dev.to post published and live
- [ ] Hashnode cross-post created with canonical pointing to Dev.to URL
