import type { Metadata } from 'next';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { BreadcrumbJsonLd } from '@/components/BreadcrumbJsonLd';

export const metadata: Metadata = {
  title: 'Agent Action Firewall — Pre-Execution Gate for AI Coding Agents',
  description:
    'A pre-execution gate for every shell command an AI coding agent proposes. verify_shell_exec consults .deslint/policy.yml and returns allow / warn / deny in under 1 ms. Built-in detection for rm -rf /, curl | sh, reverse shells, and history rewrites. Local. MCP-native. MIT.',
  alternates: { canonical: '/firewall' },
  keywords: [
    'agent action firewall',
    'AI agent sandbox',
    'verify_shell_exec',
    'MCP firewall',
    'AI coding agent security',
    'shell command interception',
    'cursor sandbox',
    'claude code sandbox',
  ],
  openGraph: {
    title: 'Deslint Agent Action Firewall — Stop the Shell Command Before It Runs',
    description:
      'Pre-execution gate for every shell command your AI agent proposes. Sub-1 ms verdict. Built-in detection for rm -rf /, curl | sh, reverse shells, and history rewrites. MCP-native. Local. MIT.',
    url: 'https://deslint.com/firewall',
    type: 'website',
  },
};

interface InterceptorRow {
  tool: string;
  status: 'shipped' | 'next' | 'planned';
  blurb: string;
  example: string;
}

const INTERCEPTORS: InterceptorRow[] = [
  {
    tool: 'verify_shell_exec',
    status: 'shipped',
    blurb: 'Pre-execution gate for shell commands. Allow / deny / built-in dangerous-pattern checks.',
    example: '`pnpm publish` → deny (denylist) · `rm -rf /` → deny (builtin:destructive-rm)',
  },
  {
    tool: 'verify_outbound_request',
    status: 'next',
    blurb: 'Allowlist hosts the agent may call; block private/loopback/metadata IPs (SSRF) at runtime.',
    example: '`fetch(req.body.url)` → deny (private-IP target)',
  },
  {
    tool: 'verify_file_read',
    status: 'planned',
    blurb: 'Confine reads to project root; flag reads of .env, secrets directories, and credential stores.',
    example: '`fs.readFile("../../.aws/credentials")` → deny (outside-root)',
  },
  {
    tool: 'verify_secret_access',
    status: 'planned',
    blurb: 'Intercept process.env.* reads; flag access to unallowlisted secret keys.',
    example: '`process.env.STRIPE_SECRET` from a script → deny (unallowlisted)',
  },
  {
    tool: 'verify_git_op',
    status: 'planned',
    blurb: 'Block force-push to protected branches; block history rewrites and tag deletes.',
    example: '`git push --force origin main` → deny (protected branch)',
  },
];

interface BuiltinCheck {
  id: string;
  name: string;
  matches: string;
  defaultOn: boolean;
}

const BUILTIN_CHECKS: BuiltinCheck[] = [
  { id: 'destructive-rm', name: 'Destructive rm', matches: 'rm -rf /, rm -rf ~, rm -rf $HOME — but NOT rm -rf node_modules / ./build', defaultOn: true },
  { id: 'curl-pipe-shell', name: 'curl | sh', matches: 'curl ... | sh, wget ... | bash and variants — the canonical drive-by-install', defaultOn: true },
  { id: 'reverse-shell', name: 'Reverse shell', matches: 'nc -e, bash -i >& /dev/tcp/.../, python -c \'socket.connect(...)\' — known exploitation signatures', defaultOn: true },
  { id: 'sudo', name: 'sudo invocations', matches: 'Any sudo invocation. Off by default — opt in via builtinChecks', defaultOn: false },
  { id: 'history-rewrite', name: 'History rewrite', matches: 'git reset --hard, git filter-branch, git push --force, reflog expire', defaultOn: false },
  { id: 'process-substitution', name: 'Process substitution', matches: '<(curl ...), >(...) — supply-chain exploit pattern', defaultOn: false },
  { id: 'crypto-mining', name: 'Crypto miners', matches: 'Known miner binaries: xmrig, cgminer, minerd, ethminer, cpuminer', defaultOn: false },
];

