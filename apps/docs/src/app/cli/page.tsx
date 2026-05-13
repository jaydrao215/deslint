import type { Metadata } from 'next';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { BreadcrumbJsonLd } from '@/components/BreadcrumbJsonLd';

export const metadata: Metadata = {
  title: 'Deslint CLI — Scan, Fix, and Attest AI-Generated Frontend Code',
  description:
    "Deslint ships a local CLI for AI-generated frontend code. Scan a repo, fix deterministic violations, import design tokens from Figma / Style Dictionary / Google Stitch, and emit a reproducible, Sigstore-signable attestation. Zero LLM in the hot path. Zero code leaves your machine.",
  alternates: { canonical: '/cli' },
  keywords: [
    'deslint cli',
    'design system linter cli',
    'tailwind arbitrary values cli',
    'wcag 2.2 cli report',
    'design health score cli',
    'reproducible attestation cli',
    'local first design linter',
  ],
  openGraph: {
    title: 'Deslint CLI — Scan, Fix, and Attest Locally',
    description:
      'Install with `npm install -D @deslint/cli`. Run `deslint scan` to see a Design Health Score + 34-rule report. Run `deslint fix` to apply every safe autofix. All local. No LLM. No egress.',
    url: 'https://deslint.com/cli',
    type: 'website',
  },
};

const COMMANDS = [
  {
    name: 'deslint scan',
    blurb: 'Scan a directory and report the Design Health Score, violations per category, and estimated design debt.',
    flags: ['--format json|sarif', '--min-score <0-100>', '--fail-on <level>', '--diff <ref>', '--budget <path>'],
  },
  {
    name: 'deslint fix',
    blurb: 'Apply every safe autofix across the workspace. Opinionated fixes are read-only — run interactively or opt in per rule.',
    flags: ['--interactive', '--dry-run', '--stage-only'],
  },
  {
    name: 'deslint init',
    blurb: 'Interactive wizard that seeds .deslintrc.json — auto-detects Tailwind v3/v4 tokens and the framework (React / Vue / Svelte / Angular / HTML).',
    flags: [],
  },
  {
    name: 'deslint import-tokens',
    blurb: 'Pull design tokens from a Figma file, a Style Dictionary JSON, or a Google Stitch / Material 3 export. Refuses to clobber existing files without --force.',
    flags: ['--figma <file-id>', '--style-dictionary <path>', '--stitch <path>', '--force'],
  },
  {
    name: 'deslint attest',
    blurb: 'Emit a reproducible .deslint/attestation.json for the current scan. Set DESLINT_ATTEST_SIGNER=sigstore to also write a signed Sigstore sidecar.',
    flags: ['--budget <path>'],
  },
  {
    name: 'deslint verify',
    blurb: 'Verify a .deslint/attestation.json against its Sigstore bundle. Exit 0 on a valid signature, non-zero on tamper. --signer-identity pins the acceptable cert SAN.',
    flags: ['--signer-identity <regex>', '--signer-issuer <url>', '--show-signer'],
  },
  {
    name: 'deslint trend',
    blurb: 'Show the Design Health Score trend over time from .deslint/history.json. Spot regressions and attribute them to commits.',
    flags: ['--since <ref>', '--format text|json'],
  },
  {
    name: 'deslint compliance',
    blurb: 'Generate a WCAG 2.2 conformance report (HTML or JSON) — maps each rule to the WCAG success criterion it enforces.',
    flags: ['--format html|json', '--output <path>'],
  },
  {
    name: 'deslint generate-config',
    blurb: 'Emit config files for AI tools (Cursor rules, CLAUDE.md, AGENTS.md, .windsurfrules) that tell your agent to call Deslint after UI edits.',
    flags: ['<target>'],
  },
  {
    name: 'deslint suggest-tokens',
    blurb: 'Group unfixable arbitrary values across the repo and emit a ready-to-paste `@theme` CSS block so you can upgrade the design system in one commit.',
    flags: [],
  },
];

const EXIT_CODES = [
  { code: '0', meaning: 'Clean scan — no violations of the configured severity or budget.' },
  { code: '1', meaning: 'Violations found. Default fires only on `error` severity; override with `--fail-on`.' },
  { code: '2', meaning: 'Usage error — bad flag, missing argument, or unreadable config.' },
];

