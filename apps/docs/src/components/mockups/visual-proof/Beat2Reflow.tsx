'use client';

import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Monitor, Tablet, Smartphone } from 'lucide-react';

interface Beat2Props {
  isActive: boolean;
  autoPlay: boolean;
}

const PRESETS = [
  { label: 'Desktop', width: 1280, icon: Monitor },
  { label: 'Tablet', width: 720, icon: Tablet },
  { label: 'Phone', width: 375, icon: Smartphone },
] as const;

const MIN_WIDTH = 320;
const MAX_WIDTH = 1440;

export function Beat2Reflow({ isActive, autoPlay }: Beat2Props) {
  const [width, setWidth] = useState<number>(1280);
  const [userOverride, setUserOverride] = useState(false);

  useEffect(() => {
    if (!isActive) {
      setWidth(1280);
      setUserOverride(false);
    }
  }, [isActive]);

  useEffect(() => {
    if (!isActive || !autoPlay || userOverride) return;
    let i = 0;
    const id = setInterval(() => {
      i = (i + 1) % PRESETS.length;
      setWidth(PRESETS[i].width);
    }, 2400);
    return () => clearInterval(id);
  }, [isActive, autoPlay, userOverride]);

  const setWidthFromUser = (w: number) => {
    setUserOverride(true);
    setWidth(w);
  };

  return (
    <div className="space-y-6">
      {/* Width slider + presets */}
      <div className="mx-auto max-w-xl space-y-3">
        <div className="flex items-center justify-center gap-2">
          {PRESETS.map((p) => {
            const Icon = p.icon;
            const active = Math.abs(width - p.width) < 30;
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => setWidthFromUser(p.width)}
                aria-label={`Set viewport to ${p.label} (${p.width} pixels)`}
                aria-pressed={active}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                  active
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Icon className="h-3 w-3" />
                {p.label}
                <span className="font-mono text-[10px] opacity-75">{p.width}</span>
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-gray-400">{MIN_WIDTH}</span>
          <input
            type="range"
            min={MIN_WIDTH}
            max={MAX_WIDTH}
            step={10}
            value={width}
            onChange={(e) => setWidthFromUser(Number(e.target.value))}
            className="vp-slider h-1 flex-1 cursor-ew-resize rounded-full bg-gray-200 accent-primary"
            aria-label="Viewport width"
          />
          <span className="text-[10px] font-mono text-gray-400">{MAX_WIDTH}</span>
        </div>
        <div className="text-center text-xs text-gray-500">
          Rendering at <span className="font-mono font-semibold text-gray-900">{width}px</span>
        </div>
      </div>

      {/* Stacked device frames with shared rendered width */}
      <div className="space-y-5">
        <DeviceFrame label="Before" variant="fail" width={width}>
          <BrokenDashboard />
        </DeviceFrame>
        <DeviceFrame label="After" variant="pass" width={width}>
          <FixedDashboard />
        </DeviceFrame>
      </div>

      {/* Caption */}
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-gray-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-fail" />
          <span>
            Rule: <code className="font-mono text-gray-700">deslint/responsive-required</code>
          </span>
        </span>
        <span className="hidden h-3 w-px bg-gray-200 sm:inline-block" />
        <span>WCAG 1.4.10 Reflow</span>
        <span className="hidden h-3 w-px bg-gray-200 sm:inline-block" />
        <span>Fail if content requires 2D scroll at 320px</span>
      </div>

    </div>
  );
}

function DeviceFrame({
  label,
  variant,
  width,
  children,
}: {
  label: string;
  variant: 'fail' | 'pass';
  width: number;
  children: React.ReactNode;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [frameWidth, setFrameWidth] = useState(1000);

  useEffect(() => {
    if (!frameRef.current) return;
    const el = frameRef.current;
    const update = () => setFrameWidth(el.clientWidth);
    update();
    const obs = new ResizeObserver(update);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const renderedWidth = Math.min(width, frameWidth - 16);
  const badgeTone =
    variant === 'fail'
      ? 'bg-fail/10 text-fail ring-fail/20'
      : 'bg-pass/10 text-pass ring-pass/20';

  return (
    <div
      ref={frameRef}
      className="relative overflow-hidden rounded-2xl bg-gray-50 ring-1 ring-gray-200"
    >
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-100 px-4 py-2">
        <div className="flex items-center gap-2 text-[10px] font-mono text-gray-500">
          <span>0</span>
          <div
            className="h-px flex-1 bg-gray-300"
            style={{ minWidth: '32px' }}
            aria-hidden
          />
          <span>{width}px</span>
        </div>
        <span
          className={`ml-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ${badgeTone}`}
        >
          {label}
        </span>
      </div>

      <div className="relative bg-white">
        <motion.div
          layout
          transition={{ duration: 0.4, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="mx-auto overflow-x-auto"
          style={{ width: `${renderedWidth}px`, maxWidth: '100%' }}
        >
          <div style={{ minWidth: '100%' }}>{children}</div>
        </motion.div>
      </div>
    </div>
  );
}

function BrokenDashboard() {
  return (
    <div
      aria-hidden
      style={{
        width: '900px',
        padding: '16px',
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '12px',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <StatCard title="Monthly revenue" value="$42,180" trend="+12.4%" color="#10B981" />
      <StatCard title="Active users" value="18,203" trend="+4.1%" color="#3B82F6" />
      <StatCard title="Avg session" value="4m 32s" trend="-0.3%" color="#F59E0B" />
    </div>
  );
}

function StatCard({
  title,
  value,
  trend,
  color,
}: {
  title: string;
  value: string;
  trend: string;
  color: string;
}) {
  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #E5E7EB',
        borderRadius: '12px',
        padding: '14px 16px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
      }}
    >
      <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '6px' }}>{title}</div>
      <div
        style={{
          fontSize: '20px',
          fontWeight: 700,
          color: '#111827',
          marginBottom: '4px',
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: '11px', color, fontWeight: 600 }}>{trend}</div>
      <div
        style={{
          marginTop: '10px',
          height: '4px',
          borderRadius: '999px',
          background: '#F3F4F6',
          overflow: 'hidden',
        }}
      >
        <div style={{ width: '66%', height: '100%', background: color, borderRadius: '999px' }} />
      </div>
    </div>
  );
}

function FixedDashboard() {
  return (
    <div
      aria-hidden
      className="vp-fixed-grid"
      style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
    >
      <StatCard title="Monthly revenue" value="$42,180" trend="+12.4%" color="#10B981" />
      <StatCard title="Active users" value="18,203" trend="+4.1%" color="#3B82F6" />
      <StatCard title="Avg session" value="4m 32s" trend="-0.3%" color="#F59E0B" />
    </div>
  );
}
