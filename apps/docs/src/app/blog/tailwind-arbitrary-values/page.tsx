import type { Metadata } from 'next';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { FadeIn } from '@/components/motion';
import { BreadcrumbJsonLd } from '@/components/BreadcrumbJsonLd';

const PUBLISHED = '2026-04-17';
const UPDATED = '2026-04-17';
const READING_MINUTES = 9;

export const metadata: Metadata = {
  title: 'The hidden cost of Tailwind arbitrary values — and how to lint them',
  description:
    'Arbitrary Tailwind values like bg-[#1a5276] and p-[17px] are an escape hatch. Three drift archetypes, why AI coding agents amplify them, and how to catch them deterministically with no-arbitrary-colors, no-arbitrary-spacing, no-arbitrary-typography, and no-arbitrary-border-radius.',
  alternates: { canonical: '/blog/tailwind-arbitrary-values' },
  keywords: [
    'tailwind arbitrary values',
    'tailwind arbitrary values linter',
    'no-arbitrary-colors',
    'no-arbitrary-spacing',
    'design token drift',
    'tailwind linter',
    'design system enforcement',
    'ai generated code design system',
  ],
  openGraph: {
    title: 'The hidden cost of Tailwind arbitrary values',
    description:
      'An escape hatch, three archetypes of drift, and why linting them deterministically matters now that AI writes most of your markup.',
    url: 'https://deslint.com/blog/tailwind-arbitrary-values',
    type: 'article',
    publishedTime: PUBLISHED,
    modifiedTime: UPDATED,
    authors: ['Deslint'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The hidden cost of Tailwind arbitrary values',
    description:
      'Three drift archetypes, why AI coding agents amplify them, and how to lint them deterministically.',
  },
};

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'BlogPosting',
  headline: 'The hidden cost of Tailwind arbitrary values',
  description:
    'An escape hatch, three archetypes of drift, and why linting them deterministically matters now that AI writes most of your markup.',
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
    '@id': 'https://deslint.com/blog/tailwind-arbitrary-values',
  },
  keywords:
    'tailwind arbitrary values, design token drift, no-arbitrary-colors, tailwind linter, design system enforcement',
};

function RuleCard({ name, catches }: { name: string; catches: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
      <code className="block text-sm font-mono font-semibold text-primary mb-1.5">
        {name}
      </code>
      <code className="block text-[12px] font-mono text-gray-500 leading-relaxed">
        catches: {catches}
      </code>
    </div>
  );
}

type Coverage = 'full' | 'partial' | 'none';

function CoverageDot({ level }: { level: Coverage }) {
  const color =
    level === 'full'
      ? 'bg-pass'
      : level === 'partial'
        ? 'bg-warn'
        : 'bg-gray-300';
  const label =
    level === 'full' ? 'Full' : level === 'partial' ? 'Partial' : 'None';
  return (
    <span className="inline-flex items-center gap-2">
      <span
        aria-hidden="true"
        className={`h-2.5 w-2.5 rounded-full ${color}`}
      />
      <span className="text-gray-700">{label}</span>
    </span>
  );
}

function ComparisonRow({
  tool,
  sub,
  hex,
  shadow,
  oneoff,
  fix,
  note,
  highlight,
}: {
  tool: string;
  sub: string;
  hex: Coverage;
  shadow: Coverage;
  oneoff: Coverage;
  fix: Coverage;
  note: string;
  highlight?: boolean;
}) {
  return (
    <tr className={highlight ? 'bg-primary-50/40' : 'bg-white'}>
      <td className="px-4 py-4 align-top">
        <div
          className={`font-semibold ${highlight ? 'text-primary' : 'text-gray-900'}`}
        >
          {tool}
        </div>
        <div className="text-xs text-gray-500 mt-0.5">{sub}</div>
        <div className="text-xs text-gray-500 mt-2 leading-relaxed max-w-xs">
          {note}
        </div>
      </td>
      <td className="px-4 py-4 align-top">
        <CoverageDot level={hex} />
      </td>
      <td className="px-4 py-4 align-top">
        <CoverageDot level={shadow} />
      </td>
      <td className="px-4 py-4 align-top">
        <CoverageDot level={oneoff} />
      </td>
      <td className="px-4 py-4 align-top">
        <CoverageDot level={fix} />
      </td>
    </tr>
  );
}

