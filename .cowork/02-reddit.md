# Cowork Task: Reddit Show & Tell Posts (S9 item 9.4)

## What you are doing
Posting Deslint to three subreddits as Show & Tell announcements.
Posts go live on r/javascript, r/reactjs, and r/vuejs on separate days.

## Authentication required
- **Reddit account** — you must be logged in at reddit.com before starting.
  If not logged in: go to reddit.com, sign in (or create an account), then return here.

## Timing rules (important — do not skip)
- Post to ONE subreddit per day
- r/javascript first, r/reactjs second, r/vuejs third
- Space them 24-48 hours apart
- r/javascript may require "Show & Tell" flair — check their sidebar before posting

---

## Post #1 — r/javascript

**URL to open:** https://www.reddit.com/r/javascript/submit

**Title (copy exactly):**
```
Show: Deslint — 20-rule ESLint plugin that catches design-system drift and WCAG failures in AI-generated code (0% FP on 4,061 files)
```

**Body (copy exactly):**
```
Hey r/javascript,

I shipped v0.2.0 of Deslint (https://github.com/jaydrao215/deslint) today. It's an ESLint plugin + CLI + MCP server that catches design-system drift and WCAG accessibility failures in code that Claude Code, Cursor, v0, Bolt, or Lovable generates.

**The problem I kept hitting:** AI-generated frontend code ships working screens that quietly shred your design system. `bg-[#1a1a1a]` instead of a token. `p-[13px]` instead of the scale. `<img>` with no alt. `<a>click here</a>`. Every one passes TypeScript, Prettier, the standard ESLint recommended set, and your Playwright screenshot diff — because the screen *renders*. The bug is in the values, not the layout.

**What Deslint does:** 20 ESLint rules across 4 categories (design system, responsive, accessibility, quality gate), all on ESLint v10 flat config, Node ≥ 20.19. Framework-agnostic — 14 of 20 rules run unchanged on React, Vue, Svelte, Angular, and plain HTML. 8 of the rules map to 13 WCAG 2.2 / 2.1 AA Success Criteria; the CLI exports an HTML compliance report with per-level conformance.

**Validation numbers (no rule shipped until these held):**
- 4,061 files scanned across 7 real production codebases (Cal.com, Dub.co, Elk, saas-starter, taxonomy, Vintor, Vintor re-run)
- 3,395 true violations caught
- **0 false positives. 0 crashes.**
- 602 files/sec on a 1,838-file project
- 1,145 tests, green on Node 20 + 22

**Why I think this is different:** 5 rules I considered for the 2.0 release got cut because their static-AST heuristics couldn't clear 0% FP on real code (`focus-indicators`, `keyboard-navigation`, `skip-navigation`, `touch-target-size`, `autocomplete-attribute`). I'd rather ship 8 a11y rules that never lie than 13 that cry wolf.

**The part I'd love feedback on:** the `@deslint/mcp` server. It exposes `analyze_file`, `analyze_project`, and `analyze_and_fix` as stdio tools. Cursor and Claude Code can call these in the same edit loop that wrote the bug, see the violations, and fix them — without a human catching it in review. Round trip on a 6-violation file is ~700 ms, all local, no LLM calls.

**Install:**
```
npm i -D @deslint/eslint-plugin
npx deslint init
npx deslint scan
```

MIT-licensed. Repo: https://github.com/jaydrao215/deslint

If you try it against your codebase and hit a false positive, please open an issue — the 0% FP number holds because people tell me the day it breaks.
```

**After posting:** Add this as your FIRST comment immediately:
```
If you want to see it run before installing: there's a 4-beat interactive section on deslint.com — dark mode drift, responsive reflow, contrast failures, and a11y wins. ~40 seconds, no signup. The source for all four beats is in `apps/docs/src/components/mockups/visual-proof/` if you want to see how we avoid the "lint rule breaks our own landing page" trap.
```

**Flair:** Select "Show" flair if available, otherwise "Project" or whatever is closest.

**PAUSE — confirm post is live, then wait 24-48 hours before Post #2.**

---

## Post #2 — r/reactjs (Day 2)

**URL to open:** https://www.reddit.com/r/reactjs/submit

**Title (copy exactly):**
```
Show: Deslint — ESLint plugin for AI-generated React code that catches design drift + WCAG violations (real <Link> component support)
```

**Body (copy exactly):**
```
Hey r/reactjs,

Shipping v0.2.0 of Deslint (https://github.com/jaydrao215/deslint) — an ESLint plugin for catching design-system drift and accessibility failures in AI-generated React code.

**Why another plugin:** I'd been using `eslint-plugin-tailwindcss` + `jsx-a11y` + custom rules, and AI-generated code kept sneaking past all of them. The common failure modes:

1. `bg-[#1a1a1a]` — Tailwind plugin catches it ✓
2. `<img>` missing alt — jsx-a11y catches it ✓
3. `<Link href="/pricing">click here</Link>` — *nothing* catches it, because jsx-a11y's `anchor-has-content` only checks raw `<a>`, and `<Link>` is a Next.js component
4. `h1 → h3` heading skip across a single page — *nothing* static catches it
5. `<input>` with no associated `<label>` when the label is a sibling — jsx-a11y gets confused

Deslint's `link-text` rule has a `linkComponents` option (default `['Link', 'NextLink']`) that checks Next.js anchor abstractions. Caught 2 real bugs in shadcn-ui/taxonomy on first dogfood. Its `heading-hierarchy` rule uses a cross-element `onComplete` hook to collect every heading in a file then check the sequence — caught 4 real production WCAG bugs on first dogfood including one in our own landing page.

**React-specific wins:**
- PascalCase components (`<Input>`, `<TextField>`) are treated as opaque design-system components — `form-labels` won't false-positive on Radix-based apps
- Works alongside jsx-a11y — no rule ID conflicts, no duplicated coverage
- Tested on Cal.com, Dub.co, saas-starter, taxonomy (all Next.js)

**Numbers:** 4,061 files, 0 false positives, 1,145 tests.

**Install alongside jsx-a11y + tailwindcss plugin:**
```
// eslint.config.js
import deslint from '@deslint/eslint-plugin';
import a11y from 'eslint-plugin-jsx-a11y';

export default [
  deslint.configs.recommended,
  a11y.flatConfigs.recommended,
];
```

MIT-licensed. v0.2.0 on npm: `@deslint/eslint-plugin`. Repo: https://github.com/jaydrao215/deslint

Feedback welcome — especially on the `linkComponents` default list. If there's a common Next.js / Remix / Astro anchor component I'm missing, I want to know.
```

**PAUSE — confirm post is live, then wait 24-48 hours before Post #3.**

---

## Post #3 — r/vuejs (Day 3)

**URL to open:** https://www.reddit.com/r/vuejs/submit

**Title (copy exactly):**
```
Show: Deslint — Vue-aware ESLint plugin that catches design drift + WCAG failures (works on vue-eslint-parser out of the box)
```

**Body (copy exactly):**
```
Hey r/vuejs,

Shipping Deslint (https://github.com/jaydrao215/deslint) v0.2.0 — an ESLint plugin for catching design-system drift and WCAG accessibility failures in Vue SFCs.

**The thing I wanted but couldn't find for Vue:** a single rule set that enforces design-system discipline on Tailwind class usage *inside Vue templates* and also catches accessibility regressions. `eslint-plugin-vue` catches Vue-specific issues. The Tailwind plugin is JSX-first. `eslint-plugin-vuejs-accessibility` covers a11y but is Vue-only and doesn't touch design tokens.

Deslint covers all three in one pass. It walks `Program.templateBody` via `vue-eslint-parser` and emits the same `{ tagName, attributes, node, framework: 'vue' }` callback the React rules see. Same rule, same fix, same WCAG mapping.

**What works today in Vue SFCs:**
- `no-arbitrary-colors`, `no-arbitrary-spacing`, `no-arbitrary-typography`, `no-arbitrary-zindex` — class-attribute scanning with auto-fix
- `image-alt-text`, `heading-hierarchy`, `form-labels`, `link-text`, `lang-attribute`, `viewport-meta`, `aria-validation` — all WCAG-mapped, cross-framework
- `responsive-required`, `a11y-color-contrast`, `dark-mode-coverage`, `missing-states`

**Known Vue caveats (honestly):**
- `consistent-component-spacing` and `consistent-border-radius` are still JSX-only (v0.3.0 roadmap). Vue SFCs pass other rules but these two are currently no-ops.
- Auto-fix confirmed working on `vue-eslint-parser` output but let me know if you hit edge cases with `v-bind:class` objects.

**Install in a Nuxt / Vite-Vue project:**
```
npm i -D @deslint/eslint-plugin
npx deslint init
```

```
// eslint.config.js
import deslint from '@deslint/eslint-plugin';
import vue from 'eslint-plugin-vue';

export default [
  ...vue.configs['flat/recommended'],
  deslint.configs.recommended,
];
```

MIT-licensed. Repo: https://github.com/jaydrao215/deslint

Vue cohort validation is my weakest (1 project tested vs 4 React projects). If you hit a Vue-specific FP or parser edge case, please open an issue.
```

---

## Done when
- [ ] r/javascript post live (Day 1)
- [ ] r/reactjs post live (Day 2)
- [ ] r/vuejs post live (Day 3)
