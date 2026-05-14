import type { Metadata } from 'next';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { FadeIn } from '@/components/motion';
import { BreadcrumbJsonLd } from '@/components/BreadcrumbJsonLd';

const UPDATED = '2026-05-14';

export const metadata: Metadata = {
  title: 'Deslint vs. CodeRabbit: the honest comparison (2026)',
  description:
    'CodeRabbit reviews a pull request with an LLM after the diff is opened. Deslint verifies inside the agent loop with deterministic rules before the file is written. Different jobs, not rivals — and most teams will end up running both.',
  alternates: { canonical: '/compare/deslint-vs-coderabbit' },
  keywords: [
    'deslint vs coderabbit',
    'coderabbit alternative',
    'ai code review',
    'deterministic linter ai',
    'mcp code review',
    'pre-write verification',
    'pull request linter',
  ],
  openGraph: {
    title: 'Deslint vs. CodeRabbit — Pre-Write vs. Post-PR, LLM vs. Deterministic',
    description:
      'CodeRabbit is an LLM PR reviewer. Deslint is a deterministic verification layer that runs inside the agent loop. Both are useful — for different parts of the pipeline. Side-by-side comparison for 2026 teams.',
    url: 'https://deslint.com/compare/deslint-vs-coderabbit',
    type: 'article',
    modifiedTime: UPDATED,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Deslint vs. CodeRabbit',
    description:
      'LLM PR reviewer vs. deterministic pre-write verifier. Honest 2026 comparison.',
  },
};

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Deslint vs. CodeRabbit: the honest comparison',
  description:
    'Side-by-side comparison of CodeRabbit (LLM PR reviewer) and Deslint (deterministic pre-write verifier) across seven dimensions — when each fires, what each catches, latency, compliance posture, cost, and how they coexist.',
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
    '@id': 'https://deslint.com/compare/deslint-vs-coderabbit',
  },
};

type Verdict = 'deslint' | 'coderabbit' | 'both' | 'neither';

