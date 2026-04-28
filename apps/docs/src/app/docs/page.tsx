import Link from 'next/link';
import {
  Rocket,
  Settings,
  Shield,
  ArrowRight,
  Terminal,
  Code2,
  PackageCheck,
  GitPullRequest,
} from 'lucide-react';
import { BreadcrumbJsonLd } from '@/components/BreadcrumbJsonLd';

const SURFACES = [
  {
    icon: Terminal,
    title: 'MCP server',
    useIf: 'Your AI agent (Claude Code, Cursor, Codex, Windsurf) should check design quality as it writes code.',
    install: 'npx @deslint/mcp install',
    href: '/mcp',
    linkLabel: 'Vendor guides',
  },
  {
    icon: Code2,
    title: 'ESLint plugin',
    useIf: 'You already run ESLint and want Deslint rules in that pipeline.',
    install: 'npm install -D @deslint/eslint-plugin',
    href: '/docs/getting-started#alternative-eslint',
    linkLabel: 'Flat-config setup',
  },
  {
    icon: PackageCheck,
    title: 'CLI',
    useIf: 'You want ad-hoc scans, local pre-commit, or CI without the GitHub Action.',
    install: 'npm install -D @deslint/cli',
    href: '/cli',
    linkLabel: 'CLI guide',
  },
  {
    icon: GitPullRequest,
    title: 'GitHub Action',
    useIf: 'You want PR comments, inline review suggestions, and a Design Health Score on every PR.',
    install: 'uses: jaydrao215/deslint/action@main',
    href: '/action',
    linkLabel: 'PR gate guide',
  },
];

const CARDS = [
  {
    href: '/docs/getting-started',
    icon: Rocket,
    title: 'Getting Started',
    description: 'The complete happy path — zero to an enforced design system with a Fix Plan.',
    color: 'text-pass bg-pass/10 border-pass/20',
  },
  {
    href: '/docs/configuration',
    icon: Settings,
    title: 'Configuration',
    description: '.deslintrc.json schema, profiles, design system tokens, and ignore patterns.',
    color: 'text-primary bg-primary/10 border-primary/20',
  },
  {
    href: '/docs/rules',
    icon: Shield,
    title: 'Rules Reference',
    description: 'All 37 rules with examples, options, and auto-fix behavior.',
    color: 'text-warn bg-warn/10 border-warn/20',
  },
];

export default function DocsIndex() {
  return (
    <div className="not-prose">
      <BreadcrumbJsonLd trail={[{ name: 'Documentation', path: '/docs' }]} />
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-3">
          Deslint Documentation
        </h1>
        <p className="text-lg text-gray-500 leading-relaxed">
          The verification layer for AI-generated code.
          <br className="hidden sm:block" />
          MCP server + ESLint plugin + CLI + GitHub Action + PR Fix Plans.
        </p>
      </div>

      {/* Surfaces — pick one or combine */}
      <div className="mb-10">
        <div className="mb-4 flex items-baseline justify-between gap-4 flex-wrap">
          <h2 className="text-lg font-semibold text-gray-900 tracking-tight">
            Choose your surface
          </h2>
          <p className="text-sm text-gray-500">
            Each works on its own. Use any one — or combine them.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {SURFACES.map((s) => (
            <div
              key={s.title}
              className="group rounded-xl border border-gray-200 bg-white p-5 motion-safe:transition-all hover:border-gray-300 hover:shadow-md hover:shadow-gray-200/50"
            >
              <div className="mb-3 flex items-center gap-2.5">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-primary/20 bg-primary-50/60 text-primary">
                  <s.icon className="h-4 w-4" />
                </span>
                <h3 className="text-sm font-semibold text-gray-900">
                  {s.title}
                </h3>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                <span className="font-medium text-gray-800">Use if:</span>{' '}
                {s.useIf}
              </p>
              <div className="mb-3 rounded-lg bg-gray-950 px-3 py-2 font-mono text-[12px] text-gray-200 overflow-x-auto">
                <span className="text-gray-500 select-none">$ </span>
                {s.install}
              </div>
              <Link
                href={s.href}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                {s.linkLabel}
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group relative rounded-xl border border-gray-200 bg-white p-5 motion-safe:transition-all motion-safe:duration-300 hover:border-gray-300 hover:shadow-lg hover:shadow-gray-200/50 hover:-translate-y-0.5"
          >
            <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border ${card.color} mb-4`}>
              <card.icon className="h-5 w-5" />
            </div>
            <h2 className="text-base font-semibold text-gray-900 mb-2 flex items-center gap-2">
              {card.title}
              <ArrowRight className="h-3.5 w-3.5 text-gray-400 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 motion-safe:transition-all" />
            </h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              {card.description}
            </p>
          </Link>
        ))}
      </div>

      {/* Featured reading */}
      <div className="mt-10 rounded-xl border border-primary/20 bg-gradient-to-br from-primary-50 via-white to-white p-6">
        <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">
          Featured reading
        </p>
        <Link
          href="/blog/tailwind-arbitrary-values"
          className="group block"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-1.5 group-hover:text-primary motion-safe:transition-colors">
            The hidden cost of Tailwind arbitrary values
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            Three drift archetypes, why AI coding agents amplify them, and
            how <code className="text-primary bg-primary-50/60 px-1 rounded">no-arbitrary-*</code>{' '}
            catches each deterministically. 9 min read.
          </p>
        </Link>
      </div>

      {/* Comparison */}
      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Evaluating linters?
        </p>
        <Link
          href="/compare/deslint-vs-stylelint"
          className="group block"
        >
          <h3 className="text-base font-semibold text-gray-900 mb-1 group-hover:text-primary motion-safe:transition-colors flex items-center gap-2">
            Deslint vs. stylelint — honest comparison
            <ArrowRight className="h-3.5 w-3.5 text-gray-400 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 motion-safe:transition-all" />
          </h3>
          <p className="text-sm text-gray-500 leading-relaxed">
            Different jobs, not rivals. Side-by-side on six real questions — authored CSS, JSX drift, Tailwind arbitrary values, design tokens, CI, and AI agents.
          </p>
        </Link>
      </div>

      {/* Quick install — recommended first step for the AI-agent path */}
      <div className="mt-6 rounded-xl border border-gray-200 bg-gray-950 p-5">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Quick Install — recommended
        </p>
        <div className="font-mono text-sm text-gray-300">
          <span className="text-gray-500 select-none">$ </span>
          <span className="text-pass">npx</span>{' '}
          <span className="text-white">@deslint/mcp</span>{' '}
          <span className="text-gray-400">install</span>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Wires Deslint into your AI agent&apos;s config (Claude Code, Cursor,
          Codex, Windsurf). Prefer a different surface? Use the &quot;Choose
          your surface&quot; grid above.
        </p>
      </div>
    </div>
  );
}
