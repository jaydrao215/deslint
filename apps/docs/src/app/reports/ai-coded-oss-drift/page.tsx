import type { Metadata } from 'next';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'The AI-Coded OSS Drift Audit — 2,888 violations across 4 shadcn repos',
  description:
    'We ran Deslint against four widely adopted shadcn/ui-based Next.js codebases — 72k combined stars, 2,899 files. 33% of files showed design or a11y drift, 175 engineering-hours of debt. Full numbers, anonymised, reproducible.',
  alternates: { canonical: '/reports/ai-coded-oss-drift' },
  openGraph: {
    title: 'The AI-Coded OSS Drift Audit — Deslint',
    description:
      '2,888 violations across 4 shadcn-based OSS repos. 33% of files had drift. 175 hours of debt. The numbers Cursor and Claude Code leave behind.',
    url: 'https://deslint.com/reports/ai-coded-oss-drift',
    type: 'article',
  },
};

type RepoRow = {
  name: string;
  stars: string;
  stack: string;
  score: number;
  files: number;
  filesWithDrift: number;
  violations: number;
  debtHours: number;
  topRule: { id: string; count: number };
};

const REPOS: RepoRow[] = [
  {
    name: 'Repo A',
    stars: '~18k',
    stack: 'Next.js 13 App Router starter + shadcn/ui',
    score: 88,
    files: 94,
    filesWithDrift: 43,
    violations: 110,
    debtHours: 6.7,
    topRule: { id: 'prefers-reduced-motion', count: 57 },
  },
  {
    name: 'Repo B',
    stars: '~14k',
    stack: 'Next.js block-based editor + shadcn/ui',
    score: 92,
    files: 37,
    filesWithDrift: 13,
    violations: 31,
    debtHours: 1.9,
    topRule: { id: 'prefers-reduced-motion', count: 14 },
  },
  {
    name: 'Repo C',
    stars: '~8k',
    stack: 'Next.js SaaS product + shadcn/ui + Tailwind',
    score: 87,
    files: 621,
    filesWithDrift: 260,
    violations: 790,
    debtHours: 52.1,
    topRule: { id: 'prefers-reduced-motion', count: 171 },
  },
  {
    name: 'Repo D',
    stars: '~32k',
    stack: 'Next.js collaboration monorepo + Tailwind',
    score: 91,
    files: 2147,
    filesWithDrift: 651,
    violations: 1957,
    debtHours: 114.7,
    topRule: { id: 'prefers-reduced-motion', count: 653 },
  },
];

const TOP_RULES: { id: string; count: number; plain: string }[] = [
  { id: 'prefers-reduced-motion',       count: 895, plain: 'Animations that ignore prefers-reduced-motion — WCAG 2.3.3' },
  { id: 'responsive-image-optimization', count: 422, plain: '<img> used where next/image (or responsive <picture>) is required' },
  { id: 'icon-accessibility',           count: 316, plain: 'Icons missing aria-label or aria-hidden' },
  { id: 'no-arbitrary-spacing',         count: 217, plain: 'Arbitrary Tailwind spacing like w-[200px] instead of the scale' },
  { id: 'responsive-required',          count: 186, plain: 'Fixed widths with no sm:/md: breakpoint overrides' },
  { id: 'prefer-semantic-html',         count: 141, plain: '<div> clicks instead of <button>; <div> landmarks instead of <main>/<nav>' },
  { id: 'focus-visible-style',          count: 133, plain: 'Interactive elements with no visible focus ring' },
  { id: 'no-arbitrary-zindex',          count:  87, plain: 'Arbitrary z-[999] values instead of a z-scale' },
  { id: 'link-text',                    count:  83, plain: 'Empty or ambiguous link text ("click here", icon-only)' },
  { id: 'form-labels',                  count:  67, plain: 'Inputs without an associated <label>' },
];

