import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Getting Started — Deslint Setup for Claude Code, Cursor, Codex & Windsurf',
  description:
    "Install Deslint in 2 minutes — MCP server for Claude Code, Cursor, Codex, and Windsurf, plus the ESLint plugin, CLI, and GitHub Action. Import tokens from Figma, Style Dictionary, or Google Stitch. Local-first. Zero cloud.",
  alternates: { canonical: '/docs/getting-started' },
  openGraph: {
    title: 'Deslint — Getting Started',
    description:
      'Install the MCP server for your AI coding agent, or plug the ESLint plugin into your build. Two minutes, no cloud.',
    url: 'https://deslint.com/docs/getting-started',
    type: 'article',
  },
};

export default function GettingStarted() {
  return (
    <div>
      <h1>Getting Started</h1>

      <p>
        Deslint ships in four surfaces — pick whichever matches your workflow.
        Every surface runs the same deterministic rule set locally; none of
        them send your code anywhere.
      </p>

      <ul>
        <li>
          <a href="#mcp">MCP server</a> — the fastest install if you use Claude
          Code, Cursor, Codex, or Windsurf.
        </li>
        <li>
          <a href="#eslint">ESLint plugin</a> — run Deslint alongside your
          existing lint pipeline.
        </li>
        <li>
          <a href="#cli">CLI</a> — scan, fix, and gate on a Design Health Score
          from the command line or CI.
        </li>
        <li>
          <a href="#github-action">GitHub Action</a> — score every PR inline.
        </li>
      </ul>

      <h2 id="mcp">MCP server for AI coding agents</h2>
      <p>
        Deslint&apos;s Model Context Protocol server lets your AI coding agent
        call deterministic design and accessibility checks before it ships a
        diff. One install, four agents:
      </p>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto">
        <code>npx @deslint/mcp install</code>
      </pre>
      <p>
        The installer detects your agent&apos;s config path, writes the MCP
        server entry, and tells you which config file to restart. Vendor-
        specific guides:
      </p>
      <ul>
        <li>
          <a href="/mcp/claude-code">Deslint for Claude Code</a> — Anthropic&apos;s
          coding agent / Claude Desktop
        </li>
        <li>
          <a href="/mcp/cursor">Deslint for Cursor</a> — Composer + Agent modes
        </li>
        <li>
          <a href="/mcp/codex">Deslint for OpenAI Codex</a>
        </li>
        <li>
          <a href="/mcp/windsurf">Deslint for Windsurf</a> — Codeium&apos;s
          Cascade agent
        </li>
      </ul>
      <p>
        Prefer to paste the config yourself? Any MCP-compatible client accepts
        the same snippet:
      </p>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto">
        <code>{`{
  "mcpServers": {
    "deslint": {
      "command": "npx",
      "args": ["-y", "@deslint/mcp"]
    }
  }
}`}</code>
      </pre>

      <h2 id="eslint">ESLint plugin</h2>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto">
        <code>npm install @deslint/eslint-plugin --save-dev</code>
      </pre>
      <p>
        Add Deslint to your <code>eslint.config.js</code> (ESLint v10+ flat
        config):
      </p>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto">
        <code>{`import deslint from '@deslint/eslint-plugin';

export default [
  deslint.configs.recommended,
  // ... your other config
];`}</code>
      </pre>

      <h2 id="cli">CLI — init, scan, fix</h2>
      <p>The fastest way to bootstrap the CLI in an existing project:</p>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto">
        <code>npx deslint init</code>
      </pre>
      <p>
        The wizard auto-detects your framework, imports your Tailwind config,
        and generates a <code>.deslintrc.json</code> with your design system
        tokens.
      </p>

      <h3>Run your first scan</h3>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto">
        <code>npx deslint scan</code>
      </pre>
      <p>
        Outputs a Design Health Score (0–100) with per-category breakdowns
        for colors, spacing, typography, responsive, and consistency.
      </p>

      <h3>Fix violations</h3>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto">
        <code>{`# Interactive mode — review each violation
npx deslint fix --interactive

# Auto-fix all — apply all safe fixes at once
npx deslint fix --all

# Dry run — preview changes without modifying files
npx deslint fix --dry-run`}</code>
      </pre>

      <h3>Import design tokens</h3>
      <p>
        Deslint enforces rules against the design system you already have. Pull
        tokens from wherever they live — no need to hand-maintain a second
        copy.
      </p>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto">
        <code>{`# Figma Variables (read-only API)
npx deslint import-tokens --figma <file-id>

# Style Dictionary (file or directory)
npx deslint import-tokens --style-dictionary ./tokens

# Google Stitch / Material 3
npx deslint import-tokens --stitch ./stitch-tokens.json`}</code>
      </pre>
      <p>
        Each adapter emits a W3C DTCG tokens file (or a{' '}
        <code>.deslintrc.json</code> fragment) that the rest of Deslint
        consumes without modification.
      </p>

      <h2 id="github-action">GitHub Action</h2>
      <p>Gate design quality on every PR:</p>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto">
        <code>{`- name: Design Quality Gate
  run: npx deslint scan --min-score 75 --format sarif`}</code>
      </pre>
      <p>
        Exit code 1 if the Design Health Score drops below your threshold.
        SARIF output integrates with GitHub Advanced Security.
      </p>

      <h2>Framework support</h2>
      <p>Deslint works with every major frontend framework out of the box:</p>
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

      <h2>Tailwind v3 + v4</h2>
      <p>
        All rules support both Tailwind v3 and v4 class naming conventions.
        Deslint auto-detects your Tailwind version from your config file.
      </p>
    </div>
  );
}
