import type { Metadata } from 'next';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { FadeIn } from '@/components/motion';
import { BreadcrumbJsonLd } from '@/components/BreadcrumbJsonLd';

const UPDATED = '2026-04-17';

export const metadata: Metadata = {
  title: 'Deslint vs. stylelint: the honest comparison (2026)',
  description:
    'Deslint and stylelint solve different problems. Stylelint lints authored CSS. Deslint lints the design-system surface that AI agents like Cursor and Claude Code actually touch — JSX className drift, arbitrary Tailwind values, token violations. Most teams run both.',
  alternates: { canonical: '/compare/deslint-vs-stylelint' },
  keywords: [
    'deslint vs stylelint',
    'stylelint alternative',
    'tailwind linter',
    'jsx className linter',
    'design token linter',
    'css linter',
    'design system enforcement',
    'ai code linter',
  ],
  openGraph: {
    title: 'Deslint vs. stylelint — the honest comparison',
    description:
      'Two linters, different jobs. Stylelint for authored CSS, deslint for JSX/Tailwind/design-token drift. Side-by-side on six real questions.',
    url: 'https://deslint.com/compare/deslint-vs-stylelint',
    type: 'article',
    modifiedTime: UPDATED,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Deslint vs. stylelint',
    description:
      'Different jobs, not rivals. Honest side-by-side comparison for 2026 frontend teams.',
  },
};

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Deslint vs. stylelint: the honest comparison',
  description:
    'Side-by-side comparison of deslint and stylelint across six real questions — authored CSS, JSX className drift, Tailwind arbitrary values, design tokens, CI integration, and AI-generated code.',
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
    '@id': 'https://deslint.com/compare/deslint-vs-stylelint',
  },
};

type Verdict = 'deslint' | 'stylelint' | 'both' | 'neither';

