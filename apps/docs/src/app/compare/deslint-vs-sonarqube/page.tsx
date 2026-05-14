import type { Metadata } from 'next';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { FadeIn } from '@/components/motion';
import { BreadcrumbJsonLd } from '@/components/BreadcrumbJsonLd';

const UPDATED = '2026-05-14';

export const metadata: Metadata = {
  title: 'Deslint vs. SonarQube: the honest comparison (2026)',
  description:
    'SonarQube is the enterprise-grade code-quality platform that runs server-side after commit, across 40+ languages. Deslint is a deterministic verification layer that runs inside the agent loop on the developer machine, before files are written. Different scopes, both useful — most regulated teams will end up running both.',
  alternates: { canonical: '/compare/deslint-vs-sonarqube' },
  keywords: [
    'deslint vs sonarqube',
    'sonarqube alternative',
    'ai code quality',
    'shift-left linter',
    'mcp lint',
    'pre-write verification',
    'sast for ai code',
  ],
  openGraph: {
    title: 'Deslint vs. SonarQube — Agent-Loop Verifier vs. Server Quality Platform',
    description:
      'SonarQube is the enterprise quality platform. Deslint is the agent-loop verifier. Different scopes — the two complement rather than compete. Honest side-by-side for 2026 teams.',
    url: 'https://deslint.com/compare/deslint-vs-sonarqube',
    type: 'article',
    modifiedTime: UPDATED,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Deslint vs. SonarQube',
    description:
      'Agent-loop verifier vs. enterprise quality platform. Honest 2026 comparison.',
  },
};

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Deslint vs. SonarQube: the honest comparison',
  description:
    'Side-by-side comparison of SonarQube (enterprise server-side quality platform) and Deslint (deterministic agent-loop verifier) across seven dimensions — where each fires, language coverage, AI-coding posture, latency, deployment model, and how they coexist.',
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
    '@id': 'https://deslint.com/compare/deslint-vs-sonarqube',
  },
};

type Verdict = 'deslint' | 'sonarqube' | 'both' | 'neither';