export default function FirewallPage() {
  return (
    <>
      <Navbar />
      <BreadcrumbJsonLd trail={[{ name: 'Agent Action Firewall', path: '/firewall' }]} />
      <main>
        <Hero />
        <WhyAiProof />
        <InterceptorsTable />
        <BuiltinChecksGrid />
        <ExamplePolicy />
        <GetStarted />
      </main>
      <Footer />
    </>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-gray-200 bg-gradient-to-br from-white via-primary-50/30 to-white px-6 pt-32 pb-20">
      <div className="absolute inset-0 dot-grid opacity-40 pointer-events-none" />
      <div className="relative z-10 mx-auto max-w-4xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary-50/60 px-4 py-1.5 text-sm font-medium text-primary mb-6">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          New — v0.10
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 leading-[1.05] mb-6 text-balance">
          Stop the shell command{' '}
          <span className="gradient-text-hero">before your AI agent runs it.</span>
        </h1>
        <p className="text-lg sm:text-xl text-gray-600 leading-relaxed mb-8 max-w-3xl">
          Your AI calls{' '}
          <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-base text-primary">
            verify_shell_exec
          </code>{' '}
          first. Deslint reads{' '}
          <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-sm">
            .deslint/policy.yml
          </code>{' '}
          and returns{' '}
          <code className="rounded bg-pass/10 px-1.5 py-0.5 font-mono text-sm text-pass">allow</code>
          {' / '}
          <code className="rounded bg-warn/10 px-1.5 py-0.5 font-mono text-sm text-warn">warn</code>
          {' / '}
          <code className="rounded bg-fail/10 px-1.5 py-0.5 font-mono text-sm text-fail">deny</code>{' '}
          in under a millisecond. Same input, same verdict, every time.
        </p>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-500">
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-pass" />
            Sub-1ms warm
          </span>
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-pass" />7 built-in dangerous-pattern checks
          </span>
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-pass" />
            Local-first · zero egress
          </span>
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-pass" />
            MCP-native · MIT
          </span>
        </div>
      </div>
    </section>
  );
}

