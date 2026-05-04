import type { Metadata } from 'next';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { FadeIn } from '@/components/motion';
import { BreadcrumbJsonLd } from '@/components/BreadcrumbJsonLd';

const UPDATED = '2026-05-04';
const URL = 'https://deslint.com/compare/deslint-vs-eslint';

export const metadata: Metadata = {
  title: 'Deslint vs. ESLint: is this just another ESLint plugin? (2026)',
  description:
    'Deslint is built on top of ESLint, not a replacement for it. ESLint catches JavaScript bugs; Deslint catches design-system drift in JSX, Tailwind, and inline styles — the things ESLint core has no opinion on. Honest side-by-side for 2026 frontend teams.',
  alternates: { canonical: '/compare/deslint-vs-eslint' },
  keywords: [
    'deslint vs eslint',
    'eslint design system plugin',
    'tailwind eslint plugin',
    'jsx design lint',
    'eslint plugin for ai code',
    'eslint custom rules design tokens',
    'eslint plugin tailwind arbitrary values',
    'design lint eslint',
  ],
  openGraph: {
    title: 'Deslint vs. ESLint — is this just another ESLint plugin?',
    description:
      'Deslint is built on ESLint, not against it. ESLint catches JS bugs; Deslint catches design-system drift in JSX & Tailwind. Side-by-side on six honest questions.',
    url: URL,
    type: 'article',
    modifiedTime: UPDATED,
    images: [
      {
        url: '/compare/deslint-vs-eslint/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Deslint vs. ESLint — built on, not against. Honest side-by-side comparison.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Deslint vs. ESLint',
    description:
      'Built on ESLint, not against it. Honest side-by-side comparison for 2026 frontend teams.',
    images: ['/compare/deslint-vs-eslint/opengraph-image'],
  },
};

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Deslint vs. ESLint: is this just another ESLint plugin?',
  description:
    'Side-by-side comparison of deslint and ESLint across six real questions — JS bugs, JSX design drift, Tailwind arbitrary values, design tokens, AI-generated code, and CI integration.',
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

type Verdict = 'deslint' | 'eslint' | 'both' | 'neither';

function VerdictBadge({ v }: { v: Verdict }) {
  const map: Record<Verdict, { label: string; cls: string }> = {
    deslint: {
      label: 'Deslint',
      cls: 'bg-primary/10 text-primary border-primary/20',
    },
    eslint: {
      label: 'ESLint',
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

export default function DeslintVsEslint() {
  return (
    <>
      <Navbar />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <BreadcrumbJsonLd
        trail={[
          { name: 'Compare', path: '/compare/deslint-vs-eslint' },
          { name: 'Deslint vs. ESLint', path: '/compare/deslint-vs-eslint' },
        ]}
      />
      <main className="mx-auto max-w-3xl px-6 pt-32 pb-20">
        <FadeIn className="mb-10">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
            Comparison
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 leading-[1.08] mb-6">
            Deslint vs. ESLint:{' '}
            <span className="text-primary">built on it, not against it</span>
          </h1>
          <p className="text-xl text-gray-600 leading-relaxed">
            Deslint <em>is</em> an ESLint plugin (plus a CLI and an{' '}
            <Link href="/mcp" className="text-primary font-semibold hover:underline">MCP server</Link>) — it doesn&rsquo;t replace ESLint, it extends it.
            ESLint core catches JavaScript bugs and stylistic noise. Deslint
            catches what ESLint structurally can&rsquo;t see: design-system drift in
            JSX, Tailwind utility classes, and inline styles written by{' '}
            <Link href="/mcp/cursor" className="text-primary font-semibold hover:underline">Cursor</Link>,{' '}
            <Link href="/mcp/claude-code" className="text-primary font-semibold hover:underline">Claude Code</Link>, and other AI agents.
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
                    <td className="px-5 py-3 text-gray-700">Catches <code className="text-xs text-primary bg-primary-50/60 px-1 rounded">no-unused-vars</code>, <code className="text-xs text-primary bg-primary-50/60 px-1 rounded">no-undef</code>, framework hooks-rules</td>
                    <td className="px-5 py-3"><VerdictBadge v="eslint" /></td>
                  </tr>
                  <tr>
                    <td className="px-5 py-3 text-gray-700">Catches <code className="text-xs text-primary bg-primary-50/60 px-1 rounded">bg-[#1a5276]</code> and other arbitrary Tailwind values</td>
                    <td className="px-5 py-3"><VerdictBadge v="deslint" /></td>
                  </tr>
                  <tr>
                    <td className="px-5 py-3 text-gray-700">Enforces a typed design-token palette across <code className="text-xs text-primary bg-primary-50/60 px-1 rounded">className</code> and <code className="text-xs text-primary bg-primary-50/60 px-1 rounded">style</code></td>
                    <td className="px-5 py-3"><VerdictBadge v="deslint" /></td>
                  </tr>
                  <tr>
                    <td className="px-5 py-3 text-gray-700">Flags WCAG 2.2 issues (alt text, target size, focus visibility)</td>
                    <td className="px-5 py-3"><VerdictBadge v="deslint" /></td>
                  </tr>
                  <tr>
                    <td className="px-5 py-3 text-gray-700"><code className="text-xs text-primary bg-primary-50/60 px-1 rounded">target=&quot;_blank&quot;</code> safety, <code className="text-xs text-primary bg-primary-50/60 px-1 rounded">dangerouslySetInnerHTML</code> guard, <code className="text-xs text-primary bg-primary-50/60 px-1 rounded">&lt;iframe sandbox&gt;</code></td>
                    <td className="px-5 py-3"><VerdictBadge v="deslint" /></td>
                  </tr>
                  <tr>
                    <td className="px-5 py-3 text-gray-700">Reads <code className="text-xs text-primary bg-primary-50/60 px-1 rounded">.eslintrc</code>, integrates with editors and CI</td>
                    <td className="px-5 py-3"><VerdictBadge v="both" /></td>
                  </tr>
                  <tr>
                    <td className="px-5 py-3 text-gray-700">Plugs into Cursor / Claude Code / Windsurf via MCP</td>
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
                  ESLint (core)
                </p>
                <p className="text-base text-gray-700 leading-relaxed mb-3">
                  A pluggable JavaScript and TypeScript linter. ESLint core ships
                  rules around language correctness — undefined variables,
                  unreachable code, unused imports, hooks call rules (via{' '}
                  <code className="text-xs text-primary bg-primary-50/60 px-1 rounded">eslint-plugin-react-hooks</code>),
                  promise misuse. It is the foundation every modern JS project sits on.
                </p>
                <p className="text-base text-gray-700 leading-relaxed">
                  By itself, ESLint has no concept of a design token, a Tailwind
                  utility class, or whether a button is large enough for a finger.
                  Those questions live one layer above the JS AST.
                </p>
              </div>
              <div className="rounded-2xl border border-primary/30 bg-primary-50/30 p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">
                  Deslint
                </p>
                <p className="text-base text-gray-700 leading-relaxed mb-3">
                  An ESLint plugin (with a standalone CLI and{' '}
                  <Link href="/mcp" className="text-primary font-semibold hover:underline">MCP server</Link>) that adds
                  37 deterministic rules for the design-system surface — JSX{' '}
                  <code className="text-xs text-primary bg-primary-50/60 px-1 rounded">className</code>, inline{' '}
                  <code className="text-xs text-primary bg-primary-50/60 px-1 rounded">style</code> props,
                  Tailwind utilities, accessibility attributes, and frontend-safety
                  patterns AI agents routinely get wrong.
                </p>
                <p className="text-base text-gray-700 leading-relaxed">
                  Installs alongside ESLint, runs in the same{' '}
                  <code className="text-xs text-primary bg-primary-50/60 px-1 rounded">eslint .</code> command, shares the
                  same config surface. There is nothing to migrate.
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
                  <h3 className="text-lg font-semibold text-gray-900">Who catches a typo in a Tailwind class like <code className="text-sm text-primary bg-primary-50/60 px-1 rounded">bg-blu-500</code>?</h3>
                </div>
                <p className="text-base text-gray-700 leading-relaxed mb-3">
                  Neither, by default. ESLint sees <code className="text-xs text-primary bg-primary-50/60 px-1 rounded">className</code> as a string
                  and has no opinion. Deslint&rsquo;s built-ins focus on intent
                  (arbitrary values, raw hex, magic numbers) rather than typo
                  detection — that&rsquo;s the job of the official Tailwind IntelliSense
                  extension or the community{' '}
                  <code className="text-xs text-primary bg-primary-50/60 px-1 rounded">eslint-plugin-tailwindcss</code>.
                </p>
                <p className="text-base text-gray-700 leading-relaxed">
                  We don&rsquo;t try to compete with that plugin — we run alongside it.
                  Pair it with deslint and you have typo-catching <em>and</em>
                  design-token enforcement.
                </p>
                <p className="mt-2 text-sm text-gray-700"><strong className="text-gray-900">Verdict:</strong> neither alone — pair Tailwind IntelliSense or eslint-plugin-tailwindcss with deslint.</p>
              </article>

              <article>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs font-mono text-gray-700">02</span>
                  <h3 className="text-lg font-semibold text-gray-900">Who catches an arbitrary value like <code className="text-sm text-primary bg-primary-50/60 px-1 rounded">bg-[#1a5276]</code>?</h3>
                </div>
                <p className="text-base text-gray-700 leading-relaxed mb-3">
                  ESLint will not. The string is well-formed JavaScript and lints
                  cleanly under every core rule. Even most Tailwind-aware ESLint
                  plugins treat arbitrary values as valid because, technically,
                  they are.
                </p>
                <p className="text-base text-gray-700 leading-relaxed">
                  Deslint&rsquo;s <Link href="/docs/rules/no-arbitrary-colors" className="text-primary font-semibold hover:underline">no-arbitrary-colors</Link> rule
                  flags this at the JSX level, before Tailwind expands it. The
                  longer story is in{' '}
                  <Link href="/blog/tailwind-arbitrary-values" className="text-primary font-semibold hover:underline">the hidden cost of Tailwind arbitrary values</Link>.
                </p>
                <p className="mt-2 text-sm text-gray-700"><strong className="text-gray-900">Verdict:</strong> deslint.</p>
              </article>

              <article>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs font-mono text-gray-700">03</span>
                  <h3 className="text-lg font-semibold text-gray-900">Who flags <code className="text-sm text-primary bg-primary-50/60 px-1 rounded">&lt;img&gt;</code> with no <code className="text-sm text-primary bg-primary-50/60 px-1 rounded">alt</code> or a button smaller than 24×24?</h3>
                </div>
                <p className="text-base text-gray-700 leading-relaxed mb-3">
                  ESLint covers a slice of accessibility through{' '}
                  <code className="text-xs text-primary bg-primary-50/60 px-1 rounded">eslint-plugin-jsx-a11y</code>, which is
                  excellent for what it does — semantic role checks, label
                  associations, redundant ARIA. Touch-target size and focus-ring
                  presence are not in its scope.
                </p>
                <p className="text-base text-gray-700 leading-relaxed">
                  Deslint adds rules that map directly to WCAG 2.2 success
                  criteria —{' '}
                  <Link href="/docs/rules/touch-target-size" className="text-primary font-semibold hover:underline">touch-target-size</Link> (2.5.8),{' '}
                  <Link href="/docs/rules/focus-visible-style" className="text-primary font-semibold hover:underline">focus-visible-style</Link> (2.4.7),{' '}
                  <Link href="/docs/rules/image-alt-text" className="text-primary font-semibold hover:underline">image-alt-text</Link> (1.1.1),{' '}
                  <Link href="/docs/rules/link-text" className="text-primary font-semibold hover:underline">link-text</Link> (2.4.4) —
                  and is meant to coexist with jsx-a11y, not replace it.
                </p>
                <p className="mt-2 text-sm text-gray-700"><strong className="text-gray-900">Verdict:</strong> deslint, for the WCAG 2.2 surface. Run jsx-a11y too.</p>
              </article>

              <article>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs font-mono text-gray-700">04</span>
                  <h3 className="text-lg font-semibold text-gray-900">Who catches a raw hex inside <code className="text-sm text-primary bg-primary-50/60 px-1 rounded">style={'{'}{'{'} color: &apos;#fa0a3e&apos; {'}'}{'}'}</code>?</h3>
                </div>
                <p className="text-base text-gray-700 leading-relaxed mb-3">
                  ESLint sees a string property in an object literal — perfectly
                  valid JavaScript. No core or recommended community rule has an
                  opinion on whether the hex matches a design token.
                </p>
                <p className="text-base text-gray-700 leading-relaxed">
                  Deslint&rsquo;s{' '}
                  <Link href="/docs/rules/no-raw-hex" className="text-primary font-semibold hover:underline">no-raw-hex</Link> and{' '}
                  <Link href="/docs/rules/no-inline-styles" className="text-primary font-semibold hover:underline">no-inline-styles</Link> were
                  written specifically for this case. It&rsquo;s the single most
                  common drift pattern in AI-generated React code, and it&rsquo;s
                  invisible to the rest of the ESLint ecosystem.
                </p>
                <p className="mt-2 text-sm text-gray-700"><strong className="text-gray-900">Verdict:</strong> deslint.</p>
              </article>

              <article>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs font-mono text-gray-700">05</span>
                  <h3 className="text-lg font-semibold text-gray-900">Who runs inside the AI authoring loop, before the generation finalizes?</h3>
                </div>
                <p className="text-base text-gray-700 leading-relaxed mb-3">
                  ESLint runs after the code is on disk. Even with editor
                  integration, the lint feedback comes back to the agent as
                  diagnostics from the language server — useful, but reactive.
                </p>
                <p className="text-base text-gray-700 leading-relaxed">
                  Deslint ships an{' '}
                  <Link href="/mcp" className="text-primary font-semibold hover:underline">MCP server</Link> that exposes{' '}
                  <code className="text-xs text-primary bg-primary-50/60 px-1 rounded">analyze_project</code>,{' '}
                  <code className="text-xs text-primary bg-primary-50/60 px-1 rounded">enforce_budget</code>, and{' '}
                  <code className="text-xs text-primary bg-primary-50/60 px-1 rounded">compliance_check</code> as native tools the
                  agent can call. Cursor, Claude Code, Windsurf, and Codex all
                  pick it up automatically. Drift is caught during generation,
                  not after.
                </p>
                <p className="mt-2 text-sm text-gray-700"><strong className="text-gray-900">Verdict:</strong> deslint.</p>
              </article>

              <article>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs font-mono text-gray-700">06</span>
                  <h3 className="text-lg font-semibold text-gray-900">Who works with editors, CI, and SARIF code-scanning?</h3>
                </div>
                <p className="text-base text-gray-700 leading-relaxed mb-3">
                  Both, because deslint is an ESLint plugin. Anywhere ESLint
                  runs — VS Code, JetBrains, Vim, GitHub Actions, GitLab CI,
                  pre-commit hooks — deslint runs too. Plus deslint adds a
                  standalone{' '}
                  <Link href="/cli" className="text-primary font-semibold hover:underline">CLI</Link> and a{' '}
                  <Link href="/action" className="text-primary font-semibold hover:underline">GitHub Action</Link> with SARIF
                  output for code-scanning surfaces.
                </p>
                <p className="text-base text-gray-700 leading-relaxed">
                  There is no integration to migrate. Add the plugin, add the
                  rule entries to your config, run your existing{' '}
                  <code className="text-xs text-primary bg-primary-50/60 px-1 rounded">eslint .</code>.
                </p>
                <p className="mt-2 text-sm text-gray-700"><strong className="text-gray-900">Verdict:</strong> both — they&rsquo;re the same surface.</p>
              </article>
            </div>
          </section>
        </FadeIn>

        <FadeIn>
          <section className="mb-12">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-4">
              Wait — so this is just an ESLint plugin?
            </h2>
            <p className="text-base text-gray-700 leading-relaxed mb-4">
              The ESLint plugin is one of three surfaces. The same rule engine
              also ships as a standalone CLI (<code className="text-xs text-primary bg-primary-50/60 px-1 rounded">npx deslint scan</code>) for
              CI runs without an ESLint config, and as an MCP server for AI
              agents that author code outside the editor lint pass. The plugin
              is the entry point most teams adopt first.
            </p>
            <p className="text-base text-gray-700 leading-relaxed">
              Calling it &ldquo;just an ESLint plugin&rdquo; is roughly like calling{' '}
              <code className="text-xs text-primary bg-primary-50/60 px-1 rounded">eslint-plugin-react</code> just an
              ESLint plugin. True, and it misses the point — the value is the
              rule set, the categorization, the CLI scoring report, and the MCP
              integration, not the loader.
            </p>
          </section>
        </FadeIn>

        <FadeIn>
          <section className="mb-12">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-4">
              When to use which
            </h2>
            <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-1">Use ESLint alone if:</p>
                <p className="text-base text-gray-700 leading-relaxed">
                  Your project is mostly business logic without a UI, or your
                  UI is a thin wrapper around a fully-locked design-system
                  library and your team writes very little net-new JSX.
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-1">Add deslint if:</p>
                <p className="text-base text-gray-700 leading-relaxed">
                  You ship JSX/TSX product surface, you use Tailwind or inline
                  styles, you care about WCAG 2.2 conformance, or any
                  meaningful share of your code is generated by AI agents.
                  Deslint sits inside your existing ESLint config — it&rsquo;s a
                  plugin, not a parallel toolchain.
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-1">Don&rsquo;t replace ESLint with deslint:</p>
                <p className="text-base text-gray-700 leading-relaxed">
                  ESLint catches real JS bugs deslint deliberately doesn&rsquo;t. The
                  two are layered, not substitutable.
                </p>
              </div>
            </div>
          </section>
        </FadeIn>

        <FadeIn>
          <section className="mb-12">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-4">
              Adding deslint to an existing ESLint config
            </h2>
            <p className="text-base text-gray-700 leading-relaxed mb-4">
              Two lines. Drop the plugin into your{' '}
              <code className="text-xs text-primary bg-primary-50/60 px-1 rounded">.eslintrc</code> (or{' '}
              <code className="text-xs text-primary bg-primary-50/60 px-1 rounded">eslint.config.js</code>) and pick a preset.
              No new ignore patterns, no new parser, no separate command in CI.
            </p>
            <pre className="rounded-xl border border-gray-800 bg-gray-950 p-4 text-sm leading-relaxed text-gray-300 overflow-x-auto font-mono">
{`// eslint.config.js
import deslint from '@deslint/eslint-plugin';

export default [
  // ...your existing config
  deslint.configs.recommended,
];`}
            </pre>
            <p className="mt-4 text-base text-gray-700 leading-relaxed">
              Then your existing{' '}
              <code className="text-xs text-primary bg-primary-50/60 px-1 rounded">eslint .</code> command picks up the new
              rules. The full walkthrough lives in the{' '}
              <Link href="/docs/getting-started" className="text-primary font-semibold hover:underline">getting-started guide</Link>.
            </p>
          </section>
        </FadeIn>

        <FadeIn>
          <section className="mb-12">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-4">
              Other comparisons
            </h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <Link href="/compare/deslint-vs-stylelint" className="rounded-lg border border-gray-200 bg-white p-4 hover:border-primary/30 motion-safe:transition-colors">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">vs.</p>
                <p className="text-base font-semibold text-gray-900">stylelint</p>
                <p className="mt-1 text-sm text-gray-700">Authored CSS vs. JSX surface.</p>
              </Link>
              <Link href="/compare/deslint-vs-prettier" className="rounded-lg border border-gray-200 bg-white p-4 hover:border-primary/30 motion-safe:transition-colors">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">vs.</p>
                <p className="text-base font-semibold text-gray-900">Prettier</p>
                <p className="mt-1 text-sm text-gray-700">Formatting vs. design-system intent.</p>
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
              Add deslint to your existing ESLint setup
            </h2>
            <p className="text-base text-gray-700 leading-relaxed mb-5">
              Two minutes from <code className="text-xs text-primary bg-primary-50/60 px-1 rounded">npm install</code> to first
              report. The{' '}
              <Link href="/docs/getting-started" className="text-primary font-semibold hover:underline">getting-started guide</Link>{' '}
              walks through the plugin, the CLI, and the MCP server — none of
              which require a cloud account.
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
