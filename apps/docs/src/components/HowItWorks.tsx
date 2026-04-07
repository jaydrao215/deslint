'use client';

import { FadeIn, StaggerContainer, StaggerItem } from './motion';
import { Terminal, Scan, Wrench, Shield } from 'lucide-react';
import type { ReactNode } from 'react';

const STEPS: { icon: ReactNode; step: string; title: string; description: string; code: string }[] = [
  {
    icon: <Terminal className="h-5 w-5" />,
    step: '01',
    title: 'Install',
    description: 'Add to any existing ESLint setup. Zero config required with the recommended preset.',
    code: `import vizlint from '@vizlint/eslint-plugin';\n\nexport default [\n  vizlint.configs.recommended,\n];`,
  },
  {
    icon: <Scan className="h-5 w-5" />,
    step: '02',
    title: 'Scan',
    description: 'Run vizlint scan to analyze your codebase and get a Design Health Score from 0-100.',
    code: `$ npx vizlint scan\n\n  Design Health Score: 72/100\n  Colors ███████░░░ 68  warn\n  Spacing █████████░ 85  pass\n  Typography ████████░░ 76  warn`,
  },
  {
    icon: <Wrench className="h-5 w-5" />,
    step: '03',
    title: 'Fix',
    description: 'Auto-fix violations instantly. Interactive mode lets you review each change.',
    code: `$ npx vizlint fix --all\n\n  ✓ Fixed 23 violations\n  ✓ 12 colors → design tokens\n  ✓ 8 spacing → scale values\n  ✓ 3 typography → type scale`,
  },
  {
    icon: <Shield className="h-5 w-5" />,
    step: '04',
    title: 'Gate',
    description: 'Add to CI/CD. Block merges when the score drops below your threshold.',
    code: `- name: Design Quality Gate\n  run: npx vizlint scan --min-score 80\n  # Exit code 1 if score < 80`,
  },
];

export function HowItWorks() {
  return (
    <section className="relative py-24 px-6 bg-surface-100 overflow-hidden">
      <div className="mx-auto max-w-6xl">
        <FadeIn className="text-center mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
            How it works
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 text-balance">
            Four steps to design consistency
          </h2>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            From install to CI gate in under 5 minutes.
          </p>
        </FadeIn>

        <StaggerContainer className="grid md:grid-cols-2 gap-6" staggerDelay={0.1}>
          {STEPS.map((step) => (
            <StaggerItem key={step.step}>
              <div className="group relative rounded-xl border border-gray-200/80 bg-white overflow-hidden transition-all duration-300 hover:border-gray-300 hover:shadow-lg hover:shadow-gray-200/50">
                {/* Header */}
                <div className="flex items-center gap-3 px-5 pt-5 pb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/5 text-primary border border-primary/10 group-hover:bg-primary group-hover:text-white transition-all">
                    {step.icon}
                  </div>
                  <div>
                    <span className="text-xs font-mono text-primary/50 uppercase tracking-widest">
                      Step {step.step}
                    </span>
                    <h3 className="text-lg font-semibold text-gray-900 -mt-0.5">{step.title}</h3>
                  </div>
                </div>
                <p className="text-sm text-gray-500 leading-relaxed px-5 pb-4">
                  {step.description}
                </p>
                {/* Code block */}
                <div className="bg-gray-950 px-5 py-4 font-mono text-xs text-gray-300 leading-relaxed border-t border-gray-800/50 overflow-x-auto">
                  <pre className="whitespace-pre">{step.code}</pre>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