function WhyAiProof() {
  return (
    <section className="px-6 py-20 bg-white">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
          Why a deterministic firewall
        </p>
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6 text-balance leading-tight">
          An AI cannot be its own firewall.
        </h2>
        <p className="text-lg text-gray-600 leading-relaxed mb-10 max-w-3xl">
          Every IDE will ship an &ldquo;AI reviews AI&rdquo; layer by 2027. Useful for taste,
          unusable as a compliance control: variance per run, slow per call, cloud round-trip
          required, no signed verdict. Four properties separate the firewall from a reviewer:
        </p>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-left">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Property</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Why AI can&apos;t match</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Why customers need it</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              <tr>
                <td className="px-5 py-4 font-semibold text-gray-900">Determinism</td>
                <td className="px-5 py-4 text-gray-600">LLMs have variance per run — same prompt, different output.</td>
                <td className="px-5 py-4 text-gray-600">CI gates need pass/fail consistency. Auditors require reproducibility.</td>
              </tr>
              <tr>
                <td className="px-5 py-4 font-semibold text-gray-900">Sub-10ms latency</td>
                <td className="px-5 py-4 text-gray-600">LLMs take 1–30 seconds. Agent loops can&apos;t tolerate that on every action.</td>
                <td className="px-5 py-4 text-gray-600">Pre-execution gating only works if it&apos;s cheaper than the agent&apos;s own thinking cycle.</td>
              </tr>
              <tr>
                <td className="px-5 py-4 font-semibold text-gray-900">Local-first</td>
                <td className="px-5 py-4 text-gray-600">Cloud AI services need data to function. Regulated industries forbid egress.</td>
                <td className="px-5 py-4 text-gray-600">Finance, health, government, defense — entire verticals can&apos;t use cloud LLM tools.</td>
              </tr>
              <tr>
                <td className="px-5 py-4 font-semibold text-gray-900">Auditable verdicts</td>
                <td className="px-5 py-4 text-gray-600">LLM verdicts can&apos;t be cited or signed. Same input, different verdict tomorrow.</td>
                <td className="px-5 py-4 text-gray-600">Every block produces a citable reason and matched-pattern. Auditor-ready trail.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function InterceptorsTable() {
  return (
    <section className="px-6 py-20 bg-surface-100">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
          The verify_before_* family
        </p>
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 text-balance leading-tight">
          Five interceptors. One policy file.
        </h2>
        <p className="text-lg text-gray-600 leading-relaxed mb-10 max-w-3xl">
          The firewall ships interceptors incrementally. The policy DSL is stable from v0.10
          forward — author the whole policy now and each interceptor starts enforcing as it
          lands.
        </p>

        <div className="space-y-3">
          {INTERCEPTORS.map((intr) => (
            <div
              key={intr.tool}
              className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-5 sm:flex-row sm:items-start"
            >
              <div className="sm:w-72 sm:shrink-0">
                <div className="flex items-center gap-2.5 mb-1">
                  <code className="font-mono text-sm font-semibold text-primary">
                    {intr.tool}
                  </code>
                  <StatusPill status={intr.status} />
                </div>
                <p className="text-sm text-gray-500 leading-snug">{intr.blurb}</p>
              </div>
              <div className="flex-1 min-w-0">
                <div className="rounded-lg bg-gray-50 px-4 py-3 font-mono text-xs text-gray-700 ring-1 ring-gray-200/60 leading-relaxed">
                  {intr.example}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function StatusPill({ status }: { status: 'shipped' | 'next' | 'planned' }) {
  if (status === 'shipped') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-pass/10 px-2 py-0.5 text-2xs font-semibold uppercase tracking-wider text-pass ring-1 ring-pass/20">
        <span className="h-1.5 w-1.5 rounded-full bg-pass" /> Shipped v0.10
      </span>
    );
  }
  if (status === 'next') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-2xs font-semibold uppercase tracking-wider text-primary ring-1 ring-primary/20">
        Next
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-2xs font-semibold uppercase tracking-wider text-gray-500 ring-1 ring-gray-200">
      Planned
    </span>
  );
}

function BuiltinChecksGrid() {
  return (
    <section className="px-6 py-20 bg-white">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
          Built-in dangerous-pattern checks
        </p>
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 text-balance leading-tight">
          7 curated regexes you don&apos;t have to write yourself.
        </h2>
        <p className="text-lg text-gray-600 leading-relaxed mb-10 max-w-3xl">
          Every policy ships with a vetted set of dangerous-pattern detectors so you don&apos;t
          have to research the canonical exploit signatures. Three are on by default; the rest
          opt in via{' '}
          <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-sm">builtinChecks</code>.
          Allowlist matches always win — legitimate use cases have an escape hatch.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {BUILTIN_CHECKS.map((check) => (
            <div
              key={check.id}
              className="rounded-xl border border-gray-200 bg-white p-5"
            >
              <div className="flex items-baseline justify-between gap-3 mb-2">
                <h3 className="text-base font-semibold text-gray-900">{check.name}</h3>
                {check.defaultOn ? (
                  <span className="text-2xs font-semibold uppercase tracking-wider text-pass">
                    Default on
                  </span>
                ) : (
                  <span className="text-2xs font-semibold uppercase tracking-wider text-gray-400">
                    Opt-in
                  </span>
                )}
              </div>
              <code className="block font-mono text-2xs text-gray-500 mb-2">{check.id}</code>
              <p className="text-sm text-gray-600 leading-relaxed">{check.matches}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ExamplePolicy() {
  return (
    <section className="px-6 py-20 bg-surface-100">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
          Authoring a policy
        </p>
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 text-balance leading-tight">
          Copy this. Done.
        </h2>
        <p className="text-lg text-gray-600 leading-relaxed mb-8 max-w-3xl">
          Drop this into{' '}
          <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-sm">
            .deslint/policy.yml
          </code>
          . The next shell command your agent proposes runs through it. Patterns prefixed{' '}
          <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-sm">re:</code> are
          regex; everything else is a literal exact match. Deny beats allow on overlap, so
          &ldquo;allow everything starting with{' '}
          <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-sm">pnpm</code>, but
          deny <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-sm">pnpm publish</code>
          &rdquo; reads cleanly.
        </p>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-950 shadow-lg">
          <div className="border-b border-white/10 px-4 py-2.5 text-xs font-mono text-gray-400">
            .deslint/policy.yml
          </div>
          <pre className="overflow-x-auto px-5 py-5 text-sm leading-relaxed text-gray-100">
            <code>{`version: 1
name: acme-corp/strict
severity: error

shellExec:
  deny:
    - "pnpm publish"
    - "re:^npm install -g"
    - "re:^git push --force"

  allow:
    - "re:^pnpm (test|run |install$|build$)"
    - "re:^git (status|diff|log|add|commit|fetch|pull)"
    - "re:^ls( |$)"
    - "pwd"

  defaultAction: deny

  builtinChecks:
    - destructive-rm
    - curl-pipe-shell
    - reverse-shell
    - history-rewrite
    - sudo`}</code>
          </pre>
        </div>
      </div>
    </section>
  );
}

function GetStarted() {
  return (
    <section className="px-6 py-20 bg-white border-t border-gray-200">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 text-balance leading-tight">
          Get the firewall in your agent loop.
        </h2>
        <p className="text-lg text-gray-600 leading-relaxed mb-8">
          Install <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-base">@deslint/mcp</code>,
          point your agent at it, drop a{' '}
          <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-base">.deslint/policy.yml</code>{' '}
          in your repo. The next shell command your agent proposes runs through{' '}
          <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-base">verify_shell_exec</code>.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/mcp"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary-light motion-safe:transition-colors"
          >
            MCP setup guides
            <span aria-hidden>→</span>
          </Link>
          <Link
            href="https://github.com/jaydrao215/deslint/blob/main/packages/mcp/examples/policy.example.yml"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:border-gray-300 hover:bg-gray-50 motion-safe:transition-colors"
          >
            Example policy.yml
          </Link>
        </div>
      </div>
    </section>
  );
}
