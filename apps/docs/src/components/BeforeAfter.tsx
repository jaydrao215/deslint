'use client';

import { FadeIn, ScaleIn } from './motion';
import { CircleX, CircleCheck, ArrowRight } from 'lucide-react';

const BEFORE_LINES = [
  { num: 1, text: '// AI-generated code — design issues everywhere', dim: true },
  { num: 2, text: 'const Card = () => (' },
  { num: 3, text: '  <div className="', after: 'bg-[#1a5276] p-[13px]', afterBad: true, end: '">' },
  { num: 4, text: '    <h2 className="', after: 'text-[#fff] text-[18px]', afterBad: true, end: '">' },
  { num: 5, text: '      Dashboard' },
  { num: 6, text: '    </h2>' },
  { num: 7, text: '    <p className="', after: 'text-[#aaa] gap-[20px]', afterBad: true, end: '">' },
  { num: 8, text: '      Welcome back' },
  { num: 9, text: '    </p>' },
  { num: 10, text: '  </div>' },
  { num: 11, text: ');' },
];

const AFTER_LINES = [
  { num: 1, text: '// After deslint fix — clean design tokens', dim: true },
  { num: 2, text: 'const Card = () => (' },
  { num: 3, text: '  <div className="', after: 'bg-primary p-3', afterGood: true, end: '">' },
  { num: 4, text: '    <h2 className="', after: 'text-white text-lg', afterGood: true, end: '">' },
  { num: 5, text: '      Dashboard' },
  { num: 6, text: '    </h2>' },
  { num: 7, text: '    <p className="', after: 'text-gray-400 gap-5', afterGood: true, end: '">' },
  { num: 8, text: '      Welcome back' },
  { num: 9, text: '    </p>' },
  { num: 10, text: '  </div>' },
  { num: 11, text: ');' },
];

const VIOLATIONS = [
  { rule: 'no-arbitrary-colors', fix: 'bg-[#1a5276] → bg-primary' },
  { rule: 'no-arbitrary-spacing', fix: 'p-[13px] → p-3' },
  { rule: 'no-arbitrary-colors', fix: 'text-[#fff] → text-white' },
  { rule: 'no-arbitrary-typography', fix: 'text-[18px] → text-lg' },
  { rule: 'no-arbitrary-colors', fix: 'text-[#aaa] → text-gray-400' },
  { rule: 'no-arbitrary-spacing', fix: 'gap-[20px] → gap-5' },
];

export function BeforeAfter() {
  return (
    <section className="relative py-24 px-6 bg-surface-100">
      <div className="mx-auto max-w-6xl">
        <FadeIn className="text-center mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
            See it in action
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 text-balance">
            From arbitrary values to design tokens
          </h2>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            Deslint detects design drift in AI-generated code and auto-fixes it
            to match your design system.
          </p>
        </FadeIn>

        {/* Code Comparison */}
        <div className="grid lg:grid-cols-2 gap-6 items-start">
          {/* Before */}
          <ScaleIn delay={0.1}>
            <div className="code-block group">
              <div className="code-block-header">
                <div className="flex gap-1.5">
                  <span className="code-block-dot bg-fail/80" />
                  <span className="code-block-dot bg-warn/60" />
                  <span className="code-block-dot bg-gray-600" />
                </div>
                <div className="flex items-center gap-2 ml-3">
                  <CircleX className="h-3.5 w-3.5 text-fail" />
                  <span className="text-xs font-medium text-fail">6 violations found</span>
                </div>
                <span className="ml-auto text-xs text-gray-500 font-mono">Card.tsx</span>
              </div>
              <div className="p-4 text-[13px] leading-6 overflow-x-auto">
                {BEFORE_LINES.map((line) => (
                  <div key={line.num} className="flex">
                    <span className="w-8 text-right text-gray-600 select-none mr-4 shrink-0">
                      {line.num}
                    </span>
                    <span className={line.dim ? 'text-gray-600' : 'text-gray-300'}>
                      {line.text}
                      {line.afterBad && (
                        <span className="text-fail-light bg-fail/10 rounded px-0.5">{line.after}</span>
                      )}
                      {line.end ?? ''}
                    </span>
                  </div>
                ))}
              </div>
              {/* Violations */}
              <div className="border-t border-gray-800/50 bg-gray-900/40 px-4 py-3 space-y-1.5">
                {VIOLATIONS.map((v, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs font-mono">
                    <CircleX className="h-3 w-3 text-fail shrink-0" />
                    <span className="text-gray-500">{v.rule}</span>
                    <span className="text-gray-400">{v.fix}</span>
                  </div>
                ))}
              </div>
            </div>
          </ScaleIn>

          {/* After */}
          <ScaleIn delay={0.2}>
            <div className="code-block group">
              <div className="code-block-header">
                <div className="flex gap-1.5">
                  <span className="code-block-dot bg-pass/80" />
                  <span className="code-block-dot bg-pass/50" />
                  <span className="code-block-dot bg-gray-600" />
                </div>
                <div className="flex items-center gap-2 ml-3">
                  <CircleCheck className="h-3.5 w-3.5 text-pass" />
                  <span className="text-xs font-medium text-pass">All fixed</span>
                </div>
                <span className="ml-auto text-xs text-gray-500 font-mono">Card.tsx</span>
              </div>
              <div className="p-4 text-[13px] leading-6 overflow-x-auto">
                {AFTER_LINES.map((line) => (
                  <div key={line.num} className="flex">
                    <span className="w-8 text-right text-gray-600 select-none mr-4 shrink-0">
                      {line.num}
                    </span>
                    <span className={line.dim ? 'text-gray-600' : 'text-gray-300'}>
                      {line.text}
                      {line.afterGood && (
                        <span className="text-pass-light bg-pass/10 rounded px-0.5">{line.after}</span>
                      )}
                      {line.end ?? ''}
                    </span>
                  </div>
                ))}
              </div>
              {/* Score */}
              <div className="border-t border-gray-800/50 bg-gray-900/40 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <CircleCheck className="h-3 w-3 text-pass" />
                    <span className="text-pass">Design Health Score: 100/100</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <span>deslint fix --all</span>
                    <ArrowRight className="h-3 w-3" />
                  </div>
                </div>
              </div>
            </div>
          </ScaleIn>
        </div>
      </div>
    </section>
  );
}
