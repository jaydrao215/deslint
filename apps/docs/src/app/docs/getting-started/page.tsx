import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Getting Started — Deslint Setup for Claude Code, Cursor, Codex & Windsurf',
  description:
    "Zero to enforced design system in five commands. Install the MCP server for your AI coding agent, import your tokens, run your first scan, fix what's auto-fixable, gate in CI. Local-first. Zero cloud.",
  alternates: { canonical: '/docs/getting-started' },
  openGraph: {
    title: 'Deslint — Getting Started',
    description:
      'The full Deslint happy path in under 5 minutes. MCP server + ESLint + CLI + GitHub Action. Local-first, zero cloud.',
    url: 'https://deslint.com/docs/getting-started',
    type: 'article',
  },
};

export default function GettingStarted() {
  return (
    <div>
      <h1>Getting Started</h1>

      <p>
        This page is the complete happy path: six steps take you from zero
        to a design system that&apos;s enforced on every AI-generated diff.
        Every step below shows the exact output you should see so you can
        tell you&apos;re on track. Everything runs locally — no code ever
        leaves your machine.
      </p>

      <h2 id="step-1">Step 1 — Install the MCP server</h2>
      <p>
        The MCP server is how Deslint talks to Claude Code, Cursor, Codex, and
        Windsurf. It lets the agent call deterministic design checks before it
        ships a diff, so drift is caught in the generation loop, not after.
      </p>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto">
        <code>npx @deslint/mcp install</code>
      </pre>
      <p>
        The installer auto-detects your agent&apos;s config file, writes the
        MCP server entry, and prints the next restart step. Vendor-specific
        guides if you want to confirm the config by hand:
      </p>
      <ul>
        <li>
          <a href="/mcp/claude-code">Claude Code</a>
        </li>
        <li>
          <a href="/mcp/cursor">Cursor</a>
        </li>
        <li>
          <a href="/mcp/codex">OpenAI Codex</a>
        </li>
        <li>
          <a href="/mcp/windsurf">Windsurf</a>
        </li>
      </ul>

      <h2 id="step-2">Step 2 — Install the CLI</h2>
      <p>
        The CLI is how you import tokens, run scans from your terminal, and
        gate PRs in CI. It&apos;s the same deterministic rule set the MCP
        server uses.
      </p>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto">
        <code>npm install --save-dev @deslint/cli</code>
      </pre>
      <p>
        Or run it directly with <code>npx deslint …</code> — no install step
        required for a quick try.
      </p>

      <h2 id="step-3">Step 3 — Import your design tokens</h2>
      <p>
        Deslint enforces rules against the design system you already have.
        Point <code>import-tokens</code> at wherever your tokens live — Figma
        Variables, a Style Dictionary file or directory, or a Google Stitch /
        Material 3 export — and it emits a{' '}
        <code>.deslintrc.json</code> fragment you can merge in.
      </p>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto">
        <code>{`# Figma Variables (read-only API)
npx deslint import-tokens --figma <file-id> --format deslintrc

# Style Dictionary (single file or directory)
npx deslint import-tokens --style-dictionary ./tokens --format deslintrc

# Google Stitch / Material 3
npx deslint import-tokens --stitch ./stitch-tokens.json --format deslintrc`}</code>
      </pre>
      <p>Expected output:</p>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto">
        <code>{`  ✓ Imported 25 token(s) from 1 file(s)
  ✓ Wrote tokens.json

  Your design system is ready:
    19 colors       → no-arbitrary-colors, no-legacy-color, consistent-color-semantics
     4 radii        → no-arbitrary-border-radius, consistent-border-radius
     2 fonts        → no-arbitrary-font-family

  Next:
    1. Merge tokens.json into your .deslintrc.json
    2. Run \`npx deslint scan\` to see drift`}</code>
      </pre>
      <p>
        The summary tells you exactly which rules each bucket unlocks.
        Merge the fragment into your project&apos;s{' '}
        <code>.deslintrc.json</code> (or run{' '}
        <code>npx deslint init</code> first to scaffold one) before moving on.
      </p>

      <h2 id="step-4">Step 4 — Run your first scan</h2>
      <p>
        With tokens in place, <code>scan</code> reports a Design Health Score
        out of 100 and a per-category breakdown for colors, spacing,
        typography, responsive behaviour, and consistency.
      </p>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto">
        <code>npx deslint scan</code>
      </pre>
      <p>Expected output (abridged):</p>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto">
        <code>{`  Deslint Design Health Report
  ────────────────────────

  Design Health Score: 88/100

  Colors       ████████████████████ 100
  Spacing      █████████████████░░░  86
  Typography   ████████████████████  99
  Responsive   ███████████░░░░░░░░░  59
  Consistency  ████████████████████  97

  Files scanned: 94
  Files with issues: 43
  Total violations: 0 errors, 110 warnings

  Full report: .deslint/report.html

  Next:
    14 auto-fixable. Review with \`npx deslint fix --interactive\`
    Or apply every safe fix: \`npx deslint fix --all\``}</code>
      </pre>
      <p>
        The CLI also writes a standalone HTML report at{' '}
        <code>.deslint/report.html</code>. Open it with{' '}
        <code>npx deslint report</code>.
      </p>
      <p>
        For a design-system-focused view — how much of your UI is on-token
        vs. drifting into arbitrary values — run the Token Drift Score
        report alongside <code>scan</code>:
      </p>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto">
        <code>npx deslint coverage</code>
      </pre>
      <p>
        This writes a shareable HTML report to{' '}
        <code>.deslint/coverage.html</code> breaking every class usage into
        three buckets: design-system tokens, default Tailwind scale, and
        arbitrary <code>prefix-[value]</code> drift. It&apos;s the artifact
        to send your design-system lead — no violations list, just the
        adoption curve.
      </p>

      <h2 id="step-5">Step 5 — Fix what&apos;s auto-fixable</h2>
      <p>Two common ways to work through the violations:</p>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto">
        <code>{`# Walk each violation with a y/n/skip prompt
npx deslint fix --interactive

# Apply every safe auto-fix at once
npx deslint fix --all

# Preview what would change, without touching files
npx deslint fix --dry-run`}</code>
      </pre>
      <p>
        Auto-fixes are surgical. Only rules with a safe, deterministic fix
        (JSX-only, bailing on dynamic class expressions) participate — drift
        that requires human judgment stays in the report for you to address
        deliberately.
      </p>

      <h2 id="step-6">Step 6 — Gate it in CI</h2>
      <p>
        Once your repo is clean, the last step is locking the gate so the
        next AI-generated PR can&apos;t silently regress it.
      </p>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto">
        <code>{`- name: Design Quality Gate
  run: npx deslint scan --min-score 85 --format sarif`}</code>
      </pre>
      <p>
        Exit code <code>1</code> if the Design Health Score drops below your
        threshold. SARIF output integrates with GitHub Advanced Security so
        violations show inline in the PR diff.
      </p>

      <h2 id="troubleshooting">Troubleshooting</h2>
      <ul>
        <li>
          <strong>&quot;No files found to scan&quot;</strong> — you&apos;re
          running <code>scan</code> from outside the source root, or your{' '}
          <code>ignore</code> pattern is too broad. Pass the directory
          explicitly: <code>npx deslint scan ./apps/web</code>.
        </li>
        <li>
          <strong>
            &quot;Score unavailable — fix N parser errors first&quot;
          </strong>{' '}
          — your files contain TypeScript/JSX the ESLint parser can&apos;t
          read. Run <code>tsc --noEmit</code> first, fix the errors, then
          re-scan.
        </li>
        <li>
          <strong>Too many warnings to address at once?</strong> — use{' '}
          <code>--diff origin/main</code> to only report on lines changed
          since a ref, which is the right gate for legacy codebases.
        </li>
      </ul>

      <h2 id="alternative-eslint">Alternative: ESLint plugin</h2>
      <p>
        If you prefer to run Deslint directly in your ESLint pipeline, skip
        the CLI and add the plugin to your <code>eslint.config.js</code> (v10+
        flat config):
      </p>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto">
        <code>{`import deslint from '@deslint/eslint-plugin';

export default [
  deslint.configs.recommended,
  // … your other config
];`}</code>
      </pre>

      <h2 id="framework-support">Framework support</h2>
      <ul>
        <li>
          <strong>React / Next.js</strong> — JSX <code>className</code>
        </li>
        <li>
          <strong>Vue</strong> — <code>class</code> and <code>:class</code>
        </li>
        <li>
          <strong>Svelte</strong> — <code>class</code> attributes and{' '}
          <code>class:</code> directives
        </li>
        <li>
          <strong>Angular</strong> — templates, <code>[ngClass]</code>,{' '}
          <code>[class]</code> bindings
        </li>
        <li>
          <strong>Plain HTML</strong> — standard <code>class</code>
        </li>
      </ul>

      <h2 id="tailwind">Tailwind v3 + v4</h2>
      <p>
        All rules support both Tailwind v3 and v4 class naming conventions.
        Deslint auto-detects your Tailwind version from your config file.
      </p>
    </div>
  );
}
