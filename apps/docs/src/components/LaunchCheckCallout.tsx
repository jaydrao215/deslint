'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Rocket, Copy, Check } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

/**
 * Homepage callout for /launch-check — the indie-facing entry point.
 *
 * Sits between Hero and AgentCompatStrip. The Hero sells Deslint as the
 * verification layer (the team / AI-coding-agent angle). This strip
 * surfaces the same engine reframed for solo / vibe-coding devs:
 * "is my AI-built app ready to ship?" — a question they actually search
 * for, with a one-command answer.
 */
export function LaunchCheckCallout() {
  const [copied, setCopied] = useState(false);
  const command = 'npx deslint launch-check';

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
    <section className="relative overflow-hidden border-y border-primary/15 bg-gradient-to-br from-primary-50/60 via-white to-primary-50/30 px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          className="grid gap-8 lg:grid-cols-12 lg:items-center"
        >
          {/* Left — copy */}
          <div className="lg:col-span-7">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
              <Rocket className="h-3 w-3" />
              <span>New · Free · No install</span>
            </div>
            <h2 className="mb-3 text-balance text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Is your AI-built app ready to ship?
            </h2>
            <p className="max-w-xl text-base leading-relaxed text-gray-600">
              Cursor rewrote your checkout. Claude Code added a settings page.
              Codex generated the signup form. <strong className="text-gray-900">QA every AI-generated frontend in one command</strong> — design-token drift, broken responsive layouts, accessibility gaps, dark-mode regressions, and the safety basics (XSS, missing rel, sandbox) — before it goes live.
            </p>
          </div>

          {/* Right — command + CTAs */}
          <div className="lg:col-span-5">
            <button
              onClick={copy}
              className="group relative flex w-full items-center justify-between gap-3 rounded-xl bg-gray-950 px-5 py-4 font-mono text-sm text-gray-300 motion-safe:transition-all hover:bg-gray-900"
              aria-label="Copy launch-check command"
            >
              <span className="flex items-center gap-3">
                <span className="text-gray-500 select-none">$</span>
                <span>
                  <span className="text-pass">npx</span>{' '}
                  <span className="text-white font-medium">deslint</span>{' '}
                  <span className="text-gray-200">launch-check</span>
                </span>
              </span>
              <span className="flex items-center gap-1.5 text-gray-500 group-hover:text-gray-300 motion-safe:transition-colors">
                {copied ? (
                  <Check className="h-4 w-4 text-pass" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </span>
            </button>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Link
                href="/launch-check"
                className="group inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white motion-safe:transition-all hover:bg-primary-light hover:shadow-lg hover:shadow-primary/20"
              >
                See a sample report
                <ArrowRight className="h-4 w-4 motion-safe:transition-transform group-hover:translate-x-0.5" />
              </Link>
              <span className="text-xs text-gray-500">
                Runs locally · 0 LLM · 0 telemetry
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
