import type { Metadata } from 'next';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { BreadcrumbJsonLd } from '@/components/BreadcrumbJsonLd';

export const metadata: Metadata = {
  title: 'Deslint Launch Check — Is your AI-built app ready to ship?',
  description:
    "One command. Free. Local. `npx deslint launch-check` scores your AI-generated frontend across 5 categories — colors, spacing, typography, responsive coverage, consistency — plus the safety basics. Built for indie devs shipping with Cursor, Claude Code, Codex, and Windsurf.",
  alternates: { canonical: '/launch-check' },
  keywords: [
    'launch check',
    'is my ai app ready to ship',
    'fix cursor mistakes',
    'lint ai generated code',
    'frontend launch readiness',
    'vibe coding qa',
    'ai app pre-flight check',
  ],
  openGraph: {
    title: 'Is your AI-built app ready to ship? — Deslint Launch Check',
    description:
      'A free 0-100 readiness score for AI-generated frontends. One command, no install, runs locally. Catch what Cursor / Claude / Codex broke before your users do.',
    url: 'https://deslint.com/launch-check',
    type: 'website',
  },
};

const BROKEN_BY_AI = [
  {
    title: 'Hardcoded Tailwind values',
    pain: 'Your AI guessed `p-[13px]` instead of `p-4`. Three weeks later your design tokens are useless.',
    catches: '`no-arbitrary-spacing`, `no-arbitrary-colors`, `no-arbitrary-typography`, `no-arbitrary-border-radius`',
    fix: 'Auto-fix. One command rewrites them to the nearest token.',
  },
  {
    title: 'Mobile layout pretends desktop is everywhere',
    pain: 'The AI never opened DevTools. No `md:`, no `sm:`, fixed widths everywhere. Looks fine until someone visits on a phone.',
    catches: '`responsive-required`, `viewport-meta`, `touch-target-size`',
    fix: 'Reports each fixed-width container that needs a breakpoint.',
  },
  {
    title: 'Buttons without focus rings, links that say "click here"',
    pain: 'Accessibility is the first thing AI strips when it\'s "cleaning up". WCAG failures ship as warnings nobody reads.',
    catches: '`focus-visible-style`, `link-text`, `image-alt-text`, `form-labels`, `aria-validation`',
    fix: 'WCAG 2.2-mapped. Tells you which clause each violation breaks.',
  },
  {
    title: 'Dark mode survived… on three components out of forty',
    pain: 'You asked the AI to add dark mode. It added `dark:` to half the file and called it done.',
    catches: '`dark-mode-coverage`',
    fix: 'Lists every element that has `bg-*` but no `dark:bg-*` peer.',
  },
  {
    title: '`dangerouslySetInnerHTML` on user-supplied data',
    pain: 'The AI rendered a comment field with `dangerouslySetInnerHTML`. You just shipped XSS.',
    catches: '`no-dangerous-html`, `safe-external-links`, `iframe-sandbox`',
    fix: 'Frontend safety basics, flagged before they reach prod.',
  },
  {
    title: 'Same component, six different paddings',
    pain: 'Each time the AI regenerates a card it picks a slightly different size. The grid drifts.',
    catches: '`consistent-component-spacing`, `consistent-border-radius`, `spacing-rhythm-consistency`',
    fix: 'Cross-file consistency check, not just one-line lints.',
  },
];

