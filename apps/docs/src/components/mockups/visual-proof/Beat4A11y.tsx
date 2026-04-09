'use client';

import { motion, useInView } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

interface Beat4Props {
  isActive: boolean;
  autoPlay: boolean;
}

const BEFORE_TRANSCRIPT: Array<{ role: string; text: string; empty?: boolean }> = [
  { role: 'heading 1', text: '(empty)', empty: true },
  { role: 'link', text: '(empty)', empty: true },
  { role: 'link', text: '(empty)', empty: true },
  { role: 'image', text: '(no alt)', empty: true },
  { role: 'button', text: '(empty)', empty: true },
  { role: 'input', text: '(no label)', empty: true },
  { role: 'link', text: 'click here' },
];

const AFTER_TRANSCRIPT: Array<{ role: string; text: string; empty?: boolean }> = [
  { role: 'heading 1', text: 'Team dashboard' },
  { role: 'link', text: 'View analytics' },
  { role: 'link', text: 'Billing, $29 / month' },
  { role: 'image', text: 'Team photo, 8 members' },
  { role: 'button', text: 'Delete account' },
  { role: 'input', text: 'Search projects' },
  { role: 'link', text: 'Read the release notes' },
];

export function Beat4A11y({ isActive, autoPlay: _autoPlay }: Beat4Props) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: '-100px' });
  const shouldRun = isActive && inView;

  return (
    <div ref={ref} className="space-y-6">
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Gauge panel */}
        <Panel label="Lighthouse accessibility" variant="mixed">
          <div className="grid grid-cols-2 gap-6 px-2 py-4">
            <GaugeColumn
              title="Before"
              variant="fail"
              targetScore={67}
              failures={[
                '`[alt]` Image elements do not have `[alt]` attributes',
                '`heading-order` Heading elements are not in sequential order',
                '`label` Form elements do not have associated labels',
              ]}
              run={shouldRun}
            />
            <GaugeColumn
              title="After"
              variant="pass"
              targetScore={100}
              failures={[]}
              run={shouldRun}
            />
          </div>
        </Panel>

        {/* Screen reader transcript panel */}
        <Panel label="Screen reader transcript" variant="mixed">
          <div className="grid gap-0 lg:grid-cols-2 lg:gap-px lg:bg-gray-200">
            <TranscriptColumn
              title="Before"
              variant="fail"
              lines={BEFORE_TRANSCRIPT}
              run={shouldRun}
            />
            <TranscriptColumn
              title="After"
              variant="pass"
              lines={AFTER_TRANSCRIPT}
              run={shouldRun}
            />
          </div>
        </Panel>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-gray-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-fail" />
          <span>Invisible-but-critical rules</span>
        </span>
        <span className="hidden h-3 w-px bg-gray-200 sm:inline-block" />
        <span>
          <code className="font-mono text-gray-700">image-alt-text</code>
          {' · '}
          <code className="font-mono text-gray-700">heading-hierarchy</code>
          {' · '}
          <code className="font-mono text-gray-700">form-labels</code>
          {' · '}
          <code className="font-mono text-gray-700">link-text</code>
          {' · '}
          <code className="font-mono text-gray-700">aria-validation</code>
        </span>
      </div>
    </div>
  );
}

function Panel({
  label,
  variant: _variant,
  children,
}: {
  label: string;
  variant: 'mixed' | 'pass' | 'fail';
  children: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white ring-1 ring-gray-200 shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-2.5">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
          {label}
        </div>
      </div>
      {children}
    </div>
  );
}

function GaugeColumn({
  title,
  variant,
  targetScore,
  failures,
  run,
}: {
  title: string;
  variant: 'fail' | 'pass';
  targetScore: number;
  failures: string[];
  run: boolean;
}) {
  const [score, setScore] = useState(0);

  useEffect(() => {
    if (!run) {
      setScore(0);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const duration = 1600;
    const loop = (t: number) => {
      const elapsed = t - start;
      const p = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setScore(Math.round(eased * targetScore));
      if (p < 1) frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [run, targetScore]);

  const passState = variant === 'pass';
  const ringColor = passState
    ? score >= 90
      ? '#10B981'
      : '#F59E0B'
    : score >= 90
      ? '#10B981'
      : score >= 50
        ? '#F59E0B'
        : '#EF4444';

  const tone = passState ? 'text-pass' : 'text-fail';
  const labelTone = passState
    ? 'bg-pass/10 text-pass ring-pass/20'
    : 'bg-fail/10 text-fail ring-fail/20';

  const R = 40;
  const C = 2 * Math.PI * R;
  const offset = C * (1 - score / 100);

  return (
    <div className="flex flex-col items-center gap-3">
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ${labelTone}`}
      >
        {title}
      </span>
      <div className="relative">
        <svg width="120" height="120" viewBox="0 0 120 120" className="-rotate-90">
          <circle cx="60" cy="60" r={R} stroke="#F1F5F9" strokeWidth="8" fill="none" />
          <motion.circle
            cx="60"
            cy="60"
            r={R}
            stroke={ringColor}
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 50ms linear, stroke 300ms ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={`text-3xl font-bold tabular-nums ${tone}`}>{score}</div>
        </div>
      </div>
      <div className="min-h-[84px] w-full space-y-1 text-center">
        {failures.length === 0 ? (
          <div className="text-[11px] font-medium text-pass">
            No accessibility audit failures
          </div>
        ) : (
          failures.map((f, i) => (
            <motion.div
              key={f}
              initial={{ opacity: 0, x: -4 }}
              animate={run ? { opacity: 1, x: 0 } : { opacity: 0, x: -4 }}
              transition={{ duration: 0.3, delay: 1.6 + i * 0.12 }}
              className="line-clamp-1 text-left text-[10px] text-gray-500"
              title={f.replace(/`/g, '')}
            >
              <span className="text-fail">✕</span>{' '}
              <span
                dangerouslySetInnerHTML={{
                  __html: f.replace(
                    /`([^`]+)`/g,
                    '<code class="font-mono text-gray-700">$1</code>',
                  ),
                }}
              />
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

function TranscriptColumn({
  title,
  variant,
  lines,
  run,
}: {
  title: string;
  variant: 'fail' | 'pass';
  lines: Array<{ role: string; text: string; empty?: boolean }>;
  run: boolean;
}) {
  const passState = variant === 'pass';
  const labelTone = passState
    ? 'bg-pass/10 text-pass ring-pass/20'
    : 'bg-fail/10 text-fail ring-fail/20';
  return (
    <div className="bg-gray-950 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ${labelTone}`}
        >
          {title}
        </span>
        <span className="text-[10px] font-mono text-gray-500">
          {passState ? 'VoiceOver' : 'VoiceOver'}
        </span>
      </div>
      <div className="space-y-0">
        {lines.map((line, i) => (
          <motion.div
            key={`${title}-${i}`}
            initial={{ opacity: 0, x: -6 }}
            animate={run ? { opacity: 1, x: 0 } : { opacity: 0, x: -6 }}
            transition={{ duration: 0.25, delay: 0.2 + i * 0.18 }}
            className="vp-sr-line"
          >
            <span className="vp-sr-role">{line.role}</span>
            <span className={line.empty ? 'vp-sr-empty' : 'vp-sr-text'}>{line.text}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
