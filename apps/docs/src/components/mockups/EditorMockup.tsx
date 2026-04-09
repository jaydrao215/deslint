'use client';

import { motion } from 'framer-motion';

/**
 * VSCode-style editor window showing a real Deslint lint error in-context:
 *   - JSX file with an arbitrary hex color
 *   - Red squiggle under the offending token
 *   - Hover tooltip with the actual rule ID and message
 *
 * All hand-coded — syntax highlighting is deliberate span coloring, the
 * squiggle is an inline SVG, and the tooltip is a positioned absolute element.
 */
export function EditorMockup() {
  return (
    <div className="relative">
      <div className="rounded-2xl border border-gray-800 bg-[#1e1e1e] shadow-2xl shadow-primary/10 overflow-hidden font-mono">
        {/* Title bar */}
        <div className="flex items-center gap-2 px-4 py-2 bg-[#323233] border-b border-black/40">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f56]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#27c93f]" />
          </div>
          <div className="flex-1 text-center text-[11px] text-gray-400 truncate">
            components/Button.tsx — deslint-demo
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex bg-[#252526] border-b border-black/40 text-[11px]">
          <div className="flex items-center gap-2 px-4 py-2 bg-[#1e1e1e] text-white border-r border-black/40 relative">
            <svg className="h-3 w-3 text-[#519aba]" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M8 0L0 4v8l8 4 8-4V4L8 0zm6 11.5l-6 3-6-3v-7l6-3 6 3v7z" />
            </svg>
            <span>Button.tsx</span>
            <span className="h-1.5 w-1.5 rounded-full bg-red-500 ml-1" />
            {/* Active tab indicator */}
            <span className="absolute left-0 top-0 right-0 h-0.5 bg-primary-light" />
          </div>
          <div className="flex items-center gap-2 px-4 py-2 text-gray-400 border-r border-black/40">
            <svg className="h-3 w-3 text-[#519aba]" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M8 0L0 4v8l8 4 8-4V4L8 0zm6 11.5l-6 3-6-3v-7l6-3 6 3v7z" />
            </svg>
            <span>Card.tsx</span>
          </div>
        </div>

        {/* Code area */}
        <div className="flex text-[12px] leading-[1.55]">
          {/* Line numbers */}
          <div className="flex-none py-4 px-3 text-right text-gray-600 select-none bg-[#1e1e1e] border-r border-gray-800/50">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>

          {/* Code */}
          <div className="flex-grow py-4 pr-4 pl-3 overflow-x-auto">
            <CodeLine>
              <Keyword>export</Keyword> <Keyword>function</Keyword>{' '}
              <FnName>Button</FnName>
              <Punct>{'({ children })'}</Punct> <Punct>{'{'}</Punct>
            </CodeLine>
            <CodeLine indent={1}>
              <Keyword>return</Keyword> <Punct>(</Punct>
            </CodeLine>
            <CodeLine indent={2}>
              <Punct>&lt;</Punct>
              <Tag>button</Tag>
            </CodeLine>
            <CodeLine indent={3}>
              <Attr>className</Attr>
              <Punct>=</Punct>
              <Str>&quot;rounded-md px-4 py-2 </Str>
              <Squiggle>
                <Str>bg-[#1a5276]</Str>
              </Squiggle>
              <Str> text-white&quot;</Str>
            </CodeLine>
            <CodeLine indent={2}>
              <Punct>&gt;</Punct>
            </CodeLine>
            <CodeLine indent={3}>
              <Punct>{'{'}</Punct>children<Punct>{'}'}</Punct>
            </CodeLine>
            <CodeLine indent={2}>
              <Punct>&lt;/</Punct>
              <Tag>button</Tag>
              <Punct>&gt;</Punct>
            </CodeLine>
            <CodeLine indent={1}>
              <Punct>)</Punct>
            </CodeLine>
            <CodeLine>
              <Punct>{'}'}</Punct>
            </CodeLine>
          </div>
        </div>

        {/* Status bar */}
        <div className="flex items-center justify-between px-4 py-1 bg-primary text-white text-[10px]">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-red-400" />1 Problem
            </span>
            <span>TypeScript React</span>
            <span>UTF-8</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Ln 4, Col 35</span>
            <span className="flex items-center gap-1">
              <svg className="h-3 w-3" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 3a1 1 0 110 2 1 1 0 010-2zm1 8H7v-4h2v4z" />
              </svg>
              Deslint
            </span>
          </div>
        </div>
      </div>

      {/* Floating tooltip */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 1.4, ease: [0.21, 0.47, 0.32, 0.98] }}
        className="absolute left-4 right-4 sm:left-[18%] sm:right-auto top-[65%] sm:top-[62%] z-10 sm:max-w-sm"
      >
        <div className="rounded-lg border border-red-500/40 bg-[#252526] shadow-2xl shadow-red-900/40 overflow-hidden">
          <div className="flex items-start gap-2 px-3 py-2 border-b border-black/40">
            <svg className="h-4 w-4 flex-none text-red-400 mt-0.5" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm-.75 3.5h1.5v5h-1.5v-5zm0 6.5h1.5v1.5h-1.5V11z" />
            </svg>
            <div className="flex-grow min-w-0">
              <div className="text-[11px] text-white font-semibold leading-tight">
                Arbitrary color <code className="text-yellow-200">#1a5276</code> — use{' '}
                <code className="text-pass-light">bg-primary</code> instead
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5 font-mono">
                deslint/no-arbitrary-colors
              </div>
            </div>
          </div>
          <div className="px-3 py-2 bg-[#1e1e1e] text-[10px] text-gray-400">
            <span className="text-primary-light">Quick fix:</span> Replace{' '}
            <code className="text-red-300">bg-[#1a5276]</code> with{' '}
            <code className="text-pass-light">bg-primary</code>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function CodeLine({
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

function Keyword({ children }: { children: React.ReactNode }) {
  return <span className="text-[#c586c0]">{children}</span>;
}
function FnName({ children }: { children: React.ReactNode }) {
  return <span className="text-[#dcdcaa]">{children}</span>;
}
function Tag({ children }: { children: React.ReactNode }) {
  return <span className="text-[#569cd6]">{children}</span>;
}
function Attr({ children }: { children: React.ReactNode }) {
  return <span className="text-[#9cdcfe]">{children}</span>;
}
function Str({ children }: { children: React.ReactNode }) {
  return <span className="text-[#ce9178]">{children}</span>;
}
function Punct({ children }: { children: React.ReactNode }) {
  return <span className="text-gray-300">{children}</span>;
}

function Squiggle({ children }: { children: React.ReactNode }) {
  return (
    <span className="relative inline-block">
      {children}
      {/* Wavy red underline */}
      <motion.svg
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.6, delay: 1.0 }}
        viewBox="0 0 120 4"
        preserveAspectRatio="none"
        className="absolute left-0 right-0 -bottom-0.5 w-full h-[4px]"
        aria-hidden="true"
      >
        <motion.path
          d="M0 2 Q 5 0, 10 2 T 20 2 T 30 2 T 40 2 T 50 2 T 60 2 T 70 2 T 80 2 T 90 2 T 100 2 T 110 2 T 120 2"
          stroke="#f48771"
          strokeWidth="1.5"
          fill="none"
        />
      </motion.svg>
    </span>
  );
}
