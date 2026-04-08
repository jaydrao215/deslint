# @deslint/eslint-plugin

> ESLint catches code bugs. Deslint catches design bugs.

[![npm version](https://img.shields.io/npm/v/@deslint/eslint-plugin)](https://www.npmjs.com/package/@deslint/eslint-plugin)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

14 ESLint rules that catch design quality violations in AI-generated frontend code — arbitrary colors, inconsistent spacing, missing responsive breakpoints, accessibility gaps, and more. Auto-fix support for 11 rules. Works with React, Vue, Svelte, Angular, and plain HTML.

**Validated on 7 real-world projects (4,061 files) with 0% false positive rate and 0 crashes.**

> **Renamed in v0.1.1** — this package was previously published as `eslint-plugin-deslint`. The old name is deprecated; install `@deslint/eslint-plugin` instead. See the [migration note](#migration-from-eslint-plugin-deslint).

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
```

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

## Rules (14)

| Rule | Category | Description | Fixable | Default |
|------|----------|-------------|:-------:|---------|
| [`no-arbitrary-spacing`](#no-arbitrary-spacing) | Spacing | Disallow arbitrary spacing values | Yes | warn |
| [`no-arbitrary-colors`](#no-arbitrary-colors) | Colors | Disallow arbitrary color values | Yes | warn |
| [`no-arbitrary-typography`](#no-arbitrary-typography) | Typography | Disallow arbitrary font/leading/tracking values | Yes | warn |
| [`no-arbitrary-zindex`](#no-arbitrary-zindex) | Consistency | Disallow arbitrary z-index values | Yes | warn |
| [`no-inline-styles`](#no-inline-styles) | Design System | Disallow inline style attributes | Yes | warn |
| [`no-magic-numbers-layout`](#no-magic-numbers-layout) | Layout | Disallow arbitrary numbers in grid/flex | Yes | warn |
| [`consistent-component-spacing`](#consistent-component-spacing) | Consistency | Detect spacing divergence across components | Yes | warn |
| [`consistent-border-radius`](#consistent-border-radius) | Consistency | Detect mixed border-radius values | Yes | warn |
| [`responsive-required`](#responsive-required) | Responsive | Require breakpoints on fixed-width containers | No | warn |
| [`missing-states`](#missing-states) | Consistency | Flag missing hover/focus/disabled states | Yes | warn |
| [`dark-mode-coverage`](#dark-mode-coverage) | Dark Mode | Flag missing dark mode variants | No | off |
| [`a11y-color-contrast`](#a11y-color-contrast) | Accessibility | Check WCAG AA contrast ratios | Yes | warn |
| [`image-alt-text`](#image-alt-text) | Accessibility | Flag missing or meaningless alt text | Yes | warn |
| [`max-component-lines`](#max-component-lines) | Code Quality | Flag overly large components | No | warn |

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

| Framework | Parsing | Rules | Auto-fix | Validated |
|-----------|:-------:|:-----:|:--------:|:---------:|
| React / Next.js | Yes | All 14 | Yes | 4 projects |
| Vue / Nuxt | Yes | All 14 | Yes | 1 project |
| Svelte | Yes | All 14 | Yes | Parser ready |
| Angular | Yes | 7/14* | No** | 1 project |
| Plain HTML | Yes | All 14 | Yes | Not yet |

\* JSX-specific rules (`a11y-color-contrast`, `missing-states`, `consistent-component-spacing`, `max-component-lines`, `responsive-required`) produce 0 violations on Angular templates — they require JSX AST patterns.

\*\* Angular template parser nodes lack `range` property. Violations are reported but auto-fix is skipped.

## Validation Results

Tested on 7 real-world open-source projects:

| Project | Framework | Files | Violations | False Positives |
|---------|-----------|------:|----------:|-----------:|
| Cal.com | Next.js, Tailwind | 1,700 | 1,222 | 0 |
| Dub.co | Next.js 15, shadcn/ui | 1,838 | 1,932 | 0 |
| Elk | Vue 3, Nuxt | 259 | 0 | 0 |
| Vintor | Angular 21, Tailwind v4 | 74 | 3 | 0 |
| saas-starter | Next.js 15, shadcn/ui | 23 | 51 | 0 |
| taxonomy | Next.js 13, shadcn/ui | 94 | 71 | 0 |

**Cumulative: 4,061 files, 3,395 violations, 0 false positives, 0 crashes.**

## Migration from `eslint-plugin-deslint`

In v0.1.1, this package was renamed from `eslint-plugin-deslint` to `@deslint/eslint-plugin` to align with the rest of the `@deslint/*` workspace (`@deslint/cli`, `@deslint/mcp`, `@deslint/shared`). Same code, same rules, same config — only the package name and import specifier changed.

**Migration steps:**

```sh
# 1. Uninstall the old package
npm uninstall eslint-plugin-deslint

# 2. Install the new one
npm install -D @deslint/eslint-plugin
```

```js
// 3. Update your eslint.config.js import
- import deslint from 'eslint-plugin-deslint';
+ import deslint from '@deslint/eslint-plugin';
```

**Nothing else changes:**
- The plugin shorthand stays `deslint` (e.g. `'deslint/no-arbitrary-colors'`)
- All rule names, options, and presets are identical
- Auto-fix output is identical
- `.deslintrc.json` schema is unchanged

The old `eslint-plugin-deslint@0.1.0` will be deprecated on npm with a redirect message pointing here.

## License

MIT
