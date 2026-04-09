'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Copy, Check, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

/**
 * Landing page Hero.
 *
 * Positioning follows Problem → Solution → Outcome:
 *   Problem: AI code ships fast but drifts from the design system
 *            and fails accessibility audits.
 *   Solution: Deslint flags design-system drift and WCAG failures
 *             statically, in any framework, locally.
 *   Outcome:  Every PR becomes a design + a11y gate — no cloud,
 *             no screenshots, no manual review.
 */
export function Hero() {
  return (
    <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden">
      <HeroBackground />

      <div className="relative z-10 mx-auto max-w-5xl px-6 pt-28 pb-20 text-center">
        {/* Eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="inline-flex items-center gap-2.5 rounded-full border border-primary/15 bg-primary-50/60 backdrop-blur-sm px-4 py-1.5 text-sm font-medium text-primary mb-8">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Design system + WCAG gate for AI-generated code</span>
          </div>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-gray-900 leading-[1.06] mb-6 text-balance"
        >
          Design quality for the{' '}
          <span className="gradient-text-hero">AI code era</span>
        </motion.h1>

        {/* Subheadline — Problem → Solution */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
          className="text-lg sm:text-xl text-gray-500 mb-12 max-w-2xl mx-auto leading-relaxed text-balance"
        >
          AI code generators ship fast. They also ship arbitrary colors, broken
          responsive layouts, and WCAG failures that fail audits. Deslint catches
          design-system drift and accessibility regressions the moment they land —
          local, deterministic, every framework.
        </motion.p>

        {/* Install command */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <InstallCommand />
        </motion.div>

        {/* CTA buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-4"
        >
          <Link
            href="/docs/getting-started"
            className="group inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary-light transition-all duration-300 hover:shadow-xl hover:shadow-primary/25 hover:-translate-y-0.5"
          >
            Install in 30 seconds
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/docs/rules"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5"
          >
            See the rules
          </Link>
        </motion.div>

        {/* Social proof — concrete, not fluff */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.9 }}
          className="mt-16 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-gray-400"
        >
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-pass" />
            14 deterministic rules
          </span>
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-pass" />
            WCAG 2.2 &amp; 2.1 AA mapping
          </span>
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-pass" />
            React, Vue, Svelte, Angular, HTML
          </span>
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-pass" />
            Zero cloud, zero AI calls
          </span>
        </motion.div>
      </div>
    </section>
  );
}

function InstallCommand() {
  const [copied, setCopied] = useState(false);
  const command = 'npm install -D @deslint/eslint-plugin';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available
    }
  };

  return (
    <button
      onClick={copy}
      className="group relative inline-flex items-center gap-4 rounded-2xl bg-gray-950 px-6 py-4 font-mono text-sm text-gray-300 transition-all hover:bg-gray-900 glow-border hover:glow-border-hover cursor-pointer"
      aria-label="Copy install command"
    >
      <span className="text-gray-500 select-none">$</span>
      <span>
        <span className="text-pass">npm</span>{' '}
        <span className="text-gray-400">install -D</span>{' '}
        <span className="text-white font-medium">@deslint/eslint-plugin</span>
      </span>
      <span className="flex items-center gap-1.5 text-gray-500 group-hover:text-gray-300 transition-colors">
        {copied ? (
          <Check className="h-4 w-4 text-pass" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </span>
    </button>
  );
}

function HeroBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[120%] h-[600px]"
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(26, 82, 118, 0.08), transparent)',
        }}
      />
      <div className="absolute inset-0 dot-grid opacity-50" />
      <div className="absolute top-20 left-[15%] w-72 h-72 rounded-full bg-primary-200/10 blur-3xl animate-float" />
      <div
        className="absolute top-40 right-[15%] w-96 h-96 rounded-full bg-primary-300/8 blur-3xl animate-float"
        style={{ animationDelay: '-3s' }}
      />
      <div
        className="absolute -bottom-20 left-[40%] w-80 h-80 rounded-full bg-primary-100/10 blur-3xl animate-float"
        style={{ animationDelay: '-1.5s' }}
      />
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent" />
    </div>
  );
}
