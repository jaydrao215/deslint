'use client';

import { motion, useInView } from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ShieldOff, EyeOff, Cpu } from 'lucide-react';

/**
 * Single section that fuses the count-up "by the numbers" pills (formerly
 * MetricsBanner) with the three "zero cloud / zero telemetry / zero LLMs"
 * pillars (formerly PrivacyTrust). Both panels lived back-to-back on the
 * homepage and made the same trust claim from two angles — the merge
 * preserves every datapoint while halving the cognitive tax and the
 * vertical real estate.
 */

interface Metric {
  value: number;
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
    value: 33,
    label: 'Deterministic rules',
    sublabel: 'Design drift + WCAG 2.2 AA',
  },
  {
    value: 5,
    label: 'Frameworks, one config',
    sublabel: 'React · Vue · Svelte · Angular · HTML',
  },
  {
    value: 1362,
    label: 'Tests passing',
    sublabel: 'Every rule: valid + invalid + fix',
    format: (n) => n.toLocaleString(),
  },
];

interface Pillar {
  icon: ReactNode;
  badge: string;
  title: string;
  detail: string;
}

const PILLARS: Pillar[] = [
  {
    icon: <ShieldOff className="h-5 w-5" />,
    badge: 'Zero cloud',
    title: 'Your code never leaves your machine',
    detail:
      'No SaaS roundtrip, no upload step, no API key. ESLint plugin + local CLI, offline-capable, air-gap friendly.',
  },
  {
    icon: <EyeOff className="h-5 w-5" />,
    badge: 'Zero telemetry',
    title: 'No analytics, no phone-home',
    detail:
      'Nothing to opt out of because nothing is being collected — no usage, no rule triggers, no anonymous counts.',
  },
  {
    icon: <Cpu className="h-5 w-5" />,
    badge: 'Zero LLMs',
    title: 'Deterministic static analysis',
    detail:
      'Every rule is pure AST pattern matching. Same input always produces the same output — the only way compliance is defensible.',
  },
];

export function TrustBanner() {
  return (
    <section
      aria-label="Deslint by the numbers and three architectural guarantees"
      className="relative overflow-hidden border-y border-gray-200/80 bg-surface-100 py-20 px-6"
    >
      {/* Subtle blueprint grid (carried over from PrivacyTrust). */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(26,82,118,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(26,82,118,0.2) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      <div className="relative mx-auto max-w-6xl">
        {/* Top: count-up pills */}
        <div className="grid grid-cols-2 gap-y-10 gap-x-6 md:grid-cols-4">
          {METRICS.map((m, i) => (
            <MetricCell key={m.label} metric={m} index={i} />
          ))}
        </div>

        {/* Divider */}
        <div className="my-14 h-px w-full bg-gradient-to-r from-transparent via-gray-300/60 to-transparent" />

        {/* Bottom: three architectural pillars */}
        <div className="grid gap-5 md:grid-cols-3">
          {PILLARS.map((p, i) => (
            <motion.div
              key={p.badge}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className="relative overflow-hidden rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm motion-safe:transition-all hover:shadow-lg hover:shadow-primary/5"
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-4 -top-6 select-none font-bold leading-none text-primary/[0.04]"
                style={{ fontSize: '120px' }}
              >
                0
              </div>
              <div className="relative">
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white shadow-sm shadow-primary/20">
                    {p.icon}
                  </div>
                  <span className="rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary-light">
                    {p.badge}
                  </span>
                </div>
                <h3 className="mb-1.5 text-base font-bold leading-snug text-gray-900">
                  {p.title}
                </h3>
                <p className="text-sm leading-relaxed text-gray-500">{p.detail}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function MetricCell({ metric, index }: { metric: Metric; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  // SSR/OG renders at target; if mounted below the fold, reset and animate up.
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
      <div className="mb-1.5 flex items-baseline justify-center">
        <span className="text-4xl font-bold tracking-tight tabular-nums text-primary sm:text-5xl">
          {formatted}
        </span>
      </div>
      <div className="text-sm font-semibold text-gray-900">{metric.label}</div>
      <div className="mt-0.5 text-xs text-gray-500">{metric.sublabel}</div>
    </motion.div>
  );
}
