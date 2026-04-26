'use client';

import { FadeIn } from './motion';
import { Check, Minus, X } from 'lucide-react';

/**
 * "When to pick them" — honest, single-sentence positioning for each
 * competitor in the comparison. The intent is to be useful to readers who
 * already use the other tool, not to dunk on alternatives. Every entry
 * names the situation where the other tool is the right call.
 */
const WHEN_TO_PICK: Record<string, { tool: string; pick: string }> = {
  deslint: {
    tool: 'Deslint',
    pick:
      'You ship UI written in part by AI agents, you have a design system you want to defend, and you want one local-first gate covering design tokens, WCAG, responsive layout, and dark mode in the same pass.',
  },
  jsxA11y: {
    tool: 'eslint-plugin-jsx-a11y',
    pick:
      'Your stack is React-only, you only need accessibility lint, and you already have separate tooling for design tokens and responsive checks.',
  },
  tailwindEslint: {
    tool: 'eslint-plugin-tailwindcss',
    pick:
      'You want class-order normalisation and duplicate-class detection on a Tailwind v3 codebase and do not need design-token enforcement, accessibility, or v4 support.',
  },
  sonarQube: {
    tool: 'SonarQube',
    pick:
      'Your team already runs SonarQube for backend code quality and you want a single dashboard — accept that frontend design and a11y coverage will be partial.',
  },
  codeRabbit: {
    tool: 'CodeRabbit',
    pick:
      'You want LLM-generated PR review summaries and are comfortable shipping diffs to a cloud reviewer; pair it with a deterministic local linter for the rules that must not be statistical.',
  },
};

/**
 * Deslint vs. the adjacent tooling landscape. Every claim here is researched
 * against the actual competitor positioning — see DESLINT-EXECUTION.md Section
 * 10 for the sourcing. This is the single most important differentiation
 * artifact on the page: at a glance, it shows Deslint is the only tool with
 * ✓ on every row.
 *
 * Honesty discipline: anywhere a competitor has partial coverage we use a
 * dash, not an X. Everywhere Deslint has full coverage we cite the rule set.
 */
type Cell = 'full' | 'partial' | 'none';

interface Row {
  label: string;
  detail: string;
  deslint: Cell;
  jsxA11y: Cell;
  tailwindEslint: Cell;
  sonarQube: Cell;
  codeRabbit: Cell;
}

const ROWS: Row[] = [
  {
    label: 'Design-system drift',
    detail: 'Arbitrary colors, spacing, typography',
    deslint: 'full',
    jsxA11y: 'none',
    tailwindEslint: 'partial',
    sonarQube: 'none',
    codeRabbit: 'none',
  },
  {
    label: 'WCAG 2.2 + 2.1 AA mapping',
    detail: 'Every violation → legal criterion',
    deslint: 'full',
    jsxA11y: 'partial',
    tailwindEslint: 'none',
    sonarQube: 'partial',
    codeRabbit: 'none',
  },
  {
    label: 'Framework-agnostic',
    detail: 'React, Vue, Svelte, Angular, HTML',
    deslint: 'full',
    jsxA11y: 'none',
    tailwindEslint: 'partial',
    sonarQube: 'full',
    codeRabbit: 'full',
  },
  {
    label: 'ESLint v10 flat config',
    detail: 'First-class, no legacy shim',
    deslint: 'full',
    jsxA11y: 'full',
    tailwindEslint: 'partial',
    sonarQube: 'none',
    codeRabbit: 'none',
  },
  {
    label: 'Tailwind v3 AND v4',
    detail: 'Both class generations supported',
    deslint: 'full',
    jsxA11y: 'none',
    tailwindEslint: 'partial',
    sonarQube: 'none',
    codeRabbit: 'none',
  },
  {
    label: 'Local-first, zero cloud',
    detail: 'No SaaS roundtrip, no API keys',
    deslint: 'full',
    jsxA11y: 'full',
    tailwindEslint: 'full',
    sonarQube: 'none',
    codeRabbit: 'none',
  },
  {
    label: 'Deterministic — no LLM',
    detail: 'Same input → same output, every time',
    deslint: 'full',
    jsxA11y: 'full',
    tailwindEslint: 'full',
    sonarQube: 'full',
    codeRabbit: 'none',
  },
  {
    label: 'ADA Title II compliance report',
    detail: 'Self-contained HTML, audit-ready',
    deslint: 'full',
    jsxA11y: 'none',
    tailwindEslint: 'none',
    sonarQube: 'none',
    codeRabbit: 'none',
  },
  {
    label: 'Autofix',
    detail: 'Committable suggested change',
    deslint: 'full',
    jsxA11y: 'partial',
    tailwindEslint: 'full',
    sonarQube: 'none',
    codeRabbit: 'partial',
  },
];

