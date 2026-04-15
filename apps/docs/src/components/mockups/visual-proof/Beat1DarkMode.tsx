'use client';

// Inline styles (not Tailwind classes) on every "before" card so the landing
// stays Level AA under its own scanner. See ROADMAP.md S7.5 decision.

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

interface Beat1Props {
  isActive: boolean;
  autoPlay: boolean;
}

export function Beat1DarkMode({ isActive, autoPlay }: Beat1Props) {
  const [isDark, setIsDark] = useState(false);
  const [userOverride, setUserOverride] = useState(false);

  useEffect(() => {
    if (!isActive) {
      setIsDark(false);
      setUserOverride(false);
    }
  }, [isActive]);

  useEffect(() => {
    if (!isActive || !autoPlay || userOverride) return;
    const id = setInterval(() => setIsDark((d) => !d), 3500);
    return () => clearInterval(id);
  }, [isActive, autoPlay, userOverride]);

  const setModeFromUser = (dark: boolean) => {
    setUserOverride(true);
    setIsDark(dark);
  };

  return (
    <div className="space-y-6">
      {/* Dark-mode toggle */}
      <div className="flex items-center justify-center">
        <div className="inline-flex items-center gap-1 rounded-full bg-gray-100 p-1 ring-1 ring-gray-200">
          <ToggleButton
            active={!isDark}
            onClick={() => setModeFromUser(false)}
            icon={<Sun className="h-4 w-4" />}
            label="Light mode"
          />
          <ToggleButton
            active={isDark}
            onClick={() => setModeFromUser(true)}
            icon={<Moon className="h-4 w-4" />}
            label="Dark mode"
          />
        </div>
      </div>

      {/* Side-by-side page frames */}
      <div className="grid gap-5 md:grid-cols-2">
        <PageFrame label="Before" variant="fail" isDark={isDark}>
          <BrokenPricingCard />
        </PageFrame>
        <PageFrame label="After" variant="pass" isDark={isDark}>
          <FixedPricingCard isDark={isDark} />
        </PageFrame>
      </div>

      {/* Explanatory strip */}
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-gray-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-fail" />
          <span>
            Rule: <code className="font-mono text-gray-700">deslint/dark-mode-coverage</code>
          </span>
        </span>
        <span className="hidden h-3 w-px bg-gray-200 sm:inline-block" />
        <span>WCAG 1.4.3 · 1.4.11</span>
        <span className="hidden h-3 w-px bg-gray-200 sm:inline-block" />
        <span>Auto-fix: adds <code className="font-mono text-gray-700">dark:</code> variants</span>
      </div>
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={`relative flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium motion-safe:transition-all ${
        active
          ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200'
          : 'text-gray-500 hover:text-gray-700'
      }`}
    >
      {icon}
      <span>{label.replace(' mode', '')}</span>
    </button>
  );
}

