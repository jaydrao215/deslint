'use client';

import { FadeIn } from './motion';
import { Scale, ShieldCheck } from 'lucide-react';

/**
 * WCAG coverage section.
 *
 * Keep this list in sync with packages/shared/src/compliance.ts WCAG_CRITERIA.
 * If the evaluator changes, this table must change with it — there's a guard
 * test in packages/shared/tests/compliance.test.ts that enforces the 2.1
 * equivalence set, but the landing copy is manual.
 */
interface Criterion {
  id: string;
  title: string;
  level: 'A' | 'AA';
}

const CRITERIA: Criterion[] = [
  { id: '1.1.1', title: 'Non-text Content', level: 'A' },
  { id: '1.3.1', title: 'Info and Relationships', level: 'A' },
  { id: '1.4.3', title: 'Contrast (Minimum)', level: 'AA' },
  { id: '1.4.4', title: 'Resize Text', level: 'AA' },
  { id: '1.4.10', title: 'Reflow', level: 'AA' },
  { id: '1.4.11', title: 'Non-text Contrast', level: 'AA' },
  { id: '1.4.12', title: 'Text Spacing', level: 'AA' },
  { id: '2.4.4', title: 'Link Purpose (In Context)', level: 'A' },
  { id: '2.4.6', title: 'Headings and Labels', level: 'AA' },
  { id: '2.4.7', title: 'Focus Visible', level: 'AA' },
  { id: '3.1.1', title: 'Language of Page', level: 'A' },
  { id: '3.3.2', title: 'Labels or Instructions', level: 'A' },
  { id: '4.1.2', title: 'Name, Role, Value', level: 'A' },
];

export function AccessibilitySection() {
  return (
    <section className="relative py-24 px-6 bg-white overflow-hidden">
      <div className="mx-auto max-w-6xl">
        <div className="grid lg:grid-cols-12 gap-12">
          {/* Left column — message */}
          <FadeIn className="lg:col-span-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary-50/60 px-3 py-1 text-xs font-semibold text-primary uppercase tracking-wider mb-4">
              <Scale className="h-3.5 w-3.5" />
              ADA Title II ready
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-5 text-balance">
              Accessibility, treated as a legal requirement —
              not a checkbox
            </h2>
            <p className="text-lg text-gray-500 leading-relaxed mb-6">
              The 2024 ADA Title II rule locks public entities to WCAG 2.1 Level AA.
              Every criterion Deslint statically detects is in that set, so a passing
              scan doubles as real compliance evidence.
            </p>
            <p className="text-sm text-gray-500 leading-relaxed mb-6">
              Every violation links to the W3C specification. The compliance report
              is a single self-contained HTML file — email it to your counsel,
              attach it to a SOC 2 audit, or drop it into a Jira ticket.
            </p>
            <div className="flex items-start gap-3 rounded-xl border border-gray-200/80 bg-surface-100 p-4">
              <ShieldCheck className="h-5 w-5 flex-none text-pass mt-0.5" />
              <p className="text-sm text-gray-600 leading-relaxed">
                <strong className="text-gray-900">13 WCAG criteria</strong>{' '}
                statically detected today. Everything Deslint cannot verify is
                flagged as &quot;manual review required&quot; — no false
                all-clear.
              </p>
            </div>
          </FadeIn>

          {/* Right column — criteria table */}
          <FadeIn className="lg:col-span-7" delay={0.15}>
            <div className="rounded-2xl border border-gray-200/80 bg-white overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200/80 bg-surface-100">
                <span className="text-xs font-semibold text-gray-900 uppercase tracking-wider">
                  WCAG 2.2 / 2.1 criteria covered
                </span>
                <span className="text-xs text-gray-500">13 / 13 mapped</span>
              </div>
              <ul className="divide-y divide-gray-100">
                {CRITERIA.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center gap-4 px-5 py-3 hover:bg-surface-50 transition-colors"
                  >
                    <code className="text-xs font-mono text-primary font-semibold w-12 flex-none">
                      {c.id}
                    </code>
                    <span className="text-sm text-gray-700 flex-grow">{c.title}</span>
                    <span
                      className={
                        c.level === 'A'
                          ? 'text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded'
                          : 'text-[10px] font-bold text-primary-dark bg-primary/15 px-2 py-0.5 rounded'
                      }
                    >
                      {c.level}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="px-5 py-3 border-t border-gray-200/80 bg-surface-100">
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  5 Level A &middot; 8 Level AA. Conformance is computed
                  &quot;at-or-below&quot;: one Level A failure drops the whole
                  claim to Not Met.
                </p>
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