export default function CliHubPage() {
  return (
    <>
      <Navbar />
      <BreadcrumbJsonLd trail={[{ name: 'CLI', path: '/cli' }]} />
      <main className="mx-auto max-w-4xl px-6 pt-32 pb-20">
        <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
          Command-line interface
        </p>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 leading-[1.1] mb-6">
          Deslint CLI — verify, fix, and attest from the terminal.
        </h1>
        <p className="text-lg text-gray-600 leading-relaxed mb-10 max-w-2xl">
          The CLI is the deterministic engine underneath every Deslint surface.
          It scans, fixes, and emits a Sigstore-ready attestation you can commit
          as a trailer. Use it standalone for pre-commit hooks and local
          development, or as the source of truth the MCP server and GitHub
          Action both delegate to.
        </p>

        {/* Install */}
        <section className="mb-14">
          <h2 className="text-2xl font-semibold tracking-tight text-gray-900 mb-4">
            Install
          </h2>
          <div className="rounded-xl bg-gray-950 text-gray-200 font-mono text-sm px-5 py-4 mb-4">
            <span className="text-gray-500 select-none">$ </span>
            <span className="text-pass">npm</span>{' '}
            <span className="text-white">install -D @deslint/cli</span>
          </div>
          <p className="text-sm text-gray-500">
            Also available via <code className="font-mono text-xs">pnpm add -D @deslint/cli</code>{' '}
            or <code className="font-mono text-xs">bun add -d @deslint/cli</code>. Requires Node 20.19+.
          </p>
        </section>

        {/* Quick scan */}
        <section className="mb-14">
          <h2 className="text-2xl font-semibold tracking-tight text-gray-900 mb-4">
            Scan in 5 seconds
          </h2>
          <p className="text-gray-600 mb-5">
            One command, one exit code, one Design Health Score. Run it from a
            pre-commit hook or CI step without any extra config — Deslint
            detects Tailwind, the framework, and the test surface on its own.
          </p>
          <div className="rounded-xl bg-gray-950 text-gray-200 font-mono text-sm leading-relaxed px-5 py-5 whitespace-pre overflow-x-auto">
{`$ npx deslint scan

  Deslint Design Health Report
  ────────────────────────────────────────────────────────

  Design Health Score: 95/100 (pass)

  Colors       ██████████████████░░  95  (3 violations)
  Spacing      ███████████████████░  97  (2 violations)
  Typography   ████████████████████ 100
  Responsive   █████████████████░░░  92  (5 violations)
  Consistency  ████████████████████ 100

  Files scanned: 247
  Files with issues: 8
  Total violations: `}<span className="text-warn">10 warnings</span>{`, `}<span className="text-pass">0 errors</span>{`
  Design debt: 42m estimated remediation effort

  See `}<span className="text-primary">https://deslint.com/docs/rules</span>{` for fixes.`}
          </div>
        </section>

        {/* Command surface */}
        <section className="mb-14">
          <h2 className="text-2xl font-semibold tracking-tight text-gray-900 mb-5">
            Every command
          </h2>
          <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
            {COMMANDS.map((c) => (
              <li key={c.name} className="px-5 py-4">
                <div className="flex items-baseline gap-3 mb-1.5 flex-wrap">
                  <code className="font-mono text-sm font-semibold text-primary">
                    {c.name}
                  </code>
                  {c.flags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {c.flags.map((f) => (
                        <span
                          key={f}
                          className="inline-flex items-center rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-mono text-gray-600"
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-600">{c.blurb}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Exit codes */}
        <section className="mb-14">
          <h2 className="text-2xl font-semibold tracking-tight text-gray-900 mb-4">
            Exit codes
          </h2>
          <p className="text-gray-600 mb-5">
            Deterministic exit codes so CI and pre-commit hooks can branch
            without parsing output.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full border border-gray-200 rounded-xl overflow-hidden text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left">
                  <th className="px-5 py-3 font-semibold text-gray-900 w-20">Exit</th>
                  <th className="px-5 py-3 font-semibold text-gray-900">Meaning</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {EXIT_CODES.map((e) => (
                  <tr key={e.code} className="bg-white">
                    <td className="px-5 py-3 font-mono font-semibold text-primary">
                      {e.code}
                    </td>
                    <td className="px-5 py-3 text-gray-700">{e.meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Local-first promise */}
        <section className="mb-14 rounded-xl border border-primary/20 bg-primary-50/40 px-6 py-6">
          <h2 className="text-xl font-semibold tracking-tight text-gray-900 mb-3">
            Why a local CLI — not a cloud service
          </h2>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>
              <strong>Every check is deterministic.</strong> The CLI runs
              ESLint rules — same input, same output, every run. No LLM
              inference in the evaluation path.
            </li>
            <li>
              <strong>Zero code egress.</strong> Scans read files from disk
              and write JSON/SARIF to stdout or a local path. No outbound
              network calls unless you explicitly opt in with{' '}
              <code className="font-mono text-xs">import-tokens --figma</code>.
            </li>
            <li>
              <strong>Sigstore-signable attestations.</strong> Run{' '}
              <code className="font-mono text-xs">deslint attest</code> to
              commit a reproducible score claim; the GitHub Action re-verifies
              it at merge time so a trailer can't lie.
            </li>
          </ul>
        </section>

        {/* CTA */}
        <div className="flex flex-wrap gap-3">
          <Link
            href="/docs/getting-started"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary-light motion-safe:transition-all"
          >
            Full getting-started guide
          </Link>
          <Link
            href="/docs/rules"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:border-gray-300 hover:bg-gray-50 motion-safe:transition-all"
          >
            All 57 rules
          </Link>
          <Link
            href="/mcp"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:border-gray-300 hover:bg-gray-50 motion-safe:transition-all"
          >
            MCP server instead
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
