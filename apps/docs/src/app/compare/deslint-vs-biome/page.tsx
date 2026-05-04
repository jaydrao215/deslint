import type { Metadata } from 'next';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { FadeIn } from '@/components/motion';
import { BreadcrumbJsonLd } from '@/components/BreadcrumbJsonLd';

const UPDATED = '2026-05-04';
const URL = 'https://deslint.com/compare/deslint-vs-biome';

export const metadata: Metadata = {
  title: 'Deslint vs. Biome: design lint for the all-in-one toolchain (2026)',
  description:
    'Biome is a fast Rust-based formatter + linter that replaces Prettier and ESLint for many teams. It still has no concept of design tokens, Tailwind drift, or WCAG. Deslint is the design-intent layer on top — honest side-by-side for 2026.',
  alternates: { canonical: '/compare/deslint-vs-biome' },
  keywords: [
    'deslint vs biome',
    'biome design system',
    'biome tailwind plugin',
    'biome design tokens',
    'biome accessibility',
    'biome ai code',
    'biome alternative for design lint',
    'design intent linter biome',
  ],
  openGraph: {
    title: 'Deslint vs. Biome — design lint for the all-in-one toolchain',
    description:
      'Biome handles formatting and JS correctness in one fast Rust binary. Deslint adds the design-intent layer Biome doesn&rsquo;t cover. Side-by-side on six honest questions.',
    url: URL,
    type: 'article',
    modifiedTime: UPDATED,
    images: [
      {
        url: '/compare/deslint-vs-biome/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Deslint vs. Biome — design lint on top of the all-in-one toolchain. Honest side-by-side comparison.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Deslint vs. Biome',
    description:
      'Biome handles speed. Deslint handles design intent. Honest comparison for 2026 frontend teams.',
    images: ['/compare/deslint-vs-biome/opengraph-image'],
  },
};

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Deslint vs. Biome: design lint for the all-in-one toolchain',
  description:
    'Side-by-side comparison of deslint and Biome across six real questions — formatting, JS correctness, Tailwind drift, design tokens, AI code, and CI integration.',
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

type Verdict = 'deslint' | 'biome' | 'both' | 'neither';

function VerdictBadge({ v }: { v: Verdict }) {
  const map: Record<Verdict, { label: string; cls: string }> = {
    deslint: {
      label: 'Deslint',
      cls: 'bg-primary/10 text-primary border-primary/20',
    },
    biome: {
      label: 'Biome',
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

export default function DeslintVsBiome() {
  return (
    <>
      <Navbar />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <BreadcrumbJsonLd
        trail={[
          { name: 'Compare', path: '/compare/deslint-vs-biome' },
          { name: 'Deslint vs. Biome', path: '/compare/deslint-vs-biome' },
        ]}
      />
      <main className="mx-auto max-w-3xl px-6 pt-32 pb-20">
        <FadeIn className="mb-10">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
            Comparison
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 leading-[1.08] mb-6">
            Deslint vs. Biome:{' '}
            <span className="text-primary">the design layer Biome doesn&rsquo;t cover</span>
          </h1>
          <p className="text-xl text-gray-600 leading-relaxed">
            Biome is a fast, Rust-based formatter and linter that replaces
            Prettier and a chunk of ESLint in one binary. It is excellent at
            what it does — and what it does is JavaScript correctness and
            formatting, not design intent. Deslint adds the layer Biome
            structurally doesn&rsquo;t cover: design tokens, Tailwind drift, WCAG
            2.2, and the safety patterns AI agents like{' '}
            <Link href="/mcp/cursor" className="text-primary font-semibold hover:underline">Cursor</Link>{' '}
            keep getting wrong.
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
                    <td className="px-5 py-3 text-gray-700">Formats <code className="text-xs text-primary bg-primary-50/60 px-1 rounded">.ts</code> / <code className="text-xs text-primary bg-primary-50/60 px-1 rounded">.tsx</code> / <code className="text-xs text-primary bg-primary-50/60 px-1 rounded">.json</code> in milliseconds</td>
                    <td className="px-5 py-3"><VerdictBadge v="biome" /></td>
                  </tr>
                  <tr>
                    <td className="px-5 py-3 text-gray-700">Catches <code className="text-xs text-primary bg-primary-50/60 px-1 rounded">no-unused-vars</code>, <code className="text-xs text-primary bg-primary-50/60 px-1 rounded">no-undef</code>, ~270 lint rules in one binary</td>
                    <td className="px-5 py-3"><VerdictBadge v="biome" /></td>
                  </tr>
                  <tr>
                    <td className="px-5 py-3 text-gray-700">Catches <code className="text-xs text-primary bg-primary-50/60 px-1 rounded">bg-[#1a5276]</code> Tailwind arbitrary value</td>
                    <td className="px-5 py-3"><VerdictBadge v="deslint" /></td>
                  </tr>
                  <tr>
                    <td className="px-5 py-3 text-gray-700">Enforces a typed design-token palette across JSX</td>
                    <td className="px-5 py-3"><VerdictBadge v="deslint" /></td>
                  </tr>
                  <tr>
                    <td className="px-5 py-3 text-gray-700">WCAG 2.2 — touch-target, focus-visible, image-alt, link-text</td>
                    <td className="px-5 py-3"><VerdictBadge v="deslint" /></td>
                  </tr>
                  <tr>
                    <td className="px-5 py-3 text-gray-700">Plugs into Cursor / Claude Code / Windsurf via MCP</td>
                    <td className="px-5 py-3"><VerdictBadge v="deslint" /></td>
                  </tr>
                  <tr>
                    <td className="px-5 py-3 text-gray-700">Single binary, no Node.js required at runtime</td>
                    <td className="px-5 py-3"><VerdictBadge v="biome" /></td>
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
                  Biome
                </p>
                <p className="text-base text-gray-700 leading-relaxed mb-3">
                  A unified Rust-based toolchain for JavaScript and TypeScript.
                  Biome formats (replacing Prettier) and lints (replacing a
                  meaningful slice of ESLint) in one binary. The headline win
                  is speed — Biome runs in milliseconds where Prettier + ESLint
                  takes seconds.
                </p>
                <p className="text-base text-gray-700 leading-relaxed">
                  Biome&rsquo;s rule set covers ~270 lint rules across correctness,
                  style, and a11y. It is not extensible the way ESLint is —
                  custom rules require contributing upstream or waiting for the
                  team to add them.
                </p>
              </div>
              <div className="rounded-2xl border border-primary/30 bg-primary-50/30 p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">
                  Deslint
                </p>
                <p className="text-base text-gray-700 leading-relaxed mb-3">
                  A design-intent linter for the JSX/TSX surface. 37
                  deterministic rules across colors, spacing, typography,
                  responsive coverage, accessibility, and frontend safety.
                  Ships as an ESLint plugin, a standalone CLI, and an{' '}
                  <Link href="/mcp" className="text-primary font-semibold hover:underline">MCP server</Link> for AI agents.
                </p>
                <p className="text-base text-gray-700 leading-relaxed">
                  Deslint deliberately doesn&rsquo;t format and doesn&rsquo;t cover JS
                  correctness. It&rsquo;s the design layer that runs alongside
                  whatever formatter and JS linter you&rsquo;ve chosen — Biome
                  included.
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
                  <h3 className="text-lg font-semibold text-gray-900">Who formats and lints a 200k-line monorepo in under a second?</h3>
                </div>
                <p className="text-base text-gray-700 leading-relaxed mb-3">
                  Biome — by a wide margin. The Rust core, parallel file
                  walker, and shared AST mean it runs roughly an order of
                  magnitude faster than Prettier + ESLint on the same tree. If
                  developer-feedback latency is your bottleneck, this matters.
                </p>
                <p className="text-base text-gray-700 leading-relaxed">
                  Deslint runs through the ESLint pipeline, so on its own its
                  performance profile is closer to ESLint&rsquo;s than to Biome&rsquo;s.
                  We&rsquo;re Node-based today; that&rsquo;s the trade-off for the plugin
                  ecosystem and the MCP integration.
                </p>
                <p className="mt-2 text-sm text-gray-700"><strong className="text-gray-900">Verdict:</strong> Biome.</p>
              </article>

              <article>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs font-mono text-gray-700">02</span>
                  <h3 className="text-lg font-semibold text-gray-900">Who catches an arbitrary Tailwind value like <code className="text-sm text-primary bg-primary-50/60 px-1 rounded">bg-[#1a5276]</code>?</h3>
                </div>
                <p className="text-base text-gray-700 leading-relaxed mb-3">
                  Biome doesn&rsquo;t. Tailwind utilities live inside JSX{' '}
                  <code className="text-xs text-primary bg-primary-50/60 px-1 rounded">className</code> strings; Biome&rsquo;s lint
                  rules operate on the JS/TS AST and have no semantic
                  understanding of Tailwind&rsquo;s class grammar.
                </p>
                <p className="text-base text-gray-700 leading-relaxed">
                  Deslint&rsquo;s{' '}
                  <Link href="/docs/rules/no-arbitrary-colors" className="text-primary font-semibold hover:underline">no-arbitrary-colors</Link> and{' '}
                  <Link href="/docs/rules/no-arbitrary-spacing" className="text-primary font-semibold hover:underline">no-arbitrary-spacing</Link> were
                  written for this — the AI-generated &ldquo;close enough&rdquo; values
                  that bypass your token system. Full breakdown:{' '}
                  <Link href="/blog/tailwind-arbitrary-values" className="text-primary font-semibold hover:underline">the hidden cost of Tailwind arbitrary values</Link>.
                </p>
                <p className="mt-2 text-sm text-gray-700"><strong className="text-gray-900">Verdict:</strong> deslint.</p>
              </article>

              <article>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs font-mono text-gray-700">03</span>
                  <h3 className="text-lg font-semibold text-gray-900">Who flags a missing <code className="text-sm text-primary bg-primary-50/60 px-1 rounded">alt</code> or a 16×16 hit target?</h3>
                </div>
                <p className="text-base text-gray-700 leading-relaxed mb-3">
                  Biome has a growing a11y rule set —{' '}
                  <code className="text-xs text-primary bg-primary-50/60 px-1 rounded">useAltText</code>,{' '}
                  <code className="text-xs text-primary bg-primary-50/60 px-1 rounded">useValidAriaProps</code>,{' '}
                  <code className="text-xs text-primary bg-primary-50/60 px-1 rounded">noRedundantRoles</code>, and a few dozen more.
                  It catches structural a11y, much like jsx-a11y does for ESLint.
                  It does not check touch-target size, focus-ring presence, or
                  whether your link text says &ldquo;click here.&rdquo;
                </p>
                <p className="text-base text-gray-700 leading-relaxed">
                  Deslint&rsquo;s WCAG 2.2 set —{' '}
                  <Link href="/docs/rules/touch-target-size" className="text-primary font-semibold hover:underline">touch-target-size</Link> (2.5.8),{' '}
                  <Link href="/docs/rules/focus-visible-style" className="text-primary font-semibold hover:underline">focus-visible-style</Link> (2.4.7),{' '}
                  <Link href="/docs/rules/link-text" className="text-primary font-semibold hover:underline">link-text</Link> (2.4.4),{' '}
                  <Link href="/docs/rules/form-labels" className="text-primary font-semibold hover:underline">form-labels</Link> (1.3.1) — covers the
                  questions Biome doesn&rsquo;t reach.
                </p>
                <p className="mt-2 text-sm text-gray-700"><strong className="text-gray-900">Verdict:</strong> deslint, for the WCAG 2.2 surface. Biome covers structural a11y.</p>
              </article>

              <article>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs font-mono text-gray-700">04</span>
                  <h3 className="text-lg font-semibold text-gray-900">Who enforces a design-token palette across <code className="text-sm text-primary bg-primary-50/60 px-1 rounded">className</code> and inline <code className="text-sm text-primary bg-primary-50/60 px-1 rounded">style</code>?</h3>
                </div>
                <p className="text-base text-gray-700 leading-relaxed mb-3">
                  Biome doesn&rsquo;t and isn&rsquo;t designed to. Its rules are general
                  JavaScript/TypeScript correctness and style — not
                  project-specific design constraints.
                </p>
                <p className="text-base text-gray-700 leading-relaxed">
                  Deslint reads a project-specific{' '}
                  <code className="text-xs text-primary bg-primary-50/60 px-1 rounded">.deslintrc.json</code> describing your
                  palette, spacing scale, and type scale, then enforces them
                  across every JSX file. Tokens Studio / Style Dictionary
                  export to that shape directly.
                </p>
                <p className="mt-2 text-sm text-gray-700"><strong className="text-gray-900">Verdict:</strong> deslint.</p>
              </article>

              <article>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs font-mono text-gray-700">05</span>
                  <h3 className="text-lg font-semibold text-gray-900">Who runs inside the AI authoring loop?</h3>
                </div>
                <p className="text-base text-gray-700 leading-relaxed mb-3">
                  Biome runs after the code is on disk — fast, but reactive.
                  There is no MCP integration today.
                </p>
                <p className="text-base text-gray-700 leading-relaxed">
                  Deslint&rsquo;s{' '}
                  <Link href="/mcp" className="text-primary font-semibold hover:underline">MCP server</Link> exposes{' '}
                  <code className="text-xs text-primary bg-primary-50/60 px-1 rounded">analyze_project</code>,{' '}
                  <code className="text-xs text-primary bg-primary-50/60 px-1 rounded">enforce_budget</code>, and{' '}
                  <code className="text-xs text-primary bg-primary-50/60 px-1 rounded">compliance_check</code> as tools the agent
                  calls during generation. Cursor, Claude Code, Windsurf, and
                  Codex pick it up automatically.
                </p>
                <p className="mt-2 text-sm text-gray-700"><strong className="text-gray-900">Verdict:</strong> deslint.</p>
              </article>

              <article>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs font-mono text-gray-700">06</span>
                  <h3 className="text-lg font-semibold text-gray-900">Who works in CI, editors, and SARIF code-scanning?</h3>
                </div>
                <p className="text-base text-gray-700 leading-relaxed mb-3">
                  Both. Biome ships first-class editor extensions and a fast
                  CI binary; deslint runs anywhere ESLint runs, plus its own{' '}
                  <Link href="/cli" className="text-primary font-semibold hover:underline">CLI</Link>,{' '}
                  <Link href="/action" className="text-primary font-semibold hover:underline">GitHub Action</Link>, and SARIF
                  output for code-scanning.
                </p>
                <p className="text-base text-gray-700 leading-relaxed">
                  They run cleanly side-by-side. Biome handles formatting and
                  JS correctness; deslint handles design intent. No conflict.
                </p>
                <p className="mt-2 text-sm text-gray-700"><strong className="text-gray-900">Verdict:</strong> both — different layers.</p>
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
                <p className="text-sm font-semibold text-gray-900 mb-1">Use Biome alone if:</p>
                <p className="text-base text-gray-700 leading-relaxed">
                  Speed is your dominant concern, you want a single binary
                  with no plugin sprawl, and you don&rsquo;t maintain a strict
                  design system. Biome&rsquo;s default rule set covers a healthy
                  baseline of correctness and a11y for general-purpose JS/TS.
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-1">Add deslint if:</p>
                <p className="text-base text-gray-700 leading-relaxed">
                  You ship Tailwind / inline styles / a design-token surface,
                  you care about WCAG 2.2 conformance, or any meaningful share
                  of your code is generated by AI agents. Deslint adds 37
                  rules Biome doesn&rsquo;t cover and runs alongside without
                  conflict.
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-1">Don&rsquo;t replace Biome with deslint:</p>
                <p className="text-base text-gray-700 leading-relaxed">
                  Biome covers formatting and JS correctness; deslint
                  deliberately doesn&rsquo;t. Pick Biome (or Prettier + ESLint) for
                  that layer, and let deslint handle design intent on top.
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
            <p className="text-base text-gray-700 leading-relaxed mb-4">
              Biome handles formatting and JS lint in CI; deslint handles the
              design-intent layer through its CLI (no ESLint required).
            </p>
            <pre className="rounded-xl border border-gray-800 bg-gray-950 p-4 text-sm leading-relaxed text-gray-300 overflow-x-auto font-mono">
{`# package.json
"scripts": {
  "biome":  "biome check --write .",
  "design": "deslint scan \\"apps/**/*.{ts,tsx}\\"",
  "check":  "pnpm biome && pnpm design"
}

# CI
pnpm biome -- --no-write
pnpm design --format sarif --output deslint.sarif

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
              <Link href="/compare/deslint-vs-prettier" className="rounded-lg border border-gray-200 bg-white p-4 hover:border-primary/30 motion-safe:transition-colors">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">vs.</p>
                <p className="text-base font-semibold text-gray-900">Prettier</p>
                <p className="mt-1 text-sm text-gray-700">Formatting vs. design intent.</p>
              </Link>
              <Link href="/compare/deslint-vs-stylelint" className="rounded-lg border border-gray-200 bg-white p-4 hover:border-primary/30 motion-safe:transition-colors">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">vs.</p>
                <p className="text-base font-semibold text-gray-900">stylelint</p>
                <p className="mt-1 text-sm text-gray-700">Authored CSS vs. JSX surface.</p>
              </Link>
            </div>
          </section>
        </FadeIn>

        <FadeIn>
          <section className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary-50 via-white to-white p-8 mb-8">
            <h2 className="text-xl font-bold tracking-tight text-gray-900 mb-3">
              Add deslint alongside Biome
            </h2>
            <p className="text-base text-gray-700 leading-relaxed mb-5">
              Two minutes from{' '}
              <code className="text-xs text-primary bg-primary-50/60 px-1 rounded">npm install</code> to first design-lint
              report. The{' '}
              <Link href="/docs/getting-started" className="text-primary font-semibold hover:underline">getting-started guide</Link>{' '}
              walks through the CLI (the most natural fit alongside Biome),
              the ESLint plugin, and the MCP server.
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