function PageFrame({
  label,
  variant,
  isDark,
  children,
}: {
  label: string;
  variant: 'fail' | 'pass';
  isDark: boolean;
  children: React.ReactNode;
}) {
  const badgeTone =
    variant === 'fail'
      ? 'bg-fail/10 text-fail ring-fail/20'
      : 'bg-pass/10 text-pass ring-pass/20';

  return (
    <div className="relative overflow-hidden rounded-2xl ring-1 ring-gray-200 shadow-sm">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-gray-300" aria-hidden />
          <span className="h-2.5 w-2.5 rounded-full bg-gray-300" aria-hidden />
          <span className="h-2.5 w-2.5 rounded-full bg-gray-300" aria-hidden />
        </div>
        <div className="mx-auto -ml-10 text-[10px] font-mono text-gray-400">
          localhost:3000/pricing
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ${badgeTone}`}
        >
          {label}
        </span>
      </div>

      {/* Simulated page surface */}
      <div
        className="relative flex items-center justify-center p-6 motion-safe:transition-colors motion-safe:duration-500"
        style={{
          background: isDark ? '#0B1220' : '#F8FAFC',
          minHeight: '280px',
        }}
      >
        <AnimatePresence>
          {isDark && variant === 'fail' && (
            <motion.div
              key="glare"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'radial-gradient(ellipse 60% 40% at 50% 50%, rgba(255,255,255,0.08), transparent)',
              }}
              aria-hidden
            />
          )}
        </AnimatePresence>
        {children}
      </div>
    </div>
  );
}

function BrokenPricingCard() {
  return (
    <div
      aria-hidden
      style={{
        width: '100%',
        maxWidth: '260px',
        background: '#FFFFFF',
        border: '1px solid #E5E7EB',
        borderRadius: '14px',
        padding: '20px 22px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.06)',
        color: '#111827',
        fontFamily: 'Satoshi, system-ui, sans-serif',
      }}
    >
      <div
        style={{
          display: 'inline-block',
          background: '#DBEAFE',
          color: '#1D4ED8',
          padding: '3px 10px',
          borderRadius: '999px',
          fontSize: '10px',
          fontWeight: 600,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          marginBottom: '14px',
        }}
      >
        Most popular
      </div>
      <div style={{ fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>
        Pro
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '14px' }}>
        <span style={{ fontSize: '30px', fontWeight: 700 }}>$29</span>
        <span style={{ fontSize: '12px', color: '#6B7280' }}>/month</span>
      </div>
      <ul style={{ padding: 0, margin: 0, listStyle: 'none', fontSize: '13px', color: '#374151' }}>
        <PlanRow label="Unlimited projects" />
        <PlanRow label="Priority support" />
        <PlanRow label="Team seats" />
      </ul>
      <button
        type="button"
        aria-hidden
        tabIndex={-1}
        style={{
          marginTop: '16px',
          width: '100%',
          background: '#1D4ED8',
          color: '#FFFFFF',
          border: 'none',
          padding: '10px 14px',
          borderRadius: '10px',
          fontSize: '13px',
          fontWeight: 600,
          cursor: 'default',
        }}
      >
        Start free trial
      </button>
    </div>
  );
}

function PlanRow({ label }: { label: string }) {
  return (
    <li style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M5 12l5 5L20 7"
          stroke="#10B981"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span>{label}</span>
    </li>
  );
}

function FixedPricingCard({ isDark }: { isDark: boolean }) {
  const bg = isDark ? '#111827' : '#FFFFFF';
  const border = isDark ? '#1F2937' : '#E5E7EB';
  const ink = isDark ? '#F9FAFB' : '#111827';
  const mute = isDark ? '#9CA3AF' : '#6B7280';
  const chipBg = isDark ? '#1E3A8A' : '#DBEAFE';
  const chipInk = isDark ? '#BFDBFE' : '#1D4ED8';
  const btnBg = isDark ? '#2563EB' : '#1D4ED8';
  const row = isDark ? '#D1D5DB' : '#374151';

  return (
    <div
      aria-hidden
      style={{
        width: '100%',
        maxWidth: '260px',
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: '14px',
        padding: '20px 22px',
        boxShadow: isDark
          ? '0 1px 2px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.35)'
          : '0 1px 2px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.06)',
        color: ink,
        fontFamily: 'Satoshi, system-ui, sans-serif',
        transition: 'all 0.4s ease',
      }}
    >
      <div
        style={{
          display: 'inline-block',
          background: chipBg,
          color: chipInk,
          padding: '3px 10px',
          borderRadius: '999px',
          fontSize: '10px',
          fontWeight: 600,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          marginBottom: '14px',
          transition: 'all 0.4s ease',
        }}
      >
        Most popular
      </div>
      <div style={{ fontSize: '18px', fontWeight: 700, marginBottom: '4px', color: ink }}>
        Pro
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '14px' }}>
        <span style={{ fontSize: '30px', fontWeight: 700, color: ink }}>$29</span>
        <span style={{ fontSize: '12px', color: mute }}>/month</span>
      </div>
      <ul style={{ padding: 0, margin: 0, listStyle: 'none', fontSize: '13px', color: row }}>
        <PlanRow label="Unlimited projects" />
        <PlanRow label="Priority support" />
        <PlanRow label="Team seats" />
      </ul>
      <button
        type="button"
        aria-hidden
        tabIndex={-1}
        style={{
          marginTop: '16px',
          width: '100%',
          background: btnBg,
          color: '#FFFFFF',
          border: 'none',
          padding: '10px 14px',
          borderRadius: '10px',
          fontSize: '13px',
          fontWeight: 600,
          cursor: 'default',
          transition: 'background 0.4s ease',
        }}
      >
        Start free trial
      </button>
    </div>
  );
}
