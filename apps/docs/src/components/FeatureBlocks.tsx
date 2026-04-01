'use client';

import { StaggerContainer, StaggerItem, FadeIn } from './motion';
import {
  Palette,
  Ruler,
  Type,
  Monitor,
  LayoutGrid,
  Accessibility,
  FileCode,
  AlertTriangle,
  Moon,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface RuleCard {
  icon: ReactNode;
  title: string;
  slug: string;
  category: string;
  categoryColor: string;
  description: string;
  autofix: boolean;
  example: string;
}

const RULES: RuleCard[] = [
  {
    icon: <Palette className="h-5 w-5" />,
    title: 'no-arbitrary-colors',
    slug: 'colors',
    category: 'Colors',
    categoryColor: 'text-fail bg-fail/10 border-fail/20',
    description: 'Flags hex, rgb, hsl arbitrary color values and suggests design tokens.',
    autofix: true,
    example: 'bg-[#FF0000] → bg-red-500',
  },
  {
    icon: <Ruler className="h-5 w-5" />,
    title: 'no-arbitrary-spacing',
    slug: 'spacing',
    category: 'Spacing',
    categoryColor: 'text-primary bg-primary/10 border-primary/20',
    description: 'Detects arbitrary padding, margin, and gap values.',
    autofix: true,
    example: 'p-[13px] → p-3',
  },
  {
    icon: <Type className="h-5 w-5" />,
    title: 'no-arbitrary-typography',
    slug: 'typography',
    category: 'Typography',
    categoryColor: 'text-warn bg-warn/10 border-warn/20',
    description: 'Enforces font-size, weight, line-height, and tracking scales.',
    autofix: true,
    example: 'text-[18px] → text-lg',
  },
  {
    icon: <Monitor className="h-5 w-5" />,
    title: 'responsive-required',
    slug: 'responsive',
    category: 'Responsive',
    categoryColor: 'text-primary-light bg-primary-light/10 border-primary-light/20',
    description: 'Requires responsive breakpoints on fixed-width containers.',
    autofix: false,
    example: 'w-[800px] → w-full md:w-[800px]',
  },
  {
    icon: <LayoutGrid className="h-5 w-5" />,
    title: 'consistent-component-spacing',
    slug: 'consistency',
    category: 'Consistency',
    categoryColor: 'text-gray-600 bg-gray-100 border-gray-200',
    description: 'Detects spacing variance across similar component instances.',
    autofix: false,
    example: 'Card A: p-4, Card B: p-6 → p-4',
  },
  {
    icon: <Accessibility className="h-5 w-5" />,
    title: 'a11y-color-contrast',
    slug: 'accessibility',
    category: 'A11y',
    categoryColor: 'text-fail bg-fail/10 border-fail/20',
    description: 'Validates WCAG AA contrast ratio for text/background pairs.',
    autofix: false,
    example: 'bg-gray-100 + text-gray-300 → 4.5:1',
  },
  {
    icon: <FileCode className="h-5 w-5" />,
    title: 'max-component-lines',
    slug: 'consistency',
    category: 'Consistency',
    categoryColor: 'text-gray-600 bg-gray-100 border-gray-200',
    description: 'Flags oversized components that should be decomposed.',
    autofix: false,
    example: '450 lines → max 300',
  },
  {
    icon: <AlertTriangle className="h-5 w-5" />,
    title: 'missing-states',
    slug: 'consistency',
    category: 'States',
    categoryColor: 'text-warn bg-warn/10 border-warn/20',
    description: 'Ensures form elements handle disabled and error states.',
    autofix: false,
    example: '<input /> → disabled + aria-invalid',
  },
  {
    icon: <Moon className="h-5 w-5" />,
    title: 'dark-mode-coverage',
    slug: 'colors',
    category: 'Dark Mode',
    categoryColor: 'text-primary-dark bg-primary-dark/10 border-primary-dark/20',
    description: 'Flags background classes missing dark: variant with shade inversion.',
    autofix: true,
    example: 'bg-white → + dark:bg-gray-900',
  },
  {
    icon: <Layers className="h-5 w-5" />,
    title: 'no-arbitrary-zindex',
    slug: 'consistency',
    category: 'Z-Index',
    categoryColor: 'text-gray-600 bg-gray-100 border-gray-200',
    description: 'Replaces arbitrary z-[999] with scale values (z-10..z-50).',
    autofix: true,
    example: 'z-[999] → z-50',
  },
];

export function FeatureBlocks() {
  return (
    <section className="relative py-24 px-6 bg-white">
      <div className="mx-auto max-w-6xl">
        <FadeIn className="text-center mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
            Complete rule set
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 text-balance">
            10 rules. Zero design drift.
          </h2>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            Every rule ships with Tailwind v3+v4 support, cross-framework detection,
            and sub-2ms performance per file.
          </p>
        </FadeIn>

        {/* Bento Grid */}
        <StaggerContainer
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          staggerDelay={0.06}
        >
          {RULES.map((rule) => (
            <StaggerItem key={rule.title}>
              <div className="group relative rounded-xl border border-gray-200/80 bg-white p-5 transition-all duration-300 hover:border-gray-300 hover:shadow-lg hover:shadow-gray-200/50 hover:-translate-y-0.5 h-full">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-200 text-gray-600 group-hover:bg-primary-50 group-hover:text-primary transition-colors">
                      {rule.icon}
                    </div>
                    <div>
                      <span className={cn(
                        'inline-flex text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border',
                        rule.categoryColor,
                      )}>
                        {rule.category}
                      </span>
                    </div>
                  </div>
                  {rule.autofix && (
                    <span className="text-[10px] font-semibold text-pass bg-pass/10 px-2 py-0.5 rounded-full border border-pass/20">
                      Auto-fix
                    </span>
                  )}
                </div>

                {/* Title */}
                <h3 className="font-mono text-sm font-semibold text-gray-900 mb-2">
                  {rule.title}
                </h3>

                {/* Description */}
                <p className="text-sm text-gray-500 leading-relaxed mb-3">
                  {rule.description}
                </p>

                {/* Example */}
                <div className="font-mono text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                  {rule.example}
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
