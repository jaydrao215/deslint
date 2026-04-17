import type { Metadata } from 'next';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { McpConfigSnippet } from '@/components/mcp/McpConfigSnippet';

export const metadata: Metadata = {
  title: 'Deslint for Windsurf — MCP Design Linter for Codeium\'s Agent IDE',
  description:
    'Install Deslint\'s MCP server in Windsurf. Deterministic design-token, accessibility, and responsive-layout lint the Cascade agent calls pre-commit. Local, no cloud.',
  alternates: { canonical: '/mcp/windsurf' },
  openGraph: {
    title: 'Deslint for Windsurf — MCP Design Linter',
    description:
      'Cascade calls deslint\'s MCP tools before shipping UI. Zero egress, zero LLM in the check path.',
    url: 'https://deslint.com/mcp/windsurf',
    type: 'article',
  },
};

export default function WindsurfPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 pt-32 pb-20">
        <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
          MCP · Windsurf
        </p>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 leading-[1.1] mb-6">
          Deslint for Windsurf
        </h1>
        <p className="text-lg text-gray-600 leading-relaxed mb-8">
          Windsurf&apos;s Cascade agent moves across files at the speed of a
          full codebase edit. That&apos;s exactly when deterministic
          guardrails matter most — without them, one Cascade run can silently
          regress your dark-mode contrast and snap every button to
          off-palette greys. Deslint&apos;s MCP server gives Cascade a
          deterministic tool to call on every touched file.
        </p>

        <section className="mb-10">
          <h2 className="text-xl font-semibold tracking-tight text-gray-900 mb-4">
            Install
          </h2>
          <p className="text-gray-600 mb-4">
            Add the <code>deslint</code> server to Windsurf&apos;s MCP config.
            Open Windsurf Settings → Cascade → MCP Servers, or edit the
            config file directly:
          </p>
          <McpConfigSnippet label="~/.codeium/windsurf/mcp_config.json" />
          <p className="text-sm text-gray-600 mt-4">
            Restart Windsurf to load the server. The{' '}
            <code>deslint.*</code> tools will appear in Cascade&apos;s tool
            list.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold tracking-tight text-gray-900 mb-4">
            How Cascade uses deslint
          </h2>
          <ul className="space-y-3 text-gray-700">
            <li>
              <strong>Per-step validation.</strong> Cascade calls{' '}
              <code>analyze_file</code> on each file it edits, applies the
              fixable suggestions, and keeps iterating until the budget
              holds.
            </li>
            <li>
              <strong>Cross-file consistency.</strong> Because{' '}
              <code>analyze_project</code> returns aggregated scores across
              the whole workspace, Cascade can detect when its own edits
              have started a regression trend and stop early.
            </li>
            <li>
              <strong>PR-ready output.</strong>{' '}
              <code>compliance_check</code> produces a clean JSON report
              Cascade can attach to its proposed diff — so your reviewers
              see the scorecard, not just the edit.
            </li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold tracking-tight text-gray-900 mb-4">
            Cascade prompt pattern
          </h2>
          <blockquote className="border-l-4 border-primary/40 bg-primary-50/30 pl-5 py-4 rounded-r-lg text-gray-700 italic">
            &ldquo;Refactor the marketing site to use our new typography
            tokens. After each file, call{' '}
            <code>deslint.analyze_and_fix</code>. Before finishing, run{' '}
            <code>deslint.enforce_budget</code> and show me the
            scorecard.&rdquo;
          </blockquote>
          <p className="text-sm text-gray-600 mt-3">
            This pattern turns deslint into a self-checking contract for
            Cascade: the agent cannot mark the step complete unless the
            budget passes.
          </p>
        </section>

        <section className="mb-10 rounded-xl border border-primary/20 bg-primary-50/30 px-6 py-5">
          <h2 className="text-lg font-semibold tracking-tight text-gray-900 mb-3">
            Why local matters here
          </h2>
          <p className="text-sm text-gray-700 leading-relaxed">
            Cascade can traverse entire monorepos. Sending that surface area
            to a cloud linter would be a data-governance nightmare. Deslint
            is a local stdio subprocess — it reads files, runs rules, returns
            JSON. No network. No LLM in the check loop. No egress to worry
            about, regardless of how aggressively Cascade scans.
          </p>
        </section>

        <div className="flex gap-3">
          <Link
            href="/mcp"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary-light"
          >
            See all MCP tools
          </Link>
          <Link
            href="/mcp/cursor"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:border-gray-300 hover:bg-gray-50"
          >
            Cursor setup
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
