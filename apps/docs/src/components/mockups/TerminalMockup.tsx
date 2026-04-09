'use client';

import { motion, useInView } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

/**
 * macOS-style terminal with a progressive "deslint scan" output animation.
 * Lines reveal sequentially; the bars fill from zero; a blinking cursor
 * trails the last line. Plays once when the viewport enters view.
 */
interface Line {
  delay: number;
  text: React.ReactNode;
}

export function TerminalMockup() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  // Bar fills are animated independently so the widths animate from 0
  const [score, setScore] = useState(0);
  const [colorsPct, setColorsPct] = useState(0);
  const [spacingPct, setSpacingPct] = useState(0);
  const [typoPct, setTypoPct] = useState(0);
  const [respPct, setRespPct] = useState(0);
  const [a11yPct, setA11yPct] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setColorsPct(92), 1400));
    timers.push(setTimeout(() => setSpacingPct(92), 1550));
    timers.push(setTimeout(() => setTypoPct(86), 1700));
    timers.push(setTimeout(() => setRespPct(97), 1850));
    timers.push(setTimeout(() => setA11yPct(100), 2000));
    // Score ticks up 0 → 88
    timers.push(
      setTimeout(() => {
        let v = 0;
        const id = setInterval(() => {
          v += 4;
          if (v >= 88) {
            v = 88;
            clearInterval(id);
          }
          setScore(v);
        }, 30);
        timers.push(id as unknown as ReturnType<typeof setTimeout>);
      }, 2200),
    );
    return () => timers.forEach((t) => clearTimeout(t));
  }, [inView]);

  const lines: Line[] = [
    {
      delay: 0.1,
      text: (
        <>
          <span className="text-gray-500 select-none">$ </span>
          <span className="text-white">npx deslint scan</span>
        </>
      ),
    },
    {
      delay: 0.5,
      text: (
        <span className="text-gray-500">
          Scanning 247 files across 4 frameworks...
        </span>
      ),
    },
    {
      delay: 0.9,
      text: (
        <span className="text-gray-400">
          <span className="text-pass">✓</span> Parsed React JSX (148 files)
        </span>
      ),
    },
    {
      delay: 1.0,
      text: (
        <span className="text-gray-400">
          <span className="text-pass">✓</span> Parsed Vue SFC (52 files)
        </span>
      ),
    },
    {
      delay: 1.1,
      text: (
        <span className="text-gray-400">
          <span className="text-pass">✓</span> Parsed plain HTML (47 files)
        </span>
      ),
    },
  ];

  return (
    <div className="relative">
      <div className="rounded-2xl border border-gray-800 bg-[#0c0c0c] shadow-2xl shadow-primary/10 overflow-hidden">
        {/* Title bar */}
        <div className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] border-b border-black/60">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f56]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#27c93f]" />
          </div>
          <div className="flex-1 text-center text-[11px] text-gray-500 font-mono truncate">
            ~/projects/my-saas-app — zsh
          </div>
        </div>

        <div
          ref={ref}
          className="px-5 py-4 font-mono text-[12px] leading-relaxed min-h-[380px]"
        >
          {lines.map((line, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 1 } : {}}
              transition={{ duration: 0.2, delay: line.delay }}
            >
              {line.text}
            </motion.div>
          ))}

          {/* Spacer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.2, delay: 1.25 }}
            className="h-3"
          />

          {/* Report header */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.3, delay: 1.3 }}
            className="text-primary-light font-semibold"
          >
            Deslint Design Health Report
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.3, delay: 1.35 }}
            className="text-gray-600 text-[10px] tracking-widest"
          >
            {'─'.repeat(36)}
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.3, delay: 2.15 }}
            className="mt-2 text-white font-semibold"
          >
            Design Health Score:{' '}
            <span className="text-pass text-[14px]">{score}/100</span>
          </motion.div>

          {/* Bars */}
          <div className="mt-3 space-y-1 text-[11px]">
            <BarRow
              label="Colors"
              pct={colorsPct}
              value={92}
              status="3 violations"
              statusColor="text-warn"
            />
            <BarRow
              label="Spacing"
              pct={spacingPct}
              value={92}
              status="3 violations"
              statusColor="text-warn"
            />
            <BarRow
              label="Typography"
              pct={typoPct}
              value={86}
              status="5 violations"
              statusColor="text-warn"
            />
            <BarRow
              label="Responsive"
              pct={respPct}
              value={97}
              status="1 violation"
              statusColor="text-warn"
            />
            <BarRow
              label="A11y (WCAG)"
              pct={a11yPct}
              value={100}
              status="13/13 pass"
              statusColor="text-pass"
            />
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.3, delay: 2.6 }}
            className="mt-3 text-gray-500 text-[11px]"
          >
            Full report:{' '}
            <span className="text-primary-light underline">.deslint/report.html</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.3, delay: 2.8 }}
            className="mt-3 flex items-center"
          >
            <span className="text-gray-500 select-none">$ </span>
            <span className="inline-block w-2 h-3.5 bg-white ml-1 animate-pulse" />
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function BarRow({
  label,
  pct,
  value,
  status,
  statusColor,
}: {
  label: string;
  pct: number;
  value: number;
  status: string;
  statusColor: string;
}) {
  return (
    <div className="flex items-center gap-2 text-gray-400">
      <span className="w-24 flex-none">{label}</span>
      <div className="relative w-40 h-2 rounded-sm bg-gray-800 overflow-hidden">
        <motion.div
          className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-primary-light to-pass"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: [0.21, 0.47, 0.32, 0.98] }}
        />
      </div>
      <span className="w-8 text-right tabular-nums text-white font-semibold">
        {pct > 0 ? value : '--'}
      </span>
      <span className={`ml-2 ${statusColor}`}>{status}</span>
    </div>
  );
}
