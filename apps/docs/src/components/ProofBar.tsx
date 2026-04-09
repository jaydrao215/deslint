'use client';

import { FadeIn } from './motion';

interface Metric {
  value: string;
  label: string;
  sublabel: string;
}

const METRICS: Metric[] = [
  {
    value: '14',
    label: 'Deterministic rules',
    sublabel: 'No AI, no LLM, no cloud',
  },
  {
    value: '0%',
    label: 'False positive rate',
    sublabel: 'Validated on Vintor + OSS',
  },
  {
    value: '< 2ms',
    label: 'Per-rule per-file',
    sublabel: 'Enforced in CI benchmark',
  },
  {
    value: '1000+',
    label: 'Tests across packages',
    sublabel: 'Every rule: valid + invalid + fix',
  },
];

export function ProofBar() {
  return (
    <section className="relative py-20 px-6 bg-white border-y border-gray-200/80">
      <div className="mx-auto max-w-6xl">
        <FadeIn className="mb-10 text-center max-w-2xl mx-auto">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
            Trust by construction
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 text-balance">
            A linter you can actually leave on
          </h2>
          <p className="text-lg text-gray-500 leading-relaxed mt-4">
            Every rule is deterministic, fast, and benchmarked. No flaky
            screenshots, no cloud roundtrips, no hidden tokens.
          </p>
        </FadeIn>

        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {METRICS.map((m, i) => (
            <FadeIn key={m.label} delay={i * 0.08}>
              <div className="text-center">
                <div className="text-4xl sm:text-5xl font-bold text-primary tracking-tight mb-2">
                  {m.value}
                </div>
                <div className="text-sm font-semibold text-gray-900 mb-1">
                  {m.label}
                </div>
                <div className="text-xs text-gray-500">{m.sublabel}</div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
