# @deslint/eslint-plugin

> The verification layer for AI-generated code — ESLint rule set.

[![npm version](https://img.shields.io/npm/v/@deslint/eslint-plugin)](https://www.npmjs.com/package/@deslint/eslint-plugin)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

The rule set behind Deslint, the verification layer for AI-generated code. 62 deterministic ESLint rules that verify design-system, accessibility, **backend-safety**, **Next.js stability**, and **AI-coding hygiene** standards on code written by Claude Code, Cursor, Codex, Windsurf, Copilot, and any other AI coding agent. Auto-fix support for 14 rules. **Works with React / Next.js, Vue / Nuxt, Svelte, Astro, Angular, and plain HTML** — including Astro's `class:list={[...]}` form and `set:html` (frontmatter ESM is linted by every backend-safety rule too).

Use `@deslint/cli` alongside the plugin to get a Fix Plan that prioritizes
auto-fixes, token decisions, accessibility risks, and design debt after every
scan.

**Zero LLM in the hot path. Zero code leaves your machine.** Validated on real-world open-source projects across React / Next.js, Vue / Nuxt, Angular, and plain HTML with 0% false positive rate and 0 crashes.

<p align="center">
  <img src="https://deslint.com/demo/vscode-squiggle.gif" alt="Deslint ESLint rules surfacing design-quality squiggles inline in VS Code as you type" width="720">
</p>

## Installation

```sh
npm install -D @deslint/eslint-plugin
# or
pnpm add -D @deslint/eslint-plugin
```

**Requirements:** ESLint v10+, Node.js v20+

**Optional framework parsers:**
```sh
# Vue / Nuxt
pnpm add -D vue-eslint-parser
# Angular
pnpm add -D @angular-eslint/template-parser
# Svelte
pnpm add -D svelte-eslint-parser
# Astro
pnpm add -D astro-eslint-parser
# Plain HTML (.html files)
pnpm add -D @html-eslint/parser
```

> **Astro setup:** Install `astro-eslint-parser` and add an override
> block to your flat config so `.astro` files are parsed correctly:
> ```js
> import astroParser from 'astro-eslint-parser';
> import deslint from '@deslint/eslint-plugin';
>
> export default [
>   deslint.configs.recommended,
>   {
>     files: ['**/*.astro'],
>     languageOptions: { parser: astroParser },
>   },
> ];
> ```
> Without the override, ESLint silently skips `.astro` files — that's
> the dominant source of false-negative reports on Astro projects.

> **Angular vs plain HTML:** When both `@angular-eslint/template-parser` and
> `@html-eslint/parser` are installed, Deslint routes `**/*.component.html` to
> the Angular parser and every other `**/*.html` file to the html-eslint parser.
> If only one is installed, it handles all `.html` files.

## Quick Start

```js
// eslint.config.js (flat config only — no legacy .eslintrc)
import deslint from '@deslint/eslint-plugin';

export default [
  deslint.configs.recommended,  // all rules at 'warn', dark-mode-coverage off
  // or
  deslint.configs.strict,       // all rules at 'error'
];
```

## Rules (62)

| Rule | Category | Description | Fixable | Default |
|------|----------|-------------|:-------:|---------|
| `no-arbitrary-spacing` | Spacing | Disallow arbitrary spacing values | Yes | warn |
| `no-arbitrary-colors` | Colors | Disallow arbitrary color values | Yes | warn |
| `no-arbitrary-typography` | Typography | Disallow arbitrary font/leading/tracking values | Yes | warn |
| `no-arbitrary-zindex` | Consistency | Disallow arbitrary z-index values | Yes | warn |
| `no-arbitrary-border-radius` | Consistency | Disallow arbitrary `rounded-[Npx]` values | Yes | warn |
| `no-magic-numbers-layout` | Layout | Disallow arbitrary numbers in grid/flex | Yes | warn |
| `no-inline-styles` | Design System | Disallow inline style attributes | No | off |
| `consistent-component-spacing` | Consistency | Detect spacing divergence across components | No | warn |
| `consistent-border-radius` | Consistency | Detect mixed border-radius values | No | warn |
| `consistent-color-palette` | Consistency | Cap unique color families per file | No | off |
| `no-conflicting-classes` | Consistency | Detect contradictory Tailwind utilities | No | warn |
| `no-duplicate-class-strings` | Consistency | Flag repeated identical class strings | No | off |
| `max-tailwind-classes` | Consistency | Cap utility classes per element | No | off |
| `spacing-rhythm-consistency` | Consistency | Detect mixed spacing sub-scales in same stack | No | off |
| `responsive-required` | Responsive | Require breakpoints on fixed-width containers | No | warn |
| `dark-mode-coverage` | Dark Mode | Flag missing dark mode variants | Yes | off |
| `missing-states` | Consistency | Flag missing hover/focus/disabled states | No | off |
| `a11y-color-contrast` | A11y (WCAG 1.4.3) | Check WCAG AA contrast ratios | No | warn |
| `image-alt-text` | A11y (WCAG 1.1.1) | Flag missing or meaningless alt text | No | warn |
| `responsive-image-optimization` | A11y (WCAG 1.4.4) | Require `loading`/`width`/`height` on `<img>` | Yes | warn |
| `icon-accessibility` | A11y (WCAG 1.1.1 · 4.1.2) | Require `aria-label`/`aria-hidden` on icons | Yes | warn |
| `heading-hierarchy` | A11y (WCAG 1.3.1 · 2.4.6) | Flag skipped heading levels | No | warn |
| `form-labels` | A11y (WCAG 1.3.1 · 3.3.2) | Match labels to inputs | No | warn |
| `autocomplete-attribute` | A11y (WCAG 1.3.5) | Require `autocomplete` on identity fields | No | warn |
| `link-text` | A11y (WCAG 2.4.4) | Flag generic link text | No | warn |
| `focus-visible-style` | A11y (WCAG 2.4.7) | Flag `outline-none` without a focus indicator | No | warn |
| `focus-trap-patterns` | A11y (WCAG 2.4.3) | Require `role=\"dialog\"`/`aria-modal` on overlays | Yes | warn |
| `touch-target-size` | A11y (WCAG 2.5.8) | Flag interactive targets < 24×24 px | No | warn |
| `prefers-reduced-motion` | A11y (WCAG 2.3.3) | Require `motion-reduce:` variants on animations | Yes | warn |
| `prefer-semantic-html` | A11y (WCAG 4.1.2) | Prefer semantic elements over `<div>` + ARIA | No | warn |
| `lang-attribute` | A11y (WCAG 3.1.1) | Require `lang` on root `<html>` | Yes | warn |
| `viewport-meta` | A11y (WCAG 1.4.4) | Forbid `user-scalable=no` | No | error |
| `aria-validation` | A11y (WCAG 4.1.2) | Invalid roles, hallucinated `aria-*` | No | error |
| `no-dangerous-html` | Frontend Safety | Flag `dangerouslySetInnerHTML` (XSS surface). Whitelists `<script type="application/ld+json">`, `<style>`, and `<Script>` (Next.js) | No | warn |
| `safe-external-links` | Frontend Safety | Require `rel="noopener noreferrer"` on `<a target="_blank">` | Yes | warn |
| `iframe-sandbox` | Frontend Safety | Require a `sandbox` attribute on `<iframe>` | No | warn |
| `max-component-lines` | Code Quality | Flag overly large components | No | off |
| `no-hardcoded-secrets` | Backend Safety | Provider-fingerprinted API keys (AWS/GitHub/Stripe/Google/Slack/OpenAI/Anthropic/JWT/PEM) + high-entropy secrets | No | error |
| `no-sql-injection` | Backend Safety | SQL built by `+` concat or template-literal interpolation | No | error |
| `no-shell-injection` | Backend Safety | `child_process.exec` / `spawn({shell:true})` with dynamic input | No | error |
| `no-path-traversal` | Backend Safety | `fs.readFile` / `path.join` / `res.sendFile` with request input (CWE-22) | No | error |
| `no-ssrf` | Backend Safety | `fetch` / `axios` / `http` with request-derived URL (CWE-918) | No | error |
| `no-eval` | Backend Safety | `eval()`, `new Function()`, `vm.run*`, string-arg `setTimeout` | No | error |
| `no-permissive-cors` | Backend Safety | `cors({ origin:"*", credentials:true })` and reflect-any-origin | No | error |
| `no-disabled-tls` | Backend Safety | `rejectUnauthorized: false`, `NODE_TLS_REJECT_UNAUTHORIZED=0` | No | error |
| `secure-cookies` | Backend Safety | Missing `httpOnly`/`secure`/`sameSite` on session cookies | No | warn |
| `require-jwt-expiry` | Backend Safety | `jwt.sign(...)` without `expiresIn`; `algorithm: "none"` | No | warn |
| `no-weak-crypto` | Backend Safety | `createHash("md5"\|"sha1")`, deprecated ciphers, `Math.random()` for tokens | No | warn |
| `safe-redirect` | Backend Safety | Open redirect (`res.redirect(req.query.next)`) on Express/Koa/Fastify/Next.js | No | warn |
| `no-hydration-mismatch` | Next.js | `Math.random`/`Date.now`/`new Date()` inline in JSX | No | warn |
| `no-leaked-env-on-client` | Next.js | Non-public `process.env.X` reads from `"use client"` files | No | error |
| `no-server-only-in-client` | Next.js | `fs`/`crypto`/`child_process`/DB drivers in `"use client"` files | No | error |
| `no-async-useeffect` | Next.js | `useEffect(async () => ...)` antipattern | No | error |
| `no-floating-promise-handler` | AI-coding | Async Express/Fastify route handlers without try/catch or wrapper | No | error |
| `no-unsafe-mass-assignment` | AI-coding | `Object.assign(user, req.body)` / `{ ...user, ...req.body }` | No | error |
| `no-empty-catch` | AI-coding | `try { … } catch {}`, `catch (e) {}`, `catch (e) { /* TODO */ }` — silently swallow runtime errors | No | error |
| `no-leaked-stack-trace` | AI-coding | `res.send(err.stack)` / `res.json({ error: err })` / `new Response(err.stack)` | No | error |
| `no-unvalidated-input` | AI-coding | `as T` / `satisfies T` on `req.body` / `await request.json()` without a validator | No | warn |
| `no-prod-console` | AI-coding | `console.log`/`debug`/`info`/`table`/`time*` in non-test source; `error`/`warn` allowed | No | warn |
| `no-mock-data-in-prod` | AI-coding | `mockUsers`/`fakeOrders`/`seedData` arrays + placeholder emails outside test paths | No | warn |
| `no-placeholder-code` | AI-coding | `throw new Error("not implemented")` / TODO-stub shapes | No | warn |
| `no-hardcoded-localhost` | AI-coding | `localhost` / `127.0.0.1` / `0.0.0.0` URLs shipping to production | No | warn |

---

### `no-arbitrary-spacing`

Detects arbitrary spacing values and auto-fixes to the nearest Tailwind spacing scale entry. Covers padding, margin, gap, positioning, and sizing utilities.

**Detects:** `p-[13px]` `m-[7px]` `gap-[20px]` `w-[200px]` `h-[48px]`

```jsx
// Bad
<div className="p-[13px] m-[7px] gap-[20px]" />
// Good (auto-fixed)
<div className="p-3 m-2 gap-5" />
```

**Options:** `allowlist`, `customScale`

---

### `no-arbitrary-colors`

Detects hex, rgb/rgba, hsl/hsla arbitrary colors in Tailwind classes. Suggests the nearest design token and auto-fixes. CSS variable references (`var(--...)`) are allowed by default.

**Detects:** `bg-[#FF0000]` `text-[rgb(59,130,246)]` `border-[hsl(220,90%,56%)]`

```jsx
// Bad
<div className="bg-[#1a5276] text-[#fff]" />
// Good (auto-fixed)
<div className="bg-primary text-white" />
```

**Options:** `allowlist`, `customTokens`, `allowCssVariables` (default: true)

---

### `no-arbitrary-typography`

Detects arbitrary font-size, font-weight, line-height, and letter-spacing values. Auto-fixes to nearest Tailwind type scale entry.

**Detects:** `text-[17px]` `font-[450]` `leading-[24px]` `tracking-[0.05em]`

```jsx
// Bad
<div className="text-[17px] font-[450] leading-[24px]" />
// Good (auto-fixed)
<div className="text-base font-normal leading-6" />
```

**Options:** `allowlist`, `customScale` (fontSize, fontWeight, leading, tracking)

---

### `no-arbitrary-zindex`

Detects arbitrary z-index values. Auto-fixes to the nearest Tailwind z-index scale entry.

**Detects:** `z-[999]` `z-[100]` `z-[1]`

```jsx
// Bad
<div className="z-[999]" />
// Good (auto-fixed)
<div className="z-50" />
```

**Options:** `allowlist`, `customScale`

---

### `no-inline-styles`

Flags `style={{}}` attributes. Inline styles bypass design system tokens and break consistency. Dynamic template literals are allowed by default.

**Detects:** `style={{ color: 'red' }}` `style={{ padding: '10px' }}`

```jsx
// Bad
<div style={{ color: 'red', padding: '10px' }} />
// Good
<div className="text-red-500 p-2.5" />
```

**Options:** `allowDynamic` (default: true), `allowlist`

---

### `no-magic-numbers-layout`

Flags arbitrary numbers in grid and flex layout properties. Auto-fixes to Tailwind utilities. Skips CSS functions (minmax, repeat, fit-content).

**Detects:** `grid-cols-[200px_1fr]` `basis-[200px]` `order-[3]`

**Options:** `allowlist`

---

### `consistent-component-spacing`

Detects spacing divergence across components in the same file. If most components use `p-4`, flags the one using `p-6`.

**Options:** `threshold` (minimum occurrences to establish pattern)

---

### `consistent-border-radius`

Detects mixed `rounded-*` values across same-type components.

**Options:** `threshold`

---

### `responsive-required`

Flags fixed-width layout containers (`w-[Npx]`, `max-w-[Npx]`, `min-w-[Npx]`) that lack responsive breakpoint variants. Not auto-fixable — adding responsive variants requires design decisions.

```jsx
// Bad
<div className="w-[800px]" />
// Good
<div className="w-[800px] sm:w-full md:w-auto" />
```

**Options:** `requiredBreakpoints` (default: `['sm', 'md']`), `iconSizeThreshold` (default: 64), `ignoredPrefixes`

---

### `missing-states`

Flags interactive elements (buttons, links, inputs) missing hover, focus, or disabled state styling.

**Detects:** `<button className="bg-blue-500">` without `hover:`, `focus:`, or `disabled:` variants

---

### `dark-mode-coverage`

Flags elements with color/background utilities that lack corresponding `dark:` variants. Disabled by default in `recommended` config — enable for projects using dark mode.

---

### `a11y-color-contrast`

Checks WCAG AA color contrast ratios between text and background colors. Works with Tailwind color utilities.

---

### `image-alt-text`

Flags `<img>` elements without `alt` attribute or with meaningless alt text like "image", "photo", "picture".

```jsx
// Bad
<img src="hero.jpg" />
<img src="hero.jpg" alt="image" />
// Good
<img src="hero.jpg" alt="Team working together in the office" />
```

---

### `max-component-lines`

Flags components exceeding a configurable line count (default: 300). Large components are harder to maintain.

**Options:** `maxLines` (default: 300)

---

### `no-dangerous-html`

Flags `dangerouslySetInnerHTML` on JSX elements — the most common XSS path in AI-generated React code, especially when the agent reaches for it instead of rendering text or piping through a sanitizer.

**Whitelisted (known-safe) patterns:** `<script type="application/ld+json">` (Schema.org structured data), `<style dangerouslySetInnerHTML>` (CSS injection has a different threat model), and `<Script dangerouslySetInnerHTML>` (the Next.js `<Script>` component for inline scripts via the framework's loading strategy).

```jsx
// Bad
<div dangerouslySetInnerHTML={{ __html: comment }} />
// Good
<div>{comment}</div>
// Or, if HTML is genuinely needed: sanitize first
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(comment) }} />
```

---

### `safe-external-links`

Flags `<a target="_blank">` missing `rel="noopener noreferrer"`. Without the rel guard, the new tab can navigate the opener (`window.opener`) and leaks the referrer. Autofixable on JSX — inserts both required tokens.

```jsx
// Bad (auto-fixed)
<a href="https://x.com" target="_blank">External</a>
// Good
<a href="https://x.com" target="_blank" rel="noopener noreferrer">External</a>
```

---

### `iframe-sandbox`

Flags `<iframe>` without a `sandbox` attribute. Without sandbox, an embedded frame inherits full origin privileges — it can navigate the parent, run scripts, and submit forms. Suggestion only; the right sandbox value is intent-dependent.

```jsx
// Bad
<iframe src="https://example.com" />
// Good — strictest
<iframe src="https://example.com" sandbox="" />
// Good — opt-in only what's needed
<iframe src="https://example.com" sandbox="allow-scripts allow-same-origin" />
```

---

## Custom Configuration

```js
// eslint.config.js
import deslint from '@deslint/eslint-plugin';

export default [
  {
    plugins: { deslint },
    rules: {
      'deslint/no-arbitrary-colors': ['error', {
        customTokens: { '#1A5276': 'primary' },
      }],
      'deslint/no-arbitrary-spacing': ['warn', {
        allowlist: ['p-[18px]'],
      }],
      'deslint/no-arbitrary-typography': 'warn',
      'deslint/responsive-required': ['warn', {
        requiredBreakpoints: ['sm', 'md'],
      }],
      'deslint/dark-mode-coverage': 'warn',  // enable for dark mode projects
      'deslint/max-component-lines': ['warn', { maxLines: 250 }],
    },
  },
];
```

## Design System Configuration

Create `.deslintrc.json` to define your design system tokens:

```json
{
  "designSystem": {
    "colors": {
      "primary": "#1A5276",
      "secondary": "#27AE60",
      "accent": "#F39C12"
    },
    "spacing": {},
    "fonts": {
      "body": "Inter",
      "heading": "DM Sans",
      "code": "JetBrains Mono"
    }
  },
  "tailwind": {
    "autoImport": true
  }
}
```

## Framework Support

| Framework | Parsing | Auto-fix | Validated |
|-----------|:-------:|:--------:|:---------:|
| React / Next.js | Yes | Yes | Cal.com, Dub.co, taxonomy, saas-starter |
| Vue / Nuxt | Yes | Yes | Elk |
| Svelte | Yes | Yes | Parser ready |
| Astro | Yes† | Partial | withastro/astro@4.16.18 (examples/blog + examples/basics) |
| Angular | Yes | No* | Vintor |
| Plain HTML | Yes** | Yes*** | html5-boilerplate, StartBootstrap |

† Via optional peer dependency `astro-eslint-parser@>=1.0.0`. Configure a `files: ['**/*.astro']` override with `languageOptions.parser: astroParser` in your flat config. Class-based rules read `class="…"` and the canonical `class:list={[…, { active: cond }]}` form; the XSS rule (`no-dangerous-html`) flags Astro's `set:html={…}` alongside React's `dangerouslySetInnerHTML`; frontmatter (`---`) ESM is linted by all backend-safety rules (`no-hardcoded-secrets`, `no-sql-injection`, `no-shell-injection`, …) since it's regular JS/TS.

\* Angular template parser nodes lack `range` property. Violations are reported but auto-fix is skipped. JSX-specific rules (`a11y-color-contrast`, `missing-states`, `consistent-component-spacing`, `max-component-lines`, `responsive-required`, `prefer-semantic-html`) require JSX AST patterns and produce 0 violations on Angular templates.

\*\* Via optional peer dependency `@html-eslint/parser@>=0.40.0`. Install it alongside the plugin if you lint `.html` files.

\*\*\* Rules fire and report correctly on plain HTML; programmatic source-range autofix for HTML-native ranges is deferred (JSX autofix paths remain fully fixable). See ROADMAP §6.2.

## Validation Results

Tested on real-world open-source projects:

| Project | Framework | Files | Violations | False Positives |
|---------|-----------|------:|----------:|-----------:|
| Cal.com | Next.js, Tailwind | 1,700 | 1,222 | 0 |
| Dub.co | Next.js 15, shadcn/ui | 1,838 | 1,932 | 0 |
| Elk | Vue 3, Nuxt | 259 | 0 | 0 |
| Vintor | Angular 21, Tailwind v4 | 74 | 3 | 0 |
| saas-starter | Next.js 15, shadcn/ui | 23 | 51 | 0 |
| taxonomy | Next.js 13, shadcn/ui | 94 | 71 | 0 |
| h5bp/html5-boilerplate | Plain HTML | 4 | 2 | 0 |
| StartBootstrap Agency | Plain HTML | 1 | 15 | 0 |
| StartBootstrap Resume | Plain HTML | 1 | 4 | 0 |
| StartBootstrap Clean Blog | Plain HTML | 4 | 13 | 0 |

**Cumulative: 3,998 files, 3,313 violations, 0 false positives, 0 crashes.**

## License

MIT
