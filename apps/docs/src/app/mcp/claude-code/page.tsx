import type { Metadata } from 'next';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { McpConfigSnippet } from '@/components/mcp/McpConfigSnippet';

export const metadata: Metadata = {
  title: 'Deslint for Claude Code — MCP Design Linter (2 min install)',
  description:
    'Install Deslint\'s MCP server in Claude Code. Deterministic design-system and WCAG lint that runs before Claude writes code. Zero LLM, zero cloud, zero egress.',
  alternates: { canonical: '/mcp/claude-code' },
  openGraph: {
    title: 'Deslint for Claude Code — MCP Design Linter',
    description:
      'Deterministic design and a11y lint inside Claude Code. Local MCP server, no cloud, no LLM in the hot path.',
    url: 'https://deslint.com/mcp/claude-code',
    type: 'article',
  },
};

export default function ClaudeCodePage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 pt-32 pb-20">
        <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
          MCP · Claude Code
        </p>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 leading-[1.1] mb-6">
          Deslint for Claude Code
        </h1>
        <p className="text-lg text-gray-600 leading-relaxed mb-8">
          Claude Code is fast at shipping UI. It is equally fast at shipping
          arbitrary hex colours, off-scale spacing, missing alt text, and
          contrast failures. Deslint is the deterministic check Claude Code
          can call <em>before</em> it writes the file — delivered over the
          Model Context Protocol.
        </p>

        <section className="mb-10">
          <h2 className="text-xl font-semibold tracking-tight text-gray-900 mb-4">
            Install
          </h2>
          <p className="text-gray-600 mb-4">
            Run once. The installer detects Claude Desktop (which Claude Code
            shares config with) and writes the MCP server entry. Restart
            Claude Code to pick it up.
          </p>
          <div className="rounded-xl bg-gray-950 text-gray-200 font-mono text-sm px-5 py-4 mb-6">
            <span className="text-gray-500 select-none">$ </span>
            <span className="text-pass">npx</span>{' '}
            <span className="text-white">@deslint/mcp install</span>
          </div>
          <p className="text-sm text-gray-600 mb-3">
            Or drop the snippet into Claude&apos;s config manually:
          </p>
          <McpConfigSnippet label="~/Library/Application Support/Claude/claude_desktop_config.json" />
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold tracking-tight text-gray-900 mb-4">
            What happens next
          </h2>
          <ol className="space-y-3 text-gray-700 list-decimal list-inside">
            <li>
              Claude Code handshakes with the <code>deslint</code> MCP server
              over stdio on startup.
            </li>
            <li>
              When you ask Claude to change UI, it calls{' '}
              <code>analyze_and_fix</code> on the touched files first and
              applies the suggestions it returns.
            </li>
            <li>
              On any remaining violation it cannot auto-fix, Claude receives
              a structured plan from <code>suggest_fix_strategy</code> and
              tells you exactly what it needs you to decide.
            </li>
            <li>
              Drift never lands in the repo. You never waste a review cycle
              arguing over <code>bg-[#1a5276]</code> again.
            </li>
          </ol>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold tracking-tight text-gray-900 mb-4">
            Example prompt
          </h2>
          <blockquote className="border-l-4 border-primary/40 bg-primary-50/30 pl-5 py-4 rounded-r-lg text-gray-700 italic">
            &ldquo;Add a primary CTA button to the pricing card. Use our
            design tokens — run <code>enforce_budget</code> before you
            commit.&rdquo;
          </blockquote>
          <p className="text-sm text-gray-600 mt-3">
            Claude calls deslint&apos;s <code>enforce_budget</code> tool,
            which gates on the rule budgets in your{' '}
            <code>.deslintrc.json</code>. If the budget is exceeded, Claude
            halts and asks you to approve the drift — or reverts its own
            edit.
          </p>
        </section>

        <section className="mb-10 rounded-xl border border-primary/20 bg-primary-50/30 px-6 py-5">
          <h2 className="text-lg font-semibold tracking-tight text-gray-900 mb-3">
            Why this works for regulated teams
          </h2>
          <p className="text-sm text-gray-700 leading-relaxed">
            The Deslint MCP server is a local stdio subprocess. It never
            calls the network. It never invokes an LLM of its own. The
            rules are deterministic ESLint rules — the same ones you can
            inspect in the{' '}
            <a
              href="https://github.com/jaydrao215/deslint"
              className="text-primary hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              open-source repository
            </a>
            . Zero code leaves your machine. Safe inside enterprise firewalls
            and private-cloud Claude Code deployments.
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
            Using Cursor instead?
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
