import type { Metadata } from 'next';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { McpConfigSnippet } from '@/components/mcp/McpConfigSnippet';
import { BreadcrumbJsonLd } from '@/components/BreadcrumbJsonLd';
import { MCP_SOFTWARE_APPLICATION } from '@/lib/mcp-jsonld';

export const metadata: Metadata = {
  title: 'Deslint MCP — Design Linter for Claude Code, Cursor, Codex & Windsurf',
  description:
    'Deslint ships a Model Context Protocol (MCP) server that runs as a local subprocess of your AI coding agent. Deterministic design-system and accessibility lint, zero LLM, zero cloud. Works with Claude Code, Cursor, Codex, and Windsurf.',
  alternates: { canonical: '/mcp' },
  openGraph: {
    title: 'Deslint MCP — Design Linter Inside Your AI Coding Agent',
    description:
      'Local-first MCP server for Claude Code, Cursor, Codex, and Windsurf. Deterministic. No LLM in the hot path. Zero egress.',
    url: 'https://deslint.com/mcp',
    type: 'website',
  },
};

const AGENTS = [
  {
    slug: 'claude-code',
    name: 'Claude Code',
    blurb: 'Anthropic\'s terminal-first coding agent.',
  },
  {
    slug: 'cursor',
    name: 'Cursor',
    blurb: 'The AI-first code editor.',
  },
  {
    slug: 'codex',
    name: 'Codex',
    blurb: 'OpenAI\'s coding agent.',
  },
  {
    slug: 'windsurf',
    name: 'Windsurf',
    blurb: 'Codeium\'s agentic IDE.',
  },
];

const TOOLS = [
  {
    name: 'analyze_file',
    blurb: 'Return all design-system and a11y violations for a single file.',
  },
  {
    name: 'analyze_project',
    blurb: 'Scan the whole workspace and return aggregated scores.',
  },
  {
    name: 'analyze_and_fix',
    blurb: 'Scan, apply every safe auto-fix in place, report what is left.',
  },
  {
    name: 'compliance_check',
    blurb:
      'Produce the full compliance report (health score, debt, WCAG) as a single structured payload.',
  },
  {
    name: 'enforce_budget',
    blurb:
      'Gate on rule budgets from .deslintrc.json. Returns pass / fail so the agent can halt its own edits.',
  },
  {
    name: 'get_rule_details',
    blurb:
      'Fetch the docs, examples, and suggested fixes for any deslint rule.',
  },
  {
    name: 'suggest_fix_strategy',
    blurb:
      'Given a violation, return a structured fix plan the agent can execute.',
  },
];

const JSON_LD = {
  '@context': 'https://schema.org',
  ...MCP_SOFTWARE_APPLICATION,
};

export default function McpHubPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <Navbar />
      <BreadcrumbJsonLd trail={[{ name: 'MCP', path: '/mcp' }]} />
      <main className="mx-auto max-w-4xl px-6 pt-32 pb-20">
        <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
          Model Context Protocol
        </p>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 leading-[1.1] mb-6">
          Deslint MCP — the design linter inside your AI coding agent.
        </h1>
        <p className="text-lg text-gray-600 leading-relaxed mb-10 max-w-2xl">
          Deslint ships a Model Context Protocol server that runs as a local
          subprocess of any MCP-compatible agent. The agent calls deterministic
          tools — <code className="font-mono text-sm">analyze_and_fix</code>,{' '}
          <code className="font-mono text-sm">enforce_budget</code>,{' '}
          <code className="font-mono text-sm">compliance_check</code> — before
          it writes code, so design-system drift and accessibility failures
          never land in your PR. No LLM in the hot path. Zero bytes ever leave
          your machine.
        </p>

        {/* Install */}
        <section className="mb-14">
          <h2 className="text-2xl font-semibold tracking-tight text-gray-900 mb-4">
            Install in one command
          </h2>
          <p className="text-gray-600 mb-5">
            The installer detects Claude Desktop and Cursor and writes the
            MCP config for you. For other agents, drop the snippet below into
            the agent&apos;s MCP config file.
          </p>
          <div className="rounded-xl bg-gray-950 text-gray-200 font-mono text-sm px-5 py-4 mb-5">
            <span className="text-gray-500 select-none">$ </span>
            <span className="text-pass">npx</span>{' '}
            <span className="text-white">@deslint/mcp install</span>
          </div>
          <McpConfigSnippet />
        </section>

        {/* Agents grid */}
        <section className="mb-14">
          <h2 className="text-2xl font-semibold tracking-tight text-gray-900 mb-5">
            Pick your agent
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {AGENTS.map((a) => (
              <Link
                key={a.slug}
                href={`/mcp/${a.slug}`}
                className="group rounded-xl border border-gray-200 bg-white px-5 py-4 hover:border-primary/40 hover:shadow-md motion-safe:transition-all"
              >
                <div className="flex items-baseline justify-between mb-1">
                  <span className="font-semibold text-gray-900 group-hover:text-primary">
                    {a.name}
                  </span>
                  <span className="text-xs text-gray-400">
                    /mcp/{a.slug} →
                  </span>
                </div>
                <p className="text-sm text-gray-600">{a.blurb}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* Tools reference */}
        <section className="mb-14">
          <h2 className="text-2xl font-semibold tracking-tight text-gray-900 mb-5">
            Tools the agent can call
          </h2>
          <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
            {TOOLS.map((t) => (
              <li key={t.name} className="px-5 py-3.5 flex gap-4 items-baseline">
                <code className="font-mono text-sm font-semibold text-primary shrink-0 w-52">
                  {t.name}
                </code>
                <span className="text-sm text-gray-600">{t.blurb}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Local-first promise */}
        <section className="mb-14 rounded-xl border border-primary/20 bg-primary-50/40 px-6 py-6">
          <h2 className="text-xl font-semibold tracking-tight text-gray-900 mb-3">
            Why a local MCP server — not a cloud review bot
          </h2>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>
              <strong>Pre-generation, not post-PR.</strong> The agent calls
              deslint before it writes the file. Drift gets stopped at the
              source, not 24 hours later in CI.
            </li>
            <li>
              <strong>Zero LLM in the hot path.</strong> Every finding is the
              output of a deterministic ESLint rule. Same result every run.
            </li>
            <li>
              <strong>Zero egress.</strong> The MCP server is a stdio
              subprocess. No network calls. No code leaves your machine.
              Safe inside enterprise firewalls and regulated environments.
            </li>
          </ul>
        </section>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/mcp/claude-code"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary-light motion-safe:transition-all"
          >
            Install for Claude Code
          </Link>
          <Link
            href="/mcp/cursor"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:border-gray-300 hover:bg-gray-50 motion-safe:transition-all"
          >
            Install for Cursor
          </Link>
          <Link
            href="/docs/getting-started"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:border-gray-300 hover:bg-gray-50 motion-safe:transition-all"
          >
            Full docs
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
