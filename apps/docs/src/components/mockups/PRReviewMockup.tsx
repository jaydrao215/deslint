'use client';

import { motion } from 'framer-motion';

/**
 * GitHub-styled pull request file diff with a Deslint bot review comment
 * attached to a specific added line. Matches GitHub's diff colors, gutter
 * layout, and comment box chrome. Hand-coded — no external screenshot.
 */
export function PRReviewMockup() {
  return (
    <div className="relative">
      <div className="rounded-2xl border border-gray-200/80 bg-white shadow-2xl shadow-primary/10 overflow-hidden">
        {/* Tab strip */}
        <div className="flex items-center gap-6 px-5 pt-4 pb-0 border-b border-gray-200 bg-gray-50">
          <Tab label="Conversation" count="14" />
          <Tab label="Commits" count="7" />
          <Tab label="Checks" count="3" />
          <Tab label="Files changed" count="8" active />
        </div>

        {/* File path bar */}
        <div className="flex items-center gap-2 px-5 py-2.5 border-b border-gray-200 bg-white text-[11px]">
          <svg className="h-3.5 w-3.5 text-gray-500" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M2 1.75C2 .784 2.784 0 3.75 0h5.586c.464 0 .909.184 1.237.513l3.914 3.914c.329.328.513.773.513 1.237v8.586A1.75 1.75 0 0113.25 16h-9.5A1.75 1.75 0 012 14.25V1.75z" />
          </svg>
          <span className="font-mono text-gray-900 font-semibold">
            apps/web/components/PricingCard.tsx
          </span>
          <span className="ml-2 text-gray-500">
            <span className="text-pass">+18</span>{' '}
            <span className="text-fail">−4</span>
          </span>
        </div>

        {/* Diff */}
        <div className="font-mono text-[11px] leading-[1.55]">
          <DiffLine oldNo="12" newNo="12" />
          <DiffLine oldNo="13" newNo="13">
            <Punct>&lt;</Punct>
            <Tag>div</Tag>{' '}
            <Attr>className</Attr>
            <Punct>=</Punct>
            <Str>&quot;rounded-lg p-6&quot;</Str>
            <Punct>&gt;</Punct>
          </DiffLine>
          <DiffLine oldNo="14" newNo="" removed>
            {'  '}
            <Punct>&lt;</Punct>
            <Tag>img</Tag>{' '}
            <Attr>src</Attr>
            <Punct>=</Punct>
            <Str>&quot;/icon.png&quot;</Str>{' '}
            <Punct>/&gt;</Punct>
          </DiffLine>
          <DiffLine oldNo="" newNo="14" added>
            {'  '}
            <Punct>&lt;</Punct>
            <Tag>img</Tag>{' '}
            <Attr>src</Attr>
            <Punct>=</Punct>
            <Str>&quot;/icon.png&quot;</Str>{' '}
            <Attr>alt</Attr>
            <Punct>=</Punct>
            <Str>&quot;&quot;</Str>{' '}
            <Punct>/&gt;</Punct>
          </DiffLine>
          <DiffLine oldNo="15" newNo="15">
            {'  '}
            <Punct>&lt;</Punct>
            <Tag>h2</Tag>
            <Punct>&gt;</Punct>
            <span className="text-gray-900">Pro plan</span>
            <Punct>&lt;/</Punct>
            <Tag>h2</Tag>
            <Punct>&gt;</Punct>
          </DiffLine>
          <DiffLine oldNo="" newNo="16" added>
            {'  '}
            <Punct>&lt;</Punct>
            <Tag>p</Tag>{' '}
            <Attr>className</Attr>
            <Punct>=</Punct>
            <Str>&quot;</Str>
            <Highlight>
              <Str>text-[13px]</Str>
            </Highlight>
            <Str>&quot;</Str>
            <Punct>&gt;</Punct>$29/mo
            <Punct>&lt;/</Punct>
            <Tag>p</Tag>
            <Punct>&gt;</Punct>
          </DiffLine>

          {/* Deslint bot review comment */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="px-6 py-4 border-y border-gray-200 bg-gray-50"
          >
            <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
              {/* Comment header */}
              <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-200 bg-gray-50">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white font-bold text-[10px]">
                  D
                </div>
                <span className="text-[11px] font-semibold text-gray-900">
                  deslint-bot
                </span>
                <span className="text-[10px] text-gray-500">
                  commented on this line
                </span>
                <span className="ml-auto text-[10px] text-gray-400">just now</span>
              </div>

              {/* Comment body */}
              <div className="px-4 py-3 space-y-2.5">
                <div className="flex items-start gap-2">
                  <svg className="h-3.5 w-3.5 flex-none text-fail mt-0.5" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                    <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm-.75 3.5h1.5v5h-1.5v-5zm0 6.5h1.5v1.5h-1.5V11z" />
                  </svg>
                  <div className="text-[11px] text-gray-900 leading-snug">
                    <strong>Arbitrary typography</strong>{' '}
                    <code className="text-[10px] bg-gray-100 px-1 py-0.5 rounded">
                      text-[13px]
                    </code>{' '}
                    breaks the type scale. Use{' '}
                    <code className="text-[10px] bg-pass/10 text-pass px-1 py-0.5 rounded">
                      text-sm
                    </code>{' '}
                    (14px) or{' '}
                    <code className="text-[10px] bg-pass/10 text-pass px-1 py-0.5 rounded">
                      text-xs
                    </code>{' '}
                    (12px).
                  </div>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-gray-500">
                  <span className="inline-flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-fail" />
                    WCAG 1.4.4 Resize Text
                  </span>
                  <span>·</span>
                  <span className="font-mono">deslint/no-arbitrary-typography</span>
                </div>
                <div className="pt-2 border-t border-gray-100">
                  <div className="text-[10px] text-gray-500 mb-1.5 font-semibold uppercase tracking-wider">
                    Suggested change
                  </div>
                  <div className="rounded border border-gray-200 bg-gray-50 font-mono text-[10px] overflow-hidden">
                    <div className="px-2 py-1 bg-[rgba(231,76,60,0.08)] text-gray-800">
                      <span className="text-fail mr-1">−</span>
                      className=&quot;text-[13px]&quot;
                    </div>
                    <div className="px-2 py-1 bg-[rgba(39,174,96,0.08)] text-gray-800">
                      <span className="text-pass mr-1">+</span>
                      className=&quot;text-sm&quot;
                    </div>
                  </div>
                </div>
              </div>

              {/* Action bar */}
              <div className="flex items-center gap-2 px-4 py-2 border-t border-gray-200 bg-gray-50">
                <button
                  type="button"
                  className="text-[10px] font-semibold text-white bg-pass hover:bg-pass-dark px-2.5 py-1 rounded border border-pass-dark/30"
                >
                  Commit suggestion
                </button>
                <button
                  type="button"
                  className="text-[10px] text-gray-700 hover:bg-gray-100 px-2.5 py-1 rounded border border-gray-200"
                >
                  Reply
                </button>
              </div>
            </div>
          </motion.div>

          <DiffLine oldNo="16" newNo="17">
            <Punct>&lt;/</Punct>
            <Tag>div</Tag>
            <Punct>&gt;</Punct>
          </DiffLine>
        </div>

        {/* Check status */}
        <div className="flex items-center gap-2 px-5 py-3 border-t border-gray-200 bg-red-50">
          <svg className="h-4 w-4 text-fail" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M8 0a8 8 0 100 16A8 8 0 008 0zM3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
          </svg>
          <span className="text-[11px] text-gray-900">
            <strong>deslint / design-quality</strong> — 1 violation blocking merge
          </span>
          <span className="ml-auto text-[11px] text-primary font-semibold">Details</span>
        </div>
      </div>
    </div>
  );
}

function Tab({
  label,
  count,
  active,
}: {
  label: string;
  count?: string;
  active?: boolean;
}) {
  return (
    <div
      className={`relative pb-3 text-[11px] ${active ? 'text-gray-900 font-semibold' : 'text-gray-500'}`}
    >
      <span>{label}</span>
      {count && (
        <span className="ml-1.5 text-[10px] bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded-full">
          {count}
        </span>
      )}
      {active && (
        <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-[#ff8c42] rounded-sm" />
      )}
    </div>
  );
}

function DiffLine({
  oldNo,
  newNo,
  added,
  removed,
  children,
}: {
  oldNo: string;
  newNo: string;
  added?: boolean;
  removed?: boolean;
  children?: React.ReactNode;
}) {
  const bg = added
    ? 'bg-[rgba(39,174,96,0.08)]'
    : removed
      ? 'bg-[rgba(231,76,60,0.08)]'
      : '';
  const marker = added ? (
    <span className="text-pass">+</span>
  ) : removed ? (
    <span className="text-fail">−</span>
  ) : (
    ' '
  );
  return (
    <div className={`flex ${bg} min-h-[22px]`}>
      <span className="w-10 flex-none text-right pr-2 text-gray-400 select-none border-r border-gray-100">
        {oldNo}
      </span>
      <span className="w-10 flex-none text-right pr-2 text-gray-400 select-none border-r border-gray-200">
        {newNo}
      </span>
      <span className="w-6 flex-none text-center text-gray-500 select-none">
        {marker}
      </span>
      <span className="flex-grow pr-4 whitespace-pre text-gray-900 overflow-x-auto">
        {children}
      </span>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="text-[#116329]">{children}</span>;
}
function Attr({ children }: { children: React.ReactNode }) {
  return <span className="text-[#0550ae]">{children}</span>;
}
function Str({ children }: { children: React.ReactNode }) {
  return <span className="text-[#0a3069]">{children}</span>;
}
function Punct({ children }: { children: React.ReactNode }) {
  return <span className="text-gray-700">{children}</span>;
}
function Highlight({ children }: { children: React.ReactNode }) {
  return (
    <span className="relative inline-block">
      <span className="relative z-10">{children}</span>
      <span className="absolute inset-0 -mx-0.5 rounded-sm bg-red-200/60" aria-hidden="true" />
    </span>
  );
}
