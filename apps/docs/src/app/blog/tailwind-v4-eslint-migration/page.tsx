import type { Metadata } from 'next';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { FadeIn } from '@/components/motion';
import { BreadcrumbJsonLd } from '@/components/BreadcrumbJsonLd';

const PUBLISHED = '2026-04-19';
const UPDATED = '2026-04-19';
const READING_MINUTES = 10;

export const metadata: Metadata = {
  title: 'Tailwind v4 ESLint migration: a deterministic upgrade guide',
  description:
    'A working playbook for moving an ESLint setup from Tailwind v3 to v4 — what changes in the class generation, which lint rules go stale, and the deterministic checks that make the migration boring instead of risky.',
  alternates: { canonical: '/blog/tailwind-v4-eslint-migration' },
  keywords: [
    'tailwind v4',
    'tailwind v4 eslint',
    'tailwind v4 migration',
    'tailwind 4 lint',
    'eslint plugin tailwindcss v4',
    'tailwind v3 to v4',
    'oxide engine lint',
    'tailwind theme directive',
    'design system migration',
  ],
  openGraph: {
    title: 'Tailwind v4 ESLint migration: a deterministic upgrade guide',
    description:
      'What breaks in your ESLint setup when you move to Tailwind v4 — and the deterministic checks that turn the migration into a single PR.',
    url: 'https://deslint.com/blog/tailwind-v4-eslint-migration',
    type: 'article',
    publishedTime: PUBLISHED,
    modifiedTime: UPDATED,
    authors: ['Deslint'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tailwind v4 ESLint migration',
    description:
      'A deterministic playbook for migrating an ESLint setup from Tailwind v3 to v4.',
  },
};

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'BlogPosting',
  headline: 'Tailwind v4 ESLint migration: a deterministic upgrade guide',
  description:
    'A working playbook for moving an ESLint setup from Tailwind v3 to v4 — what changes, what breaks, and the deterministic checks that hold the line.',
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
    '@id': 'https://deslint.com/blog/tailwind-v4-eslint-migration',
  },
  keywords:
    'tailwind v4, tailwind v4 eslint, tailwind v4 migration, eslint-plugin-tailwindcss v4, oxide engine, design system migration',
};

