'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Eye, EyeOff, XCircle, CheckCircle2 } from 'lucide-react';

interface Beat3Props {
  isActive: boolean;
  autoPlay: boolean;
}

export function Beat3Contrast({ isActive, autoPlay }: Beat3Props) {
  const [lowVision, setLowVision] = useState(false);
  const [userOverride, setUserOverride] = useState(false);

  useEffect(() => {
    if (!isActive) {
      setLowVision(false);
      setUserOverride(false);
    }
  }, [isActive]);

  useEffect(() => {
    if (!isActive || !autoPlay || userOverride) return;
    const id = setInterval(() => {
      setLowVision((v) => !v);
    }, 3200);
    return () => clearInterval(id);
  }, [isActive, autoPlay, userOverride]);

  const toggle = () => {
    setUserOverride(true);
    setLowVision((v) => !v);
  };

  return (
    <div className="space-y-6">
      {/* Simulation toggle */}
      <div className="flex items-center justify-center">
        <button
          type="button"
          onClick={toggle}
          className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 ring-1 ring-gray-200 motion-safe:transition-all hover:bg-gray-200"
          aria-pressed={lowVision}
          aria-label="Toggle simulated low-vision filter"
        >
          {lowVision ? (
            <>
              <EyeOff className="h-4 w-4 text-primary" />
              <span className="text-primary">Low-vision view</span>
            </>
          ) : (
            <>
              <Eye className="h-4 w-4 text-gray-500" />
              <span>Simulate low vision</span>
            </>
          )}
        </button>
      </div>

      {/* Side-by-side marketing cards */}
      <div className={`grid gap-5 md:grid-cols-2 motion-safe:transition-all motion-safe:duration-500 ${lowVision ? 'vp-lowvision' : ''}`}>
        <CardFrame label="Before" variant="fail">
          <BrokenCard />
          <ContrastBadge ratio="2.85" status="fail" />
        </CardFrame>
        <CardFrame label="After" variant="pass">
          <FixedCard />
          <ContrastBadge ratio="5.74" status="pass" />
        </CardFrame>
      </div>

      {/* Verdict strip */}
      <AnimatePresence mode="wait">
        <motion.div
          key={lowVision ? 'lv' : 'normal'}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.25 }}
          className="text-center text-xs text-gray-500"
        >
          {lowVision ? (
            <>
              With mild-to-moderate vision loss simulated, the{' '}
              <span className="font-semibold text-fail">Before</span> subtitle disappears entirely.
              The <span className="font-semibold text-pass">After</span> version stays readable.
            </>
          ) : (
            <>
              Rule: <code className="font-mono text-gray-700">deslint/a11y-color-contrast</code>
              {' · '}WCAG 1.4.3 AA requires ≥4.5:1 for normal text
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function CardFrame({
  label,
  variant,
  children,
}: {
  label: string;
  variant: 'fail' | 'pass';
  children: React.ReactNode;
}) {
  const badgeTone =
    variant === 'fail'
      ? 'bg-fail/10 text-fail ring-fail/20'
      : 'bg-pass/10 text-pass ring-pass/20';
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white ring-1 ring-gray-200 shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-2.5">
        <div className="flex items-center gap-2 text-[10px] font-mono text-gray-400">
          marketing-hero.tsx
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ${badgeTone}`}
        >
          {label}
        </span>
      </div>
      <div className="relative flex items-center justify-center bg-white px-6 py-10">{children}</div>
    </div>
  );
}

function ContrastBadge({ ratio, status }: { ratio: string; status: 'pass' | 'fail' }) {
  const pass = status === 'pass';
  return (
    <div className="absolute right-3 top-12 z-10">
      <div
        className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-[10px] font-mono font-semibold shadow-md backdrop-blur-sm ring-1 ${
          pass
            ? 'bg-pass/90 text-white ring-pass'
            : 'bg-fail/90 text-white ring-fail'
        }`}
      >
        {pass ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
        <span>{ratio}:1</span>
        <span className="opacity-75">· {pass ? 'AA' : 'FAIL'}</span>
      </div>
    </div>
  );
}

function BrokenCard() {
  return (
    <div
      aria-hidden
      style={{
        width: '100%',
        maxWidth: '280px',
        fontFamily: 'Satoshi, system-ui, sans-serif',
      }}
    >
      <div
        style={{
          fontSize: '12px',
          fontWeight: 600,
          color: '#9CA3AF',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: '10px',
        }}
      >
        New · April 2026
      </div>
      <div
        style={{
          fontSize: '22px',
          fontWeight: 700,
          color: '#111827',
          marginBottom: '10px',
          lineHeight: 1.2,
        }}
      >
        Ship design systems faster
      </div>
      <div
        style={{
          fontSize: '13px',
          color: '#9CA3AF',
          lineHeight: 1.55,
          marginBottom: '16px',
        }}
      >
        The AI-native toolkit that keeps every component on brand — colors,
        type, spacing, responsive, and dark mode.
      </div>
      <div
        style={{
          display: 'inline-block',
          fontSize: '12px',
          fontWeight: 600,
          color: '#1D4ED8',
        }}
      >
        Start building →
      </div>
    </div>
  );
}

function FixedCard() {
  return (
    <div
      aria-hidden
      style={{
        width: '100%',
        maxWidth: '280px',
        fontFamily: 'Satoshi, system-ui, sans-serif',
      }}
    >
      <div
        style={{
          fontSize: '12px',
          fontWeight: 600,
          color: '#6B7280',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: '10px',
        }}
      >
        New · April 2026
      </div>
      <div
        style={{
          fontSize: '22px',
          fontWeight: 700,
          color: '#111827',
          marginBottom: '10px',
          lineHeight: 1.2,
        }}
      >
        Ship design systems faster
      </div>
      <div
        style={{
          fontSize: '13px',
          color: '#4B5563',
          lineHeight: 1.55,
          marginBottom: '16px',
        }}
      >
        The AI-native toolkit that keeps every component on brand — colors,
        type, spacing, responsive, and dark mode.
      </div>
      <div
        style={{
          display: 'inline-block',
          fontSize: '12px',
          fontWeight: 600,
          color: '#1D4ED8',
        }}
      >
        Start building →
      </div>
    </div>
  );
}
