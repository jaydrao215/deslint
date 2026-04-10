'use client';

import { useState } from 'react';
import { FadeIn } from './motion';
import { McpFlowMockup } from './mockups/McpFlowMockup';
import { AsciinemaPlayer } from './AsciinemaPlayer';

/**
 * The MCP self-correction loop section.
 *
 * Structure (top → bottom):
 *   1. Headline block: eyebrow, h2, subhead
 *   2. Two-tab switcher:
 *      - "Visual" → McpFlowMockup (polished, hand-animated, marketing)
 *      - "Real session" → AsciinemaPlayer (unedited recording of the
 *         actual @deslint/mcp server answering JSON-RPC calls)
 *   3. Trust footer: three inline stats — tools registered, round trip,
 *      source leaving machine — so the claim is falsifiable, not vibes
 *
 * Dual-asset discipline: the hand-animated mockup earns attention, the
 * real recording earns belief. Together they form one coherent beat —
 * exactly how SonarQube and CodeRabbit pair a polished hero animation
 * with a "see it in action" capture below.
 */
export function McpLoopSection() {
  const [tab, setTab] = useState<'visual' | 'real'>('visual');

  return (
    <section
      id="mcp-loop"
      className="relative py-24 px-6 bg-gradient-to-b from-[#0a0f1a] via-[#0b1220] to-[#0a0f1a] overflow-hidden"
    >
      {/* Blueprint grid background */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.07] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(79,166,217,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(79,166,217,0.5) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      {/* Ambient light from above */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-64 pointer-events-none"
        style={{
          background:
            'radial-gradient(800px 240px at 50% 0%, rgba(79, 166, 217, 0.18), transparent 70%)',
        }}
      />

      <div className="relative mx-auto max-w-6xl">
        <FadeIn className="mb-12 max-w-3xl">
          <p className="text-sm font-semibold text-primary-light uppercase tracking-wider mb-3">
            The self-correction loop
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 text-balance leading-tight">
            AI writes the code. Deslint tells it exactly{' '}
            <span className="text-primary-light">what to fix</span>. Over stdio,
            in milliseconds, with zero cloud.
          </h2>
          <p className="text-lg text-gray-400 leading-relaxed">
            The <code className="text-primary-light font-mono text-base">@deslint/mcp</code>{' '}
            server speaks the Model Context Protocol over stdio — the same
            transport Cursor and Claude Code already use. Your assistant
            calls{' '}
            <code className="text-primary-light font-mono text-base">analyze_file</code>{' '}
            and{' '}
            <code className="text-primary-light font-mono text-base">analyze_and_fix</code>
            , gets back structured violations with rule IDs and autofixes,
            and corrects its own output before you even see it.
          </p>
        </FadeIn>

        {/* Tab switcher */}
        <FadeIn delay={0.1} className="mb-6">
          <div className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1 backdrop-blur-sm">
            <TabButton active={tab === 'visual'} onClick={() => setTab('visual')}>
              Visual walkthrough
            </TabButton>
            <TabButton active={tab === 'real'} onClick={() => setTab('real')}>
              Real terminal session
            </TabButton>
          </div>
        </FadeIn>

        {/* Asset pane */}
        <FadeIn delay={0.15}>
          <div className="relative rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-sm p-4 sm:p-6 lg:p-8 shadow-2xl shadow-primary/5">
            {tab === 'visual' ? (
              <McpFlowMockup />
            ) : (
              <RealSessionPanel />
            )}
          </div>
        </FadeIn>

        {/* Trust footer */}
        <FadeIn delay={0.25}>
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <TrustCell
              value="6 tools"
              label="registered over MCP"
              detail="analyze · fix · compliance · rules · strategy"
            />
            <TrustCell
              value="<1s"
              label="total round trip"
              detail="initialize + list + analyze + fix"
            />
            <TrustCell
              value="0 bytes"
              label="of source code sent anywhere"
              detail="stdio transport · no network · no LLM"
            />
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
        active
          ? 'bg-primary text-white shadow-lg shadow-primary/30'
          : 'text-gray-400 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

function RealSessionPanel() {
  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-pass animate-pulse" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-pass-light">
            Unedited recording
          </span>
        </div>
        <span className="text-[11px] font-mono text-gray-500">
          asciinema · node packages/mcp/dist/cli.js
        </span>
      </div>
      <div className="rounded-xl overflow-hidden border border-gray-800 shadow-2xl shadow-black/40">
        <AsciinemaPlayer src="/demo/mcp-self-correction.cast" />
      </div>
      <p className="mt-4 text-xs text-gray-500 max-w-2xl">
        This is the actual output of{' '}
        <code className="text-gray-300">node packages/mcp/demo/self-correction-loop.mjs</code>
        , a real MCP JSON-RPC client hitting the compiled{' '}
        <code className="text-gray-300">@deslint/mcp</code> server over stdio.
        Every rule ID, line number, and fix in the cast is produced by the
        server at record time — nothing is mocked.
      </p>
    </div>
  );
}

function TrustCell({
  value,
  label,
  detail,
}: {
  value: string;
  label: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 backdrop-blur-sm">
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-primary-light tabular-nums">{value}</span>
        <span className="text-sm text-gray-300">{label}</span>
      </div>
      <p className="text-xs text-gray-500 font-mono mt-1">{detail}</p>
    </div>
  );
}
