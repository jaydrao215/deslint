import type { Metadata } from 'next';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { McpConfigSnippet } from '@/components/mcp/McpConfigSnippet';
import { BreadcrumbJsonLd } from '@/components/BreadcrumbJsonLd';
import { mcpAgentTechArticle } from '@/lib/mcp-jsonld';

export const metadata: Metadata = {
  title: 'Deslint for Codex — MCP Design Linter for OpenAI\'s Coding Agent',
  description:
    'Wire Deslint\'s MCP server into Codex. Deterministic design-system and a11y lint that Codex can call as a tool. Local-only, no extra LLM, no network egress.',
  alternates: { canonical: '/mcp/codex' },
  keywords: [
    'deslint mcp',
    'codex mcp server',
    'openai codex mcp',
    'mcp server design lint',
    'design linter for codex',
    'ai coding agent design drift',
    'deterministic design linter',
  ],
  openGraph: {
    title: 'Deslint for Codex — MCP Design Linter',
    description:
      'Deterministic design and accessibility lint inside OpenAI Codex. Local MCP server, zero cloud.',
    url: 'https://deslint.com/mcp/codex',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Deslint for Codex — MCP Design Linter',
    description:
      'Wire the Deslint MCP server into Codex. Deterministic design-system and WCAG lint Codex can call as a tool.',
  },
};

const JSON_LD = mcpAgentTechArticle({
  agentName: 'OpenAI Codex',
  headline: 'Deslint for Codex — MCP Design Linter',
  description:
    "Wire Deslint's MCP server into Codex. Deterministic design-system and a11y lint that Codex can call as a tool. Local-only, no extra LLM, no network egress.",
  url: 'https://deslint.com/mcp/codex',
});

export default function CodexPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <Navbar />
      <BreadcrumbJsonLd
        trail={[
          { name: 'MCP', path: '/mcp' },
          { name: 'Codex', path: '/mcp/codex' },
        ]}
      />
      <main className="mx-auto max-w-3xl px-6 pt-32 pb-20">
        <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
          MCP · OpenAI Codex
        </p>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 leading-[1.1] mb-6">
          Deslint for Codex
        </h1>
        <p className="text-lg text-gray-600 leading-relaxed mb-8">
          OpenAI Codex is great at one-shotting whole features. Without a
          gate, every feature is also a fresh opportunity for arbitrary
          Tailwind values, off-palette colours, and missing ARIA attributes.
          Deslint&apos;s MCP server gives Codex a deterministic callable tool
          surface — <code>analyze_and_fix</code>, <code>compliance_check</code>,{' '}
          <code>enforce_budget</code> — it can invoke before committing.
        </p>

        <section className="mb-10">
          <h2 className="text-xl font-semibold tracking-tight text-gray-900 mb-4">
            Install
          </h2>
          <p className="text-gray-600 mb-4">
            Any MCP-compatible Codex client accepts the standard MCP config.
            Add the <code>deslint</code> entry to your Codex MCP config file:
          </p>
          <McpConfigSnippet />
          <p className="text-sm text-gray-600 mt-4">
            If your Codex client hasn&apos;t enabled MCP yet, the{' '}
            <a
              href="https://github.com/jaydrao215/deslint"
              className="text-primary hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              deslint CLI
            </a>{' '}
            runs the same rule set — run{' '}
            <code>npx @deslint/cli scan</code> in your Codex-generated diff
            to get the identical output.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold tracking-tight text-gray-900 mb-4">
            What Codex gets from deslint
          </h2>
          <ul className="space-y-3 text-gray-700">
            <li>
              <strong>Rule-backed structured output.</strong> Each tool
              response is a JSON payload Codex can parse without chain-of-thought
              guessing — rule id, line number, suggested fix, confidence.
            </li>
            <li>
              <strong>Determinism the planner can trust.</strong> Codex can
              assert a budget (&ldquo;no new <code>no-arbitrary-colors</code>{' '}
              violations&rdquo;) and verify it mechanically with{' '}
              <code>enforce_budget</code>. No need to re-ask a separate
              reviewer model.
            </li>
            <li>
              <strong>Compliance report on demand.</strong>{' '}
              <code>compliance_check</code> returns the full WCAG + design-token
              scorecard in one call — useful when Codex is writing release
              notes or PR descriptions.
            </li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold tracking-tight text-gray-900 mb-4">
            Example loop
          </h2>
          <div className="rounded-xl bg-gray-950 text-gray-200 font-mono text-xs px-5 py-4 overflow-x-auto leading-relaxed">
            <div className="text-gray-500">// Codex plans the change</div>
            <div>
              <span className="text-primary-light">→</span>{' '}
              <span className="text-white">tools/call</span>{' '}
              <span className="text-gray-400">deslint.compliance_check</span>
            </div>
            <div className="mt-2 text-gray-500">// deslint returns baseline</div>
            <div>
              <span className="text-pass">←</span> health{' '}
              <span className="text-pass-light">82</span>, coverage{' '}
              <span className="text-pass-light">67%</span>
            </div>
            <div className="mt-3 text-gray-500">// Codex writes the diff, then re-checks</div>
            <div>
              <span className="text-primary-light">→</span>{' '}
              <span className="text-white">tools/call</span>{' '}
              <span className="text-gray-400">deslint.analyze_and_fix</span>
            </div>
            <div>
              <span className="text-pass">←</span>{' '}
              <span className="text-pass-light">4 auto-fixed</span>, new health{' '}
              <span className="text-pass-light">85</span>
            </div>
          </div>
        </section>

        <section className="mb-10 rounded-xl border border-primary/20 bg-primary-50/30 px-6 py-5">
          <h2 className="text-lg font-semibold tracking-tight text-gray-900 mb-3">
            Data boundary
          </h2>
          <p className="text-sm text-gray-700 leading-relaxed">
            Deslint&apos;s MCP server runs entirely on the host machine and
            does not call OpenAI, Anthropic, or any other provider. Even if
            your Codex client is cloud-hosted, deslint itself processes your
            code locally. For regulated teams running Codex on isolated
            infrastructure, deslint ships as a single stdio binary with no
            network dependency.
          </p>
        </section>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/mcp"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary-light"
          >
            See all MCP tools
          </Link>
          <Link
            href="/mcp/claude-code"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:border-gray-300 hover:bg-gray-50"
          >
            Claude Code setup
          </Link>
          <Link
            href="/mcp/cursor"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:border-gray-300 hover:bg-gray-50"
          >
            Cursor setup
          </Link>
          <Link
            href="/mcp/windsurf"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:border-gray-300 hover:bg-gray-50"
          >
            Windsurf setup
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
