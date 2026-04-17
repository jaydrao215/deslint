import type { Metadata } from 'next';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { FadeIn } from '@/components/motion';
import { BreadcrumbJsonLd } from '@/components/BreadcrumbJsonLd';

const PUBLISHED = '2026-04-17';
const UPDATED = '2026-04-17';
const READING_MINUTES = 11;

export const metadata: Metadata = {
  title:
    'How to fix design drift in AI-generated code — a deterministic playbook',
  description:
    'AI coding agents rewrite UI faster than any team can review it. A practical playbook for catching design-system drift at generation time using an ESLint plugin for design systems and a local MCP server for Cursor, Claude Code, Windsurf, and Codex.',
  alternates: { canonical: '/blog/fix-design-drift-ai-generated-code' },
  keywords: [
    'fix design drift in ai generated code',
    'ai coding agent design drift',
    'eslint plugin for design systems ai',
    'deslint mcp',
    'mcp server design lint',
    'local mcp linting for cursor',
    'local mcp linting for claude code',
    'design token drift ai',
    'deterministic design linter',
  ],
  openGraph: {
    title: 'How to fix design drift in AI-generated code',
    description:
      'A deterministic playbook for stopping design-system drift at generation time — ESLint plugin + local MCP server for Cursor, Claude Code, Windsurf, and Codex.',
    url: 'https://deslint.com/blog/fix-design-drift-ai-generated-code',
    type: 'article',
    publishedTime: PUBLISHED,
    modifiedTime: UPDATED,
    authors: ['Deslint'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'How to fix design drift in AI-generated code',
    description:
      'Stop design-system drift at generation time — not 24 hours later in CI.',
  },
};

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'BlogPosting',
  headline: 'How to fix design drift in AI-generated code',
  description:
    'A deterministic playbook for stopping design-system drift at generation time — ESLint plugin for design systems plus a local MCP server Cursor, Claude Code, Windsurf, and Codex can call in-loop.',
  datePublished: PUBLISHED,
  dateModified: UPDATED,
  author: {
    '@type': 'Organization',
    name: 'Deslint',
    url: 'https://deslint.com',
  },
  publisher: {
    '@type': 'Organization',
    name: 'Deslint',
    url: 'https://deslint.com',
    logo: {
      '@type': 'ImageObject',
      url: 'https://deslint.com/icons/icon-192.png',
    },
  },
  mainEntityOfPage: {
    '@type': 'WebPage',
    '@id': 'https://deslint.com/blog/fix-design-drift-ai-generated-code',
  },
  keywords:
    'fix design drift in ai generated code, ai coding agent design drift, eslint plugin for design systems ai, deslint mcp, local mcp linting for cursor, local mcp linting for claude code',
};

