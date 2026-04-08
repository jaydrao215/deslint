import Link from 'next/link';
import { Rocket, Settings, Shield, ArrowRight } from 'lucide-react';

const CARDS = [
  {
    href: '/docs/getting-started',
    icon: Rocket,
    title: 'Getting Started',
    description: 'Install, configure, and run your first scan in under 2 minutes.',
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
    description: 'All 10 rules with examples, options, and auto-fix behavior.',
    color: 'text-warn bg-warn/10 border-warn/20',
  },
];

export default function DocsIndex() {
  return (
    <div className="not-prose">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-3">
          Deslint Documentation
        </h1>
        <p className="text-lg text-gray-500 leading-relaxed">
          The design quality gate for AI-generated frontend code.
          <br className="hidden sm:block" />
          ESLint plugin + CLI + MCP server.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group relative rounded-xl border border-gray-200 bg-white p-5 transition-all duration-300 hover:border-gray-300 hover:shadow-lg hover:shadow-gray-200/50 hover:-translate-y-0.5"
          >
            <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border ${card.color} mb-4`}>
              <card.icon className="h-5 w-5" />
            </div>
            <h2 className="text-base font-semibold text-gray-900 mb-2 flex items-center gap-2">
              {card.title}
              <ArrowRight className="h-3.5 w-3.5 text-gray-400 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
            </h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              {card.description}
            </p>
          </Link>
        ))}
      </div>

      {/* Quick install */}
      <div className="mt-10 rounded-xl border border-gray-200 bg-gray-950 p-5">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Quick Install
        </p>
        <div className="font-mono text-sm text-gray-300">
          <span className="text-gray-500 select-none">$ </span>
          <span className="text-pass">npm</span>{' '}
          <span className="text-gray-400">install -D</span>{' '}
          <span className="text-white">@deslint/eslint-plugin</span>
        </div>
      </div>
    </div>
  );
}
