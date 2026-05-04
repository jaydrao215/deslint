import type { Metadata } from 'next';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { FadeIn } from '@/components/motion';
import { BreadcrumbJsonLd } from '@/components/BreadcrumbJsonLd';

const UPDATED = '2026-05-04';
const URL = 'https://deslint.com/compare/deslint-vs-prettier';

export const metadata: Metadata = {
  title: 'Deslint vs. Prettier: do I still need a design linter? (2026)',
  description:
    'Prettier formats code. Deslint enforces design intent. Prettier will happily reformat a hardcoded #1a5276 hex into clean two-space indentation — the value still ships. Honest side-by-side for 2026 frontend teams shipping AI-generated UI.',
  alternates: { canonical: '/compare/deslint-vs-prettier' },
  keywords: [
    'deslint vs prettier',
    'prettier alternative',
    'prettier design system',
    'prettier vs linter',
    'tailwind formatter vs linter',
    'design intent linter',
    'prettier ai code',
    'frontend formatter vs design lint',
  ],
  openGraph: {
    title: 'Deslint vs. Prettier — formatter or design linter?',
    description:
      'Prettier formats. Deslint enforces design intent. Two different layers, both worth running. Side-by-side on six honest questions.',
    url: URL,
    type: 'article',
    modifiedTime: UPDATED,
    images: [
      {
        url: '/compare/deslint-vs-prettier/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Deslint vs. Prettier — formatter vs. design intent. Honest side-by-side comparison.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Deslint vs. Prettier',
    description:
      'Formatter vs. design intent. Two different layers, both worth running. Honest comparison for 2026.',
    images: ['/compare/deslint-vs-prettier/opengraph-image'],
  },
};

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Deslint vs. Prettier: do I still need a design linter?',
  description:
    'Side-by-side comparison of deslint and Prettier across six real questions — formatting, design intent, Tailwind drift, design tokens, AI code, and CI integration.',
  datePublished: UPDATED,
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
    '@id': URL,
  },
};

type Verdict = 'deslint' | 'prettier' | 'both' | 'neither';

