'use client';

import { motion, useInView } from 'framer-motion';
import { createContext, useContext, useEffect, useRef, useState } from 'react';

/**
 * The MCP self-correction loop, hand-animated.
 *
 * Three panes, one flow:
 *   ┌──────────────────┐       ┌───────────────┐       ┌──────────────────┐
 *   │  Editor (before) │  →→→  │  Deslint MCP  │  →→→  │  Editor (after)  │
 *   │  AI wrote this   │       │  stdio server │       │  clean, verified │
 *   └──────────────────┘       └───────────────┘       └──────────────────┘
 *
 * Creative goals for this mockup (the single most important visual on the
 * landing page after the Hero — it has to earn "this is a real product,
 * not a deck"):
 *
 *   1. Three physical panes so the story is spatial, not just textual.
 *   2. Connectors (glowing JSON-RPC arrows) that ANIMATE the request flowing
 *      left→center, and the response flowing center→right. Connectors carry
 *      the narrative more than any copy we could write.
 *   3. Bad tokens (arbitrary color/spacing/type) glow faint red in the
 *      "before" pane. Good tokens glow faint green in the "after" pane.
 *      That's the only "data viz" — the rest is typography.
 *   4. The MCP pane logs real protocol exchange with monospace labels and
 *      a single pulsing cursor so it feels like a live server, not a
 *      static screenshot.
 *   5. Loop forever while in view: after the sequence finishes there's a
 *      short hold, then the whole flow replays. We do this by bumping a
 *      `cycle` key on a timer, which remounts the inner step components
 *      with their initial state. No complex state machine needed.
 *   6. Gate the animation on useInView — before the user scrolls into the
 *      section, the panes are static. This is the same discipline the
 *      existing TerminalMockup and EditorMockup use.
 *
 * Design system: inherits the brand palette from globals.css via Tailwind
 * (primary, pass, warn, fail). The dark chrome is #0d1117 / #161b22 to match
 * the existing EditorMockup vocabulary.
 */

const PlayContext = createContext({ playing: false, cycle: 0 });

export function McpFlowMockup() {
  const ref = useRef(null);
  const inView = useInView(ref, { margin: '-120px' });
  const [cycle, setCycle] = useState(0);

  // While the section is in view, loop the animation on a fixed interval.
  // The interval length matches the longest sequential delay inside the
  // flow (~7.2s of animation + 1.8s hold).
  useEffect(() => {
    if (!inView) return;
    const interval = setInterval(() => setCycle((c) => c + 1), 9000);
    return () => clearInterval(interval);
  }, [inView]);

  return (
    <PlayContext.Provider value={{ playing: inView, cycle }}>
      <div ref={ref} className="relative">
        {/* Ambient glow — very subtle — so the whole card feels lit */}
        <div
          aria-hidden="true"
          className="absolute inset-0 rounded-3xl pointer-events-none"
          style={{
            background:
              'radial-gradient(1200px 400px at 50% 0%, rgba(79, 166, 217, 0.10), transparent 70%)',
          }}
        />

        <div className="relative grid grid-cols-1 lg:grid-cols-[1fr_auto_0.9fr_auto_1fr] gap-5 lg:gap-0 items-stretch">
          {/* Pane 1: editor BEFORE */}
          <EditorPane variant="before" />

          {/* Connector 1: editor → MCP */}
          <FlowConnector direction="right" delay={0.8} label="analyze_file" tone="primary" />

          {/* Pane 2: MCP server console */}
          <McpServerPane />

          {/* Connector 2: MCP → editor */}
          <FlowConnector direction="right" delay={4.2} label="fixed" tone="pass" />

          {/* Pane 3: editor AFTER */}
          <EditorPane variant="after" />
        </div>
      </div>
    </PlayContext.Provider>
  );
}

// ── Editor pane ──────────────────────────────────────────────────────

