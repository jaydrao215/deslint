'use client';

import { motion, useInView } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

// Verifiable metrics: 1,303 = pnpm test count, 28 = rules in packages/eslint-plugin/src/rules,
// 5 = React/Vue/Svelte/Angular/HTML, 0 = bytes leaving the machine.
interface Metric {
  value: number;
  suffix?: string;
  prefix?: string;
  label: string;
  sublabel: string;
  format?: (n: number) => string;
}

const METRICS: Metric[] = [
  {
    value: 0,
    label: 'Bytes leave your machine',
    sublabel: 'No cloud, no telemetry, no LLM',
  },
  {
    value: 28,
    label: 'Deterministic rules',
    sublabel: 'Design drift + WCAG 2.2 AA',
  },
  {
    value: 5,
    label: 'Frameworks, one config',
    sublabel: 'React · Vue · Svelte · Angular · HTML',
  },
  {
    value: 1303,
    label: 'Tests passing',
    sublabel: 'Every rule: valid + invalid + fix',
    format: (n) => n.toLocaleString(),
  },
];

export function MetricsBanner() {
  return (
    <section
      aria-label="Deslint by the numbers"
      className="relative border-y border-gray-200/80 bg-surface-100 py-14 px-6"
    >
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-2 gap-y-10 gap-x-6 md:grid-cols-4">
          {METRICS.map((m, i) => (
            <MetricCell key={m.label} metric={m} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function MetricCell({ metric, index }: { metric: Metric; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  // Initialize displayed at target so SSR/OG crawlers render final numbers.
  // Reset to zero on mount only if below the fold; the in-view effect then
  // animates 0 → target when the user scrolls to the section.
  const [displayed, setDisplayed] = useState(metric.value);
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const belowFold = ref.current.getBoundingClientRect().top > window.innerHeight;
    if (belowFold) {
      setDisplayed(0);
      setArmed(true);
    }
  }, []);

  useEffect(() => {
    if (!inView || !armed) return;
    if (metric.value === 0) {
      setDisplayed(0);
      return;
    }
    const duration = 1200;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayed(Math.round(metric.value * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, armed, metric.value]);

  const formatted = metric.format ? metric.format(displayed) : displayed.toString();

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.05, ease: [0.21, 0.47, 0.32, 0.98] }}
      className="text-center"
    >
      <div className="flex items-baseline justify-center gap-0.5 mb-1.5">
        {metric.prefix && (
          <span className="text-2xl sm:text-3xl font-bold text-primary/70">
            {metric.prefix}
          </span>
        )}
        <span className="text-4xl sm:text-5xl font-bold tabular-nums text-primary tracking-tight">
          {formatted}
        </span>
        {metric.suffix && (
          <span className="text-2xl sm:text-3xl font-bold text-primary/70">
            {metric.suffix}
          </span>
        )}
      </div>
      <div className="text-sm font-semibold text-gray-900">{metric.label}</div>
      <div className="text-xs text-gray-500 mt-0.5">{metric.sublabel}</div>
    </motion.div>
  );
}
