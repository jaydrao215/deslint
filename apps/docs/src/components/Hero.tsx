'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Copy, Check, ShieldCheck, Star } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { ComplianceReportMockup } from './mockups/ComplianceReportMockup';
import { formatStarCount } from '@/lib/github-stars';

const GITHUB_URL = 'https://github.com/jaydrao215/deslint';

interface HeroProps {
  stars: number | null;
}

/**
 * Split hero — copy on the left, live product visual on the right.
 * The visual is NOT a static screenshot — it's a hand-coded inline mockup
 * of the actual HTML compliance report that `deslint compliance` produces,
 * with motion accents that play on mount.
 */
export function Hero({ stars }: HeroProps) {
  return (
    <section className="relative overflow-hidden">
      <HeroBackground />

      <div className="relative z-10 mx-auto max-w-6xl px-6 pt-32 pb-24 lg:pt-36 lg:pb-28">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-10 items-center">
          {/* Left — copy */}
          <div className="lg:col-span-6">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <div className="inline-flex items-center gap-2.5 rounded-full border border-primary/15 bg-primary-50/60 backdrop-blur-sm px-4 py-1.5 text-sm font-medium text-primary mb-7">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Design quality + WCAG gate for AI-generated code</span>
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: [0.21, 0.47, 0.32, 0.98] }}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 leading-[1.06] mb-6 text-balance"
            >
              AI writes fast.{' '}
              <span className="gradient-text-hero">Deslint keeps it clean.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35 }}
              className="text-base sm:text-lg text-gray-500 mb-8 max-w-xl leading-relaxed"
            >
              AI ships design drift, dark-mode gaps, and WCAG failures at the
              speed of autocomplete. Deslint catches them in your editor, your
              CI, and every PR —{' '}
              <span className="font-semibold text-gray-700">
                without ever sending your code to a cloud.
              </span>
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="mb-7"
            >
              <InstallCommand />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="flex flex-wrap items-center gap-4 mb-10"
            >
              <Link
                href="/docs/getting-started"
                className="group inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary-light transition-all duration-300 hover:shadow-xl hover:shadow-primary/25 hover:-translate-y-0.5"
              >
                Install in 30 seconds
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5"
              >
                <Star className="h-4 w-4 text-warn group-hover:fill-warn transition-colors" aria-hidden />
                <span>Star on GitHub</span>
                {stars !== null && (
                  <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-mono font-semibold text-gray-700 tabular-nums">
                    {formatStarCount(stars)}
                  </span>
                )}
              </a>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.9 }}
              className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-gray-400"
            >
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-pass" />
                28 deterministic rules
              </span>
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-pass" />
                WCAG 2.2 &amp; 2.1 AA mapped
              </span>
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-pass" />
                5 frameworks
              </span>
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-pass" />
                Code never leaves your machine
              </span>
            </motion.div>
          </div>

          {/* Right — live product visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.35, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="lg:col-span-6 relative"
          >
            <ComplianceReportMockup />
          </motion.div>
        </div>
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
      className="group relative inline-flex items-center gap-4 rounded-xl bg-gray-950 px-5 py-3.5 font-mono text-sm text-gray-300 transition-all hover:bg-gray-900 glow-border hover:glow-border-hover cursor-pointer"
      aria-label="Copy install command"
    >
      <span className="text-gray-500 select-none">$</span>
      <span className="sm:whitespace-nowrap">
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
        className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(26, 82, 118, 0.09), transparent)',
        }}
      />
      <div className="absolute inset-0 dot-grid opacity-50" />
      <div className="absolute top-20 left-[10%] w-72 h-72 rounded-full bg-primary-200/10 blur-3xl animate-float" />
      <div
        className="absolute top-40 right-[10%] w-96 h-96 rounded-full bg-primary-300/8 blur-3xl animate-float"
        style={{ animationDelay: '-3s' }}
      />
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent" />
    </div>
  );
}