function EditorPane({ variant }: { variant: 'before' | 'after' }) {
  const { cycle } = useContext(PlayContext);

  const label = variant === 'before' ? 'AI just wrote this' : 'After Deslint MCP';
  const labelTone =
    variant === 'before'
      ? 'text-fail-light bg-fail/10 border-fail/30'
      : 'text-pass-light bg-pass/10 border-pass/30';
  const subdomain = variant === 'before' ? '3 violations' : '3 auto-fixed · 1 flagged';

  return (
    <div className="flex flex-col">
      {/* Label above the pane */}
      <div className="flex items-center justify-between mb-3 px-1">
        <span className={`text-[10px] font-semibold uppercase tracking-wider rounded-full border px-2 py-0.5 ${labelTone}`}>
          {label}
        </span>
        <span className="text-[10px] font-mono text-gray-500">{subdomain}</span>
      </div>

      <div className="relative rounded-xl border border-gray-800 bg-[#0d1117] shadow-2xl shadow-black/40 overflow-hidden font-mono flex-grow">
        {/* Title bar */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#161b22] border-b border-gray-800/80">
          <div className="flex gap-1">
            <span className="h-2 w-2 rounded-full bg-[#ff5f56]" />
            <span className="h-2 w-2 rounded-full bg-[#ffbd2e]" />
            <span className="h-2 w-2 rounded-full bg-[#27c93f]" />
          </div>
          <span className="text-[10px] text-gray-500 ml-2">Button.tsx</span>
          {variant === 'after' && (
            <span className="text-[10px] text-pass ml-auto flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-pass motion-safe:animate-pulse" />
              clean
            </span>
          )}
        </div>

        {/* Code area */}
        <div className="flex text-[11px] leading-[1.6]">
          <div className="flex-none py-3 px-2 text-right text-gray-700 select-none">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <div key={n}>{n}</div>
            ))}
          </div>
          <div className="flex-grow py-3 pr-3 pl-2 overflow-x-auto">
            <CodeBlock key={`${variant}-${cycle}`} variant={variant} />
          </div>
        </div>
      </div>
    </div>
  );
}

