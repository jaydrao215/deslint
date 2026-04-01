export default function RulesReference() {
  return (
    <div>
      <h1>Rules Reference</h1>
      <p>
        Vizlint ships with 10 rules across five categories: colors, spacing, typography,
        responsive, and consistency. Each rule can be set to{' '}
        <code>&quot;error&quot;</code>, <code>&quot;warn&quot;</code>, or{' '}
        <code>&quot;off&quot;</code>.
      </p>

      {/* ── Colors ─────────────────────────────────────── */}
      <h2>Colors</h2>

      <h3>no-arbitrary-colors</h3>
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

      <h3>a11y-color-contrast</h3>
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

      <h3>dark-mode-coverage</h3>
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

      {/* ── Spacing ────────────────────────────────────── */}
      <h2>Spacing</h2>

      <h3>no-arbitrary-spacing</h3>
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

      {/* ── Typography ─────────────────────────────────── */}
      <h2>Typography</h2>

      <h3>no-arbitrary-typography</h3>
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

      {/* ── Responsive ─────────────────────────────────── */}
      <h2>Responsive</h2>

      <h3>responsive-required</h3>
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

      {/* ── Consistency ─────────────────────────────────── */}
      <h2>Consistency</h2>

      <h3>consistent-component-spacing</h3>
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

      <h3>max-component-lines</h3>
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

      <h3>missing-states</h3>
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

      <h3>no-arbitrary-zindex</h3>
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

      {/* ── Inline Suppression ─────────────────────────── */}
      <h2>Inline Suppression</h2>
      <p>
        Suppress a single violation with <code>vizlint-ignore</code> and a mandatory reason:
      </p>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
        <code>{`{/* vizlint-ignore no-arbitrary-colors -- brand gradient requires exact hex */}
<div className="bg-[#1E3A5F]" />`}</code>
      </pre>
    </div>
  );
}
