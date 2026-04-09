'use client';

import { FadeIn, StaggerContainer, StaggerItem } from './motion';
import { Code2, Terminal, Sparkles, GitPullRequest } from 'lucide-react';
import type { ReactNode } from 'react';

interface Surface {
  icon: ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  bullets: string[];
}

const SURFACES: Surface[] = [
  {
    icon: <Code2 className="h-5 w-5" />,
    eyebrow: 'IDE',
    title: 'ESLint plugin',
    description:
      'Squiggles in your editor as you type. Drops into any flat-config ESLint v10 setup — no new toolchain.',
    bullets: [
      '14 rules, all try/catch wrapped',
      'Autofix for color + spacing drift',
      'Works with existing rules',
    ],
  },
  {
    icon: <Terminal className="h-5 w-5" />,
    eyebrow: 'CI',
    title: 'CLI + HTML compliance report',
    description:
      'One command produces a shareable WCAG 2.2 report with per-criterion evidence — mail it to an auditor.',
    bullets: [
      'deslint scan / fix / report',
      'Design Health Score 0–100',
      'Self-contained HTML, no assets',
    ],
  },
  {
    icon: <Sparkles className="h-5 w-5" />,
    eyebrow: 'AGENT',
    title: 'MCP server',
    description:
      'Cursor, Claude Code, and Copilot call Deslint directly — the agent fixes its own violations before you see them.',
    bullets: [
      'Self-correction loop for AI codegen',
      'Structured diagnostics over MCP',
      'No screenshots, no cloud roundtrip',
    ],
  },
  {
    icon: <GitPullRequest className="h-5 w-5" />,
    eyebrow: 'PR',
    title: 'GitHub Action',
    description:
      'Block PRs that regress the Design Health Score or fail an accessibility criterion you care about.',
    bullets: [
      'Quality-gate thresholds per category',
      'PR annotations with rule links',
      'Same engine as local scan',
    ],
  },
];

export function Surfaces() {
  return (
    <section className="relative py-24 px-6 bg-white">
      <div className="mx-auto max-w-6xl">
        <FadeIn className="mb-16 max-w-2xl">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
            One engine, four surfaces
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 text-balance">
            Meet developers where they already work
          </h2>
          <p className="text-lg text-gray-500 leading-relaxed">
            The same deterministic rule engine drives your editor, your CI pipeline,
            your AI coding agent, and your pull request checks. No duplicated config,
            no divergent results.
          </p>
        </FadeIn>

        <StaggerContainer className="grid gap-6 md:grid-cols-2" staggerDelay={0.08}>
          {SURFACES.map((s) => (
            <StaggerItem key={s.title}>
              <div className="group h-full rounded-2xl border border-gray-200/80 bg-white p-7 transition-all duration-300 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-0.5">
                <div className="flex items-start gap-4 mb-4">
                  <div className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-primary/5 text-primary border border-primary/10 group-hover:bg-primary group-hover:text-white transition-all">
                    {s.icon}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-mono text-primary/60 uppercase tracking-widest">
                      {s.eyebrow}
                    </span>
                    <h3 className="text-xl font-semibold text-gray-900 -mt-0.5">
                      {s.title}
                    </h3>
                  </div>
                </div>
                <p className="text-sm text-gray-500 leading-relaxed mb-5">
                  {s.description}
                </p>
                <ul className="space-y-2">
                  {s.bullets.map((b) => (
                    <li
                      key={b}
                      className="flex items-start gap-2.5 text-sm text-gray-600"
                    >
                      <span className="mt-1.5 h-1 w-1 flex-none rounded-full bg-primary/40" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