function CodeBlock({ variant }: { variant: 'before' | 'after' }) {
  const { playing } = useContext(PlayContext);

  // Shared animation params. The "before" pane fades in quickly; the
  // "after" pane waits until the MCP pane has printed its response.
  const base = variant === 'before' ? 0.1 : 5.2;

  const Token = ({
    delay,
    good,
    bad,
    children,
  }: {
    delay: number;
    good?: boolean;
    bad?: boolean;
    children: React.ReactNode;
  }) => (
    <motion.span
      initial={{ opacity: 0 }}
      animate={playing ? { opacity: 1 } : { opacity: 0 }}
      transition={{ duration: 0.25, delay: base + delay, ease: 'easeOut' }}
      className={`relative ${good ? 'text-pass-light' : bad ? 'text-fail-light' : ''}`}
    >
      {children}
      {(good || bad) && playing && (
        <motion.span
          aria-hidden="true"
          className="absolute inset-0 rounded-sm -mx-0.5"
          style={{
            background: good ? 'rgba(39, 174, 96, 0.16)' : 'rgba(231, 76, 60, 0.16)',
            zIndex: -1,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0.6] }}
          transition={{ duration: 0.9, delay: base + delay + 0.1 }}
        />
      )}
    </motion.span>
  );

  if (variant === 'before') {
    return (
      <div className="whitespace-pre">
        <Line>
          <Kw>export</Kw> <Kw>function</Kw> <Fn>Button</Fn>
          <Pu>({'{'} children {'}'})</Pu> <Pu>{'{'}</Pu>
        </Line>
        <Line indent={1}>
          <Kw>return</Kw> <Pu>(</Pu>
        </Line>
        <Line indent={2}>
          <Pu>&lt;</Pu>
          <Tg>button</Tg>
        </Line>
        <Line indent={3}>
          <At>className</At>
          <Pu>=</Pu>
          <St>&quot;rounded-md </St>
          <Token delay={0.4} bad>
            <St>px-[13px]</St>
          </Token>
          <St> </St>
          <Token delay={0.55} bad>
            <St>py-[7px]</St>
          </Token>
        </Line>
        <Line indent={4}>
          <Token delay={0.7} bad>
            <St>bg-[#1a5276]</St>
          </Token>
          <St> text-white&quot;</St>
        </Line>
        <Line indent={2}>
          <Pu>&gt;</Pu>
        </Line>
        <Line indent={3}>
          <Pu>{'{'}</Pu>children<Pu>{'}'}</Pu>
        </Line>
        <Line indent={2}>
          <Pu>&lt;/</Pu>
          <Tg>button</Tg>
          <Pu>&gt;</Pu>
        </Line>
        <Line>
          <Pu>{'}'}</Pu>
        </Line>
      </div>
    );
  }

  return (
    <div className="whitespace-pre">
      <Line>
        <Kw>export</Kw> <Kw>function</Kw> <Fn>Button</Fn>
        <Pu>({'{'} children {'}'})</Pu> <Pu>{'{'}</Pu>
      </Line>
      <Line indent={1}>
        <Kw>return</Kw> <Pu>(</Pu>
      </Line>
      <Line indent={2}>
        <Pu>&lt;</Pu>
        <Tg>button</Tg>
      </Line>
      <Line indent={3}>
        <At>className</At>
        <Pu>=</Pu>
        <St>&quot;rounded-md </St>
        <Token delay={0.2} good>
          <St>px-3</St>
        </Token>
        <St> </St>
        <Token delay={0.4} good>
          <St>py-1.5</St>
        </Token>
      </Line>
      <Line indent={4}>
        <Token delay={0.6} good>
          <St>bg-primary</St>
        </Token>
        <St> text-white&quot;</St>
      </Line>
      <Line indent={2}>
        <Pu>&gt;</Pu>
      </Line>
      <Line indent={3}>
        <Pu>{'{'}</Pu>children<Pu>{'}'}</Pu>
      </Line>
      <Line indent={2}>
        <Pu>&lt;/</Pu>
        <Tg>button</Tg>
        <Pu>&gt;</Pu>
      </Line>
      <Line>
        <Pu>{'}'}</Pu>
      </Line>
    </div>
  );
}

// ── MCP server pane ──────────────────────────────────────────────────

function McpServerPane() {
  const { playing, cycle } = useContext(PlayContext);

  return (
    <div className="flex flex-col">
      {/* Label above the pane */}
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-[10px] font-semibold uppercase tracking-wider rounded-full border px-2 py-0.5 text-primary-light bg-primary/10 border-primary/30">
          Deslint MCP
        </span>
        <span className="text-[10px] font-mono text-gray-500">stdio · JSON-RPC 2.0</span>
      </div>

      <div className="relative rounded-xl border border-primary/30 bg-[#0b1220] shadow-2xl shadow-primary/20 overflow-hidden font-mono flex-grow">
        {/* Title bar */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0e1729] border-b border-primary/20">
          <svg
            className="h-3 w-3 text-primary-light"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            aria-hidden="true"
          >
            <path d="M3 8l3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-[10px] text-primary-light font-semibold">@deslint/mcp</span>
          <span className="text-[10px] text-gray-500 ml-auto flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-pass motion-safe:animate-pulse" />
            listening
          </span>
        </div>

        {/* Log area */}
        <div
          key={cycle}
          className="px-3 py-3 text-[10px] leading-[1.7] text-gray-300 space-y-1.5"
        >
          <LogLine delay={0.3} playing={playing} dim>
            <span className="text-gray-500">// handshake</span>
          </LogLine>
          <LogLine delay={0.5} playing={playing}>
            <Out /> <Method>initialize</Method>
          </LogLine>
          <LogLine delay={0.75} playing={playing}>
            <In /> <span className="text-pass-light">serverInfo</span>{' '}
            <span className="text-gray-500">=</span>{' '}
            <span className="text-gray-300">&quot;deslint&quot;</span>
          </LogLine>
          <LogLine delay={1.0} playing={playing}>
            <Out /> <Method>tools/list</Method>
          </LogLine>
          <LogLine delay={1.3} playing={playing}>
            <In /> <span className="text-pass-light">3 tools</span>{' '}
            <span className="text-gray-500">ready</span>
          </LogLine>

          <LogLine delay={1.9} playing={playing}>
            <Out /> <Method>analyze_file</Method>
          </LogLine>
          <LogLine delay={2.3} playing={playing}>
            <In /> <span className="text-warn-light">4 violations</span>{' '}
            <span className="text-gray-500">/ 600ms</span>
          </LogLine>

          <Violation
            delay={2.6}
            playing={playing}
            rule="no-arbitrary-colors"
            bad="bg-[#1a5276]"
            good="bg-primary"
            kind="fix"
          />
          <Violation
            delay={2.85}
            playing={playing}
            rule="no-arbitrary-spacing"
            bad="px-[13px]"
            good="px-3"
            kind="fix"
          />
          <Violation
            delay={3.1}
            playing={playing}
            rule="no-arbitrary-spacing"
            bad="py-[7px]"
            good="py-1.5"
            kind="fix"
          />
          <Violation
            delay={3.35}
            playing={playing}
            rule="no-arbitrary-typography"
            bad="text-[15px]"
            good=""
            kind="human"
          />

          <LogLine delay={3.9} playing={playing}>
            <Out /> <Method>analyze_and_fix</Method>
          </LogLine>
          <LogLine delay={4.2} playing={playing}>
            <In /> <span className="text-pass-light">3 auto-fixed</span>{' '}
            <span className="text-gray-500">·</span>{' '}
            <span className="text-warn-light">1 flagged</span>{' '}
            <span className="text-gray-500">/ 26ms</span>
          </LogLine>

          <LogLine delay={4.6} playing={playing}>
            <span className="text-gray-600">────────────────────────</span>
          </LogLine>
          <LogLine delay={4.9} playing={playing}>
            <span className="text-primary-light font-semibold">local-first</span>{' '}
            <span className="text-gray-600">·</span>{' '}
            <span className="text-primary-light font-semibold">no LLM</span>{' '}
            <span className="text-gray-600">·</span>{' '}
            <span className="text-primary-light font-semibold">0 bytes egress</span>
          </LogLine>
        </div>
      </div>
    </div>
  );
}

function LogLine({
  children,
  delay,
  playing,
  dim = false,
}: {
  children: React.ReactNode;
  delay: number;
  playing: boolean;
  dim?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -4 }}
      animate={playing ? { opacity: dim ? 0.6 : 1, x: 0 } : { opacity: 0 }}
      transition={{ duration: 0.25, delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

function Violation({
  rule,
  bad,
  good,
  kind,
  delay,
  playing,
}: {
  rule: string;
  bad: string;
  good: string;
  kind: 'fix' | 'human';
  delay: number;
  playing: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={playing ? { opacity: 1, x: 0 } : { opacity: 0 }}
      transition={{ duration: 0.3, delay, ease: 'easeOut' }}
      className="pl-3 flex items-baseline gap-2 flex-wrap"
    >
      <span className={kind === 'fix' ? 'text-warn' : 'text-fail'}>●</span>
      <span className="text-gray-400">deslint/{rule}</span>
      <span className="text-fail-light">{bad}</span>
      {good && <span className="text-gray-600">→</span>}
      {good && <span className="text-pass-light">{good}</span>}
      {kind === 'human' && (
        <span className="ml-auto text-[9px] uppercase tracking-wider text-fail-light/80 font-semibold">
          review
        </span>
      )}
    </motion.div>
  );
}

function Out() {
  return <span className="text-primary-light">→</span>;
}
function In() {
  return <span className="text-pass">←</span>;
}
function Method({ children }: { children: React.ReactNode }) {
  return <span className="text-white font-semibold">{children}</span>;
}

// ── Connectors between panes ─────────────────────────────────────────

function FlowConnector({
  label,
  delay,
  tone,
}: {
  direction: 'right';
  label: string;
  delay: number;
  tone: 'primary' | 'pass';
}) {
  const { playing, cycle } = useContext(PlayContext);
  const color = tone === 'primary' ? 'rgb(79, 166, 217)' : 'rgb(39, 174, 96)';

  return (
    <div
      key={cycle}
      className="hidden lg:flex items-center justify-center relative px-3"
      aria-hidden="true"
    >
      <div className="relative flex flex-col items-center gap-2">
        {/* Line */}
        <svg width="72" height="10" viewBox="0 0 72 10" className="overflow-visible">
          <motion.line
            x1="0"
            y1="5"
            x2="72"
            y2="5"
            stroke={color}
            strokeWidth="1.5"
            strokeDasharray="3 3"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={playing ? { pathLength: 1, opacity: 0.8 } : { pathLength: 0, opacity: 0 }}
            transition={{ duration: 0.6, delay, ease: 'easeOut' }}
          />
          {/* Arrowhead */}
          <motion.path
            d="M 66 0 L 72 5 L 66 10"
            stroke={color}
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ opacity: 0 }}
            animate={playing ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.3, delay: delay + 0.5 }}
          />
          {/* Traveling pulse dot */}
          <motion.circle
            r="2.5"
            cy="5"
            fill={color}
            initial={{ cx: 0, opacity: 0 }}
            animate={playing ? { cx: 72, opacity: [0, 1, 1, 0] } : { cx: 0, opacity: 0 }}
            transition={{ duration: 0.8, delay: delay + 0.2, ease: 'easeInOut' }}
          />
        </svg>

        {/* Label */}
        <motion.span
          initial={{ opacity: 0, y: -2 }}
          animate={playing ? { opacity: 1, y: 0 } : { opacity: 0 }}
          transition={{ duration: 0.3, delay: delay + 0.3 }}
          className="text-[9px] font-mono uppercase tracking-wider"
          style={{ color }}
        >
          {label}
        </motion.span>
      </div>
    </div>
  );
}

// ── Tiny syntax helpers ──────────────────────────────────────────────

function Line({
  children,
  indent = 0,
}: {
  children: React.ReactNode;
  indent?: number;
}) {
  return (
    <div className="whitespace-pre">
      {'  '.repeat(indent)}
      {children}
    </div>
  );
}
function Kw({ children }: { children: React.ReactNode }) {
  return <span className="text-[#c586c0]">{children}</span>;
}
function Fn({ children }: { children: React.ReactNode }) {
  return <span className="text-[#dcdcaa]">{children}</span>;
}
function Tg({ children }: { children: React.ReactNode }) {
  return <span className="text-[#569cd6]">{children}</span>;
}
function At({ children }: { children: React.ReactNode }) {
  return <span className="text-[#9cdcfe]">{children}</span>;
}
function St({ children }: { children: React.ReactNode }) {
  return <span className="text-[#ce9178]">{children}</span>;
}
function Pu({ children }: { children: React.ReactNode }) {
  return <span className="text-gray-400">{children}</span>;
}
