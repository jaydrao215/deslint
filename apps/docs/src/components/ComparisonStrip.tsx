'use client';

import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import {
  Palette,
  ShieldCheck,
  Smartphone,
  Moon,
  MousePointerClick,
  Wand2,
} from 'lucide-react';

/**
 * Homepage differentiator section.
 *
 * Shown to visitors scrolling below the hero — the job is to establish what
 * deslint actually inspects without getting into a head-to-head with other
 * linters (those claims are hard to verify and age badly as competitors
 * change). Each tile maps 1:1 to rules documented at /docs/rules, so every
 * assertion is auditable by reading the rule source.
 */
export function ComparisonStrip() {
  return (
    <section
      id="how-we-compare"
      className="relative overflow-hidden bg-white px-6 py-24"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 max-w-3xl">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.4 }}
            className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary"
          >
            What deslint checks
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="mb-4 text-balance text-3xl font-bold leading-tight text-gray-900 sm:text-4xl lg:text-5xl"
          >
            Design-quality checks that{' '}
            <span className="gradient-text-hero">generic linters skip.</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="max-w-2xl text-lg leading-relaxed text-gray-500"
          >
            Six dimensions of design quality that ESLint, type-checkers, and
            accessibility audits don’t cover on their own — enforced in-editor,
            in CI, and deterministically from a single config.
          </motion.p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CAPABILITIES.map((c, i) => (
            <motion.article
              key={c.title}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.4, delay: 0.04 * i }}
              className="group flex flex-col rounded-2xl border border-gray-200 bg-white p-6 transition-colors hover:border-primary/30"
            >
              <span className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary ring-1 ring-primary/10">
                <c.Icon className="h-5 w-5" />
              </span>
              <h3 className="mb-1.5 text-base font-semibold text-gray-900">
                {c.title}
              </h3>
              <p className="mb-4 flex-1 text-sm leading-relaxed text-gray-500">
                {c.body}
              </p>
              <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 font-mono text-[12px] text-gray-600 ring-1 ring-gray-200/60">
                <span className="text-gray-400" aria-hidden>
                  ›
                </span>
                <span className="truncate">{c.example}</span>
              </div>
            </motion.article>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-gray-500">
          <span>Every check maps to a documented rule.</span>
          <a
            href="/docs/rules"
            className="inline-flex items-center gap-1.5 font-medium text-primary hover:text-primary-light"
          >
            Browse all 33 rules
            <span aria-hidden>→</span>
          </a>
        </div>
      </div>
    </section>
  );
}

interface Capability {
  title: string;
  body: string;
  example: string;
  Icon: LucideIcon;
}

const CAPABILITIES: Capability[] = [
  {
    title: 'Design-token drift',
    body: 'Arbitrary hex colors, spacing, radius, z-index, and type scale get flagged and rewritten to your design tokens.',
    example: 'bg-[#FF5733]  →  bg-red-500',
    Icon: Palette,
  },
  {
    title: 'WCAG 2.2 AA · mapped',
    body: 'Every accessibility violation cites the exact success criterion it fails — no guessing which spec line applies.',
    example: 'WCAG 2.2 · 1.4.3 · contrast 3.7:1',
    Icon: ShieldCheck,
  },
  {
    title: 'Responsive integrity',
    body: 'Fixed widths, missing breakpoints, and unhandled overflow get caught before they break on a real phone.',
    example: 'w-[600px]  →  flag mobile overflow',
    Icon: Smartphone,
  },
  {
    title: 'Dark-mode parity',
    body: 'Every surface color is checked for its paired dark: variant, so themes don’t ship half-finished.',
    example: 'bg-white  →  add dark:bg-gray-900',
    Icon: Moon,
  },
  {
    title: 'Interactive states',
    body: 'Buttons, inputs, and form controls are audited for hover, focus-visible, disabled, and error-state coverage.',
    example: '<button>  →  missing hover/focus',
    Icon: MousePointerClick,
  },
  {
    title: 'Safe autofix tiers',
    body: 'Deterministic rewrites auto-apply; anything context-dependent becomes a suggestion, not a silent edit to your code.',
    example: 'deterministic  →  auto · risky  →  suggest',
    Icon: Wand2,
  },
];
