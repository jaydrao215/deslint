import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Rules Reference — 33 Design, Accessibility & Token Lint Rules',
  description:
    'All 33 Deslint rules with examples, options, and auto-fix behavior. Design-token rules (no-arbitrary-colors, consistent-border-radius), accessibility (a11y-color-contrast, aria-validation), responsive-layout, dark-mode coverage, and more.',
  alternates: { canonical: '/docs/rules' },
  openGraph: {
    title: 'Deslint Rules Reference — 33 Design & A11y Lint Rules',
    description:
      'Every Deslint rule — examples, options, auto-fix support. Tailwind token drift, WCAG contrast, dark-mode, responsive, and consistency categories.',
    url: 'https://deslint.com/docs/rules',
    type: 'article',
  },
};

export default function RulesReference() {
  return (
    <div>
      <h1>Rules Reference</h1>
      <p>
        Deslint ships with 33 rules across six scoring categories. Each rule can
        be set to <code>&quot;error&quot;</code>, <code>&quot;warn&quot;</code>, or{' '}
        <code>&quot;off&quot;</code>. Rules marked <em>fixable</em> will auto-fix
        when you run <code>eslint --fix</code>.
      </p>

      {/* ── Colors ─────────────────────────────────────── */}
      <h2>Colors</h2>

      <h3 id="no-arbitrary-colors">no-arbitrary-colors</h3>
      <p>
        Disallow arbitrary color values in Tailwind classes. Flags patterns like{' '}
        <code>bg-[#FF0000]</code> and suggests design tokens instead.
      </p>
      <ul>
        <li><strong>Fixable:</strong> Yes (auto-fix replaces with nearest token)</li>
        <li><strong>Suggestions:</strong> Yes</li>
      </ul>
      <p><strong>Options:</strong></p>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
        <code>{`["error", {
  "allowlist": ["#1E3A5F"],
  "customTokens": { "brand-navy": "#1E3A5F" }
}]`}</code>
      </pre>
      <p><strong>Examples:</strong></p>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
        <code>{`// Bad
<div className="bg-[#FF5733] text-[#333]" />

// Good
<div className="bg-red-500 text-gray-700" />`}</code>
      </pre>

      <h3 id="a11y-color-contrast">a11y-color-contrast</h3>
      <p>
        Flag text/background color combinations with insufficient WCAG AA contrast ratio.
        Requires a minimum 4.5:1 ratio for normal text and 3:1 for large text.
      </p>
      <ul>
        <li><strong>Fixable:</strong> No</li>
        <li><strong>Suggestions:</strong> Yes (suggests accessible alternatives)</li>
      </ul>
      <p><strong>Options:</strong></p>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
        <code>{`["error", {
  "customColors": { "brand-navy": "#1E3A5F" }
}]`}</code>
      </pre>
      <p><strong>Examples:</strong></p>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
        <code>{`// Bad — low contrast
<div className="bg-gray-100 text-gray-300" />

// Good — sufficient contrast
<div className="bg-gray-100 text-gray-900" />`}</code>
      </pre>

      <h3 id="dark-mode-coverage">dark-mode-coverage</h3>
      <p>
        Flag components with background color classes that lack corresponding{' '}
        <code>dark:</code> variants. Auto-fixes by adding the inverted shade.
      </p>
      <ul>
        <li><strong>Fixable:</strong> Yes (adds <code>dark:</code> variant with inverted shade)</li>
        <li><strong>Suggestions:</strong> Yes</li>
      </ul>
      <p><strong>Options:</strong></p>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
        <code>{`["warn", {
  "ignoredPrefixes": ["bg-gradient"],
  "ignoredColors": ["bg-transparent"]
}]`}</code>
      </pre>
      <p><strong>Examples:</strong></p>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
        <code>{`// Bad — no dark variant
<div className="bg-white" />

// Good — dark variant included
<div className="bg-white dark:bg-gray-900" />

// Auto-fix: bg-blue-100 → bg-blue-100 dark:bg-blue-900`}</code>
      </pre>

      <h3 id="consistent-color-palette">consistent-color-palette</h3>
      <p>
        Flag files using too many unique color families in Tailwind classes. AI-generated
        code often introduces colors outside the project&apos;s design system, leading to
        visual inconsistency. Grayscale colors are ignored by default.
      </p>
      <ul>
        <li><strong>Fixable:</strong> No</li>
        <li><strong>Suggestions:</strong> No</li>
      </ul>
      <p><strong>Options:</strong></p>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
        <code>{`["warn", {
  "maxUniqueColors": 8,
  "ignoreGrayscale": true
}]`}</code>
      </pre>
      <p><strong>Examples:</strong></p>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
        <code>{`// Bad — too many color families in one file
<div className="bg-red-500 text-blue-600 border-green-400" />
<div className="bg-purple-300 text-orange-500 border-pink-200" />
<div className="bg-teal-100 text-amber-700 border-cyan-500" />

// Good — limited palette
<div className="bg-blue-500 text-blue-900 border-blue-200" />
<div className="bg-gray-100 text-gray-700 border-gray-300" />`}</code>
      </pre>

      {/* ── Spacing ────────────────────────────────────── */}
      <h2>Spacing</h2>

      <h3 id="no-arbitrary-spacing">no-arbitrary-spacing</h3>
      <p>
        Disallow arbitrary spacing values in Tailwind classes. Flags patterns like{' '}
        <code>p-[13px]</code> and suggests the nearest scale value.
      </p>
      <ul>
        <li><strong>Fixable:</strong> Yes (replaces with nearest scale value)</li>
        <li><strong>Suggestions:</strong> Yes</li>
      </ul>
      <p><strong>Options:</strong></p>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
        <code>{`["error", {
  "allowlist": ["24px"],
  "customScale": { "18": 18 }
}]`}</code>
      </pre>
      <p><strong>Examples:</strong></p>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
        <code>{`// Bad
<div className="p-[13px] mt-[7px]" />

// Good
<div className="p-3 mt-2" />`}</code>
      </pre>

      <h3 id="no-magic-numbers-layout">no-magic-numbers-layout</h3>
      <p>
        Disallow arbitrary (bracket) values in grid/flex layout Tailwind classes.
        Flags classes like <code>gap-[16px]</code> and suggests scale tokens.
      </p>
      <ul>
        <li><strong>Fixable:</strong> Yes (replaces with nearest scale value)</li>
        <li><strong>Suggestions:</strong> Yes</li>
      </ul>
      <p><strong>Examples:</strong></p>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
        <code>{`// Bad
<div className="grid gap-[16px] grid-cols-[200px_1fr]" />

// Good
<div className="grid gap-4 grid-cols-[200px_1fr]" />`}</code>
      </pre>

      {/* ── Typography ─────────────────────────────────── */}
      <h2>Typography</h2>

      <h3 id="no-arbitrary-typography">no-arbitrary-typography</h3>
      <p>
        Disallow arbitrary typography values in Tailwind classes. Covers font-size,
        font-weight, line-height, and letter-spacing.
      </p>
      <ul>
        <li><strong>Fixable:</strong> Yes (replaces with nearest scale value)</li>
        <li><strong>Suggestions:</strong> Yes</li>
      </ul>
      <p><strong>Options:</strong></p>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
        <code>{`["warn", {
  "allowlist": ["15px"],
  "customScale": {
    "fontSize": { "hero": "4rem" }
  }
}]`}</code>
      </pre>
      <p><strong>Examples:</strong></p>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
        <code>{`// Bad
<p className="text-[15px] font-[450]" />

// Good
<p className="text-base font-medium" />`}</code>
      </pre>

      <h3 id="heading-hierarchy">heading-hierarchy</h3>
      <p>
        Enforce sequential heading levels and at most one <code>&lt;h1&gt;</code>{' '}
        per file. Maps to WCAG 1.3.1 and 2.4.6.
      </p>
      <ul>
        <li><strong>Fixable:</strong> No</li>
        <li><strong>Suggestions:</strong> No</li>
      </ul>
      <p><strong>Examples:</strong></p>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
        <code>{`// Bad — skipped heading level
<h1>Title</h1>
<h3>Subsection</h3>

// Good — sequential levels
<h1>Title</h1>
<h2>Section</h2>
<h3>Subsection</h3>`}</code>
      </pre>

      {/* ── Responsive ─────────────────────────────────── */}
      <h2>Responsive</h2>

      <h3 id="responsive-required">responsive-required</h3>
      <p>
        Require responsive breakpoints on fixed-width layout containers to prevent
        broken mobile layouts. Flags elements with fixed widths that lack responsive variants.
      </p>
      <ul>
        <li><strong>Fixable:</strong> No</li>
        <li><strong>Suggestions:</strong> No</li>
      </ul>
      <p><strong>Options:</strong></p>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
        <code>{`["warn", {
  "requiredBreakpoints": ["sm", "md"],
  "iconSizeThreshold": 48,
  "ignoredPrefixes": ["max-w-"]
}]`}</code>
      </pre>
      <p><strong>Examples:</strong></p>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
        <code>{`// Bad — fixed width, no responsive
<div className="w-[800px]" />

// Good — responsive breakpoints
<div className="w-full md:w-[800px]" />`}</code>
      </pre>

      <h3 id="touch-target-size">touch-target-size</h3>
      <p>
        Flag interactive elements with explicit dimensions smaller than 24×24 px.
        AI-generated code often creates small icon buttons without adequate touch
        targets. Maps to WCAG 2.5.8 (Target Size Minimum).
      </p>
      <ul>
        <li><strong>Fixable:</strong> No</li>
        <li><strong>Suggestions:</strong> Yes (suggests minimum size classes)</li>
      </ul>
      <p><strong>Examples:</strong></p>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
        <code>{`// Bad — too small
<button className="w-4 h-4">×</button>

// Good — meets minimum
<button className="w-6 h-6">×</button>`}</code>
      </pre>

      <h3 id="focus-visible-style">focus-visible-style</h3>
      <p>
        Detect elements with <code>outline-none</code> / <code>outline-0</code>{' '}
        that lack a replacement focus indicator. Removing focus outlines without
        providing an alternative violates WCAG 2.4.7 (Focus Visible).
      </p>
      <ul>
        <li><strong>Fixable:</strong> No</li>
        <li><strong>Suggestions:</strong> Yes (suggests <code>focus-visible:ring-2</code>)</li>
      </ul>
      <p><strong>Examples:</strong></p>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
        <code>{`// Bad — outline removed, no replacement
<button className="outline-none">Click</button>

// Good — replacement focus indicator
<button className="outline-none focus-visible:ring-2 focus-visible:ring-offset-2">Click</button>`}</code>
      </pre>

      {/* ── Accessibility ──────────────────────────────── */}
      <h2>Accessibility</h2>

      <h3 id="image-alt-text">image-alt-text</h3>
      <p>
        Require meaningful <code>alt</code> text on <code>&lt;img&gt;</code>{' '}
        elements. AI-generated code frequently omits alt text, harming
        accessibility and SEO.
      </p>
      <ul>
        <li><strong>Fixable:</strong> No</li>
        <li><strong>Suggestions:</strong> Yes</li>
      </ul>
      <p><strong>Examples:</strong></p>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
        <code>{`// Bad
<img src="hero.png" />

// Good
<img src="hero.png" alt="Product screenshot showing dashboard" />`}</code>
      </pre>

      <h3 id="form-labels">form-labels</h3>
      <p>
        Every <code>&lt;input&gt;</code>, <code>&lt;select&gt;</code>, and{' '}
        <code>&lt;textarea&gt;</code> must have an associated label via{' '}
        <code>&lt;label&gt;</code>, <code>aria-label</code>, or{' '}
        <code>aria-labelledby</code>. Maps to WCAG 1.3.1 and 3.3.2.
      </p>
      <ul>
        <li><strong>Fixable:</strong> No</li>
        <li><strong>Suggestions:</strong> No</li>
      </ul>
      <p><strong>Examples:</strong></p>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
        <code>{`// Bad — no label
<input type="email" />

// Good — associated label
<label htmlFor="email">Email</label>
<input id="email" type="email" />`}</code>
      </pre>

      <h3 id="autocomplete-attribute">autocomplete-attribute</h3>
      <p>
        Require <code>autocomplete</code> on identity and payment form fields.
        AI-generated forms frequently omit autocomplete, violating WCAG 1.3.5
        (Identify Input Purpose) and degrading autofill UX.
      </p>
      <ul>
        <li><strong>Fixable:</strong> No</li>
        <li><strong>Suggestions:</strong> Yes (suggests the correct autocomplete value)</li>
      </ul>
      <p><strong>Examples:</strong></p>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
        <code>{`// Bad — missing autocomplete
<input type="email" name="email" />

// Good — autocomplete present
<input type="email" name="email" autoComplete="email" />`}</code>
      </pre>

      <h3 id="aria-validation">aria-validation</h3>
      <p>
        Forbid invalid ARIA roles and unknown <code>aria-*</code> attributes.
        Validates against WAI-ARIA 1.2 and catches common typos. Maps to
        WCAG 4.1.2.
      </p>
      <ul>
        <li><strong>Fixable:</strong> No</li>
        <li><strong>Suggestions:</strong> No</li>
      </ul>
      <p><strong>Examples:</strong></p>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
        <code>{`// Bad — invalid role
<div role="buton" />

// Good — valid role
<div role="button" tabIndex={0} />`}</code>
      </pre>

      <h3 id="link-text">link-text</h3>
      <p>
        Forbid empty anchors and generic anchor text like &quot;click here&quot; or
        &quot;read more&quot;. Maps to WCAG 2.4.4 (Link Purpose, In Context).
      </p>
      <ul>
        <li><strong>Fixable:</strong> No</li>
        <li><strong>Suggestions:</strong> No</li>
      </ul>
      <p><strong>Examples:</strong></p>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
        <code>{`// Bad — generic text
<a href="/pricing">click here</a>

// Good — descriptive text
<a href="/pricing">View pricing plans</a>`}</code>
      </pre>

      <h3 id="lang-attribute">lang-attribute</h3>
      <p>
        Require a valid <code>lang</code> attribute on the{' '}
        <code>&lt;html&gt;</code> element. Maps to WCAG 3.1.1 (Language of Page).
      </p>
      <ul>
        <li><strong>Fixable:</strong> Yes (adds <code>lang=&quot;en&quot;</code>)</li>
        <li><strong>Suggestions:</strong> Yes</li>
      </ul>
      <p><strong>Examples:</strong></p>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
        <code>{`// Bad — missing lang
<html>...</html>

// Good — valid BCP 47 tag
<html lang="en">...</html>`}</code>
      </pre>

      <h3 id="viewport-meta">viewport-meta</h3>
      <p>
        Forbid disabling user scaling on the viewport meta tag. Maps to
        WCAG 1.4.4 (Resize Text). Detects <code>user-scalable=no</code> and{' '}
        <code>maximum-scale=1</code>.
      </p>
      <ul>
        <li><strong>Fixable:</strong> No</li>
        <li><strong>Suggestions:</strong> No</li>
      </ul>
      <p><strong>Examples:</strong></p>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
        <code>{`// Bad — blocks zoom
<meta name="viewport" content="width=device-width, user-scalable=no" />

// Good — allows zoom
<meta name="viewport" content="width=device-width, initial-scale=1" />`}</code>
      </pre>

      <h3 id="prefer-semantic-html">prefer-semantic-html</h3>
      <p>
        Prefer semantic HTML elements over generic <code>&lt;div&gt;</code> and{' '}
        <code>&lt;span&gt;</code> with click handlers or ARIA roles. AI-generated
        code heavily uses <code>&lt;div onClick&gt;</code> instead of{' '}
        <code>&lt;button&gt;</code>, and adds redundant ARIA roles where semantic
        elements exist. Maps to WCAG 4.1.2 (Name, Role, Value).
      </p>
      <ul>
        <li><strong>Fixable:</strong> No</li>
        <li><strong>Suggestions:</strong> Yes</li>
      </ul>
      <p><strong>Options:</strong></p>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
        <code>{`["warn", {
  "checkClickHandlers": true,
  "checkRoles": true
}]`}</code>
      </pre>
      <p><strong>Examples:</strong></p>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
        <code>{`// Bad — div with click handler
<div onClick={handleClick}>Submit</div>

// Good — semantic button
<button onClick={handleClick}>Submit</button>

// Bad — redundant ARIA role
<div role="navigation">...</div>

// Good — semantic element
<nav>...</nav>`}</code>
      </pre>

      {/* ── Consistency ─────────────────────────────────── */}
      <h2>Consistency</h2>

      <h3 id="consistent-component-spacing">consistent-component-spacing</h3>
      <p>
        Detect inconsistent spacing patterns across similar components (e.g., Cards, Buttons).
        Reports the dominant spacing pattern as the suggested standard.
      </p>
      <ul>
        <li><strong>Fixable:</strong> No</li>
        <li><strong>Suggestions:</strong> No</li>
      </ul>
      <p><strong>Options:</strong></p>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
        <code>{`["warn", {
  "threshold": 2,
  "ignoreSizeVariants": true
}]`}</code>
      </pre>

      <h3 id="consistent-border-radius">consistent-border-radius</h3>
      <p>
        Detect inconsistent border-radius patterns across similar components.
        Reports the dominant pattern as the suggested standard.
      </p>
      <ul>
        <li><strong>Fixable:</strong> No</li>
        <li><strong>Suggestions:</strong> No</li>
      </ul>
      <p><strong>Examples:</strong></p>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
        <code>{`// Bad — mixed radii in similar components
<div className="rounded-md p-4">Card A</div>
<div className="rounded-xl p-4">Card B</div>

// Good — consistent radius
<div className="rounded-xl p-4">Card A</div>
<div className="rounded-xl p-4">Card B</div>`}</code>
      </pre>

      <h3 id="max-component-lines">max-component-lines</h3>
      <p>
        Flag single-file components exceeding a configurable line count. Large components
        should be decomposed for maintainability.
      </p>
      <ul>
        <li><strong>Fixable:</strong> No</li>
        <li><strong>Suggestions:</strong> No</li>
      </ul>
      <p><strong>Options:</strong></p>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
        <code>{`["warn", {
  "maxLines": 300,
  "ignoreComments": false,
  "ignoreBlankLines": false
}]`}</code>
      </pre>

      <h3 id="missing-states">missing-states</h3>
      <p>
        Detect form elements missing error, disabled, or required state handling.
        Ensures interactive elements handle edge cases properly.
      </p>
      <ul>
        <li><strong>Fixable:</strong> No</li>
        <li><strong>Suggestions:</strong> Yes</li>
      </ul>
      <p><strong>Options:</strong></p>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
        <code>{`["error", {
  "requireDisabled": true,
  "requireAriaInvalid": true,
  "requireAriaRequired": true,
  "formElements": ["input", "select", "textarea", "button"]
}]`}</code>
      </pre>
      <p><strong>Examples:</strong></p>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
        <code>{`// Bad — missing states
<input type="text" />

// Good — all states handled
<input type="text" disabled={isDisabled} aria-invalid={hasError} aria-required />`}</code>
      </pre>

      <h3 id="no-arbitrary-zindex">no-arbitrary-zindex</h3>
      <p>
        Disallow arbitrary z-index values like <code>z-[999]</code>. Use Tailwind
        scale values (<code>z-0</code>, <code>z-10</code>, <code>z-20</code>,{' '}
        <code>z-30</code>, <code>z-40</code>, <code>z-50</code>) instead.
      </p>
      <ul>
        <li><strong>Fixable:</strong> Yes (replaces with nearest scale value)</li>
        <li><strong>Suggestions:</strong> Yes</li>
      </ul>
      <p><strong>Options:</strong></p>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
        <code>{`["error", {
  "allowlist": [999, 9999]
}]`}</code>
      </pre>
      <p><strong>Examples:</strong></p>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
        <code>{`// Bad
<div className="z-[999]" />

// Good
<div className="z-50" />

// Auto-fix: z-[25] → z-20 (nearest scale value)`}</code>
      </pre>

      <h3 id="no-inline-styles">no-inline-styles</h3>
      <p>
        Disallow inline <code>style</code> attributes. Use Tailwind utility
        classes instead for consistency and maintainability.
      </p>
      <ul>
        <li><strong>Fixable:</strong> No</li>
        <li><strong>Suggestions:</strong> Yes</li>
      </ul>
      <p><strong>Examples:</strong></p>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
        <code>{`// Bad
<div style={{ color: "red", padding: "16px" }} />

// Good
<div className="text-red-500 p-4" />`}</code>
      </pre>

      <h3 id="no-conflicting-classes">no-conflicting-classes</h3>
      <p>
        Detect contradictory Tailwind utility classes on the same element. AI code
        generators frequently produce conflicting utilities like{' '}
        <code>flex hidden</code> or <code>text-left text-center</code> that cancel
        each other out.
      </p>
      <ul>
        <li><strong>Fixable:</strong> No</li>
        <li><strong>Suggestions:</strong> No</li>
      </ul>
      <p><strong>Options:</strong></p>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
        <code>{`["warn", {
  "customConflicts": [["my-class-a", "my-class-b"]]
}]`}</code>
      </pre>
      <p><strong>Examples:</strong></p>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
        <code>{`// Bad — conflicting display
<div className="flex hidden" />

// Bad — conflicting text alignment
<p className="text-left text-center" />

// Good — no conflicts
<div className="flex items-center gap-4" />

// OK — different variants (not a conflict)
<div className="flex sm:hidden" />`}</code>
      </pre>

      <h3 id="no-duplicate-class-strings">no-duplicate-class-strings</h3>
      <p>
        Flag identical class strings appearing 3+ times in a single file. Repeated
        class strings indicate a missing component extraction or shared style.
      </p>
      <ul>
        <li><strong>Fixable:</strong> No</li>
        <li><strong>Suggestions:</strong> No</li>
      </ul>
      <p><strong>Options:</strong></p>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
        <code>{`["warn", {
  "threshold": 3,
  "minClassCount": 3
}]`}</code>
      </pre>
      <p><strong>Examples:</strong></p>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
        <code>{`// Bad — same class string repeated 3+ times
<div className="flex items-center gap-4 p-4 rounded-lg" />
<div className="flex items-center gap-4 p-4 rounded-lg" />
<div className="flex items-center gap-4 p-4 rounded-lg" />

// Good — extract to a component or shared style
const cardClasses = "flex items-center gap-4 p-4 rounded-lg";
<div className={cardClasses} />`}</code>
      </pre>

      <h3 id="max-tailwind-classes">max-tailwind-classes</h3>
      <p>
        Flag elements with too many Tailwind utility classes. Overly long class
        strings reduce readability and usually indicate that the element should be
        decomposed or use a shared abstraction.
      </p>
      <ul>
        <li><strong>Fixable:</strong> No</li>
        <li><strong>Suggestions:</strong> No</li>
      </ul>
      <p><strong>Options:</strong></p>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
        <code>{`["warn", {
  "max": 15
}]`}</code>
      </pre>
      <p><strong>Examples:</strong></p>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
        <code>{`// Bad — too many classes (16+)
<div className="flex items-center justify-between gap-4 p-4 m-2 rounded-lg border bg-white text-gray-900 shadow-sm hover:shadow-md transition-all w-full h-auto min-h-screen" />

// Good — under limit, or decompose into components
<Card className="flex items-center justify-between gap-4">
  <CardContent>...</CardContent>
</Card>`}</code>
      </pre>

      {/* ── Motion & Animation ─────────────────────────── */}
      <h2>Motion &amp; Animation</h2>

      <h3 id="prefers-reduced-motion">prefers-reduced-motion</h3>
      <p>
        Require animations and transitions to respect the user&apos;s{' '}
        <code>prefers-reduced-motion</code> preference. AI-generated code often
        ships Tailwind animation utilities (<code>animate-spin</code>,{' '}
        <code>transition-*</code>) without the <code>motion-reduce:</code> variant,
        causing vestibular disorders for users who opted out of motion. Maps to
        WCAG 2.3.3 (Animation from Interactions).
      </p>
      <ul>
        <li><strong>Fixable:</strong> Yes (wraps class in <code>motion-reduce:</code> variant)</li>
        <li><strong>Suggestions:</strong> Yes</li>
      </ul>
      <p><strong>Examples:</strong></p>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
        <code>{`// Bad — no reduced-motion fallback
<div className="animate-spin transition-all duration-500" />

// Good — respects user preference
<div className="animate-spin motion-reduce:animate-none transition-all motion-reduce:transition-none" />`}</code>
      </pre>

      <h3 id="icon-accessibility">icon-accessibility</h3>
      <p>
        Require icons (Lucide, Heroicons, Radix) to carry an accessible name or be
        marked decorative. Standalone icon-only buttons need{' '}
        <code>aria-label</code>; decorative icons should be hidden from assistive
        tech with <code>aria-hidden</code>. Maps to WCAG 1.1.1 (Non-text Content)
        and 4.1.2 (Name, Role, Value).
      </p>
      <ul>
        <li><strong>Fixable:</strong> Yes (auto-adds <code>aria-hidden</code> to decorative icons)</li>
        <li><strong>Suggestions:</strong> Yes</li>
      </ul>
      <p><strong>Examples:</strong></p>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
        <code>{`// Bad — icon-only button with no label
<button><X /></button>

// Good — accessible name on the button
<button aria-label="Close dialog"><X aria-hidden /></button>`}</code>
      </pre>

      <h3 id="focus-trap-patterns">focus-trap-patterns</h3>
      <p>
        Detect modal / dialog / drawer components that don&apos;t establish a focus
        trap. AI-generated overlays frequently lack <code>role=&quot;dialog&quot;</code>,{' '}
        <code>aria-modal</code>, and programmatic focus management, letting keyboard
        users escape into background content. Maps to WCAG 2.4.3 (Focus Order).
      </p>
      <ul>
        <li><strong>Fixable:</strong> Yes (auto-adds <code>role</code> and <code>aria-modal</code>)</li>
        <li><strong>Suggestions:</strong> Yes</li>
      </ul>
      <p><strong>Examples:</strong></p>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
        <code>{`// Bad — modal without dialog semantics
<div className="fixed inset-0">...</div>

// Good — dialog semantics + focus trap
<div role="dialog" aria-modal="true" className="fixed inset-0">...</div>`}</code>
      </pre>

      <h3 id="responsive-image-optimization">responsive-image-optimization</h3>
      <p>
        Flag <code>&lt;img&gt;</code> elements missing <code>loading</code>,{' '}
        <code>width</code>/<code>height</code>, or <code>srcset</code>. These
        attributes protect Core Web Vitals (LCP, CLS) and bandwidth on mobile — AI
        code generators routinely omit them.
      </p>
      <ul>
        <li><strong>Fixable:</strong> Yes (adds <code>loading=&quot;lazy&quot;</code> and <code>decoding=&quot;async&quot;</code>)</li>
        <li><strong>Suggestions:</strong> Yes</li>
      </ul>
      <p><strong>Examples:</strong></p>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
        <code>{`// Bad — no lazy loading, no intrinsic size
<img src="hero.jpg" alt="Hero" />

// Good — CLS-safe and bandwidth-friendly
<img src="hero.jpg" alt="Hero" width="1200" height="630" loading="lazy" decoding="async" />`}</code>
      </pre>

      <h3 id="spacing-rhythm-consistency">spacing-rhythm-consistency</h3>
      <p>
        Detect stacks that mix spacing tokens from different sub-scales (e.g.{' '}
        <code>mt-3</code> next to <code>mt-5</code> next to <code>mt-7</code>) inside
        the same section. Breaks vertical rhythm and is a strong tell-tale of
        AI-assembled layouts. Off by default — enable once your design system has
        stabilized.
      </p>
      <ul>
        <li><strong>Fixable:</strong> No</li>
        <li><strong>Suggestions:</strong> No</li>
      </ul>
      <p><strong>Examples:</strong></p>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
        <code>{`// Bad — three different rhythms in one stack
<section>
  <h2 className="mt-3">A</h2>
  <p className="mt-5">B</p>
  <p className="mt-7">C</p>
</section>

// Good — consistent rhythm
<section className="space-y-4">
  <h2>A</h2>
  <p>B</p>
  <p>C</p>
</section>`}</code>
      </pre>

      {/* ── Inline Suppression ─────────────────────────── */}
      <h2>Inline Suppression</h2>
      <p>
        Suppress a single violation with <code>deslint-ignore</code> and a mandatory reason:
      </p>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
        <code>{`{/* deslint-ignore no-arbitrary-colors -- brand gradient requires exact hex */}
<div className="bg-[#1E3A5F]" />`}</code>
      </pre>

      {/* ── Report False Positive ─────────────────────── */}
      <h2>Report a False Positive</h2>
      <p>
        If a rule flags code that you believe is correct, please report it so we can improve
        Deslint for everyone. Include the rule name, the flagged code, and why you think
        it&apos;s a false positive.
      </p>
      <p>
        <a
          href="https://github.com/jaydrao215/deslint/issues/new?labels=false-positive"
          target="_blank"
          rel="noopener noreferrer"
        >
          Report a false positive on GitHub &rarr;
        </a>
      </p>
    </div>
  );
}
