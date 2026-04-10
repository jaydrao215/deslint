'use client';

import { FadeIn, StaggerContainer, StaggerItem } from './motion';
import { Palette, Ruler, Type, Smartphone, Accessibility, Moon } from 'lucide-react';
import type { ReactNode } from 'react';

interface Category {
  icon: ReactNode;
  title: string;
  description: string;
  examples: { bad: string; good: string };
  rules: string[];
}

const CATEGORIES: Category[] = [
  {
    icon: <Palette className="h-5 w-5" />,
    title: 'Color drift',
    description:
      'Arbitrary hex values, `text-[#abc]` escapes, off-palette tokens. Maps every color back to your Tailwind config or W3C tokens.',
    examples: {
      bad: 'text-[#1a5276] bg-[rgb(39,174,96)]',
      good: 'text-primary bg-pass',
    },
    rules: ['no-arbitrary-colors', 'no-inline-styles'],
  },
  {
    icon: <Ruler className="h-5 w-5" />,
    title: 'Spacing inconsistency',
    description:
      'Off-scale padding, margins, and gaps. Enforces your 4/8px grid — no more `p-[13px]` creeping in.',
    examples: {
      bad: 'p-[13px] gap-[7px]',
      good: 'p-3 gap-2',
    },
    rules: ['no-arbitrary-spacing'],
  },
  {
    icon: <Type className="h-5 w-5" />,
    title: 'Typography scale breaks',
    description:
      'Font sizes outside your type scale, mixed weights, arbitrary line heights — hierarchy that reads like a ransom note.',
    examples: {
      bad: 'text-[15px] leading-[22px]',
      good: 'text-base leading-relaxed',
    },
    rules: ['no-arbitrary-typography', 'heading-hierarchy'],
  },
  {
    icon: <Smartphone className="h-5 w-5" />,
    title: 'Broken responsive layouts',
    description:
      'Missing mobile breakpoints, desktop-only flex rows, fixed widths. Catches layouts AI forgot to make responsive.',
    examples: {
      bad: 'flex flex-row gap-8',
      good: 'flex flex-col md:flex-row gap-4 md:gap-8',
    },
    rules: ['responsive-required', 'no-magic-numbers-layout'],
  },
  {
    icon: <Accessibility className="h-5 w-5" />,
    title: 'Accessibility violations',
    description:
      'Missing alt text, bad contrast, label-less inputs, no focus states, heading skips. Mapped to WCAG 2.2 + 2.1 AA criteria.',
    examples: {
      bad: '<img src="hero.png" />',
      good: '<img src="hero.png" alt="Product screenshot" />',
    },
    rules: ['image-alt-text', 'a11y-color-contrast', 'form-labels'],
  },
  {
    icon: <Moon className="h-5 w-5" />,
    title: 'Dark mode gaps',
    description:
      'Hardcoded light-only colors, backgrounds without `dark:` variants, text that vanishes on a dark theme.',
    examples: {
      bad: 'bg-white text-gray-900',
      good: 'bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100',
    },
    rules: ['dark-mode-coverage'],
  },
];

export function WhatItCatches() {
  return (
    <section className="relative py-24 px-6 bg-surface-100 overflow-hidden">
      <div className="mx-auto max-w-6xl">
        <FadeIn className="mb-16 max-w-2xl">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
            What it catches
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 text-balance">
            The bugs that slip past type checkers and tests
          </h2>
          <p className="text-lg text-gray-500 leading-relaxed">
            AI code compiles. It passes your tests. It renders. And then a designer
            opens the screen and finds six shades of blue, inconsistent spacing, and
            a contrast ratio that fails an audit. Deslint catches all of it before
            the commit lands.
          </p>
        </FadeIn>

        <StaggerContainer className="grid gap-6 md:grid-cols-2 lg:grid-cols-3" staggerDelay={0.06}>
          {CATEGORIES.map((c) => (
            <StaggerItem key={c.title}>
              <div className="group h-full flex flex-col rounded-xl border border-gray-200/80 bg-white p-6 transition-all duration-300 hover:border-gray-300 hover:shadow-lg hover:shadow-gray-200/50">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/5 text-primary border border-primary/10 group-hover:bg-primary group-hover:text-white transition-all">
                    {c.icon}
                  </div>
                  <h3 className="text-base font-semibold text-gray-900">{c.title}</h3>
                </div>
                <p className="text-sm text-gray-500 leading-relaxed mb-4 flex-grow">
                  {c.description}
                </p>
                <div className="rounded-lg border border-gray-200/80 bg-gray-950 p-3 font-mono text-xs leading-relaxed">
                  <div className="flex items-start gap-2 text-fail">
                    <span className="select-none">-</span>
                    <span className="truncate">{c.examples.bad}</span>
                  </div>
                  <div className="flex items-start gap-2 text-pass">
                    <span className="select-none">+</span>
                    <span className="truncate">{c.examples.good}</span>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {c.rules.map((r) => (
                    <code
                      key={r}
                      className="text-[10px] font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded"
                    >
                      {r}
                    </code>
                  ))}
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
