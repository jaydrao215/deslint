'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Copy, Check } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export function Hero() {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      {/* Background Effects */}
      <HeroBackground />

      <div className="relative z-10 mx-auto max-w-5xl px-6 pt-28 pb-20 text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="inline-flex items-center gap-2.5 rounded-full border border-primary/15 bg-primary-50/60 backdrop-blur-sm px-4 py-1.5 text-sm font-medium text-primary mb-8">
            <Sparkles className="h-3.5 w-3.5" />
            <span>ESLint plugin for Tailwind CSS</span>
            <span className="h-1 w-1 rounded-full bg-primary/30" />
            <span className="text-primary-light">10 rules</span>
          </div>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-gray-900 leading-[1.08] mb-6 text-balance"
        >
          The design quality gate
          <br />
          for{' '}
          <span className="gradient-text-hero">
            AI-generated
          </span>{' '}
          code
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
          className="text-lg sm:text-xl text-gray-500 mb-12 max-w-2xl mx-auto leading-relaxed text-balance"
        >
          Catch arbitrary colors, inconsistent spacing, and broken responsive layouts
          before they ship. Drop-in ESLint plugin with auto-fix for any Tailwind project.
        </motion.p>

        {/* Install Command */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <InstallCommand />
        </motion.div>

        {/* CTA Buttons */}
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
            Get Started
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <a
            href="https://github.com/vizlint/vizlint"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5"
          >
            <GithubIcon />
            Star on GitHub
          </a>
        </motion.div>

        {/* Social Proof */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.9 }}
          className="mt-16 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-gray-400"
        >
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-pass" />
            10 lint rules
          </span>
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-pass" />
            Auto-fix included
          </span>
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-pass" />
            Tailwind v3 + v4
          </span>
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-pass" />
            React, Vue, Svelte, Angular
          </span>
        </motion.div>
      </div>
    </section>
  );
}

function InstallCommand() {
  const [copied, setCopied] = useState(false);
  const command = 'npm install -D eslint-plugin-vizlint';

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
    >
      <span className="text-gray-500 select-none">$</span>
      <span>
        <span className="text-pass">npm</span>{' '}
        <span className="text-gray-400">install -D</span>{' '}
        <span className="text-white font-medium">eslint-plugin-vizlint</span>
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
      {/* Radial glow from top */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[120%] h-[600px]"
        style={{
          background: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(26, 82, 118, 0.08), transparent)',
        }}
      />

      {/* Dot grid */}
      <div className="absolute inset-0 dot-grid opacity-50" />

      {/* Floating gradient orbs */}
      <div className="absolute top-20 left-[15%] w-72 h-72 rounded-full bg-primary-200/10 blur-3xl animate-float" />
      <div
        className="absolute top-40 right-[15%] w-96 h-96 rounded-full bg-primary-300/8 blur-3xl animate-float"
        style={{ animationDelay: '-3s' }}
      />
      <div
        className="absolute -bottom-20 left-[40%] w-80 h-80 rounded-full bg-primary-100/10 blur-3xl animate-float"
        style={{ animationDelay: '-1.5s' }}
      />

      {/* Bottom fade to white */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent" />
    </div>
  );
}

function GithubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}
