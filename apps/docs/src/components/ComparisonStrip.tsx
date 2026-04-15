'use client';

import { motion } from 'framer-motion';
import { useRef } from 'react';
import { Film } from 'lucide-react';
import { useAutoplayWhenVisible } from '@/lib/useAutoplayWhenVisible';

/**
 * Compressed homepage replacement for the full ComparisonTable.
 *
 * The full 5-tool / 8-row matrix lives on `/pricing`, where it informs
 * purchase intent. On the homepage we show a 4-second pre-rendered loop of
 * the same matrix typewriter-revealing — visually richer than a dense table
 * and ~250 lines lighter on the homepage bundle.
 *
 * Three textual callouts sit below the video as a safety net for users who
 * scroll past mid-loop or browse with reduced-motion enabled.
 */
export function ComparisonStrip() {
  const videoRef = useRef<HTMLVideoElement>(null);
  useAutoplayWhenVisible(videoRef);

  return (
    <section
      id="how-we-compare"
      className="relative overflow-hidden bg-white px-6 py-24"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 max-w-3xl">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.4 }}
            className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary"
          >
            How we compare
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="mb-4 text-balance text-3xl font-bold leading-tight text-gray-900 sm:text-4xl lg:text-5xl"
          >
            One column has every check.{' '}
            <span className="gradient-text-hero">It isn’t SonarQube’s.</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="max-w-2xl text-lg leading-relaxed text-gray-500"
          >
            Design drift, WCAG 2.2 mapping, framework coverage, autofix, and
            local-first execution — graded across Deslint, jsx-a11y,
            tailwindcss-eslint, SonarQube, and CodeRabbit.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
          aria-label="4-second loop of the design-tooling comparison matrix"
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary-50 text-primary ring-1 ring-primary/15">
                <Film className="h-3.5 w-3.5" />
              </span>
              <div>
                <div className="text-sm font-semibold text-gray-900">
                  Watch the matrix fill in
                </div>
                <div className="text-xs text-gray-500">
                  Same 8 capability rows as the full matrix on{' '}
                  <a href="/pricing" className="text-primary hover:text-primary-light">
                    /pricing
                  </a>
                  .
                </div>
              </div>
            </div>
            <div className="hidden items-center gap-3 text-[10px] text-gray-400 sm:flex">
              <span className="font-mono">1200×675 · H.264</span>
              <span className="h-3 w-px bg-gray-200" aria-hidden />
              <a
                href="/demo/comparison-table.mp4"
                download
                className="font-medium text-primary hover:text-primary-light"
              >
                Download MP4
              </a>
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl bg-gray-950 shadow-xl ring-1 ring-gray-200">
            <video
              ref={videoRef}
              className="block h-auto w-full"
              poster="/demo/comparison-table-poster.jpg"
              muted
              loop
              playsInline
              preload="none"
              aria-label="4-second recorded loop of the comparison matrix"
            >
              <source src="/demo/comparison-table.webm" type="video/webm" />
              <source src="/demo/comparison-table.mp4" type="video/mp4" />
              Your browser doesn’t support embedded video. Download the{' '}
              <a href="/demo/comparison-table.mp4">MP4</a>.
            </video>
          </div>
        </motion.div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {CALLOUTS.map((c, i) => (
            <motion.div
              key={c.label}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, delay: 0.05 + i * 0.05 }}
              className="rounded-xl border border-gray-200 bg-white px-4 py-3"
            >
              <div className="text-sm font-semibold text-gray-900">{c.label}</div>
              <div className="mt-0.5 text-xs text-gray-500">{c.detail}</div>
            </motion.div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <a
            href="/pricing#how-we-compare"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-light"
          >
            See the full 5-tool matrix on /pricing
            <span aria-hidden>→</span>
          </a>
        </div>
      </div>
    </section>
  );
}

const CALLOUTS = [
  { label: 'Design drift · covered', detail: 'Arbitrary colors, spacing, z-index, typography.' },
  { label: 'WCAG 2.2 AA · mapped', detail: 'Every violation cites the success criterion.' },
  { label: 'Framework-agnostic · 5', detail: 'React, Vue, Svelte, Angular, plain HTML.' },
];
