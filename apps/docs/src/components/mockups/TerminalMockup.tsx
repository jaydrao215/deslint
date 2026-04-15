'use client';

import { motion, useInView } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

interface Line {
  delay: number;
  text: React.ReactNode;
}

// Target values — initialized into state so SSR/OG crawlers and above-fold
// viewers render the final report, not an empty "0/100" skeleton.
const TARGET_SCORE = 88;
const TARGET_COLORS = 92;
const TARGET_SPACING = 92;
const TARGET_TYPO = 86;
const TARGET_RESP = 97;
const TARGET_A11Y = 100;

export function TerminalMockup() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  const [score, setScore] = useState(TARGET_SCORE);
  const [colorsPct, setColorsPct] = useState(TARGET_COLORS);
  const [spacingPct, setSpacingPct] = useState(TARGET_SPACING);
  const [typoPct, setTypoPct] = useState(TARGET_TYPO);
  const [respPct, setRespPct] = useState(TARGET_RESP);
  const [a11yPct, setA11yPct] = useState(TARGET_A11Y);
  const [armed, setArmed] = useState(false);

  // On mount, if the element is below the fold, arm the animation:
  // reset all values to zero so the existing in-view effect can run
  // the 0 → target fill when the user scrolls to the section.
  // If the element is already in view on mount, leave the target
  // values in place — no snap-to-zero flicker.
  useEffect(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const belowFold = rect.top > window.innerHeight;
    if (belowFold) {
      setScore(0);
      setColorsPct(0);
      setSpacingPct(0);
      setTypoPct(0);
      setRespPct(0);
      setA11yPct(0);
      setArmed(true);
    }
  }, []);

  useEffect(() => {
    if (!inView || !armed) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setColorsPct(TARGET_COLORS), 1400));
    timers.push(setTimeout(() => setSpacingPct(TARGET_SPACING), 1550));
    timers.push(setTimeout(() => setTypoPct(TARGET_TYPO), 1700));
    timers.push(setTimeout(() => setRespPct(TARGET_RESP), 1850));
    timers.push(setTimeout(() => setA11yPct(TARGET_A11Y), 2000));
    timers.push(
      setTimeout(() => {
        let v = 0;
        const id = setInterval(() => {
          v += 4;
          if (v >= TARGET_SCORE) {
            v = TARGET_SCORE;
            clearInterval(id);
          }
          setScore(v);
        }, 30);
        timers.push(id as unknown as ReturnType<typeof setTimeout>);
      }, 2200),
    );
    return () => timers.forEach((t) => clearTimeout(t));
  }, [inView, armed]);

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
          className="px-5 py-4 font-mono text-xs leading-relaxed min-h-[380px] overflow-x-auto whitespace-nowrap"
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
            <span className="text-pass text-sm">{score}/100</span>
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
            <span className="inline-block w-2 h-3.5 bg-white ml-1 motion-safe:animate-pulse" />
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
        {value}
      </span>
      <span className={`ml-2 ${statusColor}`}>{status}</span>
    </div>
  );
}