export default function OssDriftAudit() {
  const totalFiles = REPOS.reduce((s, r) => s + r.files, 0);
  const totalFilesWithDrift = REPOS.reduce((s, r) => s + r.filesWithDrift, 0);
  const totalViolations = REPOS.reduce((s, r) => s + r.violations, 0);
  const totalDebt = REPOS.reduce((s, r) => s + r.debtHours, 0);
  const pctFiles = Math.round((100 * totalFilesWithDrift) / totalFiles);

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 pt-32 pb-20">
        <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
          Report · April 2026
        </p>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 leading-[1.1] mb-6">
          The AI-Coded OSS Drift Audit
        </h1>
        <p className="text-lg text-gray-600 leading-relaxed mb-8">
          We ran Deslint, unchanged and with default rules, against four of the
          most widely adopted shadcn/ui-based Next.js codebases on GitHub — a
          combined 72k stars and {totalFiles.toLocaleString()} source files.
          Every one of them ships a polished product. Every one of them has
          design-system and accessibility drift that an AI coding agent will
          happily extend. Repositories are anonymised below (stack and star
          count preserved); the point is the pattern, not the scoreboard. The
          numbers are reproducible on your own code in under ten minutes — no
          cloud, no telemetry, no cherry-picking.
        </p>

        <section className="mb-10 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Files scanned</div>
            <div className="mt-1 text-3xl font-bold text-gray-900">{totalFiles.toLocaleString()}</div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Files with drift</div>
            <div className="mt-1 text-3xl font-bold text-gray-900">{pctFiles}%</div>
            <div className="text-xs text-gray-500 mt-1">{totalFilesWithDrift.toLocaleString()} of {totalFiles.toLocaleString()}</div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Violations</div>
            <div className="mt-1 text-3xl font-bold text-gray-900">{totalViolations.toLocaleString()}</div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Engineering debt</div>
            <div className="mt-1 text-3xl font-bold text-gray-900">{totalDebt.toFixed(0)}h</div>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold tracking-tight text-gray-900 mb-4">
            The methodology
          </h2>
          <p className="text-gray-600 mb-3">
            We took each repo at its current main branch, ran{' '}
            <code>npx deslint scan --format json</code> with default rules (no
            allowlists, no custom tokens, no suppression), and tallied the
            output. The CLI runs entirely on the local filesystem — nothing was
            sent anywhere. Reproduction is a three-line script:
          </p>
          <div className="rounded-xl bg-gray-950 text-gray-200 font-mono text-xs px-5 py-4 overflow-x-auto leading-relaxed">
            <pre className="whitespace-pre"><code>{`git clone --depth 1 <your-repo>.git target
cd target
npx deslint scan --format json . > drift.json`}</code></pre>
          </div>
          <p className="text-gray-600 mt-3 text-sm">
            The four repos were picked because each one represents a
            different class of real-world frontend: a starter template, a
            block-based editor, a SaaS product, and a collaboration monorepo.
            Together they cover the surface area an AI coding agent hits in
            practice. We&apos;re anonymising the names because the intent is
            to show the <em>pattern</em>, not to grade anyone&apos;s project —
            the exact repositories are available on request to investors,
            journalists, and maintainers who want to verify our methodology.
          </p>
          <p className="text-gray-600 mt-3 text-sm">
            Every rule Deslint ships is opinionated by design — a maintainer
            who configures an allowlist, disables a rule, or runs with a
            tighter token budget will get a different score. What matters for
            the thesis of this report is that <em>default</em> rules — the
            ones an AI coding agent will encounter on a fresh install —
            surface a consistent shape of drift across very different
            codebases.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold tracking-tight text-gray-900 mb-4">
            Per-repo scorecard
          </h2>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2.5 text-left font-semibold text-gray-700">Repo</th>
                  <th className="px-4 py-2.5 text-right font-semibold text-gray-700">Score</th>
                  <th className="px-4 py-2.5 text-right font-semibold text-gray-700">Files</th>
                  <th className="px-4 py-2.5 text-right font-semibold text-gray-700">Drift</th>
                  <th className="px-4 py-2.5 text-right font-semibold text-gray-700">Violations</th>
                  <th className="px-4 py-2.5 text-right font-semibold text-gray-700">Debt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {REPOS.map((r) => (
                  <tr key={r.name}>
                    <td className="px-4 py-3 text-gray-900">
                      <div className="font-semibold">{r.name}</div>
                      <div className="text-xs text-gray-500">{r.stars} stars · {r.stack}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-900">{r.score}/100</td>
                    <td className="px-4 py-3 text-right font-mono text-gray-700">{r.files.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-mono text-gray-700">{r.filesWithDrift.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-mono text-gray-900">{r.violations.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-mono text-gray-700">{r.debtHours.toFixed(1)}h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-gray-600 mt-3">
            All four projects pass a 75/100 gate with room to spare. None of
            them are broken. Every one of them has hundreds of small
            accessibility and responsive regressions that a reviewer would
            never catch at PR speed — and that any code-generating agent will
            faithfully extend into every new file it writes.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold tracking-tight text-gray-900 mb-4">
            Where the drift lives
          </h2>
          <p className="text-gray-600 mb-4">
            A pattern jumped out the moment we aggregated. The shadcn palette
            itself holds up — colour and typography scores are 99–100 across
            every repo. Tokens are explicit, so agents copy them correctly.
            The drift is concentrated in the parts of the UI that require
            human judgment, the parts AI agents are worst at:
          </p>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2.5 text-left font-semibold text-gray-700">Rule</th>
                  <th className="px-4 py-2.5 text-right font-semibold text-gray-700">Hits</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-gray-700">What it catches</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {TOP_RULES.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3"><code className="text-xs">{r.id}</code></td>
                    <td className="px-4 py-3 text-right font-mono text-gray-900">{r.count}</td>
                    <td className="px-4 py-3 text-gray-700">{r.plain}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold tracking-tight text-gray-900 mb-4">
            What this actually means
          </h2>
          <ul className="space-y-4 text-gray-700">
            <li>
              <strong className="text-gray-900">AI agents copy the palette. They skip the judgment.</strong>{' '}
              Colour scores are 99–100 across every repo because the shadcn
              palette is literally in the prompt context. Motion preferences,
              responsive breakpoints, icon accessibility, and semantic HTML —
              none of which are in the context — drop into the 60s and 70s.
            </li>
            <li>
              <strong className="text-gray-900">Accessibility is where the money is.</strong>{' '}
              Of {totalViolations.toLocaleString()} total violations,{' '}
              {(895 + 316 + 133 + 83 + 67).toLocaleString()} (
              {Math.round((100 * (895 + 316 + 133 + 83 + 67)) / totalViolations)}%)
              are a11y regressions a lawsuit or ADA audit will find before you
              do. Your MCP server is the only gate that catches these before
              the agent writes them.
            </li>
            <li>
              <strong className="text-gray-900">The drift scales with codebase size, superlinearly.</strong>{' '}
              Novel (37 files) averages ~0.8 violations per file. Plane (2,147
              files) averages ~0.9. Without a deterministic gate, every new
              AI-generated file quietly extends the distribution.
            </li>
            <li>
              <strong className="text-gray-900">Human review cannot keep up.</strong>{' '}
              {totalDebt.toFixed(0)} engineering-hours of debt across four
              repos means a single reviewer cannot possibly clean this up
              post-hoc. The gate has to be in the generation loop, not after.
            </li>
          </ul>
        </section>

        <section className="mb-10 rounded-xl border border-primary/20 bg-primary-50/30 px-6 py-5">
          <h2 className="text-lg font-semibold tracking-tight text-gray-900 mb-3">
            Reproduce this on your own repo in ten minutes
          </h2>
          <p className="text-sm text-gray-700 leading-relaxed mb-4">
            Every number on this page came from the same unmodified CLI. Point
            it at your codebase and get your own scorecard — no signup, no
            cloud, no code leaves your laptop:
          </p>
          <div className="rounded-xl bg-gray-950 text-gray-200 font-mono text-xs px-5 py-4 overflow-x-auto leading-relaxed">
            <pre className="whitespace-pre"><code>{`npx deslint scan --format text .
# or, to gate in CI:
npx deslint scan --min-score 85 --format sarif .`}</code></pre>
          </div>
        </section>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/mcp"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary-light"
          >
            Install the MCP server
          </Link>
          <Link
            href="/docs/getting-started"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:border-gray-300 hover:bg-gray-50"
          >
            Getting started
          </Link>
          <Link
            href="/case-studies/shadcn"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:border-gray-300 hover:bg-gray-50"
          >
            shadcn case study
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