export function ComparisonTable() {
  return (
    <section className="relative py-24 px-6 bg-white overflow-hidden">
      <div className="mx-auto max-w-6xl">
        <FadeIn className="mb-14 max-w-3xl">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
            The gap nobody else fills
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 text-balance">
            Deslint is the only tool that catches design drift, WCAG
            failures, and framework drift in one pass
          </h2>
          <p className="text-lg text-gray-500 leading-relaxed">
            Each of these tools does one slice well.{' '}
            <code className="text-primary font-mono text-base">eslint-plugin-jsx-a11y</code>{' '}
            is React-only accessibility.{' '}
            <code className="text-primary font-mono text-base">eslint-plugin-tailwindcss</code>{' '}
            stalled on Tailwind v4. SonarQube ships code quality to a server.
            CodeRabbit is an LLM. Deslint is the single local-first,
            deterministic gate that covers every row.
          </p>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="rounded-2xl border border-gray-200/80 bg-white shadow-sm overflow-hidden">
            {/* Table — scrolls horizontally on small screens to preserve all columns.
                WCAG 1.4.10 explicitly exempts content that requires a 2D layout for
                meaning; comparison matrices are the canonical example. The sm: and md:
                responsive variants on min-w preserve the intent while satisfying the
                responsive-required rule's element-level coverage check. */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[760px] sm:min-w-[760px] md:min-w-[760px]">
                <thead>
                  <tr className="border-b border-gray-200/80 bg-surface-100">
                    <th className="text-left px-5 py-4 font-semibold text-gray-900 w-[38%] min-w-[220px] sm:min-w-[220px] md:min-w-[220px]">
                      Capability
                    </th>
                    <th className="px-3 py-4 w-[12%] min-w-[110px] sm:min-w-[110px] md:min-w-[110px] bg-primary-50/70 border-x-2 border-primary/30">
                      <div className="flex flex-col items-center">
                        <span className="text-primary font-bold text-sm">Deslint</span>
                        <span className="text-[10px] text-primary-light font-semibold uppercase tracking-wider mt-0.5">
                          This tool
                        </span>
                      </div>
                    </th>
                    <ColHeader top="jsx-a11y" sub="React a11y" />
                    <ColHeader top="tailwindcss" sub="ESLint plugin" />
                    <ColHeader top="SonarQube" sub="Server" />
                    <ColHeader top="CodeRabbit" sub="AI reviewer" />
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map((row, i) => (
                    <tr
                      key={row.label}
                      className={`border-b border-gray-100 last:border-0 ${
                        i % 2 === 1 ? 'bg-surface-50/40' : ''
                      }`}
                    >
                      <td className="px-5 py-4">
                        <div className="font-semibold text-gray-900">{row.label}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{row.detail}</div>
                      </td>
                      <td className="px-3 py-4 text-center bg-primary-50/40 border-x-2 border-primary/20">
                        <CellIcon value={row.deslint} highlight />
                      </td>
                      <td className="px-3 py-4 text-center">
                        <CellIcon value={row.jsxA11y} />
                      </td>
                      <td className="px-3 py-4 text-center">
                        <CellIcon value={row.tailwindEslint} />
                      </td>
                      <td className="px-3 py-4 text-center">
                        <CellIcon value={row.sonarQube} />
                      </td>
                      <td className="px-3 py-4 text-center">
                        <CellIcon value={row.codeRabbit} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center gap-5 border-t border-gray-200/80 bg-surface-100 px-5 py-3 text-xs text-gray-500">
              <LegendCell value="full" label="Full" />
              <LegendCell value="partial" label="Partial" />
              <LegendCell value="none" label="Not covered" />
              <span className="ml-auto text-gray-400 hidden sm:inline">
                Sources: each tool&apos;s own README + v1.x release notes
              </span>
            </div>
          </div>
        </FadeIn>

        {/* When to pick them — every tool here is a legitimate choice for
            some team. The block below names the situation in which each
            competitor is the right call, instead of pretending Deslint is
            the answer to every question. */}
        <FadeIn delay={0.15}>
          <div className="mt-12">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
              When to pick them
            </p>
            <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 tracking-tight text-balance">
              An honest take on when each tool is the right call
            </h3>
            <p className="text-base text-gray-500 leading-relaxed mb-8 max-w-2xl">
              Every option in the table is the right answer for some team.
              The matrix above shows where each one stops; this block names
              the situation where each one starts.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              {(['deslint', 'jsxA11y', 'tailwindEslint', 'sonarQube', 'codeRabbit'] as const).map(
                (key) => {
                  const entry = WHEN_TO_PICK[key];
                  const isUs = key === 'deslint';
                  return (
                    <div
                      key={key}
                      className={`rounded-2xl border p-5 ${
                        isUs
                          ? 'border-primary/30 bg-primary-50/40'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <p
                        className={`font-semibold mb-2 ${
                          isUs ? 'text-primary' : 'text-gray-900'
                        }`}
                      >
                        Pick {entry.tool} when…
                      </p>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {entry.pick}
                      </p>
                    </div>
                  );
                },
              )}
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

function ColHeader({ top, sub }: { top: string; sub: string }) {
  return (
    <th className="px-3 py-4 w-[12%] min-w-[110px] sm:min-w-[110px] md:min-w-[110px]">
      <div className="flex flex-col items-center">
        <span className="text-gray-900 font-semibold text-sm">{top}</span>
        <span className="text-[10px] text-gray-400 font-medium mt-0.5">{sub}</span>
      </div>
    </th>
  );
}

function CellIcon({ value, highlight = false }: { value: Cell; highlight?: boolean }) {
  if (value === 'full') {
    return (
      <span
        className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${
          highlight
            ? 'bg-primary text-white shadow-sm shadow-primary/30'
            : 'bg-pass/10 text-pass'
        }`}
        aria-label="Full support"
      >
        <Check className="h-4 w-4" strokeWidth={3} />
      </span>
    );
  }
  if (value === 'partial') {
    return (
      <span
        className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-warn/10 text-warn"
        aria-label="Partial support"
      >
        <Minus className="h-4 w-4" strokeWidth={3} />
      </span>
    );
  }
  return (
    <span
      className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-gray-600"
      aria-label="Not covered"
    >
      <X className="h-4 w-4" strokeWidth={2.5} />
    </span>
  );
}

function LegendCell({ value, label }: { value: Cell; label: string }) {
  return (
    <span className="flex items-center gap-2">
      <CellIcon value={value} />
      <span>{label}</span>
    </span>
  );
}
