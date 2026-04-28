import type { Metadata } from 'next';
import Link from 'next/link';
import {
  GitPullRequest,
  ShieldCheck,
  Users,
  Palette,
  Wand2,
  GaugeCircle,
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { BreadcrumbJsonLd } from '@/components/BreadcrumbJsonLd';

export const metadata: Metadata = {
  title: 'Deslint GitHub Action — Design Quality Gate on Every Pull Request',
  description:
    "The Deslint GitHub Action posts an inline review on every pull request: Design Health Score, one-click PR suggestions for provably safe autofixes, Sigstore attestation verification, per-agent scorecard that attributes violations to Claude / Cursor / Codex / Copilot / Windsurf / humans, and a design-token drift diff between base and head.",
  alternates: { canonical: '/action' },
  keywords: [
    'deslint github action',
    'design quality pr gate',
    'design system linter github action',
    'wcag 2.2 github action',
    'sigstore attestation pr',
    'ai code pr review',
    'design token drift pr',
  ],
  openGraph: {
    title: 'Deslint GitHub Action — The Merge Gate for AI-Generated Code',
    description:
      'Design Health Score, one-click PR suggestions, Sigstore verification, agent scorecard, token drift — every pull request gets reviewed by the same deterministic engine your agent already calls locally.',
    url: 'https://deslint.com/action',
    type: 'website',
  },
};

const FEATURES = [
  {
    icon: GaugeCircle,
    title: 'Design Health Score on every PR',
    body: "A pass/warn/fail banner at the top of the PR comment — reviewers see the score, design debt estimate, and a sorted top-violations table before they open the diff. Configurable `min-score` input fails the check when the score drops below a floor.",
  },
  {
    icon: Wand2,
    title: 'One-click PR suggestions for safe fixes',
    body: "Autofixes that are provably visually lossless — e.g. swapping `bg-[#1A5276]` for `bg-primary` when the token resolves to the same hex, or wrapping a `transition-all` with `motion-safe:` — render as GitHub `suggestion` blocks. A reviewer commits the change with one click. Heuristic fixes render as read-only code blocks with a `deslint fix` nudge, so no pixel change ever ships without a human seeing it.",
  },
  {
    icon: ShieldCheck,
    title: 'Sigstore attestation verification',
    body: "When the PR author ran `deslint attest` and committed the sidecar, the Action re-verifies the `.deslint/attestation.json` bundle against Sigstore — matching signer identity, issuer, and the trailer's reproducible claim against a fresh scan of the HEAD ref. Pin an acceptable signer with `signer-identity` / `signer-issuer`.",
  },
  {
    icon: Users,
    title: 'Per-agent scorecard',
    body: "`git blame` attributes each inline violation to the agent that authored the offending line — Claude, Cursor, Codex, Copilot, Windsurf, or a human contributor — and renders a sorted table in the PR comment. Only commits belonging to the PR count; violations the PR merely touched are excluded so humans aren't punished for inherited debt.",
  },
  {
    icon: Palette,
    title: 'Design-token drift diff',
    body: "Compares `designSystem` tokens between the PR base and head. A silent `colors.primary` rename — \"#1A5276\" → \"#2C3E50\" — ripples through every consumer with no visible diff; the Action surfaces it as a side-by-side markdown table so a reviewer can't miss it.",
  },
  {
    icon: GitPullRequest,
    title: 'Inline review comments',
    body: "Every violation becomes a review comment anchored at the exact line and column. Up to `max-inline-comments` per PR (default 25) so a large refactor doesn't drown the review.",
  },
];

const WORKFLOW_YAML = `name: Deslint Design Review
on:
  pull_request:
    branches: [main]
jobs:
  deslint:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0            # blame + token-drift need full history
      - uses: jaydrao215/deslint/action@main
        with:
          github-token: \${{ secrets.GITHUB_TOKEN }}
          min-score: 80             # fail when score drops below floor
          suggest-fixes: 'true'     # one-click PR suggestions
          agent-scorecard: 'true'   # blame-based attribution
          token-drift: 'true'       # designSystem diff
          strict-trailer: 'false'   # set true to fail on trailer mismatch
          require-signed: 'false'   # set true to gate on Sigstore signature`;

const INPUTS = [
  { name: 'github-token', default: '—', meaning: 'GITHUB_TOKEN (or a PAT). Required to post PR comments.' },
  { name: 'min-score', default: '0', meaning: 'Fail the check when the Design Health Score drops below this value.' },
  { name: 'fail-on', default: 'error', meaning: 'Which severity triggers an exit-1. One of: error / warning / any / never.' },
  { name: 'inline-review', default: 'true', meaning: 'Post per-violation review comments anchored to line+column.' },
  { name: 'suggest-fixes', default: 'true', meaning: 'Render provably safe autofixes as GitHub suggestion blocks.' },
  { name: 'max-inline-comments', default: '25', meaning: 'Cap on review comments per PR so large refactors stay readable.' },
  { name: 'strict-trailer', default: 'false', meaning: "When true, a lying or missing `Deslint-Compliance` trailer fails the job." },
  { name: 'require-signed', default: 'false', meaning: 'When true, an unsigned or tampered attestation fails the job.' },
  { name: 'signer-identity', default: '—', meaning: 'Regex matching the Sigstore cert SAN that signed the attestation.' },
  { name: 'signer-issuer', default: '—', meaning: 'Expected OIDC issuer (exact match) for the Sigstore bundle.' },
  { name: 'agent-scorecard', default: 'true', meaning: 'Attribute violations to authoring agents via `git blame`.' },
  { name: 'token-drift', default: 'true', meaning: 'Diff `designSystem` tokens between base and head refs.' },
  { name: 'config-path', default: '.deslintrc.json', meaning: 'Alternative config path if the rcfile lives outside the repo root.' },
  { name: 'working-directory', default: '.', meaning: 'Subdirectory to scan — useful for monorepos.' },
  { name: 'file-patterns', default: '—', meaning: 'Comma-separated glob filter for which files to scan.' },
];

export default function ActionHubPage() {
  return (
    <>
      <Navbar />
      <BreadcrumbJsonLd trail={[{ name: 'GitHub Action', path: '/action' }]} />
      <main className="mx-auto max-w-4xl px-6 pt-32 pb-20">
        <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
          GitHub Action
        </p>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 leading-[1.1] mb-6">
          Deslint GitHub Action — the merge gate for AI-generated code.
        </h1>
        <p className="text-lg text-gray-600 leading-relaxed mb-10 max-w-2xl">
          Every pull request gets a Design Health Score, inline violation
          review, one-click suggestions for provably safe fixes, and a
          Sigstore-verified attestation that the trailer hasn&apos;t lied.
          Same deterministic engine your agent already calls locally — re-run
          at the merge gate so nothing slips through between commit and
          review.
        </p>

        {/* Workflow YAML */}
        <section className="mb-14">
          <h2 className="text-2xl font-semibold tracking-tight text-gray-900 mb-4">
            Drop into <code className="font-mono text-[0.9em]">.github/workflows/deslint.yml</code>
          </h2>
          <p className="text-gray-600 mb-5">
            The Action posts a PR comment and — when configured — fails the
            check. No servers, no API keys beyond the built-in{' '}
            <code className="font-mono text-sm">GITHUB_TOKEN</code>, no code
            egress.
          </p>
          <div className="rounded-xl bg-gray-950 text-gray-200 font-mono text-xs leading-relaxed px-5 py-5 whitespace-pre overflow-x-auto">
            {WORKFLOW_YAML}
          </div>
        </section>

        {/* Features */}
        <section className="mb-14">
          <h2 className="text-2xl font-semibold tracking-tight text-gray-900 mb-5">
            What lands in the PR
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-gray-200 bg-white p-5"
              >
                <div className="mb-3 flex items-center gap-2.5">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-primary/20 bg-primary-50/60 text-primary">
                    <f.icon className="h-4 w-4" />
                  </span>
                  <h3 className="text-sm font-semibold text-gray-900">
                    {f.title}
                  </h3>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {f.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Inputs reference */}
        <section className="mb-14">
          <h2 className="text-2xl font-semibold tracking-tight text-gray-900 mb-4">
            Every input
          </h2>
          <p className="text-gray-600 mb-5">
            Defaults are chosen so a plain{' '}
            <code className="font-mono text-sm">uses: jaydrao215/deslint/action@main</code>{' '}
            posts a useful PR comment without any tuning. Override any input
            when you want stricter gating.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full border border-gray-200 rounded-xl overflow-hidden text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left">
                  <th className="px-4 py-3 font-semibold text-gray-900">Input</th>
                  <th className="px-4 py-3 font-semibold text-gray-900 w-28">Default</th>
                  <th className="px-4 py-3 font-semibold text-gray-900">Meaning</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {INPUTS.map((i) => (
                  <tr key={i.name} className="bg-white">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-primary whitespace-nowrap">
                      {i.name}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500 whitespace-nowrap">
                      {i.default}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{i.meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Local-first promise */}
        <section className="mb-14 rounded-xl border border-primary/20 bg-primary-50/40 px-6 py-6">
          <h2 className="text-xl font-semibold tracking-tight text-gray-900 mb-3">
            Why verify at the merge gate
          </h2>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>
              <strong>The trailer can lie.</strong>{' '}
              <code className="font-mono text-xs">deslint attest</code> writes
              a claim into the commit trailer; the Action re-runs the scan
              against the head ref and fails when the committed claim doesn&apos;t
              match the real score. Works for both AI-authored and
              human-authored diffs.
            </li>
            <li>
              <strong>Visible reviewer surface.</strong> Inline review comments
              sit on the lines they&apos;re about. One-click suggestions let a
              reviewer commit a fix without switching context.
            </li>
            <li>
              <strong>Runs on GitHub-hosted runners.</strong> No API keys
              beyond the default{' '}
              <code className="font-mono text-xs">GITHUB_TOKEN</code>, no
              third-party services to authorize. Safe inside enterprise
              firewalls.
            </li>
          </ul>
        </section>

        {/* CTA */}
        <div className="flex flex-wrap gap-3">
          <Link
            href="/docs/getting-started#step-6-github-action"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary-light motion-safe:transition-all"
          >
            Full workflow setup guide
          </Link>
          <Link
            href="/cli"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:border-gray-300 hover:bg-gray-50 motion-safe:transition-all"
          >
            Run the same checks locally (CLI)
          </Link>
          <Link
            href="/mcp"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:border-gray-300 hover:bg-gray-50 motion-safe:transition-all"
          >
            MCP server for pre-PR checks
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