function VerdictBadge({ v }: { v: Verdict }) {
  const map: Record<Verdict, { label: string; cls: string }> = {
    deslint: {
      label: 'Deslint',
      cls: 'bg-primary/10 text-primary border-primary/20',
    },
    coderabbit: {
      label: 'CodeRabbit',
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

export default function DeslintVsCoderabbit() {
  return (
    <>
      <Navbar />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <BreadcrumbJsonLd
        trail={[
          { name: 'Compare', path: '/compare/deslint-vs-coderabbit' },
          { name: 'Deslint vs. CodeRabbit', path: '/compare/deslint-vs-coderabbit' },
        ]}
      />
      <main className="mx-auto max-w-3xl px-6 pt-32 pb-20">
        <FadeIn className="mb-10">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
            Comparison
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 leading-[1.08] mb-6">
            Deslint vs. CodeRabbit:{' '}
            <span className="gradient-text-hero">the honest comparison.</span>
          </h1>
          <p className="text-lg text-gray-600 leading-relaxed">
            CodeRabbit and Deslint solve different problems. CodeRabbit is a
            cloud LLM that reviews a pull request after the diff is opened.
            Deslint is a deterministic verification layer that runs inside the
            agent loop — your AI calls it before writing a file or running a
            shell command. Different parts of the pipeline, different
            guarantees. Most teams shipping with{' '}
            <Link href="/mcp/cursor" className="text-primary font-semibold hover:underline">
              Cursor
            </Link>{' '}
            or{' '}
            <Link href="/mcp/claude-code" className="text-primary font-semibold hover:underline">
              Claude Code
            </Link>{' '}
            should run both.
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
                    <td className="px-5 py-3 text-gray-700">When does it fire — pre-write or post-PR?</td>
                    <td className="px-5 py-3"><VerdictBadge v="deslint" /></td>
                  </tr>
                  <tr>
                    <td className="px-5 py-3 text-gray-700">Same input, same output every run?</td>
                    <td className="px-5 py-3"><VerdictBadge v="deslint" /></td>
                  </tr>
                  <tr>
                    <td className="px-5 py-3 text-gray-700">LLM-quality review (logic, edge cases, prose)</td>
                    <td className="px-5 py-3"><VerdictBadge v="coderabbit" /></td>
                  </tr>
                  <tr>
                    <td className="px-5 py-3 text-gray-700">Sub-millisecond verdict, no cloud roundtrip</td>
                    <td className="px-5 py-3"><VerdictBadge v="deslint" /></td>
                  </tr>
                  <tr>
                    <td className="px-5 py-3 text-gray-700">Pre-execution gate for shell commands the agent proposes</td>
                    <td className="px-5 py-3"><VerdictBadge v="deslint" /></td>
                  </tr>
                  <tr>
                    <td className="px-5 py-3 text-gray-700">PR-level summary, &ldquo;what changed&rdquo; explainer</td>
                    <td className="px-5 py-3"><VerdictBadge v="coderabbit" /></td>
                  </tr>
                  <tr>
                    <td className="px-5 py-3 text-gray-700">Air-gapped / regulated deployment (zero cloud)</td>
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
                  CodeRabbit
                </p>
                <p className="text-base text-gray-700 leading-relaxed mb-3">
                  An LLM-powered pull-request reviewer. Once the diff is opened
                  on GitHub or GitLab, CodeRabbit reads the changes, generates
                  a summary, suggests fixes, and posts inline comments. The
                  underlying engine is a large language model; the value is
                  the model&rsquo;s ability to reason about logic, edge cases,
                  and reviewer-style concerns no static rule can encode.
                </p>
                <p className="text-base text-gray-700 leading-relaxed">
                  If you want a fast second pair of eyes on every PR — the
                  kind a senior engineer would do — and you&rsquo;re
                  comfortable shipping diffs to a cloud reviewer, CodeRabbit
                  is the right tool. It&rsquo;s polished, widely adopted, and
                  the LLM angle is genuinely useful for the class of bug a
                  deterministic checker cannot describe.
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
                  backend safety, Next.js boundaries, and AI-coding antipatterns.
                  Reproducible, signed attestation, sub-1 ms warm verdict, local.
                </p>
                <p className="text-base text-gray-700 leading-relaxed">
                  Its job is the structural gate — same input, same verdict,
                  every time. That is the property auditors need and the
                  property the agent loop can call thousands of times per
                  session without slowing down.
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
                  <h3 className="text-lg font-semibold text-gray-900">When does each tool fire?</h3>
                </div>
                <p className="text-base text-gray-700 leading-relaxed mb-3">
                  CodeRabbit fires after the diff is opened — when the PR
                  exists, the agent has already written the file, and the
                  reviewer is now reading what shipped. Useful, but late.
                </p>
                <p className="text-base text-gray-700 leading-relaxed">
                  Deslint fires inside the agent loop. Your AI calls{' '}
                  <code className="text-xs text-primary bg-primary-50/60 px-1 rounded">
                    verify_before_write
                  </code>{' '}
                  with the candidate file content; the server returns{' '}
                  <code className="text-xs text-primary bg-primary-50/60 px-1 rounded">passed</code>{' '}
                  / violations / a{' '}
                  <code className="text-xs text-primary bg-primary-50/60 px-1 rounded">
                    recommendedAction
                  </code>{' '}
                  in 3-7 ms. The fix happens before the file lands on disk,
                  not after the PR is opened.
                </p>
                <p className="mt-2 text-sm text-gray-500"><strong className="text-gray-700">Verdict:</strong> Deslint for pre-write, CodeRabbit for post-PR. Different stages.</p>
              </article>

              <article>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs font-mono text-gray-400">02</span>
                  <h3 className="text-lg font-semibold text-gray-900">Is the verdict reproducible?</h3>
                </div>
                <p className="text-base text-gray-700 leading-relaxed mb-3">
                  CodeRabbit&rsquo;s engine is an LLM. Same input, different
                  output across runs — by design. The model picks up on
                  different things on different days. That is fine for &ldquo;a
                  second pair of eyes,&rdquo; problematic as a CI gate, and
                  unworkable for a compliance audit that demands the same
                  verdict on the same code 18 months later.
                </p>
                <p className="text-base text-gray-700 leading-relaxed">
                  Deslint is pure deterministic static analysis. Every rule is
                  an AST pattern. Same input always produces the same output —
                  the only kind of verifier you can put on a SOC 2 control or
                  an EU AI Act trail.
                </p>
                <p className="mt-2 text-sm text-gray-500"><strong className="text-gray-700">Verdict:</strong> Deslint, conclusively. CodeRabbit cannot be deterministic and still be an LLM.</p>
              </article>

              <article>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs font-mono text-gray-400">03</span>
                  <h3 className="text-lg font-semibold text-gray-900">Who catches a hardcoded API key in <code className="text-sm text-primary bg-primary-50/60 px-1 rounded">env.ts</code>?</h3>
                </div>
                <p className="text-base text-gray-700 leading-relaxed mb-3">
                  Both. CodeRabbit&rsquo;s LLM will frequently flag it on the
                  PR diff. Deslint&rsquo;s{' '}
                  <code className="text-xs text-primary bg-primary-50/60 px-1 rounded">no-hardcoded-secrets</code>{' '}
                  rule flags it before the file is even written, via the agent
                  loop. The category is well-trodden — provider fingerprints
                  for AWS, Stripe, GitHub, OpenAI, Anthropic, JWT, and PEM
                  blocks.
                </p>
                <p className="text-base text-gray-700 leading-relaxed">
                  The difference is reliability. Deslint catches 100% of
                  matching fingerprints, every run, every time. CodeRabbit&rsquo;s
                  recall depends on the model and the prompt; it&rsquo;s
                  excellent in practice but not guaranteed.
                </p>
                <p className="mt-2 text-sm text-gray-500"><strong className="text-gray-700">Verdict:</strong> Both catch it. Deslint is the structural guarantee; CodeRabbit is the high-quality second opinion.</p>
              </article>

              <article>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs font-mono text-gray-400">04</span>
                  <h3 className="text-lg font-semibold text-gray-900">Who can stop the agent from running <code className="text-sm text-primary bg-primary-50/60 px-1 rounded">rm -rf /</code>?</h3>
                </div>
                <p className="text-base text-gray-700 leading-relaxed mb-3">
                  CodeRabbit cannot — it operates on the PR diff, not on
                  shell commands the agent proposes during authoring. By the
                  time the diff exists, the destructive command (if it ran)
                  has already executed.
                </p>
                <p className="text-base text-gray-700 leading-relaxed">
                  Deslint&rsquo;s{' '}
                  <Link href="/firewall" className="text-primary font-semibold hover:underline">
                    Agent Action Firewall
                  </Link>{' '}
                  intercepts shell commands the agent proposes. The agent
                  calls{' '}
                  <code className="text-xs text-primary bg-primary-50/60 px-1 rounded">
                    verify_shell_exec
                  </code>{' '}
                  first; the server reads{' '}
                  <code className="text-xs text-primary bg-primary-50/60 px-1 rounded">
                    .deslint/policy.yml
                  </code>{' '}
                  and returns allow / warn / deny in under a millisecond.
                  Built-in detection for{' '}
                  <code className="text-xs text-primary bg-primary-50/60 px-1 rounded">rm -rf /</code>,{' '}
                  <code className="text-xs text-primary bg-primary-50/60 px-1 rounded">curl | sh</code>,
                  reverse shells, and history rewrites.
                </p>
                <p className="mt-2 text-sm text-gray-500"><strong className="text-gray-700">Verdict:</strong> Deslint. CodeRabbit is the wrong layer for this.</p>
              </article>

              <article>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs font-mono text-gray-400">05</span>
                  <h3 className="text-lg font-semibold text-gray-900">Who catches edge-case logic bugs?</h3>
                </div>
                <p className="text-base text-gray-700 leading-relaxed mb-3">
                  CodeRabbit, decisively. Logic correctness, off-by-one
                  errors, subtle race conditions, &ldquo;did you mean to
                  return early here?&rdquo; — all things an LLM is genuinely
                  good at. A deterministic linter would need a rule for every
                  possible bug shape; an LLM reasons about the diff. This is
                  CodeRabbit&rsquo;s home turf.
                </p>
                <p className="text-base text-gray-700 leading-relaxed">
                  Deslint deliberately doesn&rsquo;t compete here. We make no
                  claim to catch logic bugs — only structural rules with a
                  reproducible verdict.
                </p>
                <p className="mt-2 text-sm text-gray-500"><strong className="text-gray-700">Verdict:</strong> CodeRabbit. Use it for what it&rsquo;s best at.</p>
              </article>

              <article>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs font-mono text-gray-400">06</span>
                  <h3 className="text-lg font-semibold text-gray-900">Can either run in an air-gapped or regulated environment?</h3>
                </div>
                <p className="text-base text-gray-700 leading-relaxed mb-3">
                  CodeRabbit is a cloud service. The diff is sent to the
                  CodeRabbit API, the LLM analyses it, comments come back.
                  That is incompatible with the threat model of finance,
                  health, defense, and government engineering — none of those
                  CISOs will sign off on shipping product source to a
                  third-party LLM provider.
                </p>
                <p className="text-base text-gray-700 leading-relaxed">
                  Deslint runs locally. The ESLint plugin, the CLI, the MCP
                  server — all subprocesses on the developer&rsquo;s machine.
                  Zero bytes of source code leave the box. Air-gap friendly,
                  zero telemetry, zero LLM in the hot path.
                </p>
                <p className="mt-2 text-sm text-gray-500"><strong className="text-gray-700">Verdict:</strong> Deslint. CodeRabbit is structurally cloud-only.</p>
              </article>

              <article>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs font-mono text-gray-400">07</span>
                  <h3 className="text-lg font-semibold text-gray-900">What does it cost?</h3>
                </div>
                <p className="text-base text-gray-700 leading-relaxed mb-3">
                  CodeRabbit&rsquo;s paid tier starts around $15/seat/month
                  (free for open-source repos). At scale across a team of
                  100, that&rsquo;s $1,500/month for the LLM reviewer alone,
                  growing with seat count.
                </p>
                <p className="text-base text-gray-700 leading-relaxed">
                  Deslint&rsquo;s open-source tier — the ESLint plugin, CLI,
                  MCP server, and{' '}
                  <Link href="/firewall" className="text-primary font-semibold hover:underline">
                    Agent Action Firewall
                  </Link>{' '}
                  — is free and MIT-licensed forever. Teams ($99/mo for 5
                  developers) and Enterprise add dashboards and the Hosted
                  Policy Registry on top. The verifier itself is always free.
                </p>
                <p className="mt-2 text-sm text-gray-500"><strong className="text-gray-700">Verdict:</strong> Different cost shapes. The deterministic verification layer is free at Deslint; the LLM reviewer service is metered at CodeRabbit. Not a like-for-like comparison.</p>
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
                <p className="text-sm font-semibold text-gray-900 mb-1">Use CodeRabbit alone if:</p>
                <p className="text-base text-gray-600 leading-relaxed">
                  You want a fast LLM second opinion on every PR, you&rsquo;re
                  comfortable shipping diffs to a cloud reviewer, your
                  compliance posture allows third-party LLM access, and you
                  don&rsquo;t need a pre-write or pre-shell gate inside the
                  agent loop.
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-1">Use Deslint alone if:</p>
                <p className="text-base text-gray-600 leading-relaxed">
                  You ship AI-generated code, you want a deterministic check
                  in the agent loop (Cursor / Claude Code / Codex / Windsurf),
                  you need a reproducible verdict for compliance, and you
                  can&rsquo;t send source code to a cloud (or you simply
                  don&rsquo;t want to).
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-1">Use both if:</p>
                <p className="text-base text-gray-600 leading-relaxed">
                  You ship product fast, you want the LLM&rsquo;s opinion on
                  every diff <em>and</em> a deterministic structural gate the
                  agent must clear before writing a file. This is the common
                  case for non-regulated SaaS teams — the two tools gate
                  different stages of the pipeline and don&rsquo;t overlap.
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
              agent loop (Cursor / Claude Code), Deslint CLI in CI as the
              merge gate, and CodeRabbit as the post-PR LLM reviewer. Three
              gates, three different jobs.
            </p>
            <pre className="rounded-xl border border-gray-800 bg-gray-950 p-4 text-sm leading-relaxed text-gray-300 overflow-x-auto font-mono">
{`# AI authoring loop (deterministic, sub-millisecond)
# Cursor / Claude Code / Codex → Deslint MCP
#   verify_before_write   → pre-write gate
#   verify_shell_exec     → pre-execute gate

# CI / merge gate (deterministic, reproducible)
pnpm deslint scan "apps/**/*.{ts,tsx}" --format sarif

# Post-PR review (LLM, prose-quality)
# CodeRabbit on the diff once the PR is opened`}
            </pre>
          </section>
        </FadeIn>

        <FadeIn>
          <section className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary-50 via-white to-white p-8 mb-8">
            <h2 className="text-xl font-bold tracking-tight text-gray-900 mb-3">
              Ready to add the deterministic layer?
            </h2>
            <p className="text-base text-gray-700 leading-relaxed mb-5">
              It takes about two minutes. The{' '}
              <Link href="/docs/getting-started" className="text-primary font-semibold hover:underline">
                getting-started guide
              </Link>{' '}
              walks through the ESLint plugin, the CLI, the MCP server, and the
              Agent Action Firewall. None of them require a cloud account.
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
