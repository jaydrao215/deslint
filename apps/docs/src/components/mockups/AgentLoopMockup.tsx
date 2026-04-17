'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

/**
 * Compact hero visual. Two stacked panels wired over stdio:
 *
 *   ┌────────────────────────┐
 *   │  AI agent (tool_call)  │   — vendor-neutral: Cursor, Claude Code,
 *   └────────────────────────┘     Copilot, your own agent, doesn't matter.
 *              ↓
 *        stdio · JSON-RPC
 *              ↓
 *   ┌────────────────────────┐
 *   │  @deslint/mcp response │   — deterministic findings + auto-fixes,
 *   └────────────────────────┘     local only, no LLM, 0 bytes egress.
 *
 * The hero story is: the design-system quality gate lives *inside* the
 * AI coding loop, not after a PR. Keep this one card, one beat, short.
 * The full three-pane version lives in McpLoopSection below the fold.
 */
export function AgentLoopMockup() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <div ref={ref} className="relative mx-auto max-w-[520px]">
      <div
        aria-hidden="true"
        className="absolute -inset-8 pointer-events-none"
        style={{
          background:
            'radial-gradient(600px 260px at 50% 40%, rgba(79,166,217,0.18), transparent 70%)',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
        transition={{ duration: 0.5 }}
        className="relative"
      >
        <AgentPanel playing={inView} />
        <StdioPipe playing={inView} />
        <DeslintPanel playing={inView} />
      </motion.div>
    </div>
  );
}

function AgentPanel({ playing }: { playing: boolean }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-[#0d1117] shadow-2xl shadow-black/40 font-mono overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-[#161b22] border-b border-gray-800">
        <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">
          AI agent
        </span>
        <span className="ml-auto text-[10px] text-gray-500">tool call</span>
      </div>
      <div className="px-3 py-3 space-y-1 text-[11px] text-gray-300 leading-[1.7]">
        <Step delay={0.1} playing={playing}>
          <span className="text-primary-light">→</span>{' '}
          <span className="text-white font-semibold">tools/call</span>{' '}
          <span className="text-gray-500">deslint.analyze_and_fix</span>
        </Step>
        <Step delay={0.25} playing={playing}>
          <span className="text-gray-500">  path:</span>{' '}
          <span className="text-[#ce9178]">&quot;src/Button.tsx&quot;</span>
        </Step>
      </div>
    </div>
  );
}

function DeslintPanel({ playing }: { playing: boolean }) {
  return (
    <div className="rounded-xl border border-primary/30 bg-[#0b1220] shadow-2xl shadow-primary/20 font-mono overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0e1729] border-b border-primary/20">
        <span className="text-[10px] text-primary-light font-semibold">@deslint/mcp</span>
        <span className="ml-auto text-[10px] text-gray-500 flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-pass motion-safe:animate-pulse" />
          local · no LLM · 0 bytes egress
        </span>
      </div>
      <div className="px-3 py-3 space-y-1 text-[11px] leading-[1.7]">
        <Step delay={1.1} playing={playing}>
          <span className="text-pass">←</span>{' '}
          <span className="text-warn-light">4 findings</span>{' '}
          <span className="text-gray-600">/ 612ms</span>
        </Step>
        <Diff delay={1.3} playing={playing} rule="no-arbitrary-colors"        bad="bg-[#1a5276]" good="bg-primary" />
        <Diff delay={1.45} playing={playing} rule="no-arbitrary-spacing"      bad="px-[13px]"    good="px-3" />
        <Diff delay={1.6} playing={playing} rule="a11y-color-contrast"        bad="3.2:1"        good="7.1:1" />
        <Diff delay={1.75} playing={playing} rule="no-hard-coded-dark-mode"   bad="bg-white"     good="bg-background" />
        <Step delay={2.0} playing={playing}>
          <span className="text-pass">←</span>{' '}
          <span className="text-pass-light font-semibold">3 auto-fixed</span>{' '}
          <span className="text-gray-600">·</span>{' '}
          <span className="text-warn-light">1 flagged for review</span>
        </Step>
      </div>
    </div>
  );
}

function Step({
  children,
  delay,
  playing,
}: {
  children: React.ReactNode;
  delay: number;
  playing: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -4 }}
      animate={playing ? { opacity: 1, x: 0 } : { opacity: 0, x: -4 }}
      transition={{ duration: 0.3, delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

function Diff({
  rule,
  bad,
  good,
  delay,
  playing,
}: {
  rule: string;
  bad: string;
  good: string;
  delay: number;
  playing: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={playing ? { opacity: 1, x: 0 } : { opacity: 0, x: -6 }}
      transition={{ duration: 0.3, delay, ease: 'easeOut' }}
      className="pl-3 flex items-baseline gap-2 flex-wrap text-[10px]"
    >
      <span className="text-warn">●</span>
      <span className="text-gray-400">deslint/{rule}</span>
      <span className="text-fail-light">{bad}</span>
      <span className="text-gray-600">→</span>
      <span className="text-pass-light">{good}</span>
    </motion.div>
  );
}

function StdioPipe({ playing }: { playing: boolean }) {
  return (
    <div className="relative flex items-center justify-center py-2" aria-hidden="true">
      <svg width="10" height="28" viewBox="0 0 10 28" className="overflow-visible">
        <motion.line
          x1="5"
          y1="0"
          x2="5"
          y2="22"
          stroke="rgb(79,166,217)"
          strokeWidth="1.5"
          strokeDasharray="3 3"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={playing ? { pathLength: 1, opacity: 0.85 } : { pathLength: 0, opacity: 0 }}
          transition={{ duration: 0.5, delay: 0.55 }}
        />
        <motion.path
          d="M 0 22 L 5 28 L 10 22"
          stroke="rgb(79,166,217)"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ opacity: 0 }}
          animate={playing ? { opacity: 0.9 } : { opacity: 0 }}
          transition={{ duration: 0.3, delay: 0.95 }}
        />
      </svg>
      <motion.span
        initial={{ opacity: 0 }}
        animate={playing ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.3, delay: 1.0 }}
        className="absolute left-[calc(50%+14px)] text-[9px] font-mono uppercase tracking-wider text-primary-light"
      >
        stdio · JSON-RPC
      </motion.span>
    </div>
  );
}