function VerdictBadge({ v }: { v: Verdict }) {
  const map: Record<Verdict, { label: string; cls: string }> = {
    deslint: {
      label: 'Deslint',
      cls: 'bg-primary/10 text-primary border-primary/20',
    },
    sonarqube: {
      label: 'SonarQube',
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
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold uppercase tracking-wider ${cls}`}
    >
      {label}
    </span>
  );
}

export default function DeslintVsSonarqube() {
  return (
    <>
      <Navbar />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <BreadcrumbJsonLd
        trail={[
          { name: 'Compare', path: '/compare/deslint-vs-sonarqube' },
          { name: 'Deslint vs. SonarQube', path: '/compare/deslint-vs-sonarqube' },
        ]}
      />
      <main className="mx-auto max-w-3xl px-6 pt-32 pb-20">
        <FadeIn className="mb-10">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
            Comparison
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 leading-[1.08] mb-6">
            Deslint vs. SonarQube:{' '}
            <span className="gradient-text-hero">the honest comparison.</span>
          </h1>
          <p className="text-lg text-gray-600 leading-relaxed">
            SonarQube and Deslint sit at different points in the pipeline.
            SonarQube is the enterprise-grade quality platform that runs
            server-side after commit, covering 40+ languages with SAST, taint
            analysis, SCA, and secrets detection. Deslint is a deterministic
            verification layer that runs inside the agent loop on the
            developer&rsquo;s machine, before files are written and before
            shell commands execute. Different scopes, both useful — most
            regulated teams will end up running both.
          </p>
          <p className="mt-4 text-sm text-gray-500">
            Last updated{' '}
            {new Date(UPDATED).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.
            Written by the deslint team. We&rsquo;re trying to be honest, not
            to sell.
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
                    <td className="px-5 py-3 text-gray-700">Where does it fire — agent loop or server?</td>
                    <td className="px-5 py-3"><VerdictBadge v="deslint" /></td>
                  </tr>
                  <tr>
                    <td className="px-5 py-3 text-gray-700">Multi-language SAST across the whole org (Java, C#, Python, Go, &hellip;)</td>
                    <td className="px-5 py-3"><VerdictBadge v="sonarqube" /></td>
                  </tr>
                  <tr>
                    <td className="px-5 py-3 text-gray-700">Design-system / Tailwind / WCAG enforcement in JSX</td>
                    <td className="px-5 py-3"><VerdictBadge v="deslint" /></td>
                  </tr>
                  <tr>
                    <td className="px-5 py-3 text-gray-700">MCP server callable from Cursor / Claude Code</td>
                    <td className="px-5 py-3"><VerdictBadge v="deslint" /></td>
                  </tr>
                  <tr>
                    <td className="px-5 py-3 text-gray-700">Pre-execution gate for shell commands the agent proposes</td>
                    <td className="px-5 py-3"><VerdictBadge v="deslint" /></td>
                  </tr>
                  <tr>
                    <td className="px-5 py-3 text-gray-700">Mature enterprise dashboard + portfolio reporting</td>
                    <td className="px-5 py-3"><VerdictBadge v="sonarqube" /></td>
                  </tr>
                  <tr>
                    <td className="px-5 py-3 text-gray-700">Local-first, runs without a server</td>
                    <td className="px-5 py-3"><VerdictBadge v="deslint" /></td>
                  </tr>
                  <tr>
                    <td className="px-5 py-3 text-gray-700">CI / merge-gate integration</td>
                    <td className="px-5 py-3"><VerdictBadge v="both" /></td>
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
                  SonarQube
                </p>
                <p className="text-base text-gray-700 leading-relaxed mb-3">
                  An enterprise code-quality platform. Engineers commit code,
                  CI pushes the scan to a SonarQube server (or SonarQube
                  Cloud), and the platform reports issues across SAST, taint
                  analysis, secrets detection, IaC scanning, and SCA. Covers
                  40+ languages — Java, C#, Python, Go, TypeScript, C++,
                  Kotlin, Terraform, Kubernetes — and ships portfolio
                  dashboards, customisable quality gates, and compliance
                  exports.
                </p>
                <p className="text-base text-gray-700 leading-relaxed">
                  If you run a 500-engineer org across multiple languages and
                  you want a single quality-and-security platform with a
                  dashboard the CISO can read, SonarQube is mature, deeply
                  capable, and widely adopted. Trusted by Mercedes-Benz,
                  Adobe, NASA, and Santander (their own social proof).
                </p>
              </div>
              <div className="rounded-2xl border border-primary/30 bg-primary-50/30 p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">
                  Deslint
                </p>
                <p className="text-base text-gray-700 leading-relaxed mb-3">
                  A deterministic verification layer for AI-generated code.
                  Runs inside the agent loop via{' '}
                  <Link href="/mcp" className="text-primary font-semibold hover:underline">
                    MCP
                  </Link>{' '}
                  — your AI calls{' '}
                  <code className="text-xs text-primary bg-primary-50/60 px-1 rounded">
                    verify_before_write
                  </code>{' '}
                  before writing a file and{' '}
                  <code className="text-xs text-primary bg-primary-50/60 px-1 rounded">
                    verify_shell_exec
                  </code>{' '}
                  before running a command. 62 rules across design tokens, WCAG,
                  backend safety, Next.js boundaries, and AI-coding
                  antipatterns. Sub-1 ms warm verdict. Local. Zero LLM in the
                  hot path.
                </p>
                <p className="text-base text-gray-700 leading-relaxed">
                  Its scope is narrower than SonarQube&rsquo;s by design.
                  Deslint is not trying to be your SAST platform — it&rsquo;s
                  the structural gate the agent loop calls thousands of times
                  per session, and the deterministic check that runs the
                  moment the AI proposes a change.
                </p>
              </div>
            </div>
          </section>
        </FadeIn>

        <FadeIn>
          <section className="mb-12">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-6">
              Seven real questions, answered honestly
            </h2>

            <div className="space-y-8">
              <article>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs font-mono text-gray-400">01</span>
                  <h3 className="text-lg font-semibold text-gray-900">Where in the pipeline does each fire?</h3>
                </div>
                <p className="text-base text-gray-700 leading-relaxed mb-3">
                  SonarQube fires post-commit, server-side. The developer
                  commits, CI runs the scan, the server reports back. By the
                  time SonarQube weighs in, the code has been written and
                  shared. Useful as the org-wide quality dashboard; slow for
                  the AI authoring loop.
                </p>
                <p className="text-base text-gray-700 leading-relaxed">
                  Deslint fires inside the agent loop, on the developer&rsquo;s
                  machine, before the file is written. Sub-1 ms warm. The fix
                  happens before the file lands on disk.
                </p>
                <p className="mt-2 text-sm text-gray-500"><strong className="text-gray-700">Verdict:</strong> Different pipeline stages. Both useful at their respective layers.</p>
              </article>

              <article>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs font-mono text-gray-400">02</span>
                  <h3 className="text-lg font-semibold text-gray-900">How many languages does each cover?</h3>
                </div>
                <p className="text-base text-gray-700 leading-relaxed mb-3">
                  SonarQube covers 40+ languages and IaC technologies — Java,
                  C#, Python, Go, Rust, C++, TypeScript, Kotlin, Swift, PHP,
                  Ruby, Terraform, Kubernetes, and on. If your org has a Java
                  backend, a Go data pipeline, and a Python ML team,
                  SonarQube&rsquo;s breadth is structurally unmatched.
                </p>
                <p className="text-base text-gray-700 leading-relaxed">
                  Deslint covers TypeScript/JavaScript today, across six
                  parsers (React JSX, Vue, Svelte, Angular, Astro, HTML). The{' '}
                  <Link href="/" className="text-primary font-semibold hover:underline">
                    2027 roadmap
                  </Link>{' '}
                  ships Python next, then Go. We&rsquo;re narrower on purpose
                  — every language adds an integration burden that doesn&rsquo;t
                  serve our agent-loop thesis.
                </p>
                <p className="mt-2 text-sm text-gray-500"><strong className="text-gray-700">Verdict:</strong> SonarQube, conclusively, for multi-language SAST.</p>
              </article>

              <article>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs font-mono text-gray-400">03</span>
                  <h3 className="text-lg font-semibold text-gray-900">Who catches Tailwind / WCAG / design-token drift in JSX?</h3>
                </div>
                <p className="text-base text-gray-700 leading-relaxed mb-3">
                  Deslint, decisively. Our 62 rules include arbitrary Tailwind
                  values (<code className="text-xs text-primary bg-primary-50/60 px-1 rounded">bg-[#1a5276]</code>),
                  off-scale spacing, dark-mode parity, WCAG 2.2 AA contrast,
                  responsive integrity, and design-token enforcement against
                  your Tailwind config. This is the AI-generated-frontend
                  category SonarQube&rsquo;s rule packs structurally
                  don&rsquo;t cover.
                </p>
                <p className="text-base text-gray-700 leading-relaxed">
                  SonarQube has solid TypeScript rules for code quality and
                  bug detection but no concept of &ldquo;this className violated
                  the design system&rdquo; or &ldquo;this contrast ratio fails
                  the WCAG 1.4.3 criterion.&rdquo; Different scope.
                </p>
                <p className="mt-2 text-sm text-gray-500"><strong className="text-gray-700">Verdict:</strong> Deslint. SonarQube does not compete here.</p>
              </article>

              <article>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs font-mono text-gray-400">04</span>
                  <h3 className="text-lg font-semibold text-gray-900">Who works inside Cursor / Claude Code / Codex / Windsurf?</h3>
                </div>
                <p className="text-base text-gray-700 leading-relaxed mb-3">
                  Deslint ships an{' '}
                  <Link href="/mcp" className="text-primary font-semibold hover:underline">
                    MCP server
                  </Link>{' '}
                  with 12 tools the agent calls during authoring — including{' '}
                  <code className="text-xs text-primary bg-primary-50/60 px-1 rounded">
                    verify_before_write
                  </code>{' '}
                  (pre-write gate) and{' '}
                  <code className="text-xs text-primary bg-primary-50/60 px-1 rounded">
                    verify_shell_exec
                  </code>{' '}
                  (pre-execute gate, the{' '}
                  <Link href="/firewall" className="text-primary font-semibold hover:underline">
                    Agent Action Firewall
                  </Link>). Sub-1 ms warm verdict. The agent corrects its own
                  output before the file is written.
                </p>
                <p className="text-base text-gray-700 leading-relaxed">
                  SonarQube has no MCP surface and isn&rsquo;t structurally
                  positioned for the agent loop — it&rsquo;s a server. You
                  can&rsquo;t put a SonarQube call on every AI-generated
                  edit; the latency and deployment model don&rsquo;t fit.
                </p>
                <p className="mt-2 text-sm text-gray-500"><strong className="text-gray-700">Verdict:</strong> Deslint. SonarQube is the wrong layer for this.</p>
              </article>

              <article>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs font-mono text-gray-400">05</span>
                  <h3 className="text-lg font-semibold text-gray-900">Who has the mature enterprise dashboard?</h3>
                </div>
                <p className="text-base text-gray-700 leading-relaxed mb-3">
                  SonarQube, conclusively. Portfolio reporting, customisable
                  quality gates, compliance exports, role-based access, audit
                  logs, multi-project dashboards. This is fifteen years of
                  enterprise UI work; Deslint won&rsquo;t match it on day
                  one, or honestly, on year one.
                </p>
                <p className="text-base text-gray-700 leading-relaxed">
                  Deslint&rsquo;s Teams and Enterprise tiers (waitlisted in
                  Q3 2026) ship cross-repo dashboards focused on the AI-PR
                  surface — per-agent attribution, weekly drift digest,
                  Hosted Policy Registry for the firewall. Narrower scope,
                  but optimised for the AI authoring loop rather than the
                  whole-org code-quality view.
                </p>
                <p className="mt-2 text-sm text-gray-500"><strong className="text-gray-700">Verdict:</strong> SonarQube, today. Deslint is purpose-built for a different metric.</p>
              </article>

              <article>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs font-mono text-gray-400">06</span>
                  <h3 className="text-lg font-semibold text-gray-900">Can either run fully air-gapped?</h3>
                </div>
                <p className="text-base text-gray-700 leading-relaxed mb-3">
                  Both. SonarQube Server supports self-hosted, air-gapped
                  deployments — that&rsquo;s a core enterprise offering and
                  why it&rsquo;s widely deployed in regulated industries.
                </p>
                <p className="text-base text-gray-700 leading-relaxed">
                  Deslint runs locally by default. The ESLint plugin, the
                  CLI, and the MCP server are all subprocesses on the
                  developer machine. Zero bytes of source code leave the box,
                  no server to deploy, no licence to manage.
                </p>
                <p className="mt-2 text-sm text-gray-500"><strong className="text-gray-700">Verdict:</strong> Both work air-gapped — through different mechanisms.</p>
              </article>

              <article>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs font-mono text-gray-400">07</span>
                  <h3 className="text-lg font-semibold text-gray-900">What does it cost?</h3>
                </div>
                <p className="text-base text-gray-700 leading-relaxed mb-3">
                  SonarQube Community Edition is open source; SonarQube
                  Developer, Enterprise, and Data Center editions are
                  commercial (per developer-LOC or per LOC). At enterprise
                  scale, that&rsquo;s typically $50k–$500k+ per year.
                </p>
                <p className="text-base text-gray-700 leading-relaxed">
                  Deslint&rsquo;s open-source tier is free and MIT-licensed
                  forever, including the firewall. Teams ($99/mo for 5
                  developers) and Enterprise (from $10k/year) add dashboards
                  and the Hosted Policy Registry. Different cost shapes,
                  different scopes — not a like-for-like comparison.
                </p>
                <p className="mt-2 text-sm text-gray-500"><strong className="text-gray-700">Verdict:</strong> Deslint is cheaper, SonarQube is broader. Buy what fits the scope.</p>
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
                <p className="text-sm font-semibold text-gray-900 mb-1">Use SonarQube alone if:</p>
                <p className="text-base text-gray-600 leading-relaxed">
                  You run a multi-language org with 100+ engineers, you want
                  one quality-and-security dashboard for the whole company,
                  and you&rsquo;re comfortable with code-quality checks
                  firing post-commit on a server rather than inside the agent
                  loop.
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-1">Use Deslint alone if:</p>
                <p className="text-base text-gray-600 leading-relaxed">
                  Your stack is TypeScript/JavaScript-first (React, Vue,
                  Svelte, Angular, Astro), you ship AI-generated code, you
                  want a deterministic gate inside the agent loop, and you
                  don&rsquo;t need a multi-language enterprise platform yet.
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-1">Use both if:</p>
                <p className="text-base text-gray-600 leading-relaxed">
                  You already run SonarQube as the org-wide quality
                  platform <em>and</em> your engineers ship AI-generated
                  frontend code through Cursor / Claude Code / Codex /
                  Windsurf. Deslint fills the agent-loop gap SonarQube
                  doesn&rsquo;t fit; SonarQube fills the multi-language
                  whole-org gap Deslint doesn&rsquo;t cover. They sit at
                  different stages of the pipeline.
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
              The cleanest setup we&rsquo;ve seen: Deslint MCP inside the
              agent loop, Deslint CLI as the pre-commit / merge gate on
              the frontend surface, and SonarQube as the post-commit
              org-wide quality and SAST platform. Three layers, three
              different jobs.
            </p>
            <pre className="rounded-xl border border-gray-800 bg-gray-950 p-4 text-sm leading-relaxed text-gray-300 overflow-x-auto font-mono">
{`# AI authoring loop (sub-millisecond, deterministic)
# Cursor / Claude Code / Codex → Deslint MCP
#   verify_before_write   → pre-write gate
#   verify_shell_exec     → pre-execute gate

# CI / merge gate — design + a11y + AI-coding rules
pnpm deslint scan "apps/**/*.{ts,tsx}" --format sarif

# Post-commit, org-wide quality + SAST + SCA
# SonarQube Server / Cloud picks up the commit and reports`}
            </pre>
          </section>
        </FadeIn>

        <FadeIn>
          <section className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary-50 via-white to-white p-8 mb-8">
            <h2 className="text-xl font-bold tracking-tight text-gray-900 mb-3">
              Ready to add the agent-loop layer?
            </h2>
            <p className="text-base text-gray-700 leading-relaxed mb-5">
              It takes about two minutes. The{' '}
              <Link href="/docs/getting-started" className="text-primary font-semibold hover:underline">
                getting-started guide
              </Link>{' '}
              walks through the ESLint plugin, the CLI, the MCP server, and
              the Agent Action Firewall. None of them replace SonarQube;
              they sit beside it.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/docs/getting-started"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-light motion-safe:transition-all hover:shadow-lg hover:shadow-primary/20"
              >
                Get started
              </Link>
              <Link
                href="/firewall"
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:border-primary/30 hover:text-primary motion-safe:transition-colors"
              >
                Read the firewall page
              </Link>
              <Link
                href="/mcp"
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:border-primary/30 hover:text-primary motion-safe:transition-colors"
              >
                MCP setup guides
              </Link>
            </div>
          </section>
        </FadeIn>
      </main>
      <Footer />
    </>
  );
}
