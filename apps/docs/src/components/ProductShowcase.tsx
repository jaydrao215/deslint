'use client';

import { FadeIn } from './motion';
import { EditorMockup } from './mockups/EditorMockup';
import { TerminalMockup } from './mockups/TerminalMockup';
import { PRReviewMockup } from './mockups/PRReviewMockup';
import { Code2, Terminal, GitPullRequest, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * "One engine, four surfaces" — but as actual product showcase, not icons
 * in boxes. Each surface gets a full-width alternating row with a live,
 * hand-coded mockup showing what the product actually looks like there.
 */
interface Surface {
  eyebrow: string;
  title: string;
  description: string;
  bullets: { icon: ReactNode; text: string }[];
  visual: ReactNode;
  reverse?: boolean;
}

export function ProductShowcase() {
  const surfaces: Surface[] = [
    {
      eyebrow: '01 · In your editor',
      title: 'Squiggles as you type',
      description:
        'ESLint v10 flat config plugin. Drop into any existing setup — no new toolchain, no peer-dep war. Errors and autofixes appear in Cursor, VS Code, WebStorm, and every ESLint-aware IDE instantly.',
      bullets: [
        { icon: <Code2 className="h-4 w-4" />, text: 'React, Vue, Svelte, Angular, HTML' },
        { icon: <Sparkles className="h-4 w-4" />, text: 'Autofix for color + spacing drift' },
        { icon: <ShieldIcon />, text: 'Every rule try/catch wrapped — never crashes lint' },
      ],
      visual: <EditorMockup />,
    },
    {
      eyebrow: '02 · In your terminal',
      title: 'Design Health Score for the whole codebase',
      description:
        'One command scans every file, produces a 0–100 Design Health Score, and generates a self-contained HTML compliance report you can email to legal or attach to a SOC 2 audit.',
      bullets: [
        { icon: <Terminal className="h-4 w-4" />, text: 'deslint scan / fix / compliance / trend' },
        { icon: <ChartIcon />, text: 'Per-category scores + violation breakdown' },
        { icon: <FileIcon />, text: 'WCAG 2.2 + 2.1 AA report, no external assets' },
      ],
      visual: <TerminalMockup />,
      reverse: true,
    },
    {
      eyebrow: '03 · In your pull requests',
      title: 'Block drift before it lands',
      description:
        'GitHub Action runs the same engine as your local scan. Posts inline review comments with rule ID, WCAG mapping, and a commit-ready suggested change. Fails the check when the score drops below your threshold.',
      bullets: [
        { icon: <GitPullRequest className="h-4 w-4" />, text: 'Inline review comments on the offending line' },
        { icon: <WcagIcon />, text: 'Every violation linked to its WCAG criterion' },
        { icon: <GateIcon />, text: 'Configurable gate: min-score, per-category, fail-on a11y' },
      ],
      visual: <PRReviewMockup />,
    },
  ];

  return (
    <section className="relative py-24 px-6 bg-white overflow-hidden">
      <div className="mx-auto max-w-6xl">
        <FadeIn className="mb-20 max-w-2xl">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
            One engine, everywhere you work
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 text-balance">
            Same rules in your editor, CI, and PR
          </h2>
          <p className="text-lg text-gray-500 leading-relaxed">
            Configure Deslint once in your flat config. Every surface — IDE,
            terminal, GitHub Action, MCP agent — runs the same deterministic rule
            engine against the same config. No duplicated rules, no divergent
            results, no &quot;it passed locally&quot; drift.
          </p>
        </FadeIn>

        <div className="space-y-28 sm:space-y-32">
          {surfaces.map((s) => (
            <SurfaceRow key={s.title} surface={s} />
          ))}
        </div>
      </div>
    </section>
  );
}

function SurfaceRow({ surface }: { surface: Surface }) {
  const copyCol = (
    <FadeIn direction={surface.reverse ? 'right' : 'left'}>
      <div className="max-w-lg">
        <p className="text-xs font-mono font-semibold text-primary/70 uppercase tracking-[0.18em] mb-3">
          {surface.eyebrow}
        </p>
        <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 leading-tight text-balance">
          {surface.title}
        </h3>
        <p className="text-base text-gray-500 leading-relaxed mb-6">
          {surface.description}
        </p>
        <ul className="space-y-3">
          {surface.bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="flex-none flex h-7 w-7 items-center justify-center rounded-lg bg-primary/5 text-primary border border-primary/10 mt-0.5">
                {b.icon}
              </span>
              <span className="text-sm text-gray-700 leading-relaxed pt-0.5">
                {b.text}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </FadeIn>
  );

  const visualCol = (
    <FadeIn direction={surface.reverse ? 'left' : 'right'} delay={0.1}>
      {surface.visual}
    </FadeIn>
  );

  return (
    <div className="grid gap-12 lg:grid-cols-12 lg:gap-14 items-center">
      <div
        className={`lg:col-span-5 ${surface.reverse ? 'lg:order-2' : ''}`}
      >
        {copyCol}
      </div>
      <div
        className={`lg:col-span-7 ${surface.reverse ? 'lg:order-1' : ''}`}
      >
        {visualCol}
      </div>
    </div>
  );
}

function ShieldIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2L4 6v6c0 5 3.5 9.5 8 10 4.5-.5 8-5 8-10V6l-8-4z" />
    </svg>
  );
}
function ChartIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M7 15l4-4 4 4 6-6" />
    </svg>
  );
}
function FileIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM14 2v6h6M10 14h4M10 18h4" />
    </svg>
  );
}
function WcagIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" d="M8 12l3 3 5-6" />
    </svg>
  );
}
function GateIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <path strokeLinecap="round" d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  );
}
