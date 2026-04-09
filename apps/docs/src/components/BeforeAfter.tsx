'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { ArrowRight, AlertTriangle, CheckCircle2, Terminal } from 'lucide-react';

/**
 * "Before Deslint / After Deslint" — the single most important storytelling
 * beat on the page. The same AI-generated component is rendered twice, with
 * the 6 real design-drift issues that AI code generators ship highlighted on
 * the left, and the Deslint-normalized equivalent on the right.
 *
 * Every flag here maps to an actual rule in packages/eslint-plugin/src/rules.
 */
export function BeforeAfter() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section className="relative py-24 px-6 bg-white overflow-hidden">
      <div className="mx-auto max-w-6xl">
        <div className="mb-14 max-w-2xl">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.4 }}
            className="text-sm font-semibold text-primary uppercase tracking-wider mb-3"
          >
            Before · After
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 text-balance"
          >
            The exact drift AI ships — and what Deslint lands instead
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-lg text-gray-500 leading-relaxed"
          >
            Same AI-generated React component. Six real violations on the left —
            each one maps to a deterministic rule, a WCAG criterion, or both.
            The right-hand version is what lands after <code className="font-mono text-primary">deslint --fix</code>.
          </motion.p>
        </div>

        <div ref={ref} className="grid gap-6 lg:grid-cols-[1fr_auto_1fr] lg:gap-4 items-center">
          {/* Before — AI-generated */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] }}
          >
            <Panel
              tone="bad"
              label="AI-generated"
              status="6 violations"
              statusIcon={<AlertTriangle className="h-3.5 w-3.5" />}
            >
              <CodeBefore />
            </Panel>
          </motion.div>

          {/* Arrow */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={inView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="hidden lg:flex flex-col items-center justify-center px-2"
          >
            <div className="flex items-center gap-2 rounded-full border border-primary/20 bg-primary-50 px-3 py-1.5 font-mono text-[11px] text-primary font-semibold shadow-sm">
              <Terminal className="h-3 w-3" />
              deslint --fix
            </div>
            <ArrowRight className="h-5 w-5 text-primary mt-2" />
          </motion.div>

          {/* Mobile arrow */}
          <div className="flex lg:hidden items-center justify-center gap-2 text-primary">
            <div className="h-px w-8 bg-primary/30" />
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary-50 px-3 py-1 font-mono text-[11px] font-semibold">
              <Terminal className="h-3 w-3" />
              deslint --fix
            </span>
            <div className="h-px w-8 bg-primary/30" />
          </div>

          {/* After — Deslint-clean */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.15, ease: [0.21, 0.47, 0.32, 0.98] }}
          >
            <Panel
              tone="good"
              label="Deslint-clean"
              status="0 violations"
              statusIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
            >
              <CodeAfter />
            </Panel>
          </motion.div>
        </div>

        {/* Violations mapped */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-10 grid gap-3 md:grid-cols-2 lg:grid-cols-3"
        >
          {VIOLATIONS.map((v) => (
            <div
              key={v.rule}
              className="flex items-start gap-3 rounded-xl border border-gray-200/80 bg-white p-4 shadow-sm"
            >
              <span className="flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-fail/10 text-fail font-bold text-xs">
                {v.n}
              </span>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-gray-900 leading-snug">
                  {v.title}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px]">
                  <code className="font-mono text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                    {v.rule}
                  </code>
                  {v.wcag && (
                    <span className="text-primary font-semibold">
                      WCAG {v.wcag}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

interface Violation {
  n: number;
  title: string;
  rule: string;
  wcag?: string;
}

const VIOLATIONS: Violation[] = [
  {
    n: 1,
    title: 'Arbitrary hex color bg-[#1e3a5f] off the token palette',
    rule: 'deslint/no-arbitrary-colors',
  },
  {
    n: 2,
    title: 'p-[13px] breaks the 4/8px spacing scale',
    rule: 'deslint/spacing-scale-consistency',
  },
  {
    n: 3,
    title: 'Arbitrary typography text-[32px] drifts off the type scale',
    rule: 'deslint/typography-scale',
    wcag: '1.4.4',
  },
  {
    n: 4,
    title: 'Missing alt text on <img> — non-text content has no accessible name',
    rule: 'deslint/image-alt-text',
    wcag: '1.1.1',
  },
  {
    n: 5,
    title: 'Inline style color bypasses every design token',
    rule: 'deslint/no-inline-styles',
  },
  {
    n: 6,
    title: 'flex-row with no mobile breakpoint — layout breaks under 640px',
    rule: 'deslint/responsive-required',
    wcag: '1.4.10',
  },
];

function Panel({
  tone,
  label,
  status,
  statusIcon,
  children,
}: {
  tone: 'bad' | 'good';
  label: string;
  status: string;
  statusIcon: React.ReactNode;
  children: React.ReactNode;
}) {
  const bar =
    tone === 'bad'
      ? 'bg-fail/10 border-fail/20 text-fail'
      : 'bg-pass/10 border-pass/20 text-pass';
  return (
    <div className="rounded-2xl border border-gray-200/80 bg-[#1e1e1e] shadow-xl overflow-hidden">
      {/* Title bar */}
      <div className="flex items-center gap-2 px-4 py-2 bg-[#323233] border-b border-black/40">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f56]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#27c93f]" />
        </div>
        <span className="text-[11px] text-gray-400 font-mono">Hero.tsx</span>
        <span
          className={`ml-auto inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${bar}`}
        >
          {statusIcon}
          {label} · {status}
        </span>
      </div>

      {/* Code */}
      <div className="px-4 py-4 font-mono text-[11px] leading-[1.7] min-h-[240px]">
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Before code — AI-generated with six real violations                *
 * ------------------------------------------------------------------ */

function CodeBefore() {
  return (
    <div className="whitespace-pre">
      <Line>
        <K>export</K> <K>function</K> <F>Hero</F>
        <P>{'() {'}</P>
      </Line>
      <Line indent={1}>
        <K>return</K> <P>(</P>
      </Line>
      <Line indent={2}>
        <P>&lt;</P>
        <T>div</T> <A>className</A>
        <P>=</P>
        <S>&quot;</S>
        <Bad n={2}>
          <S>p-[13px]</S>
        </Bad>{' '}
        <Bad n={1}>
          <S>bg-[#1e3a5f]</S>
        </Bad>
        <S>&quot;</S>
        <P>&gt;</P>
      </Line>
      <Line indent={3}>
        <P>&lt;</P>
        <T>img</T> <A>src</A>
        <P>=</P>
        <S>&quot;/logo.png&quot;</S>{' '}
        <Bad n={4}>
          <P>/&gt;</P>
        </Bad>
      </Line>
      <Line indent={3}>
        <P>&lt;</P>
        <T>h1</T> <A>className</A>
        <P>=</P>
        <S>&quot;</S>
        <Bad n={3}>
          <S>text-[32px]</S>
        </Bad>
        <S>&quot;</S>
        <P>&gt;</P>
        <span className="text-gray-300">Welcome</span>
        <P>&lt;/</P>
        <T>h1</T>
        <P>&gt;</P>
      </Line>
      <Line indent={3}>
        <P>&lt;</P>
        <T>div</T> <A>className</A>
        <P>=</P>
        <S>&quot;</S>
        <Bad n={6}>
          <S>flex flex-row</S>
        </Bad>
        <S> gap-4&quot;</S>
        <P>&gt;</P>
      </Line>
      <Line indent={4}>
        <P>&lt;</P>
        <T>button</T>{' '}
        <Bad n={5}>
          <A>style</A>
          <P>=</P>
          <P>{'{{'}</P>
          <span className="text-gray-300"> color: </span>
          <S>&apos;#ff6347&apos;</S>
          <P>{' }}'}</P>
        </Bad>
        <P>&gt;</P>
      </Line>
      <Line indent={5}>
        <span className="text-gray-300">Get started</span>
      </Line>
      <Line indent={4}>
        <P>&lt;/</P>
        <T>button</T>
        <P>&gt;</P>
      </Line>
      <Line indent={3}>
        <P>&lt;/</P>
        <T>div</T>
        <P>&gt;</P>
      </Line>
      <Line indent={2}>
        <P>&lt;/</P>
        <T>div</T>
        <P>&gt;</P>
      </Line>
      <Line indent={1}>
        <P>);</P>
      </Line>
      <Line>
        <P>{'}'}</P>
      </Line>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * After code — Deslint-clean                                         *
 * ------------------------------------------------------------------ */

function CodeAfter() {
  return (
    <div className="whitespace-pre">
      <Line>
        <K>export</K> <K>function</K> <F>Hero</F>
        <P>{'() {'}</P>
      </Line>
      <Line indent={1}>
        <K>return</K> <P>(</P>
      </Line>
      <Line indent={2}>
        <P>&lt;</P>
        <T>div</T> <A>className</A>
        <P>=</P>
        <S>&quot;</S>
        <Good>
          <S>p-3</S>
        </Good>{' '}
        <Good>
          <S>bg-primary-950</S>
        </Good>
        <S>&quot;</S>
        <P>&gt;</P>
      </Line>
      <Line indent={3}>
        <P>&lt;</P>
        <T>img</T> <A>src</A>
        <P>=</P>
        <S>&quot;/logo.png&quot;</S>{' '}
        <Good>
          <A>alt</A>
          <P>=</P>
          <S>&quot;Company logo&quot;</S>
        </Good>{' '}
        <P>/&gt;</P>
      </Line>
      <Line indent={3}>
        <P>&lt;</P>
        <T>h1</T> <A>className</A>
        <P>=</P>
        <S>&quot;</S>
        <Good>
          <S>text-3xl</S>
        </Good>
        <S>&quot;</S>
        <P>&gt;</P>
        <span className="text-gray-300">Welcome</span>
        <P>&lt;/</P>
        <T>h1</T>
        <P>&gt;</P>
      </Line>
      <Line indent={3}>
        <P>&lt;</P>
        <T>div</T> <A>className</A>
        <P>=</P>
        <S>&quot;</S>
        <Good>
          <S>flex flex-col md:flex-row</S>
        </Good>
        <S> gap-4&quot;</S>
        <P>&gt;</P>
      </Line>
      <Line indent={4}>
        <P>&lt;</P>
        <T>button</T> <A>className</A>
        <P>=</P>
        <S>&quot;</S>
        <Good>
          <S>text-fail</S>
        </Good>
        <S>&quot;</S>
        <P>&gt;</P>
      </Line>
      <Line indent={5}>
        <span className="text-gray-300">Get started</span>
      </Line>
      <Line indent={4}>
        <P>&lt;/</P>
        <T>button</T>
        <P>&gt;</P>
      </Line>
      <Line indent={3}>
        <P>&lt;/</P>
        <T>div</T>
        <P>&gt;</P>
      </Line>
      <Line indent={2}>
        <P>&lt;/</P>
        <T>div</T>
        <P>&gt;</P>
      </Line>
      <Line indent={1}>
        <P>);</P>
      </Line>
      <Line>
        <P>{'}'}</P>
      </Line>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Syntax helpers                                                     *
 * ------------------------------------------------------------------ */

function Line({ children, indent = 0 }: { children: React.ReactNode; indent?: number }) {
  return (
    <div>
      {'  '.repeat(indent)}
      {children}
    </div>
  );
}
function K({ children }: { children: React.ReactNode }) {
  return <span className="text-[#c586c0]">{children}</span>;
}
function F({ children }: { children: React.ReactNode }) {
  return <span className="text-[#dcdcaa]">{children}</span>;
}
function T({ children }: { children: React.ReactNode }) {
  return <span className="text-[#569cd6]">{children}</span>;
}
function A({ children }: { children: React.ReactNode }) {
  return <span className="text-[#9cdcfe]">{children}</span>;
}
function S({ children }: { children: React.ReactNode }) {
  return <span className="text-[#ce9178]">{children}</span>;
}
function P({ children }: { children: React.ReactNode }) {
  return <span className="text-gray-300">{children}</span>;
}

/** Red-tinted background + small numbered badge overlay for flagged code */
function Bad({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <span className="relative inline-block rounded-sm bg-fail/20 px-0.5 ring-1 ring-inset ring-fail/50">
      {children}
      <span className="absolute -top-2 -right-2 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-fail text-white text-[8px] font-bold leading-none shadow-sm">
        {n}
      </span>
    </span>
  );
}

/** Green-tinted background for the corrected token */
function Good({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-sm bg-pass/15 px-0.5 ring-1 ring-inset ring-pass/40">
      {children}
    </span>
  );
}