export default function LaunchCheckPage() {
  return (
    <>
      <Navbar />
      <BreadcrumbJsonLd trail={[{ name: 'Launch Check', path: '/launch-check' }]} />
      <main className="mx-auto max-w-4xl px-6 pt-32 pb-20">
        <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
          Free · No install · Runs locally
        </p>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 leading-[1.1] mb-6">
          Is your AI-built app ready to ship?
        </h1>
        <p className="text-lg text-gray-600 leading-relaxed mb-8 max-w-2xl">
          Cursor just rewrote your checkout flow. Claude Code added a settings
          page in eleven seconds. Codex generated the whole signup form.
          Everything looks fine — until someone opens it on a phone, in dark
          mode, with a screen reader. <strong className="text-gray-900">Run one command before you push.</strong>
        </p>

        {/* Hero command */}
        <div className="rounded-xl bg-gray-950 text-gray-200 font-mono text-base px-5 py-4 mb-3">
          <span className="text-gray-500 select-none">$ </span>
          <span className="text-pass">npx</span>{' '}
          <span className="text-white">deslint launch-check</span>
        </div>
        <p className="text-sm text-gray-500 mb-12">
          Zero install, zero config. Detects React / Vue / Svelte / Angular /
          plain HTML on its own. Requires Node 20.19+.
        </p>

        {/* Sample report */}
        <section className="mb-14">
          <h2 className="text-2xl font-semibold tracking-tight text-gray-900 mb-4">
            What you get back
          </h2>
          <p className="text-gray-600 mb-5 max-w-2xl">
            A single 0-100 score, five category bars, and a Fix Plan that
            tells you the literal next command to run. No dashboard, no
            account, no telemetry — the report renders in your terminal and
            in <code className="font-mono text-xs">.deslint/report.html</code>.
          </p>
          <div className="rounded-xl bg-gray-950 text-gray-200 font-mono text-sm leading-relaxed px-5 py-5 whitespace-pre overflow-x-auto">
{`$ npx deslint launch-check

  Deslint Launch Check
  ────────────────────────────────────────────────────────

  Frontend Launch Readiness: `}<span className="text-warn">73</span>{`/100

  Colors       ████████████████████ 100
  Spacing      ███████████░░░░░░░░░  56  (8 violations)
  Typography   ████████████████░░░░  80  (3 violations)
  Responsive   ████████████░░░░░░░░  62  (5 violations)
  Consistency  ███████████████████░  95  (1 violation)

  Files scanned: 38
  Files with issues: 11
  Total violations: `}<span className="text-warn">17 warnings</span>{`, `}<span className="text-fail">2 errors</span>{`
  Design debt: 1h 5m estimated remediation effort

  Fix Plan
  `}<span className="text-pass">Auto-fix now:</span>{` 9 issues across no-arbitrary-spacing, no-arbitrary-colors
    npx deslint fix --all
  `}<span className="text-warn">Needs design decision:</span>{` 4 token candidates (3 repeated values)
  `}<span className="text-fail">Accessibility blockers:</span>{` 2 WCAG-mapped issues (2 errors)
    npx deslint compliance

  Next:
    9 auto-fixable. Review with \`npx deslint fix --interactive\`
    Or apply every safe fix: \`npx deslint fix --all\``}
          </div>
        </section>

        {/* AI broke this */}
        <section className="mb-14">
          <h2 className="text-2xl font-semibold tracking-tight text-gray-900 mb-2">
            What it catches that your AI missed
          </h2>
          <p className="text-gray-600 mb-6 max-w-2xl">
            37 deterministic rules across 5 scoring categories — design system,
            spacing, typography, responsive coverage, consistency — plus the
            safety basics every shipped app should pass. Every check is plain
            ESLint underneath, so no LLM ever sees your code.
          </p>
          <ul className="space-y-4">
            {BROKEN_BY_AI.map((item) => (
              <li key={item.title} className="rounded-xl border border-gray-200 bg-white px-5 py-4">
                <h3 className="font-semibold text-gray-900 mb-1.5">{item.title}</h3>
                <p className="text-sm text-gray-600 mb-2">{item.pain}</p>
                <p className="text-xs text-gray-500 mb-1">
                  <span className="font-semibold text-gray-700">Rules: </span>
                  <code className="font-mono">{item.catches}</code>
                </p>
                <p className="text-xs text-gray-500">
                  <span className="font-semibold text-gray-700">Output: </span>
                  {item.fix}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {/* Why local */}
        <section className="mb-14 rounded-xl border border-primary/20 bg-primary-50/40 px-6 py-6">
          <h2 className="text-xl font-semibold tracking-tight text-gray-900 mb-3">
            Why this isn't another AI code-review SaaS
          </h2>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>
              <strong>No LLM in the hot path.</strong> Every rule is plain
              ESLint logic — same input, same output, every run. There's no
              second AI second-guessing the first.
            </li>
            <li>
              <strong>Zero code egress.</strong> Files read from disk, report
              written to your terminal. No outbound network calls. No account.
              No usage telemetry.
            </li>
            <li>
              <strong>Free forever.</strong> The CLI, the rules, the GitHub
              Action, the MCP servers — all open-source under MIT. Pricing
              exists for orgs that want hosted attestations; the core never
              becomes a paywall.
            </li>
          </ul>
        </section>

        {/* Once you've passed */}
        <section className="mb-14">
          <h2 className="text-2xl font-semibold tracking-tight text-gray-900 mb-4">
            Once your launch check passes
          </h2>
          <p className="text-gray-600 mb-5 max-w-2xl">
            Three places to plug Deslint in so the next AI rewrite doesn't
            silently regress what you just fixed.
          </p>
          <div className="grid sm:grid-cols-3 gap-3">
            <Link
              href="/mcp"
              className="rounded-xl border border-gray-200 bg-white px-5 py-3 hover:border-primary hover:bg-primary-50/40 motion-safe:transition-colors"
            >
              <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">In the agent loop</p>
              <p className="font-semibold text-gray-900 mb-1">MCP server</p>
              <p className="text-xs text-gray-600">Cursor, Claude Code, Codex, Windsurf — verify after every UI edit.</p>
            </Link>
            <Link
              href="/action"
              className="rounded-xl border border-gray-200 bg-white px-5 py-3 hover:border-primary hover:bg-primary-50/40 motion-safe:transition-colors"
            >
              <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">At the merge gate</p>
              <p className="font-semibold text-gray-900 mb-1">GitHub Action</p>
              <p className="text-xs text-gray-600">Block PRs that drop the score, with a signed attestation trailer.</p>
            </Link>
            <Link
              href="/cli"
              className="rounded-xl border border-gray-200 bg-white px-5 py-3 hover:border-primary hover:bg-primary-50/40 motion-safe:transition-colors"
            >
              <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">In your terminal</p>
              <p className="font-semibold text-gray-900 mb-1">Full CLI</p>
              <p className="text-xs text-gray-600">12 commands: scan, fix, attest, verify, trend, compliance.</p>
            </Link>
          </div>
        </section>

        {/* CTA */}
        <div className="flex flex-wrap gap-3">
          <Link
            href="/docs/getting-started"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary-light motion-safe:transition-all"
          >
            Getting started
          </Link>
          <Link
            href="/docs/rules"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:border-gray-300 hover:bg-gray-50 motion-safe:transition-all"
          >
            All 37 rules
          </Link>
          <Link
            href="https://github.com/jaydrao215/deslint"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:border-gray-300 hover:bg-gray-50 motion-safe:transition-all"
          >
            Star on GitHub
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