function VerdictBadge({ v }: { v: Verdict }) {
  const map: Record<Verdict, { label: string; cls: string }> = {
    deslint: {
      label: 'Deslint',
      cls: 'bg-primary/10 text-primary border-primary/20',
    },
    prettier: {
      label: 'Prettier',
      cls: 'bg-gray-100 text-gray-700 border-gray-200',
    },
    both: {
      label: 'Both',
      cls: 'bg-pass/10 text-pass border-pass/20',
    },
    neither: {
      label: 'Neither',
      cls: 'bg-gray-50 text-gray-700 border-gray-200',
    },
  };
  const { label, cls } = map[v];
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold uppercase tracking-wider ${cls}`}
    >
      {label}
    </span>
  );
}

export default function DeslintVsPrettier() {
  return (
    <>
      <Navbar />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <BreadcrumbJsonLd
        trail={[
          { name: 'Compare', path: '/compare/deslint-vs-prettier' },
          { name: 'Deslint vs. Prettier', path: '/compare/deslint-vs-prettier' },
        ]}
      />
      <main className="mx-auto max-w-3xl px-6 pt-32 pb-20">
        <FadeIn className="mb-10">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
            Comparison
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 leading-[1.08] mb-6">
            Deslint vs. Prettier:{' '}
            <span className="text-primary">two different layers</span>
          </h1>
          <p className="text-xl text-gray-600 leading-relaxed">
            Prettier formats. Deslint enforces design intent. They never
            answer the same question, and they never disagree about
            indentation either —{' '}
            <code className="text-base text-primary bg-primary-50/60 px-1 rounded">prettier</code> will happily reformat a
            hardcoded <code className="text-base text-primary bg-primary-50/60 px-1 rounded">#1a5276</code> into beautifully
            indented JSX. The hex still ships. Most teams shipping modern
            frontend should run both.
          </p>
          <p className="mt-4 text-sm text-gray-500">
            Last updated {new Date(UPDATED).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.
            Written by the deslint team; we&rsquo;re trying to be honest, not to sell.
          </p>
        </FadeIn>

        <FadeIn>
          <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden mb-12">
            <div className="border-b border-gray-200 bg-gray-50/80 px-5 py-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                TL;DR at a glance
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    <th className="px-5 py-3">Question</th>
                    <th className="px-5 py-3">Winner</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="px-5 py-3 text-gray-700">Whitespace, line breaks, trailing commas, quote style</td>
                    <td className="px-5 py-3"><VerdictBadge v="prettier" /></td>
                  </tr>
                  <tr>
                    <td className="px-5 py-3 text-gray-700">Sorts Tailwind class order in <code className="text-xs text-primary bg-primary-50/60 px-1 rounded">className</code></td>
                    <td className="px-5 py-3"><VerdictBadge v="prettier" /></td>
                  </tr>
                  <tr>
                    <td className="px-5 py-3 text-gray-700">Catches <code className="text-xs text-primary bg-primary-50/60 px-1 rounded">bg-[#1a5276]</code> arbitrary value</td>
                    <td className="px-5 py-3"><VerdictBadge v="deslint" /></td>
                  </tr>
                  <tr>
                    <td className="px-5 py-3 text-gray-700">Catches a <code className="text-xs text-primary bg-primary-50/60 px-1 rounded">style={'{{'} color: &apos;#fa0a3e&apos; {'}}'}</code> drift</td>
                    <td className="px-5 py-3"><VerdictBadge v="deslint" /></td>
                  </tr>
                  <tr>
                    <td className="px-5 py-3 text-gray-700">Flags missing alt text or undersized touch targets</td>
                    <td className="px-5 py-3"><VerdictBadge v="deslint" /></td>
                  </tr>
                  <tr>
                    <td className="px-5 py-3 text-gray-700">Runs in editors, on save, in CI</td>
                    <td className="px-5 py-3"><VerdictBadge v="both" /></td>
                  </tr>
                  <tr>
                    <td className="px-5 py-3 text-gray-700">Has an opinion on what good design looks like</td>
                    <td className="px-5 py-3"><VerdictBadge v="deslint" /></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </FadeIn>

        <FadeIn>
          <section className="mb-12">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-4">
              What each tool is actually built for
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                  Prettier
                </p>
                <p className="text-base text-gray-700 leading-relaxed mb-3">
                  An opinionated code formatter. Prettier parses your file,
                  throws away the original whitespace, and re-prints it with
                  consistent indentation, line wrapping, quote style, and
                  trailing commas. Its scope is shape, not meaning.
                </p>
                <p className="text-base text-gray-700 leading-relaxed">
                  With{' '}
                  <code className="text-xs text-primary bg-primary-50/60 px-1 rounded">prettier-plugin-tailwindcss</code>{' '}
                  installed, it also sorts Tailwind utility classes. That&rsquo;s
                  cosmetic ordering, not validation — it has no opinion on
                  whether the classes themselves are correct.
                </p>
              </div>
              <div className="rounded-2xl border border-primary/30 bg-primary-50/30 p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">
                  Deslint
                </p>
                <p className="text-base text-gray-700 leading-relaxed mb-3">
                  A design-intent linter. It parses JSX/TSX and runs 37
                  deterministic rules against the design-system surface — does
                  this color match the palette, is this spacing on the scale,
                  is this Tailwind value an arbitrary escape hatch, is this{' '}
                  <code className="text-xs text-primary bg-primary-50/60 px-1 rounded">target=&quot;_blank&quot;</code> safe?
                </p>
                <p className="text-base text-gray-700 leading-relaxed">
                  Deslint never changes your formatting. It&rsquo;s perfectly
                  comfortable running after Prettier — the two operate on
                  separate axes.
                </p>
              </div>
            </div>
          </section>
        </FadeIn>

        <FadeIn>
          <section className="mb-12">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-6">
              Six real questions, answered honestly
            </h2>

            <div className="space-y-8">
              <article>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs font-mono text-gray-700">01</span>
                  <h3 className="text-lg font-semibold text-gray-900">Who decides whether your file uses single or double quotes?</h3>
                </div>
                <p className="text-base text-gray-700 leading-relaxed mb-3">
                  Prettier, every time. Quote style is a formatting decision; it
                  has no semantic meaning to JavaScript or to your design
                  system. Deslint deliberately has no quote-style rule because
                  Prettier already covers it definitively, and competing
                  formatters cause merge fights nobody wants.
                </p>
                <p className="mt-2 text-sm text-gray-700"><strong className="text-gray-900">Verdict:</strong> Prettier.</p>
              </article>

              <article>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs font-mono text-gray-700">02</span>
                  <h3 className="text-lg font-semibold text-gray-900">Who catches <code className="text-sm text-primary bg-primary-50/60 px-1 rounded">className=&quot;bg-[#1a5276] p-[17px]&quot;</code>?</h3>
                </div>
                <p className="text-base text-gray-700 leading-relaxed mb-3">
                  Prettier sees a string. With the Tailwind plugin, it might
                  re-order the two utilities. It will not flag either of them —
                  the arbitrary hex and the off-scale padding both pass through
                  cleanly, looking neatly indented.
                </p>
                <p className="text-base text-gray-700 leading-relaxed">
                  Deslint&rsquo;s{' '}
                  <Link href="/docs/rules/no-arbitrary-colors" className="text-primary font-semibold hover:underline">no-arbitrary-colors</Link> and{' '}
                  <Link href="/docs/rules/no-arbitrary-spacing" className="text-primary font-semibold hover:underline">no-arbitrary-spacing</Link> were
                  written exactly for this — the AI-generated &ldquo;close enough&rdquo;
                  values that bypass your token system. The longer story is in{' '}
                  <Link href="/blog/tailwind-arbitrary-values" className="text-primary font-semibold hover:underline">the hidden cost of Tailwind arbitrary values</Link>.
                </p>
                <p className="mt-2 text-sm text-gray-700"><strong className="text-gray-900">Verdict:</strong> deslint.</p>
              </article>

              <article>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs font-mono text-gray-700">03</span>
                  <h3 className="text-lg font-semibold text-gray-900">Who reformats a 200-character JSX prop list onto multiple lines?</h3>
                </div>
                <p className="text-base text-gray-700 leading-relaxed mb-3">
                  Prettier — that is its core competence and one of the genuine
                  reasons every modern JS project should use it. Auto-wrapping
                  long lines, sorting imports, breaking nested JSX at sensible
                  boundaries: Prettier does this better than any human can with
                  consistency.
                </p>
                <p className="text-base text-gray-700 leading-relaxed">
                  Deslint deliberately doesn&rsquo;t touch formatting. We rely on
                  Prettier to keep diffs clean.
                </p>
                <p className="mt-2 text-sm text-gray-700"><strong className="text-gray-900">Verdict:</strong> Prettier.</p>
              </article>

              <article>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs font-mono text-gray-700">04</span>
                  <h3 className="text-lg font-semibold text-gray-900">Who flags a <code className="text-sm text-primary bg-primary-50/60 px-1 rounded">&lt;img&gt;</code> with no <code className="text-sm text-primary bg-primary-50/60 px-1 rounded">alt</code> or a 16×16 hit target?</h3>
                </div>
                <p className="text-base text-gray-700 leading-relaxed mb-3">
                  Prettier has no concept of accessibility. It cares about the
                  shape of the source, not the rendered output.
                </p>
                <p className="text-base text-gray-700 leading-relaxed">
                  Deslint&rsquo;s{' '}
                  <Link href="/docs/rules/image-alt-text" className="text-primary font-semibold hover:underline">image-alt-text</Link> (WCAG 1.1.1) and{' '}
                  <Link href="/docs/rules/touch-target-size" className="text-primary font-semibold hover:underline">touch-target-size</Link> (WCAG 2.5.8) catch these
                  at lint time, before they reach the browser. The full
                  pre-launch checklist is in{' '}
                  <Link href="/blog/frontend-launch-readiness-checklist" className="text-primary font-semibold hover:underline">Frontend launch readiness</Link>.
                </p>
                <p className="mt-2 text-sm text-gray-700"><strong className="text-gray-900">Verdict:</strong> deslint.</p>
              </article>

              <article>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs font-mono text-gray-700">05</span>
                  <h3 className="text-lg font-semibold text-gray-900">Who catches frontend-safety drift like <code className="text-sm text-primary bg-primary-50/60 px-1 rounded">target=&quot;_blank&quot;</code> without <code className="text-sm text-primary bg-primary-50/60 px-1 rounded">rel</code>?</h3>
                </div>
                <p className="text-base text-gray-700 leading-relaxed mb-3">
                  Prettier never has and never will — it&rsquo;s strictly cosmetic.
                  This is one of the most common AI-generated bugs (the agent
                  copies the pattern from old tutorials), and it slips through
                  every formatter cleanly.
                </p>
                <p className="text-base text-gray-700 leading-relaxed">
                  Deslint&rsquo;s{' '}
                  <Link href="/docs/rules/safe-external-links" className="text-primary font-semibold hover:underline">safe-external-links</Link> autofixes
                  it (inserts <code className="text-xs text-primary bg-primary-50/60 px-1 rounded">rel=&quot;noopener noreferrer&quot;</code>);{' '}
                  <Link href="/docs/rules/no-dangerous-html" className="text-primary font-semibold hover:underline">no-dangerous-html</Link> guards{' '}
                  <code className="text-xs text-primary bg-primary-50/60 px-1 rounded">dangerouslySetInnerHTML</code>;{' '}
                  <Link href="/docs/rules/iframe-sandbox" className="text-primary font-semibold hover:underline">iframe-sandbox</Link> flags
                  unsandboxed iframes.
                </p>
                <p className="mt-2 text-sm text-gray-700"><strong className="text-gray-900">Verdict:</strong> deslint.</p>
              </article>

              <article>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs font-mono text-gray-700">06</span>
                  <h3 className="text-lg font-semibold text-gray-900">Who runs in editors, on save, and in CI?</h3>
                </div>
                <p className="text-base text-gray-700 leading-relaxed mb-3">
                  Both. Prettier integrates everywhere via{' '}
                  <code className="text-xs text-primary bg-primary-50/60 px-1 rounded">prettier --write</code>, format-on-save,
                  and pre-commit hooks. Deslint installs as an{' '}
                  <Link href="/docs/getting-started" className="text-primary font-semibold hover:underline">ESLint plugin</Link>{' '}
                  (so anywhere ESLint runs, deslint runs), as a standalone{' '}
                  <Link href="/cli" className="text-primary font-semibold hover:underline">CLI</Link>, as a{' '}
                  <Link href="/action" className="text-primary font-semibold hover:underline">GitHub Action</Link>, and as an{' '}
                  <Link href="/mcp" className="text-primary font-semibold hover:underline">MCP server</Link> for AI agents.
                </p>
                <p className="text-base text-gray-700 leading-relaxed">
                  Run order: Prettier first (canonicalize the source), then
                  ESLint with the deslint plugin (validate intent). Standard
                  setup, no conflicts.
                </p>
                <p className="mt-2 text-sm text-gray-700"><strong className="text-gray-900">Verdict:</strong> both — they layer cleanly.</p>
              </article>
            </div>
          </section>
        </FadeIn>

        <FadeIn>
          <section className="mb-12">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-4">
              The honest framing
            </h2>
            <p className="text-base text-gray-700 leading-relaxed mb-4">
              &ldquo;Do I still need a design linter if I have Prettier?&rdquo; is
              roughly like asking &ldquo;do I still need spell check if I have a
              grammar checker?&rdquo; Different layers. Prettier guarantees your
              code <em>looks</em> consistent. Deslint guarantees the design{' '}
              <em>is</em> consistent — that the colors come from your palette,
              the spacing comes from your scale, the targets are large enough,
              the dark-mode classes are present, and the safety boilerplate is
              in place.
            </p>
            <p className="text-base text-gray-700 leading-relaxed">
              The two are most useful together. Prettier first; deslint second.
              Neither one replaces the other.
            </p>
          </section>
        </FadeIn>

        <FadeIn>
          <section className="mb-12">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-4">
              Running them together
            </h2>
            <p className="text-base text-gray-700 leading-relaxed mb-4">
              The cleanest setup we&rsquo;ve seen: Prettier on save, deslint on
              save (via the ESLint plugin), both gated again in CI.
            </p>
            <pre className="rounded-xl border border-gray-800 bg-gray-950 p-4 text-sm leading-relaxed text-gray-300 overflow-x-auto font-mono">
{`# package.json
"scripts": {
  "format": "prettier --write \\"**/*.{ts,tsx,css,md}\\"",
  "lint":   "eslint . --max-warnings 0",
  "check":  "pnpm format && pnpm lint"
}

# CI
pnpm format -- --check
pnpm lint

# AI authoring loop
# Cursor / Claude Code / Windsurf → deslint MCP tools`}
            </pre>
          </section>
        </FadeIn>

        <FadeIn>
          <section className="mb-12">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-4">
              Other comparisons
            </h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <Link href="/compare/deslint-vs-eslint" className="rounded-lg border border-gray-200 bg-white p-4 hover:border-primary/30 motion-safe:transition-colors">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">vs.</p>
                <p className="text-base font-semibold text-gray-900">ESLint</p>
                <p className="mt-1 text-sm text-gray-700">JS correctness vs. design intent.</p>
              </Link>
              <Link href="/compare/deslint-vs-stylelint" className="rounded-lg border border-gray-200 bg-white p-4 hover:border-primary/30 motion-safe:transition-colors">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">vs.</p>
                <p className="text-base font-semibold text-gray-900">stylelint</p>
                <p className="mt-1 text-sm text-gray-700">Authored CSS vs. JSX surface.</p>
              </Link>
              <Link href="/compare/deslint-vs-biome" className="rounded-lg border border-gray-200 bg-white p-4 hover:border-primary/30 motion-safe:transition-colors">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">vs.</p>
                <p className="text-base font-semibold text-gray-900">Biome</p>
                <p className="mt-1 text-sm text-gray-700">All-in-one toolchain vs. design layer.</p>
              </Link>
            </div>
          </section>
        </FadeIn>

        <FadeIn>
          <section className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary-50 via-white to-white p-8 mb-8">
            <h2 className="text-xl font-bold tracking-tight text-gray-900 mb-3">
              Add deslint alongside Prettier
            </h2>
            <p className="text-base text-gray-700 leading-relaxed mb-5">
              Two minutes. Deslint installs as an ESLint plugin, runs after
              Prettier with zero conflict, and starts catching the design-intent
              drift Prettier deliberately ignores. The{' '}
              <Link href="/docs/getting-started" className="text-primary font-semibold hover:underline">getting-started guide</Link>{' '}
              walks through plugin, CLI, and MCP — none require a cloud account.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/docs/getting-started"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-light motion-safe:transition-all hover:shadow-lg hover:shadow-primary/20"
              >
                Get started
              </Link>
              <Link
                href="/docs/rules"
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:border-primary/30 hover:text-primary motion-safe:transition-colors"
              >
                Browse all 37 rules
              </Link>
              <Link
                href="/launch-check"
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:border-primary/30 hover:text-primary motion-safe:transition-colors"
              >
                Run a launch check
              </Link>
            </div>
          </section>
        </FadeIn>
      </main>
      <Footer />
    </>
  );
}
