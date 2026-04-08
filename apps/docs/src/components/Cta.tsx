'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Terminal } from 'lucide-react';
import Link from 'next/link';

export function Cta() {
  return (
    <section className="relative py-24 px-6 overflow-hidden">
      {/* Dark gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-900 via-primary-dark to-primary-950" />

      {/* Dot grid overlay */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Glow effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/20 blur-[100px] rounded-full" />

      <div className="relative z-10 mx-auto max-w-3xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 text-balance">
            Start catching design drift today
          </h2>
          <p className="text-lg text-primary-200/80 mb-10 max-w-xl mx-auto">
            Drop into any Tailwind CSS project. Works with React, Vue, Svelte, Angular, and plain HTML.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          {/* Install command */}
          <div className="inline-flex items-center gap-3 rounded-xl bg-black/30 backdrop-blur-sm border border-white/10 px-6 py-4 font-mono text-sm text-gray-200">
            <Terminal className="h-4 w-4 text-primary-300" />
            <span>
              <span className="text-pass-light">npm</span>{' '}
              <span className="text-gray-400">install -D</span>{' '}
              <span className="text-white">@deslint/eslint-plugin</span>
            </span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-6"
        >
          <Link
            href="/docs/getting-started"
            className="group inline-flex items-center gap-2 text-sm font-medium text-primary-200 hover:text-white transition-colors"
          >
            Read the docs
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <a
            href="https://github.com/deslint/deslint"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary-200 hover:text-white transition-colors"
          >
            View source on GitHub
            <ArrowRight className="h-4 w-4" />
          </a>
        </motion.div>
      </div>
    </section>
  );
}