export default function TailwindV4MigrationPost() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <BreadcrumbJsonLd
        trail={[
          { name: 'Blog', path: '/blog' },
          { name: 'Tailwind v4 ESLint migration', path: '/blog/tailwind-v4-eslint-migration' },
        ]}
      />
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 pt-32 pb-20">
        {/* Header */}
        <FadeIn className="mb-12">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
            Tooling · {READING_MINUTES} min read
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 leading-[1.08] mb-6">
            Tailwind v4 ESLint migration:{' '}
            <span className="text-primary">a deterministic upgrade guide</span>
          </h1>
          <p className="text-xl text-gray-600 leading-relaxed mb-8">
            What changes in the class generation, which lint rules go stale,
            and the deterministic checks that turn the migration into a single
            boring pull request.
          </p>
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <time dateTime={PUBLISHED}>April 19, 2026</time>
            <span aria-hidden="true">·</span>
            <span>{READING_MINUTES} min read</span>
            <span aria-hidden="true">·</span>
            <Link href="/docs/rules" className="text-primary hover:underline">
              Related rules
            </Link>
          </div>
        </FadeIn>

        <article className="space-y-12">
          <FadeIn>
            <p className="text-lg text-gray-700 leading-relaxed mb-6">
              Tailwind v4 is the largest change to the project since utilities
              were introduced. The Oxide engine rewrites the class scanner, the
              configuration model moves from <code className="text-primary bg-primary-50/60 px-1.5 py-0.5 rounded-md text-sm font-mono">tailwind.config.js</code>{' '}
              into CSS, and a small but real list of utilities renamed,
              consolidated, or were removed outright.
            </p>
            <p className="text-lg text-gray-700 leading-relaxed">
              For most teams the runtime upgrade is mechanical. The risky part
              is the layer of <em>tooling</em> that grew on top of v3 — the
              ESLint config, the editor plugins, the AI agents that write
              Tailwind from training data still anchored in v3 syntax. Those
              do not migrate themselves. This post is a punch-list for the
              parts that bite.
            </p>
          </FadeIn>

          {/* What changes */}
          <FadeIn>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 mb-5">
              What actually changes for the linter
            </h2>
            <p className="text-lg text-gray-700 leading-relaxed mb-5">
              Three categories of change matter for any tool that inspects
              Tailwind classes — your ESLint plugin, your editor, and any AI
              agent generating markup against your tokens.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-3">
              1. Configuration moves into CSS
            </h3>
            <p className="text-gray-700 leading-relaxed mb-3">
              v3 read its scale, theme, and plugin list from a JS module. v4
              reads from a CSS file via <code className="text-primary bg-primary-50/60 px-1.5 py-0.5 rounded-md text-sm font-mono">@theme</code>{' '}
              and friends:
            </p>
            <pre className="bg-gray-950 text-gray-100 rounded-xl border border-gray-800/50 p-4 overflow-x-auto text-sm font-mono mb-4">
              <code>{`/* app/styles.css — v4 */
@import "tailwindcss";

@theme {
  --color-brand-primary: #1A5276;
  --color-brand-primary-dark: #173F62;
  --spacing-18: 4.5rem;
  --font-display: "Satoshi", system-ui;
}`}</code>
            </pre>
            <p className="text-gray-700 leading-relaxed">
              Any linter that <em>read your token scale from{' '}
              <code className="text-primary bg-primary-50/60 px-1.5 py-0.5 rounded-md text-sm font-mono">tailwind.config.js</code></em> —
              including the older versions of <code className="text-primary bg-primary-50/60 px-1.5 py-0.5 rounded-md text-sm font-mono">eslint-plugin-tailwindcss</code>{' '}
              and most internal rule wrappers — now reads from a file that is
              empty. Your &quot;valid colours&quot; allowlist silently becomes
              the empty set, every class in your codebase becomes legal, and
              every off-token hex an agent generates becomes invisible.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-10 mb-3">
              2. A small set of utilities renamed
            </h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              v4 cleaned up some long-running inconsistencies. The shadow,
              blur, and rounded scales gained an <code className="text-primary bg-primary-50/60 px-1.5 py-0.5 rounded-md text-sm font-mono">-xs</code>{' '}
              tier; the old <code className="text-primary bg-primary-50/60 px-1.5 py-0.5 rounded-md text-sm font-mono">-sm</code> aliases
              shifted; opacity utilities like <code className="text-primary bg-primary-50/60 px-1.5 py-0.5 rounded-md text-sm font-mono">bg-opacity-50</code>{' '}
              are deprecated in favour of the slash syntax{' '}
              <code className="text-primary bg-primary-50/60 px-1.5 py-0.5 rounded-md text-sm font-mono">bg-black/50</code>.
            </p>
            <div className="rounded-2xl border border-gray-200 overflow-x-auto mb-4">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left font-semibold text-gray-900 px-4 py-3">v3</th>
                    <th className="text-left font-semibold text-gray-900 px-4 py-3">v4</th>
                    <th className="text-left font-semibold text-gray-900 px-4 py-3">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr><td className="px-4 py-3 font-mono text-xs text-gray-700">shadow-sm</td><td className="px-4 py-3 font-mono text-xs text-gray-700">shadow-xs</td><td className="px-4 py-3 text-xs text-gray-600">Old <code>shadow-sm</code> reassigned to a heavier value.</td></tr>
                  <tr><td className="px-4 py-3 font-mono text-xs text-gray-700">rounded-sm</td><td className="px-4 py-3 font-mono text-xs text-gray-700">rounded-xs</td><td className="px-4 py-3 text-xs text-gray-600">Same scale shift; existing <code>rounded-sm</code> usages render larger.</td></tr>
                  <tr><td className="px-4 py-3 font-mono text-xs text-gray-700">bg-opacity-50</td><td className="px-4 py-3 font-mono text-xs text-gray-700">bg-black/50</td><td className="px-4 py-3 text-xs text-gray-600">Slash syntax is the canonical form. The old <code>*-opacity-*</code> family still works in v4.0 but is deprecated.</td></tr>
                  <tr><td className="px-4 py-3 font-mono text-xs text-gray-700">flex-shrink-0</td><td className="px-4 py-3 font-mono text-xs text-gray-700">shrink-0</td><td className="px-4 py-3 text-xs text-gray-600">Aliases consolidated; both still emit but the canonical is shorter.</td></tr>
                  <tr><td className="px-4 py-3 font-mono text-xs text-gray-700">space-x-4 / space-y-4</td><td className="px-4 py-3 font-mono text-xs text-gray-700">gap-4 (preferred)</td><td className="px-4 py-3 text-xs text-gray-600">Still emitted, but flex/grid <code>gap</code> is the recommended pattern.</td></tr>
                </tbody>
              </table>
            </div>
            <p className="text-gray-700 leading-relaxed">
              These shifts are mostly safe at the runtime layer — but a stale
              ESLint rule that hard-codes the v3 names will either flag valid
              v4 code, or worse, miss the deprecated form entirely. AI coding
              agents trained primarily on v3 corpora produce them by default.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 mt-10 mb-3">
              3. The Oxide engine&apos;s scan surface
            </h3>
            <p className="text-gray-700 leading-relaxed">
              v4&apos;s class extraction is faster and stricter. Class strings
              built dynamically with template literals (<code className="text-primary bg-primary-50/60 px-1.5 py-0.5 rounded-md text-sm font-mono">{'`bg-${shade}`'}</code>)
              are no longer guaranteed to be discovered. v3 lint rules that
              relied on the same template-literal heuristic stop matching what
              the runtime actually compiles. The fix is the one Tailwind has
              recommended for years — only ever pass full class names as
              strings — but the migration window is when the divergence
              surfaces.
            </p>
          </FadeIn>

          {/* The migration in five steps */}
          <FadeIn>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 mb-5">
              The migration in five steps
            </h2>
            <p className="text-lg text-gray-700 leading-relaxed mb-6">
              Most projects can run the official codemod and ship the upgrade
              in one PR. The steps below assume an existing v3 setup with
              ESLint, Prettier, and at least one Tailwind plugin enabled.
            </p>

            <ol className="space-y-8 list-none pl-0">
              <li>
                <div className="flex items-baseline gap-3 mb-2">
                  <span className="text-xs font-mono font-semibold text-primary bg-primary-50 px-2 py-1 rounded">01</span>
                  <h3 className="text-xl font-semibold text-gray-900">
                    Run the codemod
                  </h3>
                </div>
                <pre className="bg-gray-950 text-gray-100 rounded-xl border border-gray-800/50 p-4 overflow-x-auto text-sm font-mono">
                  <code>{`npx @tailwindcss/upgrade@latest`}</code>
                </pre>
                <p className="text-gray-700 leading-relaxed mt-3">
                  This rewrites <code>tailwind.config.js</code> into a CSS{' '}
                  <code>@theme</code> block, swaps the renamed utilities in
                  your source files, and updates your dependencies. Read the
                  diff — do not blindly accept it. The codemod is conservative
                  with custom plugins.
                </p>
              </li>

              <li>
                <div className="flex items-baseline gap-3 mb-2">
                  <span className="text-xs font-mono font-semibold text-primary bg-primary-50 px-2 py-1 rounded">02</span>
                  <h3 className="text-xl font-semibold text-gray-900">
                    Replace the ESLint plugin
                  </h3>
                </div>
                <p className="text-gray-700 leading-relaxed mb-3">
                  <code>eslint-plugin-tailwindcss</code> through v3.x targets
                  the v3 class set. If you depended on its{' '}
                  <code>no-custom-classname</code> or{' '}
                  <code>classnames-order</code> rules, pin a v4-compatible
                  release or move to a tool that reads from CSS{' '}
                  <code>@theme</code> directly. Either way the install line
                  changes:
                </p>
                <pre className="bg-gray-950 text-gray-100 rounded-xl border border-gray-800/50 p-4 overflow-x-auto text-sm font-mono">
                  <code>{`# remove
pnpm remove eslint-plugin-tailwindcss

# install — pick one
pnpm add -D eslint-plugin-tailwindcss@next   # community v4 track
pnpm add -D @deslint/eslint-plugin           # reads tokens from @theme`}</code>
                </pre>
              </li>

              <li>
                <div className="flex items-baseline gap-3 mb-2">
                  <span className="text-xs font-mono font-semibold text-primary bg-primary-50 px-2 py-1 rounded">03</span>
                  <h3 className="text-xl font-semibold text-gray-900">
                    Re-import your tokens into the lint config
                  </h3>
                </div>
                <p className="text-gray-700 leading-relaxed mb-3">
                  This is the step most teams forget. The codemod migrates the
                  <em> runtime</em> token source to CSS, but your linter still
                  needs to know what is allowed. With deslint, regenerate the{' '}
                  <code>.deslintrc.json</code> from the new <code>@theme</code>{' '}
                  block:
                </p>
                <pre className="bg-gray-950 text-gray-100 rounded-xl border border-gray-800/50 p-4 overflow-x-auto text-sm font-mono">
                  <code>{`npx deslint import-tokens --tailwind-v4 ./app/styles.css --format deslintrc`}</code>
                </pre>
                <p className="text-gray-700 leading-relaxed mt-3">
                  The command parses every <code>--color-*</code>,{' '}
                  <code>--spacing-*</code>, <code>--font-*</code>, and{' '}
                  <code>--radius-*</code> custom property declared inside{' '}
                  <code>@theme</code>, and emits a deslintrc allowlist that
                  matches the runtime exactly. Now <code>no-arbitrary-colors</code>{' '}
                  knows your palette again.
                </p>
              </li>

              <li>
                <div className="flex items-baseline gap-3 mb-2">
                  <span className="text-xs font-mono font-semibold text-primary bg-primary-50 px-2 py-1 rounded">04</span>
                  <h3 className="text-xl font-semibold text-gray-900">
                    Sweep the renamed utilities
                  </h3>
                </div>
                <p className="text-gray-700 leading-relaxed mb-3">
                  The codemod handles the obvious cases. Anything generated
                  after the codemod ran — a stray PR opened against the v3
                  branch, an AI agent with v3 priors — will keep producing
                  <code> bg-opacity-*</code>, <code>shadow-sm</code> at the old
                  weight, and <code>flex-shrink-0</code>. A targeted lint
                  sweep catches them:
                </p>
                <pre className="bg-gray-950 text-gray-100 rounded-xl border border-gray-800/50 p-4 overflow-x-auto text-sm font-mono">
                  <code>{`# deslint flags v3 classes that drift back in
npx deslint scan --rules no-conflicting-classes,no-arbitrary-colors`}</code>
                </pre>
                <p className="text-gray-700 leading-relaxed mt-3">
                  The same <code>no-conflicting-classes</code> rule that
                  catches <code>flex hidden</code> also catches the v3/v4
                  cohabitation patterns — for example{' '}
                  <code>shadow-sm shadow-md</code> from a half-applied
                  rename.
                </p>
              </li>

              <li>
                <div className="flex items-baseline gap-3 mb-2">
                  <span className="text-xs font-mono font-semibold text-primary bg-primary-50 px-2 py-1 rounded">05</span>
                  <h3 className="text-xl font-semibold text-gray-900">
                    Lock the gate in CI
                  </h3>
                </div>
                <p className="text-gray-700 leading-relaxed mb-3">
                  The migration is only complete when v3 patterns can no
                  longer enter the codebase. Wire the deslint scan into your
                  PR check — it runs in seconds, has zero cloud dependency,
                  and the budget gate halts the merge if drift returns:
                </p>
                <pre className="bg-gray-950 text-gray-100 rounded-xl border border-gray-800/50 p-4 overflow-x-auto text-sm font-mono">
                  <code>{`# .github/workflows/lint.yml — relevant step
- name: Deslint
  run: npx @deslint/cli enforce-budget`}</code>
                </pre>
              </li>
            </ol>
          </FadeIn>

          {/* AI agents + v4 */}
          <FadeIn>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 mb-5">
              The bit nobody talks about: AI agents are still on v3
            </h2>
            <p className="text-lg text-gray-700 leading-relaxed mb-5">
              Most coding agents&apos; training corpora skew heavily toward v3
              Tailwind. That means even after your runtime is on v4, your{' '}
              <Link href="/mcp/claude-code" className="text-primary font-semibold hover:underline">Claude Code</Link>,{' '}
              <Link href="/mcp/cursor" className="text-primary font-semibold hover:underline">Cursor</Link>,{' '}
              <Link href="/mcp/codex" className="text-primary font-semibold hover:underline">Codex</Link>, and{' '}
              <Link href="/mcp/windsurf" className="text-primary font-semibold hover:underline">Windsurf</Link>{' '}
              sessions will keep generating v3-shaped class strings: the
              old <code>shadow-sm</code> weight, the deprecated{' '}
              <code>bg-opacity-*</code> family, the <code>tailwind.config.js</code>{' '}
              file you just deleted.
            </p>
            <p className="text-lg text-gray-700 leading-relaxed mb-5">
              The fix is the same fix you have for any context-poor
              generation: hand the agent a deterministic checker as a tool.
              When deslint runs as an MCP server, the agent calls{' '}
              <code>analyze_and_fix</code> before it commits — and the v3
              patterns get rewritten into their v4 equivalents the same way
              <code>no-arbitrary-colors</code> rewrites a hex into a token.
              No prompt engineering, no guessing.
            </p>

            <div className="rounded-2xl border border-gray-200 bg-gray-50/60 p-6">
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                What the agent sees on each call
              </p>
              <pre className="bg-white border border-gray-200 rounded-lg p-4 overflow-x-auto text-xs font-mono text-gray-800 leading-relaxed">
                <code>{`{
  "rule": "no-conflicting-classes",
  "file": "components/Card.tsx",
  "line": 14,
  "message": "shadow-sm shifted in Tailwind v4. Use shadow-xs for the old weight.",
  "fix": { "from": "shadow-sm", "to": "shadow-xs" }
}`}</code>
              </pre>
            </div>
          </FadeIn>

          {/* Closing CTA */}
          <FadeIn>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 mb-5">
              Three commands to verify the migration
            </h2>
            <pre className="bg-gray-950 text-gray-100 rounded-xl border border-gray-800/50 p-5 overflow-x-auto text-sm font-mono mb-8 leading-relaxed">
              <code>{`# 1. install the v4-aware lint set
pnpm add -D @deslint/eslint-plugin @deslint/cli

# 2. import tokens from your new @theme block
npx deslint import-tokens --tailwind-v4 ./app/styles.css --format deslintrc

# 3. measure
npx deslint coverage`}</code>
            </pre>

            <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary-50 via-white to-primary-50/30 p-6 sm:p-8">
              <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
                Want the v4 check inside the AI loop?
              </p>
              <p className="text-gray-700 leading-relaxed mb-5">
                The CLI tells you what drifted. The MCP server tells the agent
                before it writes. Same v4-aware rule set, single stdio
                subprocess, zero cloud.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/mcp/claude-code" className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary-light">
                  Claude Code setup
                </Link>
                <Link href="/mcp/cursor" className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:border-gray-300 hover:bg-gray-50">
                  Cursor setup
                </Link>
                <Link href="/docs/getting-started" className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:border-gray-300 hover:bg-gray-50">
                  Full getting started
                </Link>
              </div>
            </div>
          </FadeIn>

          {/* Related */}
          <FadeIn>
            <div className="border-t border-gray-200 pt-10">
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                Related reading
              </p>
              <ul className="space-y-3">
                <li>
                  <Link href="/blog/tailwind-arbitrary-values" className="group inline-flex items-center gap-2 text-primary hover:underline">
                    <span className="font-semibold">The hidden cost of Tailwind arbitrary values</span>
                    <span className="text-gray-500 text-sm">· three drift archetypes and how to lint them</span>
                  </Link>
                </li>
                <li>
                  <Link href="/blog/fix-design-drift-ai-generated-code" className="group inline-flex items-center gap-2 text-primary hover:underline">
                    <span className="font-semibold">How to fix design drift in AI-generated code</span>
                    <span className="text-gray-500 text-sm">· deterministic playbook — ESLint + MCP + CI</span>
                  </Link>
                </li>
                <li>
                  <Link href="/docs/rules/no-arbitrary-colors" className="group inline-flex items-center gap-2 text-primary hover:underline">
                    <span className="font-semibold">no-arbitrary-colors</span>
                    <span className="text-gray-500 text-sm">· the rule that flags hex outside your @theme</span>
                  </Link>
                </li>
                <li>
                  <Link href="/docs/rules/no-conflicting-classes" className="group inline-flex items-center gap-2 text-primary hover:underline">
                    <span className="font-semibold">no-conflicting-classes</span>
                    <span className="text-gray-500 text-sm">· catches v3/v4 utility cohabitation</span>
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
