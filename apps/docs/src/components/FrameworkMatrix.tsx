'use client';

import { FadeIn } from './motion';
import { Check, Circle } from 'lucide-react';

/**
 * Framework × capability matrix.
 *
 * Be honest: "full" only where we genuinely have parser support. "partial"
 * for surfaces where rules run but some AST-specific checks don't fire.
 */
type Support = 'full' | 'partial';

interface Row {
  framework: string;
  blurb: string;
  classLinting: Support;
  a11y: Support;
  autofix: Support;
}

const ROWS: Row[] = [
  {
    framework: 'React / JSX',
    blurb: 'TSX, JSX, className / clsx / cva',
    classLinting: 'full',
    a11y: 'full',
    autofix: 'full',
  },
  {
    framework: 'Vue SFC',
    blurb: '.vue templates via vue-eslint-parser',
    classLinting: 'full',
    a11y: 'full',
    autofix: 'full',
  },
  {
    framework: 'Svelte',
    blurb: '.svelte via svelte-eslint-parser',
    classLinting: 'full',
    a11y: 'full',
    autofix: 'full',
  },
  {
    framework: 'Angular',
    blurb: 'Inline + external templates',
    classLinting: 'full',
    a11y: 'full',
    autofix: 'partial',
  },
  {
    framework: 'HTML',
    blurb: 'Plain .html via @html-eslint/parser',
    classLinting: 'full',
    a11y: 'full',
    autofix: 'partial',
  },
];

function Cell({ value }: { value: Support }) {
  if (value === 'full') {
    return (
      <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-pass/10 text-pass">
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-warn/10 text-warn"
      title="Partial — see docs"
    >
      <Circle className="h-2 w-2 fill-current" />
    </span>
  );
}

export function FrameworkMatrix() {
  return (
    <section className="relative py-24 px-6 bg-surface-100">
      <div className="mx-auto max-w-6xl">
        <FadeIn className="mb-12 max-w-2xl">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
            Framework-agnostic
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 text-balance">
            Same rules, every framework you already ship
          </h2>
          <p className="text-lg text-gray-500 leading-relaxed">
            Deslint parses the actual template — JSX, Vue SFC, Svelte, Angular,
            HTML — not a stringly-typed regex. One config, one rule set, zero
            per-framework plugins.
          </p>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="rounded-2xl border border-gray-200/80 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200/80 bg-surface-100">
                    <th className="text-left px-6 py-4 font-semibold text-gray-900">
                      Framework
                    </th>
                    <th className="text-center px-4 py-4 font-semibold text-gray-900">
                      Design system
                    </th>
                    <th className="text-center px-4 py-4 font-semibold text-gray-900">
                      Accessibility
                    </th>
                    <th className="text-center px-4 py-4 font-semibold text-gray-900">
                      Autofix
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map((row) => (
                    <tr
                      key={row.framework}
                      className="border-b border-gray-100 last:border-0 hover:bg-surface-50 motion-safe:transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900">{row.framework}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{row.blurb}</div>
                      </td>
                      <td className="text-center px-4 py-4">
                        <Cell value={row.classLinting} />
                      </td>
                      <td className="text-center px-4 py-4">
                        <Cell value={row.a11y} />
                      </td>
                      <td className="text-center px-4 py-4">
                        <Cell value={row.autofix} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-gray-200/80 bg-surface-100 px-6 py-3 flex flex-wrap items-center gap-5 text-xs text-gray-500">
              <span className="flex items-center gap-2">
                <Cell value="full" />
                Full support
              </span>
              <span className="flex items-center gap-2">
                <Cell value="partial" />
                Partial — some rules read-only
              </span>
              <span className="ml-auto text-gray-400 hidden sm:inline">
                jsx-a11y is React-only. tailwindcss-eslint stalled on v4. Deslint covers both.
              </span>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
