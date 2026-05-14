'use client';

import Link from 'next/link';
import { motion, useInView } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Beat1DarkMode } from './mockups/visual-proof/Beat1DarkMode';

/**
 * Homepage teaser for the four-beat visual proof. The full carousel
 * (with autoplay, recorded-loop, and the other three beats) lives on
 * /proof — the dedicated page lets the asset rank for its own search
 * intent and keeps the home page under the CodeRabbit / SonarQube
 * scroll length. This teaser renders the most striking beat
 * (dark-mode flipped) and links to /proof for the rest.
 */
export function VisualProofSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: '-100px' });
  const [autoplay, setAutoplay] = useState(false);

  useEffect(() => {
    if (inView) setAutoplay(true);
  }, [inView]);

  return (
    <section
      ref={ref}
      id="visual-proof"
      className="relative overflow-hidden bg-gradient-to-b from-white via-gray-50 to-white px-6 py-24"
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
            Visual proof
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="mb-4 text-balance text-3xl font-bold leading-tight text-gray-900 sm:text-4xl lg:text-5xl"
          >
            Before and after,{' '}
            <span className="gradient-text-hero">rendered live in your browser.</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="max-w-2xl text-lg leading-relaxed text-gray-500"
          >
            One mockup below: dark-mode breaks. Three more — responsive reflow,
            contrast, and the invisible accessibility gaps — live on the proof
            page, with a 40-second recorded loop you can share.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="relative rounded-3xl bg-white p-6 shadow-xl ring-1 ring-gray-200 sm:p-8 lg:p-10"
        >
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="mb-1 flex items-center gap-3">
                <span className="font-mono text-xs font-semibold text-primary/70">01</span>
                <h3 className="text-lg font-bold text-gray-900 sm:text-xl">Dark mode · flipped</h3>
              </div>
              <p className="max-w-2xl text-sm text-gray-500">
                AI generated hardcoded colours. The preview looks fine. Flip to dark mode and the page breaks.
              </p>
            </div>
            <Link
              href="/proof"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-white motion-safe:transition-all hover:bg-primary-light"
            >
              See all four proofs
              <span aria-hidden>→</span>
            </Link>
          </div>

          <div className="min-h-[320px] sm:min-h-[420px]">
            <Beat1DarkMode isActive={true} autoPlay={autoplay} />
          </div>
        </motion.div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-center text-xs text-gray-500">
          <span>Every fix is deterministic — same input, same output.</span>
          <span className="hidden h-3 w-px bg-gray-200 sm:inline-block" />
          <Link href="/proof" className="font-medium text-primary hover:text-primary-light">
            See the other three beats →
          </Link>
        </div>
      </div>
    </section>
  );
}