export default function TailwindArbitraryValuesPost() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <BreadcrumbJsonLd
        trail={[
          { name: 'Blog', path: '/blog' },
          { name: 'Tailwind arbitrary values', path: '/blog/tailwind-arbitrary-values' },
        ]}
      />
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 pt-32 pb-20">
        {/* Article header */}
        <FadeIn className="mb-12">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
            Design system engineering · 9 min read
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 leading-[1.08] mb-6">
            The hidden cost of Tailwind{' '}
            <span className="text-primary">arbitrary values</span>
          </h1>
          <p className="text-xl text-gray-600 leading-relaxed mb-8">
            An escape hatch, three archetypes of drift, and why linting them
            deterministically matters more now that AI writes most of your
            markup.
          </p>
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <time dateTime={PUBLISHED}>April 17, 2026</time>
            <span aria-hidden="true">·</span>
            <span>{READING_MINUTES} min read</span>
            <span aria-hidden="true">·</span>
            <Link href="/docs/rules" className="text-primary hover:underline">
              Related rules
            </Link>
          </div>
        </FadeIn>

        {/* Body sections — filled in subsequent batches */}
        <article className="space-y-12">
          {/* Batch 2: Opening + definition */}
          <FadeIn>
            <p className="text-lg text-gray-700 leading-relaxed mb-6">
              Here is a class string from a pull request that shipped last week
              at a company you have probably heard of. Read it the way your
              code reviewer did — quickly, on a phone, between meetings.
            </p>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-5 py-6 font-mono text-sm text-gray-700 leading-relaxed mb-6 overflow-x-auto">
              <span className="text-gray-400 select-none">className=&quot;</span>
              flex items-center gap-3 rounded-lg{' '}
              <span className="bg-warn/10 text-warn-dark font-semibold px-1 rounded">
                bg-[#1A5276]
              </span>{' '}
              px-4 py-2 text-sm font-medium text-white hover:opacity-90
              focus:outline-none focus:ring-2 focus:ring-offset-2
              <span className="text-gray-400 select-none">&quot;</span>
            </div>
            <p className="text-lg text-gray-700 leading-relaxed mb-6">
              Nothing wrong, on the face of it. Eleven Tailwind utilities, one
              arbitrary color value. The color even looks brand-correct. It
              passed review. It merged.
            </p>
            <p className="text-lg text-gray-700 leading-relaxed">
              Seven weeks later the brand team shifts primary to{' '}
              <code className="text-primary bg-primary-50/60 px-1.5 py-0.5 rounded-md text-sm font-mono">
                #173F62
              </code>
              . The token updates. The tokens cascade. This button does not
              move. Neither do the 134 others like it. Nobody can explain why
              the brand looks inconsistent across the product — the tokens are
              right, the design is right, the code is what lies.
            </p>
          </FadeIn>

          <FadeIn>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 mb-5">
              What arbitrary values actually are
            </h2>
            <p className="text-lg text-gray-700 leading-relaxed mb-5">
              Tailwind ships a finite scale of utilities — <code className="text-primary bg-primary-50/60 px-1.5 py-0.5 rounded-md text-sm font-mono">bg-blue-500</code>,{' '}
              <code className="text-primary bg-primary-50/60 px-1.5 py-0.5 rounded-md text-sm font-mono">p-4</code>,{' '}
              <code className="text-primary bg-primary-50/60 px-1.5 py-0.5 rounded-md text-sm font-mono">rounded-lg</code>. When a design calls for a value the
              scale does not cover, Tailwind gives you the escape hatch:
              arbitrary values in square brackets.
            </p>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-5 py-5 font-mono text-sm text-gray-700 leading-relaxed mb-5 space-y-1">
              <div>
                <span className="text-gray-400">bg-</span>
                <span className="text-warn-dark font-semibold">[#1a5276]</span>
                <span className="text-gray-400"> &nbsp;&nbsp;/* any hex */</span>
              </div>
              <div>
                <span className="text-gray-400">p-</span>
                <span className="text-warn-dark font-semibold">[17px]</span>
                <span className="text-gray-400"> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/* any length */</span>
              </div>
              <div>
                <span className="text-gray-400">grid-cols-</span>
                <span className="text-warn-dark font-semibold">[auto_1fr]</span>
                <span className="text-gray-400"> &nbsp;/* any CSS */</span>
              </div>
            </div>
            <p className="text-lg text-gray-700 leading-relaxed mb-5">
              The feature exists for good reasons. Real designs have edge
              cases. Some CSS properties do not have a corresponding utility.
              Iterating quickly is worth a bypass now and then. Tailwind&apos;s
              own docs recommend arbitrary values for exactly these moments.
            </p>
            <p className="text-lg text-gray-700 leading-relaxed">
              The problem is not the escape hatch. The problem is the
              proportion. When arbitrary values are 2% of your class strings,
              your design system is intact. When they are 30%, you no longer
              have a design system — you have a colour-coordinated accident.
              Most teams never find out which side of that line they are on.
            </p>
          </FadeIn>

          {/* Batch 3: Three archetypes */}
          <FadeIn>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 mb-4">
              Three archetypes of drift
            </h2>
            <p className="text-lg text-gray-700 leading-relaxed mb-8">
              Arbitrary values do not enter a codebase uniformly. Three
              patterns account for almost all real-world drift. Learn to
              recognise them in a diff and you will catch 90% of the damage
              before it merges.
            </p>

            <div className="space-y-6">
              {/* Archetype 1 */}
              <div className="rounded-2xl border border-gray-200 bg-white p-6">
                <div className="flex items-baseline gap-3 mb-3">
                  <span className="text-xs font-mono font-semibold text-primary bg-primary-50 px-2 py-1 rounded">
                    01
                  </span>
                  <h3 className="text-xl font-semibold text-gray-900">
                    The one-off exception that sticks around
                  </h3>
                </div>
                <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 font-mono text-sm text-gray-700 mb-4">
                  <span className="text-gray-400">{'<div className="'}</span>
                  <span className="text-warn-dark font-semibold">p-[17px]</span>
                  <span className="text-gray-400">{' border rounded-lg" />'}</span>
                </div>
                <p className="text-gray-700 leading-relaxed">
                  A designer eyeballed 17 pixels in Figma. 16 looked a touch
                  tight, 20 a touch loose. The engineer — correctly, under a
                  deadline — typed{' '}
                  <code className="text-primary bg-primary-50/60 px-1.5 py-0.5 rounded-md text-sm font-mono">
                    p-[17px]
                  </code>
                  . The card shipped. Everyone forgot. The component library
                  now quietly contains one location where spacing does not
                  come from the scale — and every component built by copy-paste
                  from it inherits the deviation.
                </p>
                <p className="text-sm text-gray-500 leading-relaxed mt-3 italic">
                  Cost: almost nothing the day it ships. Real cost: discovered
                  the day someone asks why padding looks different on the
                  settings page.
                </p>
              </div>

              {/* Archetype 2 */}
              <div className="rounded-2xl border border-gray-200 bg-white p-6">
                <div className="flex items-baseline gap-3 mb-3">
                  <span className="text-xs font-mono font-semibold text-primary bg-primary-50 px-2 py-1 rounded">
                    02
                  </span>
                  <h3 className="text-xl font-semibold text-gray-900">
                    The shadow scale
                  </h3>
                </div>
                <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 font-mono text-sm text-gray-700 mb-4 space-y-1">
                  <div>
                    <span className="text-gray-400">{'<h3 className="'}</span>
                    <span className="text-warn-dark font-semibold">text-[13px]</span>
                    <span className="text-gray-400">{' font-medium" />'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">{'<p  className="'}</span>
                    <span className="text-warn-dark font-semibold">text-[15px]</span>
                    <span className="text-gray-400">{' leading-6" />'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">{'<span className="'}</span>
                    <span className="text-warn-dark font-semibold">text-[17px]</span>
                    <span className="text-gray-400">{' font-semibold" />'}</span>
                  </div>
                </div>
                <p className="text-gray-700 leading-relaxed">
                  You have{' '}
                  <code className="text-primary bg-primary-50/60 px-1.5 py-0.5 rounded-md text-sm font-mono">
                    text-sm
                  </code>{' '}
                  (14px),{' '}
                  <code className="text-primary bg-primary-50/60 px-1.5 py-0.5 rounded-md text-sm font-mono">
                    text-base
                  </code>{' '}
                  (16px), and{' '}
                  <code className="text-primary bg-primary-50/60 px-1.5 py-0.5 rounded-md text-sm font-mono">
                    text-lg
                  </code>{' '}
                  (18px) as tokens. Your codebase has 13, 15, and 17 hiding
                  between them. Each one was the path of least resistance on
                  some Tuesday. Together they form a parallel typographic
                  scale nobody wrote down, nobody owns, and nobody can refactor
                  because removing any single instance might be the one the
                  design team actually wanted.
                </p>
                <p className="text-sm text-gray-500 leading-relaxed mt-3 italic">
                  Cost: your type ramp is now seven values, not three. Your
                  vertical rhythm is an illusion.
                </p>
              </div>

              {/* Archetype 3 */}
              <div className="rounded-2xl border border-fail/30 bg-fail/[0.03] p-6">
                <div className="flex items-baseline gap-3 mb-3">
                  <span className="text-xs font-mono font-semibold text-fail bg-fail/10 px-2 py-1 rounded">
                    03
                  </span>
                  <h3 className="text-xl font-semibold text-gray-900">
                    The hex-outside-palette
                  </h3>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-fail">
                    Most damaging
                  </span>
                </div>
                <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 font-mono text-sm text-gray-700 mb-4 space-y-1">
                  <div>
                    <span className="text-gray-500">{'// in tokens:'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">--brand-primary: </span>
                    <span className="text-pass-dark font-semibold">#1A5276</span>
                  </div>
                  <div className="pt-2">
                    <span className="text-gray-500">{'// in the button that shipped:'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">{'<button className="'}</span>
                    <span className="text-warn-dark font-semibold">bg-[#1A5276]</span>
                    <span className="text-gray-400">{' text-white" />'}</span>
                  </div>
                </div>
                <p className="text-gray-700 leading-relaxed">
                  The value is correct. The mechanism is wrong. The token
                  exists, the engineer typed the hex anyway — probably because
                  their editor offered to autocomplete from the style guide
                  rather than from the Tailwind config. When the brand team
                  shifts primary to{' '}
                  <code className="text-primary bg-primary-50/60 px-1.5 py-0.5 rounded-md text-sm font-mono">
                    #173F62
                  </code>
                  , every component using{' '}
                  <code className="text-primary bg-primary-50/60 px-1.5 py-0.5 rounded-md text-sm font-mono">
                    bg-brand
                  </code>{' '}
                  updates. This one does not. The design system quietly breaks
                  its only real promise: change the token, change the product.
                </p>
                <p className="text-sm text-gray-500 leading-relaxed mt-3 italic">
                  Cost: your design system is now suggestions, not
                  infrastructure. Nobody notices until the rebrand.
                </p>
              </div>
            </div>
          </FadeIn>

          {/* Batch 4: Pull quote + AI amplification */}
          <FadeIn>
            <blockquote className="relative rounded-2xl bg-gradient-to-br from-primary-50 via-white to-primary-50/40 border border-primary/20 px-8 py-10 my-4">
              <p className="text-2xl sm:text-[1.6rem] font-semibold text-gray-900 leading-snug tracking-tight">
                The design system you have is whatever survives your last
                thirty AI-generated pull requests.
              </p>
              <p className="mt-4 text-sm font-semibold text-primary uppercase tracking-wider">
                An observation that keeps getting more true
              </p>
            </blockquote>
          </FadeIn>

          <FadeIn>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 mb-5">
              Why AI coding agents amplify this tenfold
            </h2>
            <p className="text-lg text-gray-700 leading-relaxed mb-5">
              Before AI wrote your UI, arbitrary values accumulated at human
              speed — one per sprint, one per refactor, one per tired Friday.
              Code review caught most of them because the diff was small
              enough for a human to read, and because the engineer writing
              the component knew the token scale by heart.
            </p>
            <p className="text-lg text-gray-700 leading-relaxed mb-5">
              That constraint is gone.{' '}
              <Link href="/mcp/claude-code" className="text-primary font-semibold hover:underline">
                Claude Code
              </Link>
              ,{' '}
              <Link href="/mcp/cursor" className="text-primary font-semibold hover:underline">
                Cursor
              </Link>
              ,{' '}
              <Link href="/mcp/windsurf" className="text-primary font-semibold hover:underline">
                Windsurf
              </Link>
              , and{' '}
              <Link href="/mcp/codex" className="text-primary font-semibold hover:underline">
                Codex
              </Link>{' '}
              know Tailwind&apos;s syntax perfectly and know your design system
              not at all. Ask any of them to &quot;add a card component with a
              subtle accent border&quot; and you get back fluent, runnable
              code with an arbitrary colour, an arbitrary padding, and a
              rounded corner that does not match any of your four token radii.
            </p>
            <p className="text-lg text-gray-700 leading-relaxed mb-5">
              This is not a model-quality problem. It is a context problem.
              The agent does not know what your tokens are, so it defaults
              to the most specific value it can generate — a hex, a pixel
              count, a raw CSS string. Every one of them is technically
              correct. Every one of them adds a line to your shadow scale.
            </p>
            <div className="rounded-2xl border border-gray-200 bg-gray-50/60 p-6">
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                The math, rough but directional
              </p>
              <ul className="space-y-3 text-gray-700 leading-relaxed">
                <li className="flex gap-3">
                  <span className="text-primary font-mono font-semibold shrink-0">
                    20%
                  </span>
                  <span>
                    of drift caught by design review — only the parts that look
                    obviously wrong in Figma diffs.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="text-primary font-mono font-semibold shrink-0">
                    10%
                  </span>
                  <span>
                    caught by code review — when the PR is small enough to read
                    and the reviewer happens to know the scale.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="text-fail font-mono font-semibold shrink-0">
                    70%
                  </span>
                  <span>
                    ships. Compounds. Becomes the shadow scale nobody owns.
                  </span>
                </li>
              </ul>
            </div>
            <p className="text-lg text-gray-700 leading-relaxed mt-6">
              The only durable fix is a deterministic check that runs on
              every diff, knows your token scale, and surfaces the three
              archetypes before a human ever looks at the PR — ideally{' '}
              <em>before the agent even finishes writing</em>.
            </p>
          </FadeIn>

          {/* Batch 5: Comparison table */}
          <FadeIn>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 mb-5">
              What the existing tools actually catch
            </h2>
            <p className="text-lg text-gray-700 leading-relaxed mb-6">
              Most teams already run a linter. The honest answer to{' '}
              <em>&quot;do we need another one?&quot;</em> is: the tools you
              have are excellent at what they were built for. None of them
              were built for this.
            </p>

            <div className="overflow-x-auto rounded-2xl border border-gray-200">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left font-semibold text-gray-900 px-4 py-3">
                      Tool
                    </th>
                    <th className="text-left font-semibold text-gray-900 px-4 py-3">
                      Hex outside palette
                    </th>
                    <th className="text-left font-semibold text-gray-900 px-4 py-3">
                      Shadow scale
                    </th>
                    <th className="text-left font-semibold text-gray-900 px-4 py-3">
                      One-off exception
                    </th>
                    <th className="text-left font-semibold text-gray-900 px-4 py-3">
                      Autofix
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <ComparisonRow
                    tool="stylelint"
                    sub="CSS-level linting"
                    hex="none"
                    shadow="none"
                    oneoff="none"
                    fix="none"
                    note="Reads authored CSS. Never sees Tailwind utility classes."
                  />
                  <ComparisonRow
                    tool="eslint-plugin-tailwindcss"
                    sub="Class order + duplicates"
                    hex="none"
                    shadow="none"
                    oneoff="none"
                    fix="partial"
                    note="Sorts classes and flags duplicates. Does not evaluate whether a class exists in your scale."
                  />
                  <ComparisonRow
                    tool="Prettier (tailwind plugin)"
                    sub="Formatting only"
                    hex="none"
                    shadow="none"
                    oneoff="none"
                    fix="none"
                    note="Reorders classes. No semantic analysis."
                  />
                  <ComparisonRow
                    tool="Code review"
                    sub="Humans on small diffs"
                    hex="partial"
                    shadow="none"
                    oneoff="partial"
                    fix="none"
                    note="Catches the obvious cases, misses the drift that compounds."
                  />
                  <ComparisonRow
                    tool="Deslint"
                    sub="no-arbitrary-* rule family"
                    hex="full"
                    shadow="full"
                    oneoff="full"
                    fix="partial"
                    note="Evaluates every className against your imported token scale. Flags deterministically."
                    highlight
                  />
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-5 text-xs text-gray-500">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-pass inline-block" />
                Full coverage
              </span>
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-warn inline-block" />
                Partial
              </span>
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-gray-300 inline-block" />
                Not in scope
              </span>
            </div>

            <p className="text-lg text-gray-700 leading-relaxed mt-8">
              Keep{' '}
              <Link href="/compare/deslint-vs-stylelint" className="text-primary font-semibold hover:underline">
                stylelint
              </Link>
              . Keep Prettier. They do their jobs well. They
              just do not see what an agent is generating into your JSX at
              commit time. That is the layer that needs its own check.
            </p>
          </FadeIn>

          {/* Batch 6: Deslint detection + autofix */}
          <FadeIn>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 mb-5">
              How to lint arbitrary values deterministically
            </h2>
            <p className="text-lg text-gray-700 leading-relaxed mb-5">
              Deslint approaches the problem in three moves. Import the token
              scale. Flag anything outside it. Leave the semantic choice of
              which token is right to a human.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-10 mb-4">
              1. Import your token scale as configuration
            </h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              Deslint reads a{' '}
              <code className="text-primary bg-primary-50/60 px-1.5 py-0.5 rounded-md text-sm font-mono">
                .deslintrc.json
              </code>{' '}
              that knows your colours, spacing, type, and radii. You can write
              it by hand, but the point of{' '}
              <code className="text-primary bg-primary-50/60 px-1.5 py-0.5 rounded-md text-sm font-mono">
                deslint import-tokens
              </code>{' '}
              is that you do not have to.
            </p>
            <pre className="bg-gray-950 text-gray-100 rounded-xl border border-gray-800/50 p-4 overflow-x-auto text-sm font-mono mb-4">
              <code>{`# Figma Variables
npx deslint import-tokens --figma <file-id>  --format deslintrc

# Style Dictionary
npx deslint import-tokens --style-dictionary ./tokens --format deslintrc`}</code>
            </pre>
            <p className="text-gray-700 leading-relaxed">
              The command prints a per-bucket summary — how many colours,
              radii, spacing values, and font families it found, and which
              rules each bucket unlocks. Merge the emitted fragment into{' '}
              <code className="text-primary bg-primary-50/60 px-1.5 py-0.5 rounded-md text-sm font-mono">
                .deslintrc.json
              </code>{' '}
              and you are done with configuration.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-12 mb-4">
              2. Four rules, one per archetype axis
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
              <RuleCard
                name="no-arbitrary-colors"
                catches="bg-[#1A5276], text-[hsl(210,40%,35%)]"
              />
              <RuleCard
                name="no-arbitrary-spacing"
                catches="p-[17px], mt-[22px], gap-[13px]"
              />
              <RuleCard
                name="no-arbitrary-typography"
                catches="text-[13px], text-[1.05rem], leading-[27px]"
              />
              <RuleCard
                name="no-arbitrary-border-radius"
                catches="rounded-[11px], rounded-[0.375rem]"
              />
            </div>
            <p className="text-gray-700 leading-relaxed">
              Each rule reads its allowed set from the imported tokens plus
              Tailwind&apos;s default scale. Anything else is a drift
              violation with a rule ID, a file, a line, and a column. No
              judgement, no heuristics — deterministic enough to gate a
              merge on.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-12 mb-4">
              3. What a real run looks like
            </h3>
            <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
              <div className="px-4 py-2 border-b border-gray-200 bg-gray-50 text-xs font-mono text-gray-500">
                $ npx deslint scan ./src/components/Button.tsx
              </div>
              <pre className="bg-gray-950 text-gray-100 p-5 text-sm font-mono overflow-x-auto leading-relaxed">
                <code>{`src/components/Button.tsx
  12:21  error    'bg-[#1A5276]' matches existing token 'brand-primary'.
                  Use 'bg-brand-primary' instead.            no-arbitrary-colors
  12:48  warning  'p-[17px]' is not on the spacing scale.
                  Nearest tokens: p-4 (16px), p-5 (20px).     no-arbitrary-spacing
  14:10  warning  'text-[15px]' is not on the type scale.
                  Nearest tokens: text-sm (14px), text-base (16px).
                                                              no-arbitrary-typography

3 problems (1 error, 2 warnings)
1 error and 0 warnings auto-fixable with \`--fix\`.

Design Health Score: 88/100`}</code>
              </pre>
            </div>
            <p className="text-lg text-gray-700 leading-relaxed mt-6">
              Notice what deslint does and does not do. The hex that matches
              an existing token gets an <em>error</em> and a safe autofix —
              the token exists, the mechanism is wrong, the swap is
              unambiguous. The off-scale spacing and typography get{' '}
              <em>warnings</em> with the nearest legal values, but no
              autofix — choosing between 16 and 20 px is a design decision,
              not a linter&apos;s call.
            </p>
            <p className="text-lg text-gray-700 leading-relaxed mt-5">
              This is the principle: surface the drift loudly, automate only
              the fixes that cannot be wrong. The linter that tries to be
              clever about the rest is the linter your team turns off in
              month three.
            </p>
          </FadeIn>

          {/* Batch 7: Install CTA + closing + related */}
          <FadeIn>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 mb-5">
              Three commands to measure your own drift
            </h2>
            <p className="text-lg text-gray-700 leading-relaxed mb-6">
              Before you decide whether this matters, measure. Point deslint
              at your repo and look at the number. A score above 90 means
              your design system is infrastructure. Below 70, it is
              suggestions.
            </p>
            <pre className="bg-gray-950 text-gray-100 rounded-xl border border-gray-800/50 p-5 overflow-x-auto text-sm font-mono mb-8 leading-relaxed">
              <code>{`# 1. install
npm install --save-dev @deslint/cli

# 2. import your tokens (Figma / Style Dictionary / Stitch)
npx deslint import-tokens --figma <file-id> --format deslintrc

# 3. measure
npx deslint coverage`}</code>
            </pre>

            <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary-50 via-white to-primary-50/30 p-6 sm:p-8">
              <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
                Want deslint inside the AI loop, not after it?
              </p>
              <p className="text-gray-700 leading-relaxed mb-5">
                The CLI tells you what drifted. The MCP server tells the
                agent before it writes. Claude Code, Cursor, Codex, and
                Windsurf can call deslint as a tool — the same deterministic
                rules, a single stdio subprocess, zero cloud.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/mcp/claude-code"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary-light"
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
            </div>
          </FadeIn>

          <FadeIn>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 mb-5">
              One last honest note
            </h2>
            <p className="text-lg text-gray-700 leading-relaxed mb-5">
              Arbitrary values are not the enemy. The best Tailwind codebases
              have a small, deliberate population of them — the truly
              exceptional cases a token scale cannot anticipate. What those
              codebases have in common is that someone decided, on each one,
              that the exception was earned.
            </p>
            <p className="text-lg text-gray-700 leading-relaxed">
              A deterministic linter is how you get that conversation to
              happen at the pull request, when it is cheap, instead of at
              the rebrand, when it is expensive. Everything else — the
              archetypes, the tooling, the 33 rules — is mechanics in
              service of that one idea.
            </p>
          </FadeIn>

          {/* Related reading */}
          <FadeIn>
            <div className="border-t border-gray-200 pt-10">
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                Related reading
              </p>
              <ul className="space-y-3">
                <li>
                  <Link
                    href="/blog/fix-design-drift-ai-generated-code"
                    className="group inline-flex items-center gap-2 text-primary hover:underline"
                  >
                    <span className="font-semibold">
                      How to fix design drift in AI-generated code
                    </span>
                    <span className="text-gray-500 text-sm">
                      · the deterministic playbook — ESLint + MCP + CI
                    </span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/docs/rules"
                    className="group inline-flex items-center gap-2 text-primary hover:underline"
                  >
                    <span className="font-semibold">Rules reference</span>
                    <span className="text-gray-500 text-sm">
                      · all 33 rules, examples, options, autofix coverage
                    </span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/docs/getting-started"
                    className="group inline-flex items-center gap-2 text-primary hover:underline"
                  >
                    <span className="font-semibold">
                      Getting started in six steps
                    </span>
                    <span className="text-gray-500 text-sm">
                      · install, import tokens, scan, fix, gate
                    </span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/docs/configuration"
                    className="group inline-flex items-center gap-2 text-primary hover:underline"
                  >
                    <span className="font-semibold">
                      .deslintrc.json schema
                    </span>
                    <span className="text-gray-500 text-sm">
                      · designSystem buckets, ignore patterns, profiles
                    </span>
                  </Link>
                </li>
              </ul>
            </div>
          </FadeIn>
        </article>
      </main>
      <Footer />
    </>
  );
}
