import type { Metadata } from 'next';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { McpConfigSnippet } from '@/components/mcp/McpConfigSnippet';

export const metadata: Metadata = {
  title: 'Deslint for Cursor — MCP Design Linter (2 min install)',
  description:
    'Install Deslint\'s MCP server in Cursor. Deterministic design-system, token, and WCAG lint that Cursor calls before it writes code. Local-only. No LLM. No egress.',
  alternates: { canonical: '/mcp/cursor' },
  openGraph: {
    title: 'Deslint for Cursor — MCP Design Linter',
    description:
      'Cursor calls deslint\'s MCP tools before it ships a change. Zero cloud, zero LLM in the hot path.',
    url: 'https://deslint.com/mcp/cursor',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Deslint for Cursor — MCP Design Linter',
    description:
      'Install the Deslint MCP server in Cursor. Deterministic design-token, WCAG, and responsive lint called before code is written.',
  },
};

export default function CursorPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 pt-32 pb-20">
        <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
          MCP · Cursor
        </p>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 leading-[1.1] mb-6">
          Deslint for Cursor
        </h1>
        <p className="text-lg text-gray-600 leading-relaxed mb-8">
          Cursor&apos;s Composer and Agent modes are prolific. Within a week
          they can quietly rewrite a third of your UI, and half of it will
          have slipped past your design tokens. Deslint runs as a Model
          Context Protocol server Cursor invokes in-loop — pre-generation,
          deterministically, with zero network calls.
        </p>

        <section className="mb-10">
          <h2 className="text-xl font-semibold tracking-tight text-gray-900 mb-4">
            Install
          </h2>
          <p className="text-gray-600 mb-4">
            The one-line installer writes the MCP config into{' '}
            <code>~/.cursor/mcp.json</code>. Reload Cursor and the{' '}
            <code>deslint</code> server appears under Settings → MCP.
          </p>
          <div className="rounded-xl bg-gray-950 text-gray-200 font-mono text-sm px-5 py-4 mb-6">
            <span className="text-gray-500 select-none">$ </span>
            <span className="text-pass">npx</span>{' '}
            <span className="text-white">@deslint/mcp install</span>
          </div>
          <p className="text-sm text-gray-600 mb-3">
            Prefer manual config? Paste this into{' '}
            <code>~/.cursor/mcp.json</code>:
          </p>
          <McpConfigSnippet label="~/.cursor/mcp.json" />
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold tracking-tight text-gray-900 mb-4">
            How Cursor uses deslint
          </h2>
          <ul className="space-y-3 text-gray-700">
            <li>
              <strong>In-Composer auto-fix.</strong> Before Cursor finalises a
              multi-file diff, it calls <code>analyze_and_fix</code> on the
              touched files. Safe fixes (token swaps, spacing, radius) are
              applied silently; anything risky is flagged in the diff.
            </li>
            <li>
              <strong>Budget enforcement.</strong> Pin your rule budgets in{' '}
              <code>.deslintrc.json</code>. Cursor calls{' '}
              <code>enforce_budget</code> before committing and refuses to
              ship the change if it would push the project over budget.
            </li>
            <li>
              <strong>Rule docs on demand.</strong>{' '}
              <code>get_rule_details</code> lets Cursor quote the rule
              documentation inline when it&apos;s explaining a change to you
              — so the rule, the violation, and the fix all travel together.
            </li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold tracking-tight text-gray-900 mb-4">
            Example tool call
          </h2>
          <div className="rounded-xl bg-gray-950 text-gray-200 font-mono text-xs px-5 py-4 overflow-x-auto leading-relaxed">
            <div className="text-gray-500">// Cursor → deslint MCP</div>
            <div>
              <span className="text-primary-light">→</span>{' '}
              <span className="text-white">tools/call</span>{' '}
              <span className="text-gray-400">deslint.analyze_and_fix</span>
            </div>
            <div className="text-gray-400 pl-4">
              paths: <span className="text-[#ce9178]">[&quot;src/PricingCard.tsx&quot;]</span>
            </div>
            <div className="mt-2 text-gray-500">// deslint → Cursor</div>
            <div>
              <span className="text-pass">←</span>{' '}
              <span className="text-warn-light">4 findings</span>,{' '}
              <span className="text-pass-light">3 auto-fixed</span>
            </div>
          </div>
        </section>

        <section className="mb-10 rounded-xl border border-primary/20 bg-primary-50/30 px-6 py-5">
          <h2 className="text-lg font-semibold tracking-tight text-gray-900 mb-3">
            Privacy notes
          </h2>
          <p className="text-sm text-gray-700 leading-relaxed">
            Deslint never calls the network. The MCP server is a Node process
            Cursor spawns over stdio. It reads local files, runs ESLint with
            the deslint rule set, and returns JSON. It does not share code
            with deslint.com, Anthropic, OpenAI, or any third party — even if
            Cursor itself is configured to.
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
            href="/mcp/codex"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:border-gray-300 hover:bg-gray-50"
          >
            OpenAI Codex setup
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
