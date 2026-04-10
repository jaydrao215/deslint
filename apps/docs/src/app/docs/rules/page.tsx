export default function RulesReference() {
  return (
    <div>
      <h1>Rules Reference</h1>
      <p>
        Deslint ships with 23 rules across five scoring categories. Each rule can
        be set to <code>&quot;error&quot;</code>, <code>&quot;warn&quot;</code>, or{' '}
        <code>&quot;off&quot;</code>. Rules marked <em>fixable</em> will auto-fix
        when you run <code>eslint --fix</code>.
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

      <h3>no-magic-numbers-layout</h3>
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

      <h3>heading-hierarchy</h3>
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

      <h3>touch-target-size</h3>
      <p>
        Flag interactive elements with explicit dimensions smaller than 24×24 px.
        AI-generated code often creates small icon buttons without adequate touch
        targets. Maps to WCAG 2.5.8 (Target Size Minimum).
      </p>
      <ul>
        <li><strong>Fixable:</strong> Yes (suggests minimum size classes)</li>
        <li><strong>Suggestions:</strong> Yes</li>
      </ul>
      <p><strong>Examples:</strong></p>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
        <code>{`// Bad — too small
<button className="w-4 h-4">×</button>

// Good — meets minimum
<button className="w-6 h-6">×</button>`}</code>
      </pre>

      <h3>focus-visible-style</h3>
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

      <h3>image-alt-text</h3>
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

      <h3>form-labels</h3>
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

      <h3>autocomplete-attribute</h3>
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

      <h3>aria-validation</h3>
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

      <h3>link-text</h3>
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

      <h3>lang-attribute</h3>
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

      <h3>viewport-meta</h3>
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

      <h3>consistent-border-radius</h3>
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

      <h3>no-inline-styles</h3>
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