export default function FixDesignDriftAiGeneratedCodePost() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <BreadcrumbJsonLd
        trail={[
          { name: 'Blog', path: '/blog' },
          {
            name: 'Fix design drift in AI-generated code',
            path: '/blog/fix-design-drift-ai-generated-code',
          },
        ]}
      />
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 pt-32 pb-20">
        <FadeIn className="mb-12">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
            AI coding · Design systems · {READING_MINUTES} min read
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 leading-[1.08] mb-6">
            How to fix{' '}
            <span className="text-primary">design drift</span> in
            AI-generated code
          </h1>
          <p className="text-xl text-gray-600 leading-relaxed mb-8">
            AI coding agents rewrite UI faster than any team can review it. A
            practical playbook for catching design-system drift at generation
            time — with a purpose-built ESLint plugin and a local MCP server
            Cursor, Claude Code, Windsurf, and Codex call in-loop — instead
            of chasing it in CI 24 hours later.
          </p>
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <time dateTime={PUBLISHED}>April 17, 2026</time>
            <span aria-hidden="true">·</span>
            <span>{READING_MINUTES} min read</span>
            <span aria-hidden="true">·</span>
            <Link href="/mcp" className="text-primary hover:underline">
              MCP setup
            </Link>
          </div>
        </FadeIn>

        <article className="space-y-12">
          <FadeIn>
            <p className="text-lg text-gray-700 leading-relaxed mb-6">
              Design drift is the slow, silent erosion of a design system
              across a codebase — arbitrary hex colours instead of tokens,
              off-scale paddings, ad-hoc border radii, missing ARIA
              attributes, layouts that silently break at the md breakpoint.
              It is not a new problem. What is new is the rate.
            </p>
            <p className="text-lg text-gray-700 leading-relaxed mb-6">
              An AI coding agent can produce a 14-file diff in under a
              minute. On a fast team, dozens of those diffs land per day.
              Post-PR review cannot keep pace, and linters that only run in
              CI only catch the damage after it has merged — at which point
              the drift has already shipped to staging and is about to
              cascade into more agent-generated code that uses the freshly
              drifted components as reference.
            </p>
            <p className="text-lg text-gray-700 leading-relaxed">
              The fix is not more reviewers. It is moving the check earlier
              — to the moment the agent is about to write the code. This
              post is the practical playbook for doing that with a local,
              deterministic, zero-egress toolchain.
            </p>
          </FadeIn>

          <FadeIn>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 mb-5">
              What design drift actually looks like
            </h2>
            <p className="text-lg text-gray-700 leading-relaxed mb-5">
              Drift is rarely a single dramatic change. It is a long tail of
              small, locally-defensible choices — each of which makes sense
              in isolation, and together dissolve the design system.
              Agent-generated code exhibits a handful of recognisable
              archetypes:
            </p>
            <ul className="space-y-3 text-gray-700 leading-relaxed mb-6 list-disc pl-6">
              <li>
                <strong>Arbitrary colour values.</strong>{' '}
                <code className="text-primary bg-primary-50/60 px-1.5 py-0.5 rounded-md text-sm font-mono">
                  bg-[#1a5276]
                </code>{' '}
                instead of{' '}
                <code className="text-primary bg-primary-50/60 px-1.5 py-0.5 rounded-md text-sm font-mono">
                  bg-brand-primary
                </code>
                . Looks brand-correct today; does not update when the token
                moves tomorrow.
              </li>
              <li>
                <strong>Off-scale spacing.</strong>{' '}
                <code className="text-primary bg-primary-50/60 px-1.5 py-0.5 rounded-md text-sm font-mono">
                  p-[17px]
                </code>
                ,{' '}
                <code className="text-primary bg-primary-50/60 px-1.5 py-0.5 rounded-md text-sm font-mono">
                  gap-[11px]
                </code>
                . Misses the 4-px rhythm your designer spent a week
                establishing.
              </li>
              <li>
                <strong>Missing accessibility attributes.</strong> Icon-only
                buttons without an accessible name, inputs without labels,
                images without alt text, regions without landmarks.
              </li>
              <li>
                <strong>Silent responsive gaps.</strong> A card grid that
                looks fine in the agent&apos;s preview and breaks at the
                first real viewport it hits.
              </li>
              <li>
                <strong>Duplicated component shapes.</strong> Three
                near-identical button variants, all one-off, none derived
                from the canonical primitive.
              </li>
            </ul>
            <p className="text-lg text-gray-700 leading-relaxed">
              Individually, each of these is a one-line finding. Cumulatively,
              they are what &ldquo;the design system feels off&rdquo; means
              when a PM says it six months after adopting an AI coding
              agent.
            </p>
          </FadeIn>

          <FadeIn>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 mb-5">
              Why post-PR review cannot keep up
            </h2>
            <p className="text-lg text-gray-700 leading-relaxed mb-5">
              The conventional answer to drift is a CI linter plus a
              human reviewer. Both are still necessary. Neither is
              sufficient once an AI coding agent is the primary author.
            </p>
            <p className="text-lg text-gray-700 leading-relaxed mb-5">
              CI linters fire minutes to hours after the agent has already
              moved on to the next task. The developer riding the agent is
              now reviewing a five-file diff, and CI is flagging drift in
              the previous two. Context has shifted; the cheap fix window
              has closed.
            </p>
            <p className="text-lg text-gray-700 leading-relaxed mb-5">
              Human reviewers, meanwhile, were never the bottleneck for
              finding arbitrary hex values — they were the bottleneck for
              finding architectural issues, logic bugs, and product-fit
              questions. Asking a reviewer to also catch a missed token in a
              40-line Tailwind string is both a waste of a reviewer&apos;s
              attention and a task they are demonstrably bad at.
            </p>
            <p className="text-lg text-gray-700 leading-relaxed">
              The category of check that stops drift — &ldquo;does this
              value exist in our design system?&rdquo; — is deterministic.
              It belongs to a machine. The only real question is{' '}
              <em>which</em> machine, and <em>when</em> in the loop it runs.
            </p>
          </FadeIn>

          <FadeIn>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 mb-5">
              Three places to install a deterministic design linter
            </h2>
            <p className="text-lg text-gray-700 leading-relaxed mb-8">
              Deslint is a deterministic, open-source design linter for
              web frontends. It ships the same rule set through three
              surfaces — an ESLint plugin, a Node CLI, and a local MCP
              server — so you can place the check wherever drift is
              actually being introduced. For most teams adopting AI coding
              agents, that means all three, with the MCP surface doing
              most of the work.
            </p>

            <div className="space-y-6">
              <div className="rounded-2xl border border-gray-200 bg-white p-6">
                <div className="flex items-baseline gap-3 mb-3">
                  <span className="text-xs font-mono font-semibold text-primary bg-primary-50 px-2 py-1 rounded">
                    01
                  </span>
                  <h3 className="text-xl font-semibold text-gray-900">
                    Local MCP server — the in-loop check
                  </h3>
                </div>
                <p className="text-gray-700 leading-relaxed mb-4">
                  The Model Context Protocol surface is the one that stops
                  drift <em>before</em> it is written. Deslint&apos;s MCP
                  server runs as a local stdio subprocess of your agent —
                  Claude Code, Cursor, Windsurf, or an MCP-compatible Codex
                  client — and exposes seven callable tools:
                </p>
                <ul className="text-sm text-gray-700 leading-relaxed mb-4 space-y-1.5 font-mono">
                  <li>
                    <code className="text-primary">analyze_file</code> — all
                    violations for a single file
                  </li>
                  <li>
                    <code className="text-primary">analyze_project</code> —
                    aggregated scores across the workspace
                  </li>
                  <li>
                    <code className="text-primary">analyze_and_fix</code> —
                    scan, apply safe auto-fixes in place, report what remains
                  </li>
                  <li>
                    <code className="text-primary">compliance_check</code> —
                    full scorecard as a single structured payload
                  </li>
                  <li>
                    <code className="text-primary">enforce_budget</code> —
                    pass/fail gate against{' '}
                    <code className="text-primary">.deslintrc.json</code>{' '}
                    budgets
                  </li>
                  <li>
                    <code className="text-primary">get_rule_details</code> —
                    docs, examples, suggested fixes for any rule
                  </li>
                  <li>
                    <code className="text-primary">suggest_fix_strategy</code>{' '}
                    — structured fix plan for a given violation
                  </li>
                </ul>
                <p className="text-gray-700 leading-relaxed mb-4">
                  The agent calls these on every touched file. No LLM runs
                  in the check path — each finding is the output of a
                  deterministic ESLint rule. No bytes leave the machine.
                  Same result every run.
                </p>
                <p className="text-sm text-gray-600">
                  Install guides per agent:{' '}
                  <Link
                    href="/mcp/cursor"
                    className="text-primary hover:underline"
                  >
                    Cursor
                  </Link>
                  ,{' '}
                  <Link
                    href="/mcp/claude-code"
                    className="text-primary hover:underline"
                  >
                    Claude Code
                  </Link>
                  ,{' '}
                  <Link
                    href="/mcp/windsurf"
                    className="text-primary hover:underline"
                  >
                    Windsurf
                  </Link>
                  ,{' '}
                  <Link
                    href="/mcp/codex"
                    className="text-primary hover:underline"
                  >
                    Codex
                  </Link>
                  .
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-6">
                <div className="flex items-baseline gap-3 mb-3">
                  <span className="text-xs font-mono font-semibold text-primary bg-primary-50 px-2 py-1 rounded">
                    02
                  </span>
                  <h3 className="text-xl font-semibold text-gray-900">
                    ESLint plugin — the editor + pre-commit check
                  </h3>
                </div>
                <p className="text-gray-700 leading-relaxed mb-4">
                  The ESLint plugin is the same rule engine, wired into the
                  tool every JavaScript/TypeScript team already runs. It
                  powers the squiggles in the IDE, the{' '}
                  <code className="text-primary bg-primary-50/60 px-1.5 py-0.5 rounded-md text-sm font-mono">
                    --fix
                  </code>{' '}
                  auto-fix pass in pre-commit, and the CI gate. Rules cover
                  design-token adherence (
                  <code className="text-primary bg-primary-50/60 px-1.5 py-0.5 rounded-md text-sm font-mono">
                    no-arbitrary-colors
                  </code>
                  ,{' '}
                  <code className="text-primary bg-primary-50/60 px-1.5 py-0.5 rounded-md text-sm font-mono">
                    no-arbitrary-spacing
                  </code>
                  ,{' '}
                  <code className="text-primary bg-primary-50/60 px-1.5 py-0.5 rounded-md text-sm font-mono">
                    no-arbitrary-typography
                  </code>
                  ,{' '}
                  <code className="text-primary bg-primary-50/60 px-1.5 py-0.5 rounded-md text-sm font-mono">
                    no-arbitrary-border-radius
                  </code>
                  ), accessibility (
                  <code className="text-primary bg-primary-50/60 px-1.5 py-0.5 rounded-md text-sm font-mono">
                    image-alt-text
                  </code>
                  ,{' '}
                  <code className="text-primary bg-primary-50/60 px-1.5 py-0.5 rounded-md text-sm font-mono">
                    form-labels
                  </code>
                  ,{' '}
                  <code className="text-primary bg-primary-50/60 px-1.5 py-0.5 rounded-md text-sm font-mono">
                    touch-target-size
                  </code>
                  ), and responsive-layout hygiene.
                </p>
                <p className="text-gray-700 leading-relaxed mb-4">
                  Auto-fix is deliberately conservative — it runs only
                  where a swap is structurally safe (JSX string literals,
                  static attributes), and bails out on dynamic expressions
                  rather than guessing. Breadth of auto-fix coverage is not
                  the goal; trustworthy auto-fix coverage is.
                </p>
                <p className="text-sm text-gray-600">
                  See every rule in{' '}
                  <Link
                    href="/docs/rules"
                    className="text-primary hover:underline"
                  >
                    /docs/rules
                  </Link>
                  .
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-6">
                <div className="flex items-baseline gap-3 mb-3">
                  <span className="text-xs font-mono font-semibold text-primary bg-primary-50 px-2 py-1 rounded">
                    03
                  </span>
                  <h3 className="text-xl font-semibold text-gray-900">
                    CLI + GitHub Action — the backstop gate
                  </h3>
                </div>
                <p className="text-gray-700 leading-relaxed mb-4">
                  The Node CLI (
                  <code className="text-primary bg-primary-50/60 px-1.5 py-0.5 rounded-md text-sm font-mono">
                    @deslint/cli
                  </code>
                  ) exposes{' '}
                  <code className="text-primary bg-primary-50/60 px-1.5 py-0.5 rounded-md text-sm font-mono">
                    scan
                  </code>
                  ,{' '}
                  <code className="text-primary bg-primary-50/60 px-1.5 py-0.5 rounded-md text-sm font-mono">
                    fix
                  </code>
                  ,{' '}
                  <code className="text-primary bg-primary-50/60 px-1.5 py-0.5 rounded-md text-sm font-mono">
                    init
                  </code>
                  ,{' '}
                  <code className="text-primary bg-primary-50/60 px-1.5 py-0.5 rounded-md text-sm font-mono">
                    coverage
                  </code>
                  , and{' '}
                  <code className="text-primary bg-primary-50/60 px-1.5 py-0.5 rounded-md text-sm font-mono">
                    import-tokens
                  </code>
                  . The last one is the one design-system teams most
                  underuse: it reads a Figma file (
                  <code className="text-primary bg-primary-50/60 px-1.5 py-0.5 rounded-md text-sm font-mono">
                    --figma
                  </code>
                  ), a Style Dictionary export (
                  <code className="text-primary bg-primary-50/60 px-1.5 py-0.5 rounded-md text-sm font-mono">
                    --style-dictionary
                  </code>
                  ), or a Stitch token file (
                  <code className="text-primary bg-primary-50/60 px-1.5 py-0.5 rounded-md text-sm font-mono">
                    --stitch
                  </code>
                  ), and writes the corresponding{' '}
                  <code className="text-primary bg-primary-50/60 px-1.5 py-0.5 rounded-md text-sm font-mono">
                    designSystem
                  </code>{' '}
                  block of{' '}
                  <code className="text-primary bg-primary-50/60 px-1.5 py-0.5 rounded-md text-sm font-mono">
                    .deslintrc.json
                  </code>
                  . One command, and every rule is configured against the
                  source of truth.
                </p>
                <p className="text-gray-700 leading-relaxed mb-4">
                  In CI,{' '}
                  <code className="text-primary bg-primary-50/60 px-1.5 py-0.5 rounded-md text-sm font-mono">
                    deslint scan
                  </code>{' '}
                  can emit SARIF for GitHub Advanced Security and any other
                  SARIF-consuming tool. Or drop in the GitHub Action, which
                  posts a score, gates on{' '}
                  <code className="text-primary bg-primary-50/60 px-1.5 py-0.5 rounded-md text-sm font-mono">
                    min-score
                  </code>
                  , and verifies a commit trailer on merges.
                </p>
                <p className="text-sm text-gray-600">
                  CLI reference:{' '}
                  <Link
                    href="/docs/getting-started"
                    className="text-primary hover:underline"
                  >
                    getting started
                  </Link>
                  .
                </p>
              </div>
            </div>
          </FadeIn>
        </article>

        <div className="mt-16 flex flex-wrap gap-3">
          <Link
            href="/mcp"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary-light motion-safe:transition-all"
          >
            See the MCP tool surface
          </Link>
          <Link
            href="/docs/getting-started"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:border-gray-300 hover:bg-gray-50 motion-safe:transition-all"
          >
            Install in 2 minutes
          </Link>
          <Link
            href="/docs/rules"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:border-gray-300 hover:bg-gray-50 motion-safe:transition-all"
          >
            Browse every rule
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
