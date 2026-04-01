export default function Configuration() {
  return (
    <div>
      <h1>Configuration Reference</h1>

      <p>
        Vizlint uses a <code>.vizlintrc.json</code> file in your project root for configuration.
        Run <code>npx vizlint init</code> to generate one automatically.
      </p>

      <h2>Full Schema</h2>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
        <code>{`{
  "$schema": "https://vizlint.dev/schema.json",
  "rules": {
    "no-arbitrary-colors": "error",
    "no-arbitrary-spacing": "error",
    "no-arbitrary-typography": "warn",
    "responsive-required": "warn",
    "consistent-component-spacing": "warn",
    "a11y-color-contrast": "error",
    "max-component-lines": "warn",
    "missing-states": "error",
    "dark-mode-coverage": "warn",
    "no-arbitrary-zindex": "error"
  },
  "designSystem": {
    "colors": {
      "brand-navy": "#1E3A5F",
      "brand-gold": "#FFD700"
    },
    "fonts": {
      "body": "Inter",
      "heading": "DM Sans",
      "mono": "JetBrains Mono"
    },
    "spacing": {
      "sm": "0.5rem",
      "md": "1rem",
      "lg": "1.5rem"
    },
    "borderRadius": {
      "default": "8px"
    }
  },
  "ignore": [
    "node_modules/**",
    "dist/**",
    "**/*.test.tsx"
  ],
  "profiles": {
    "prototype": {
      "description": "Relaxed for rapid prototyping",
      "rules": {
        "no-arbitrary-colors": "warn",
        "responsive-required": "off"
      }
    },
    "production": {
      "description": "Strict for shipping",
      "rules": {
        "no-arbitrary-colors": "error",
        "responsive-required": "error"
      }
    }
  }
}`}</code>
      </pre>

      <h2>Five Levels of Control</h2>

      <h3>Level 1: Inline Ignore</h3>
      <p>Suppress a single violation with a mandatory reason:</p>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
        <code>{`{/* vizlint-ignore no-arbitrary-colors -- brand gradient requires exact hex */}
<div className="bg-[#1E3A5F]" />`}</code>
      </pre>

      <h3>Level 2: Rule Configuration</h3>
      <p>Set severity per rule: <code>&quot;error&quot;</code> | <code>&quot;warn&quot;</code> | <code>&quot;off&quot;</code></p>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
        <code>{`{
  "rules": {
    "no-arbitrary-colors": ["warn", { "allowlist": ["#1E3A5F"] }],
    "responsive-required": "off"
  }
}`}</code>
      </pre>

      <h3>Level 3: Design System Definition</h3>
      <p>
        Define your team&apos;s design tokens. Custom colors become recognized tokens —
        <code>bg-[#1E3A5F]</code> is suggested as <code>bg-brand-navy</code>.
      </p>

      <h3>Level 4: File/Folder Ignore Patterns</h3>
      <p>Exclude legacy code, test files, or generated output:</p>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
        <code>{`{
  "ignore": ["src/legacy/**", "**/*.stories.tsx"]
}`}</code>
      </pre>

      <h3>Level 5: Severity Profiles</h3>
      <p>Switch strictness based on context:</p>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
        <code>{`vizlint scan --profile production
vizlint scan --profile prototype`}</code>
      </pre>

      <h2>Tailwind Auto-Import</h2>
      <p>
        Vizlint automatically reads your Tailwind configuration — no manual token setup needed:
      </p>
      <ul>
        <li><strong>Tailwind v3</strong>: Reads <code>tailwind.config.js</code> / <code>.ts</code></li>
        <li><strong>Tailwind v4</strong>: Reads <code>@theme</code> blocks in CSS</li>
        <li><strong>CSS fallback</strong>: Reads <code>:root</code> custom properties</li>
      </ul>
      <p>
        Manual <code>.vizlintrc.json</code> tokens override auto-imported ones.
      </p>
    </div>
  );
}