function VerdictBadge({ v }: { v: Verdict }) {
  const map: Record<Verdict, { label: string; cls: string }> = {
    deslint: {
      label: 'Deslint',
      cls: 'bg-primary/10 text-primary border-primary/20',
    },
    stylelint: {
      label: 'stylelint',
      cls: 'bg-gray-100 text-gray-700 border-gray-200',
    },
    both: {
      label: 'Both',
      cls: 'bg-pass/10 text-pass border-pass/20',
    },
    neither: {
      label: 'Neither',
      cls: 'bg-gray-50 text-gray-500 border-gray-200',
    },
  };
  const { label, cls } = map[v];
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${cls}`}
    >
      {label}
    </span>
  );
}

export default function DeslintVsStylelint() {
  return (
    <>
      <Navbar />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <BreadcrumbJsonLd
        trail={[
          { name: 'Compare', path: '/compare/deslint-vs-stylelint' },
          { name: 'Deslint vs. stylelint', path: '/compare/deslint-vs-stylelint' },
        ]}
      />
      <main className="mx-auto max-w-3xl px-6 pt-32 pb-20">
        <FadeIn className="mb-10">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
            Comparison
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 leading-[1.08] mb-6">
            Deslint vs. stylelint:{' '}
            <span className="text-primary">they do different jobs</span>
          </h1>
          <p className="text-xl text-gray-600 leading-relaxed">
            Stylelint is the mature, de-facto linter for authored CSS.
            Deslint lints the design-system surface that AI agents like{' '}
            <Link href="/mcp/cursor" className="text-primary font-semibold hover:underline">
              Cursor
            </Link>{' '}
            and{' '}
            <Link href="/mcp/claude-code" className="text-primary font-semibold hover:underline">
              Claude Code
            </Link>{' '}
            actually touch — JSX className drift,
            arbitrary Tailwind values, design-token violations. Most
            teams shipping modern frontend should run both.
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
                  <tr className="border-b border-gray-100 text-left text-[12px] font-semibold uppercase tracking-wider text-gray-500">
                    <th className="px-5 py-3">Question</th>
                    <th className="px-5 py-3">Winner</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="px-5 py-3 text-gray-700">Authored <code className="text-[12px] text-primary bg-primary-50/60 px-1 rounded">.css</code> / <code className="text-[12px] text-primary bg-primary-50/60 px-1 rounded">.scss</code> (nesting, ordering, syntax)</td>
                    <td className="px-5 py-3"><VerdictBadge v="stylelint" /></td>
                  </tr>
                  <tr>
                    <td className="px-5 py-3 text-gray-700">Tailwind arbitrary values in JSX (<code className="text-[12px] text-primary bg-primary-50/60 px-1 rounded">bg-[#1a5276]</code>)</td>
                    <td className="px-5 py-3"><VerdictBadge v="deslint" /></td>
                  </tr>
                  <tr>
                    <td className="px-5 py-3 text-gray-700">Raw hex colors in <code className="text-[12px] text-primary bg-primary-50/60 px-1 rounded">className</code> / <code className="text-[12px] text-primary bg-primary-50/60 px-1 rounded">style</code> props</td>
                    <td className="px-5 py-3"><VerdictBadge v="deslint" /></td>
                  </tr>
                  <tr>
                    <td className="px-5 py-3 text-gray-700">Design-token enforcement across a monorepo</td>
                    <td className="px-5 py-3"><VerdictBadge v="deslint" /></td>
                  </tr>
                  <tr>
                    <td className="px-5 py-3 text-gray-700">CSS-in-JS (emotion, styled-components)</td>
                    <td className="px-5 py-3"><VerdictBadge v="both" /></td>
                  </tr>
                  <tr>
                    <td className="px-5 py-3 text-gray-700">CI gate, SARIF, editor integration</td>
                    <td className="px-5 py-3"><VerdictBadge v="both" /></td>
                  </tr>
                  <tr>
                    <td className="px-5 py-3 text-gray-700">Works with AI coding agents via MCP</td>
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
                  stylelint
                </p>
                <p className="text-[15px] text-gray-700 leading-relaxed mb-3">
                  A CSS linter. It parses <code className="text-[12px] text-primary bg-primary-50/60 px-1 rounded">.css</code>, <code className="text-[12px] text-primary bg-primary-50/60 px-1 rounded">.scss</code>, <code className="text-[12px] text-primary bg-primary-50/60 px-1 rounded">.less</code>, <code className="text-[12px] text-primary bg-primary-50/60 px-1 rounded">.vue</code>, and style blocks, then runs rules against the CSS AST. It catches bad selectors, invalid values, disallowed nesting, ordering problems, and vendor prefixes you forgot to strip.
                </p>
                <p className="text-[15px] text-gray-700 leading-relaxed">
                  If you write CSS by hand — design-system source files, global styles, utility stylesheets — stylelint is the right tool. It is mature, well-maintained, and has an enormous plugin ecosystem.
                </p>
              </div>
              <div className="rounded-2xl border border-primary/30 bg-primary-50/30 p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">
                  Deslint
                </p>
                <p className="text-[15px] text-gray-700 leading-relaxed mb-3">
                  A JSX/TSX linter focused on the design-system surface. It parses your components and runs 33 deterministic rules against what AI coding agents actually write — <code className="text-[12px] text-primary bg-primary-50/60 px-1 rounded">className</code> strings, <code className="text-[12px] text-primary bg-primary-50/60 px-1 rounded">style</code> props, Tailwind utilities, inline hex colors.
                </p>
                <p className="text-[15px] text-gray-700 leading-relaxed">
                  Its job is to catch the stuff stylelint structurally can&rsquo;t see: <code className="text-[12px] text-primary bg-primary-50/60 px-1 rounded">bg-[#1a5276]</code> sitting in a React component, a one-off <code className="text-[12px] text-primary bg-primary-50/60 px-1 rounded">p-[17px]</code>, a <code className="text-[12px] text-primary bg-primary-50/60 px-1 rounded">text-blue-500</code> that should have been a token.
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
                  <span className="text-xs font-mono text-gray-400">01</span>
                  <h3 className="text-lg font-semibold text-gray-900">Who catches a raw hex in <code className="text-[14px] text-primary bg-primary-50/60 px-1 rounded">className=&quot;bg-[#1a5276]&quot;</code>?</h3>
                </div>
                <p className="text-[15px] text-gray-700 leading-relaxed mb-3">
                  Stylelint never sees this. It runs on CSS files, not JSX string literals, so a Tailwind arbitrary value inside a React <code className="text-[12px] text-primary bg-primary-50/60 px-1 rounded">className</code> is invisible to it — even with <code className="text-[12px] text-primary bg-primary-50/60 px-1 rounded">postcss-lit</code> or template parsers, the string isn&rsquo;t CSS yet at lint time.
                </p>
                <p className="text-[15px] text-gray-700 leading-relaxed">
                  Deslint&rsquo;s <Link href="/docs/rules" className="text-primary font-semibold hover:underline">no-arbitrary-colors</Link> rule flags it at the JSX level, before Tailwind expands it. The full story is in{' '}
                  <Link href="/blog/tailwind-arbitrary-values" className="text-primary font-semibold hover:underline">the hidden cost of Tailwind arbitrary values</Link>.
                </p>
                <p className="mt-2 text-sm text-gray-500"><strong className="text-gray-700">Verdict:</strong> deslint.</p>
              </article>

              <article>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs font-mono text-gray-400">02</span>
                  <h3 className="text-lg font-semibold text-gray-900">Who enforces ordering inside an authored <code className="text-[14px] text-primary bg-primary-50/60 px-1 rounded">tokens.css</code>?</h3>
                </div>
                <p className="text-[15px] text-gray-700 leading-relaxed mb-3">
                  Stylelint. This is its home turf. If you author CSS custom properties, keep a design-token file, or maintain a utility stylesheet, stylelint&rsquo;s rule ecosystem — <code className="text-[12px] text-primary bg-primary-50/60 px-1 rounded">declaration-block-no-redundant-longhand-properties</code>, <code className="text-[12px] text-primary bg-primary-50/60 px-1 rounded">order/properties-order</code>, <code className="text-[12px] text-primary bg-primary-50/60 px-1 rounded">selector-max-specificity</code> — is unmatched.
                </p>
                <p className="text-[15px] text-gray-700 leading-relaxed">
                  Deslint doesn&rsquo;t parse CSS. It deliberately doesn&rsquo;t compete here. If someone sells you &ldquo;replace your stylelint,&rdquo; they&rsquo;re selling you something worse.
                </p>
                <p className="mt-2 text-sm text-gray-500"><strong className="text-gray-700">Verdict:</strong> stylelint.</p>
              </article>

              <article>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs font-mono text-gray-400">03</span>
                  <h3 className="text-lg font-semibold text-gray-900">Who catches a <code className="text-[14px] text-primary bg-primary-50/60 px-1 rounded">style={'{'}{'{'} color: &apos;#fa0a3e&apos; {'}'}{'}'}</code> inline prop?</h3>
                </div>
                <p className="text-[15px] text-gray-700 leading-relaxed mb-3">
                  Stylelint can, but only if you wire up a template-literal plugin and the value is in a tagged template or CSS-in-JS string. A plain object-literal <code className="text-[12px] text-primary bg-primary-50/60 px-1 rounded">style</code> prop on a React element is outside its scope.
                </p>
                <p className="text-[15px] text-gray-700 leading-relaxed">
                  Deslint&rsquo;s <Link href="/docs/rules" className="text-primary font-semibold hover:underline">no-inline-styles</Link> and <Link href="/docs/rules" className="text-primary font-semibold hover:underline">no-raw-hex</Link> were written specifically for this case — it&rsquo;s the single most common drift pattern in AI-generated React code.
                </p>
                <p className="mt-2 text-sm text-gray-500"><strong className="text-gray-700">Verdict:</strong> deslint.</p>
              </article>

              <article>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs font-mono text-gray-400">04</span>
                  <h3 className="text-lg font-semibold text-gray-900">Who imports your Figma tokens and enforces them?</h3>
                </div>
                <p className="text-[15px] text-gray-700 leading-relaxed mb-3">
                  Neither does it end-to-end, but the gap is narrower for deslint. Deslint&rsquo;s <code className="text-[12px] text-primary bg-primary-50/60 px-1 rounded">.deslintrc.json</code> accepts a design-system config (palette, spacing scale, type scale) which the rules then enforce across JSX. Tokens Studio / Style Dictionary export to that shape in one step.
                </p>
                <p className="text-[15px] text-gray-700 leading-relaxed">
                  Stylelint can lint custom properties you&rsquo;ve already authored, but it has no concept of &ldquo;this component used a color that isn&rsquo;t in the palette.&rdquo; That&rsquo;s a JSX-level question.
                </p>
                <p className="mt-2 text-sm text-gray-500"><strong className="text-gray-700">Verdict:</strong> deslint, for the cross-component enforcement. Stylelint for the token file itself.</p>
              </article>

              <article>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs font-mono text-gray-400">05</span>
                  <h3 className="text-lg font-semibold text-gray-900">Who integrates with AI coding agents (Claude Code, Cursor, Windsurf)?</h3>
                </div>
                <p className="text-[15px] text-gray-700 leading-relaxed mb-3">
                  Deslint ships an <Link href="/mcp" className="text-primary font-semibold hover:underline">MCP server</Link> that plugs directly into Claude Code, Cursor, Windsurf, and Codex. The agent can run <code className="text-[12px] text-primary bg-primary-50/60 px-1 rounded">analyze_project</code>, <code className="text-[12px] text-primary bg-primary-50/60 px-1 rounded">enforce_budget</code>, and <code className="text-[12px] text-primary bg-primary-50/60 px-1 rounded">compliance_check</code> before it finalizes a generation — the lint happens inside the authoring loop, not after.
                </p>
                <p className="text-[15px] text-gray-700 leading-relaxed">
                  Stylelint is a post-hoc linter with no MCP surface. You can wire it into a CI gate or editor plugin, but the agent doesn&rsquo;t see it during generation.
                </p>
                <p className="mt-2 text-sm text-gray-500"><strong className="text-gray-700">Verdict:</strong> deslint.</p>
              </article>

              <article>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs font-mono text-gray-400">06</span>
                  <h3 className="text-lg font-semibold text-gray-900">Who works with CI, editor, and SARIF/GitHub code-scanning?</h3>
                </div>
                <p className="text-[15px] text-gray-700 leading-relaxed mb-3">
                  Both. Stylelint has first-class editor plugins, a stable CLI, and mature CI patterns. Deslint ships an ESLint plugin, a standalone CLI (<code className="text-[12px] text-primary bg-primary-50/60 px-1 rounded">deslint scan</code>), a GitHub Action, and SARIF output for GitHub Advanced Security and Azure DevOps.
                </p>
                <p className="text-[15px] text-gray-700 leading-relaxed">
                  Neither one replaces the other at the CI layer. You can (and should) run them both in the same pipeline — they gate different surfaces.
                </p>
                <p className="mt-2 text-sm text-gray-500"><strong className="text-gray-700">Verdict:</strong> both — they coexist cleanly.</p>
              </article>
            </div>
          </section>
        </FadeIn>

        <FadeIn>
          <section className="mb-12">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-4">
              When to use which
            </h2>
            <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-1">Use stylelint alone if:</p>
                <p className="text-[15px] text-gray-600 leading-relaxed">
                  Your codebase is mostly authored CSS or SCSS, your components don&rsquo;t embed color/spacing values in JSX, you don&rsquo;t use Tailwind, and AI-generated code is a small fraction of what ships.
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-1">Use deslint alone if:</p>
                <p className="text-[15px] text-gray-600 leading-relaxed">
                  You&rsquo;re Tailwind-only, your team barely touches CSS files directly, and most of your drift lives in <code className="text-[12px] text-primary bg-primary-50/60 px-1 rounded">className</code> strings and inline styles written by AI agents.
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-1">Use both if:</p>
                <p className="text-[15px] text-gray-600 leading-relaxed">
                  You maintain a design-system source (tokens, primitives, global styles) <em>and</em> ship product components in JSX/TSX with AI assistance. This is the common case, and the two tools don&rsquo;t overlap — they gate different parts of your pipeline.
                </p>
              </div>
            </div>
          </section>
        </FadeIn>

        <FadeIn>
          <section className="mb-12">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-4">
              Running them together
            </h2>
            <p className="text-[15px] text-gray-700 leading-relaxed mb-4">
              The cleanest setup we&rsquo;ve seen: stylelint gates the <code className="text-[12px] text-primary bg-primary-50/60 px-1 rounded">packages/design-system/**/*.css</code> and <code className="text-[12px] text-primary bg-primary-50/60 px-1 rounded">globals.css</code> paths, deslint gates the <code className="text-[12px] text-primary bg-primary-50/60 px-1 rounded">apps/**/*.tsx</code> product surface, and the MCP server runs during AI-assisted authoring. Three gates, zero overlap.
            </p>
            <pre className="rounded-xl border border-gray-800 bg-gray-950 p-4 text-[13px] leading-relaxed text-gray-300 overflow-x-auto font-mono">
{`# CI pipeline
pnpm stylelint "packages/**/*.{css,scss}"
pnpm deslint scan "apps/**/*.{ts,tsx}" --format sarif --output deslint.sarif

# Local editor
# stylelint plugin + ESLint (deslint) plugin, both enabled

# AI authoring loop
# Claude Code / Cursor / Windsurf → deslint MCP tools`}
            </pre>
          </section>
        </FadeIn>

        <FadeIn>
          <section className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary-50 via-white to-white p-8 mb-8">
            <h2 className="text-xl font-bold tracking-tight text-gray-900 mb-3">
              Ready to add deslint alongside stylelint?
            </h2>
            <p className="text-[15px] text-gray-700 leading-relaxed mb-5">
              It takes about two minutes. The <Link href="/docs/getting-started" className="text-primary font-semibold hover:underline">getting-started guide</Link> walks through the ESLint plugin, the CLI, and the MCP server. None of them require a cloud account.
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
                Browse all 33 rules
              </Link>
              <Link
                href="/blog/tailwind-arbitrary-values"
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:border-primary/30 hover:text-primary motion-safe:transition-colors"
              >
                Read the Tailwind drift post
              </Link>
            </div>
          </section>
        </FadeIn>
      </main>
      <Footer />
    </>
  );
}
