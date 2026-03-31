# eslint-plugin-vizlint

> The design quality gate for AI-generated frontend code.

[![npm version](https://img.shields.io/npm/v/eslint-plugin-vizlint)](https://www.npmjs.com/package/eslint-plugin-vizlint)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

Vizlint catches arbitrary colors, inconsistent spacing, and broken responsive layouts before they ship — with auto-fix support. Works with React, Vue, Svelte, Angular, and plain HTML.

## Installation

```sh
npm install -D eslint-plugin-vizlint
# or
pnpm add -D eslint-plugin-vizlint
```

**Requirements:** ESLint v10+, Node.js v20+

## Quick Start

```js
// eslint.config.js
import vizlint from 'eslint-plugin-vizlint';

export default [
  vizlint.configs.recommended,  // all rules at 'warn'
  // or
  vizlint.configs.strict,       // all rules at 'error'
];
```

## Rules

| Rule | Description | Fixable | Default |
|------|-------------|---------|---------|
| [`no-arbitrary-colors`](#no-arbitrary-colors) | Disallow arbitrary color values; suggest nearest design token | ✅ | warn |
| [`no-arbitrary-spacing`](#no-arbitrary-spacing) | Disallow arbitrary spacing values; suggest nearest scale entry | ✅ | warn |
| [`no-arbitrary-typography`](#no-arbitrary-typography) | Disallow arbitrary font size, weight, leading, tracking values | ✅ | warn |
| [`responsive-required`](#responsive-required) | Require responsive breakpoints on fixed-width layout containers | — | warn |

---

### `no-arbitrary-colors`

Detects hex, rgb/rgba, hsl/hsla, and CSS variable arbitrary colors in Tailwind classes. Suggests the nearest design token and auto-fixes.

**Detects:** `bg-[#FF0000]` · `text-[rgb(59,130,246)]` · `border-[hsl(220,90%,56%)]` · `bg-[var(--random-color)]`

```jsx
// ✕ Bad
<div className="bg-[#1a5276] text-[#fff]" />

// ✓ Good (auto-fixed)
<div className="bg-primary text-white" />
```

**Options:**
```js
{
  // Classes to allow through
  allowlist: ['bg-[#brand-special]'],
  // Custom design tokens to recognize
  customTokens: { '#1A5276': 'primary', '#27AE60': 'pass' },
}
```

---

### `no-arbitrary-spacing`

Detects arbitrary spacing values and auto-fixes to the nearest Tailwind spacing scale entry. Covers padding, margin, gap, positioning, and sizing utilities.

**Detects:** `p-[13px]` · `m-[7px]` · `gap-[20px]` · `w-[200px]` · `h-[48px]`

```jsx
// ✕ Bad
<div className="p-[13px] m-[7px] gap-[20px]" />

// ✓ Good (auto-fixed)
<div className="p-3 m-2 gap-5" />
```

**Options:**
```js
{
  allowlist: ['p-[18px]'],
  // Override Tailwind spacing scale (key = class suffix, value = px)
  customScale: { '18': 72 },
}
```

---

### `no-arbitrary-typography`

Detects arbitrary font-size, font-weight, line-height, and letter-spacing values. Auto-fixes to the nearest Tailwind type scale entry.

**Detects:** `text-[17px]` · `font-[450]` · `leading-[24px]` · `tracking-[0.05em]`

```jsx
// ✕ Bad
<div className="text-[17px] font-[450] leading-[24px]" />

// ✓ Good (auto-fixed)
<div className="text-base font-normal leading-6" />
```

**Options:**
```js
{
  allowlist: ['text-[15px]'],
  customScale: {
    fontSize: { display: 56 },    // → text-display
    fontWeight: { book: 450 },    // → font-book
    leading: { cozy: 28 },        // → leading-cozy
    tracking: { loose: 75 },      // → tracking-loose
  },
}
```

---

### `responsive-required`

Flags fixed-width layout containers (`w-[Npx]`) that lack responsive breakpoint variants. Not auto-fixable — adding responsive variants requires design decisions.

**Detects:** `w-[800px]` without `sm:w-*` or `md:w-*` variants.
**Ignores:** Widths below 64px (icon/avatar sizing).

```jsx
// ✕ Bad
<div className="w-[800px]" />

// ✓ Good
<div className="w-[800px] sm:w-full md:w-auto" />
```

**Options:**
```js
{
  // Breakpoints that must be present (default: ['sm', 'md'])
  requiredBreakpoints: ['sm', 'md', 'lg'],
  // Ignore widths below this threshold in px (default: 64)
  iconSizeThreshold: 48,
  // Class prefixes to skip entirely
  ignoredPrefixes: ['max-w-'],
}
```

---

## Custom Configuration

```js
// eslint.config.js
import vizlint from 'eslint-plugin-vizlint';

export default [
  {
    plugins: { vizlint },
    rules: {
      'vizlint/no-arbitrary-colors': ['error', {
        customTokens: { '#1A5276': 'primary' },
      }],
      'vizlint/no-arbitrary-spacing': ['warn', {
        allowlist: ['p-[18px]'],
      }],
      'vizlint/no-arbitrary-typography': 'warn',
      'vizlint/responsive-required': ['warn', {
        requiredBreakpoints: ['sm', 'md'],
        iconSizeThreshold: 64,
      }],
    },
  },
];
```

## Framework Support

Works out of the box with all major frameworks:

- **React / Next.js** — `className` JSX attribute
- **Vue / Nuxt** — `:class` and `class` attributes in `.vue` files
- **Svelte** — `class` attribute
- **Angular** — `class`, `[ngClass]`, and `[class]` bindings (requires `@angular-eslint/template-parser`)
- **Plain HTML** — `class` attribute

## License

MIT © Vizlint
