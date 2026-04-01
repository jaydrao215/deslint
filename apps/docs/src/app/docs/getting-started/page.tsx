export default function GettingStarted() {
  return (
    <div>
      <h1>Getting Started</h1>

      <h2>Installation</h2>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto">
        <code>npm install eslint-plugin-vizlint --save-dev</code>
      </pre>

      <h2>ESLint Configuration</h2>
      <p>Add Vizlint to your <code>eslint.config.js</code> (ESLint v10+ flat config):</p>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto">
        <code>{`import vizlint from 'eslint-plugin-vizlint';

export default [
  vizlint.configs.recommended,
  // ... your other config
];`}</code>
      </pre>

      <h2>Quick Setup with Init Wizard</h2>
      <p>The fastest way to get started:</p>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto">
        <code>npx vizlint init</code>
      </pre>
      <p>
        The wizard auto-detects your framework, imports your Tailwind config, and generates
        a <code>.vizlintrc.json</code> with your design system tokens.
      </p>

      <h2>Run Your First Scan</h2>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto">
        <code>npx vizlint scan</code>
      </pre>
      <p>
        This scans your project and outputs a Design Health Score (0-100) with per-category
        breakdowns for colors, spacing, typography, responsive, and consistency.
      </p>

      <h2>Fix Violations</h2>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto">
        <code>{`# Interactive mode — review each violation
npx vizlint fix --interactive

# Auto-fix all — apply all safe fixes at once
npx vizlint fix --all

# Dry run — preview changes without modifying files
npx vizlint fix --dry-run`}</code>
      </pre>

      <h2>CI/CD Integration</h2>
      <p>Add to your GitHub Actions workflow:</p>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto">
        <code>{`- name: Design Quality Gate
  run: npx vizlint scan --min-score 75 --format sarif`}</code>
      </pre>
      <p>
        Exit code 1 if the Design Health Score drops below your threshold.
        SARIF output integrates with GitHub Security tab.
      </p>

      <h2>Framework Support</h2>
      <p>Vizlint works with all major frontend frameworks out of the box:</p>
      <ul>
        <li><strong>React/Next.js</strong> — JSX <code>className</code> attributes</li>
        <li><strong>Vue</strong> — <code>class</code> and <code>:class</code> bindings</li>
        <li><strong>Svelte</strong> — <code>class</code> attributes and <code>class:</code> directives</li>
        <li><strong>Angular</strong> — templates, <code>[ngClass]</code>, <code>[class]</code> bindings</li>
        <li><strong>Plain HTML</strong> — standard <code>class</code> attributes</li>
      </ul>

      <h2>Tailwind v3 + v4</h2>
      <p>
        All rules support both Tailwind v3 and v4 class naming conventions.
        Vizlint auto-detects your Tailwind version from your config file.
      </p>
    </div>
  );
}
