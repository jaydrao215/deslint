'use client';

import { FadeIn, StaggerContainer, StaggerItem } from './motion';
import { Terminal, Scan, Wrench, Shield } from 'lucide-react';
import type { ReactNode } from 'react';

interface Step {
  icon: ReactNode;
  step: string;
  title: string;
  description: string;
  code: string;
}

const STEPS: Step[] = [
  {
    icon: <Terminal className="h-5 w-5" />,
    step: '01',
    title: 'Install',
    description:
      'Add to any existing ESLint v10 flat config. Zero new toolchain, zero peer-dep conflicts.',
    code: `import deslint from '@deslint/eslint-plugin';\n\nexport default [\n  deslint.configs.recommended,\n];`,
  },
  {
    icon: <Scan className="h-5 w-5" />,
    step: '02',
    title: 'Scan',
    description:
      'One command gives you a Design Health Score and a shareable HTML compliance report for the whole codebase.',
    code: `$ npx deslint scan\n\n  Design Health Score: 72 / 100\n  Colors      ███████░░░ 68  warn\n  Spacing     █████████░ 85  pass\n  Typography  ████████░░ 76  warn\n  A11y (WCAG) ██████░░░░ 61  fail`,
  },
  {
    icon: <Wrench className="h-5 w-5" />,
    step: '03',
    title: 'Fix',
    description:
      'Autofix deterministic violations. MCP mode lets your AI agent fix its own output before you see it.',
    code: `$ npx deslint fix --all\n\n  ✓ Fixed 23 violations\n  ✓ 12 colors → design tokens\n  ✓ 8 spacing → scale values\n  ✓ 3 typography → type scale`,
  },
  {
    icon: <Shield className="h-5 w-5" />,
    step: '04',
    title: 'Gate',
    description:
      'Block merges when the score drops or an accessibility criterion regresses. One job, both concerns.',
    code: `- name: Deslint quality gate\n  run: npx deslint scan --min-score 80 \\\n       --fail-on a11y\n  # Exit 1 if score < 80 or any WCAG fail`,
  },
];

export function HowItWorks() {
  return (
    <section className="relative py-24 px-6 bg-white overflow-hidden">
      <div className="mx-auto max-w-6xl">
        <FadeIn className="mb-16 max-w-2xl">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
            How it works
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 text-balance">
            From install to merge gate in under 5 minutes
          </h2>
          <p className="text-lg text-gray-500 leading-relaxed">
            Same engine powers your editor, CI, agent, and PR check. Configure
            once in your flat config and every surface stays in sync.
          </p>
        </FadeIn>

        <StaggerContainer className="grid md:grid-cols-2 gap-6" staggerDelay={0.1}>
          {STEPS.map((step) => (
            <StaggerItem key={step.step}>
              <div className="group relative rounded-xl border border-gray-200/80 bg-white overflow-hidden transition-all duration-300 hover:border-gray-300 hover:shadow-lg hover:shadow-gray-200/50">
                <div className="flex items-center gap-3 px-5 pt-5 pb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/5 text-primary border border-primary/10 group-hover:bg-primary group-hover:text-white transition-all">
                    {step.icon}
                  </div>
                  <div>
                    <span className="text-xs font-mono text-primary/50 uppercase tracking-widest">
                      Step {step.step}
                    </span>
                    <h3 className="text-lg font-semibold text-gray-900 -mt-0.5">
                      {step.title}
                    </h3>
                  </div>
                </div>
                <p className="text-sm text-gray-500 leading-relaxed px-5 pb-4">
                  {step.description}
                </p>
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
