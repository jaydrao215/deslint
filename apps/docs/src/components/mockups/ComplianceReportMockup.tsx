'use client';

import { motion } from 'framer-motion';

/**
 * Pixel-accurate inline mockup of the HTML compliance report that
 * `deslint compliance` actually produces. Used as the hero-right visual.
 *
 * Everything here is hand-built to match packages/cli/src/compliance-report.ts
 * so viewers can verify "this is really what the tool outputs" by running it
 * themselves. No PNG, no lorem ipsum — the same criteria, same layout, same
 * color system as the real report.
 */
export function ComplianceReportMockup() {
  return (
    <div className="relative">
      {/* Browser chrome */}
      <div className="rounded-2xl border border-gray-200/80 bg-white shadow-2xl shadow-primary/10 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 bg-gray-100 border-b border-gray-200/80">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f56]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#27c93f]" />
          </div>
          <div className="flex-1 mx-3 h-5 rounded-md bg-white border border-gray-200 flex items-center px-2 text-[10px] text-gray-400 font-mono truncate">
            file:///.deslint/compliance.html
          </div>
        </div>

        {/* Report content */}
        <div className="p-5 sm:p-6">
          {/* Title */}
          <div className="mb-4">
            <div className="text-[15px] font-bold text-primary leading-tight">
              WCAG 2.2 Compliance Report
            </div>
            <div className="text-[10px] text-gray-500 mt-0.5">
              Project: <span className="font-semibold text-gray-700">deslint-docs</span> ·
              Scanned: Apr 9, 2026 · 18 files
            </div>
          </div>

          {/* Hero stat grid — 5 cards */}
          <div className="grid grid-cols-5 gap-2 mb-4">
            <StatCard label="WCAG 2.2" value="Level AA" tone="pass" />
            <StatCard label="WCAG 2.1 AA*" value="Level AA" tone="pass" />
            <StatCard label="Pass Rate" value="100%" tone="default" />
            <StatCard label="Coverage" value="100%" tone="default" />
            <StatCard label="Violations" value="0" tone="pass" />
          </div>

          {/* ADA note */}
          <div className="rounded border-l-2 border-primary bg-gray-50 px-3 py-2 mb-4">
            <div className="text-[9px] text-gray-600 leading-snug">
              <strong className="text-primary">ADA Title II note:</strong>{' '}
              The public-entity ADA Title II rule adopts WCAG 2.1 Level AA as
              its technical standard. Every criterion evaluated here also exists
              in WCAG 2.1.
            </div>
          </div>

          {/* Level A section */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-bold text-primary">Level A</span>
              <span className="text-[9px] text-gray-500">(5/5 passing)</span>
              <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-[#d4edda] text-[#155724] px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider">
                Conformant
              </span>
            </div>
            <div className="rounded border border-gray-200 overflow-hidden">
              <CriterionRow sc="1.1.1" title="Non-text Content" pass animated delay={0.2} />
              <CriterionRow sc="1.3.1" title="Info and Relationships" pass animated delay={0.3} />
              <CriterionRow sc="2.4.4" title="Link Purpose (In Context)" pass animated delay={0.4} />
              <CriterionRow sc="3.1.1" title="Language of Page" pass animated delay={0.5} />
              <CriterionRow sc="4.1.2" title="Name, Role, Value" pass animated delay={0.6} />
            </div>
          </div>

          {/* Level AA section */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-bold text-primary">Level AA</span>
              <span className="text-[9px] text-gray-500">(8/8 passing)</span>
              <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-[#d4edda] text-[#155724] px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider">
                Conformant
              </span>
            </div>
            <div className="rounded border border-gray-200 overflow-hidden">
              <CriterionRow sc="1.4.3" title="Contrast (Minimum)" pass animated delay={0.7} />
              <CriterionRow sc="1.4.10" title="Reflow" pass animated delay={0.75} />
              <CriterionRow sc="1.4.11" title="Non-text Contrast" pass animated delay={0.8} />
              <CriterionRow sc="2.4.6" title="Headings and Labels" pass animated delay={0.85} />
              <CriterionRow sc="2.4.7" title="Focus Visible" pass animated delay={0.9} />
            </div>
          </div>
        </div>
      </div>

      {/* Floating "Level AA" badge */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 1.0, ease: [0.21, 0.47, 0.32, 0.98] }}
        className="absolute -bottom-5 -right-3 sm:-right-5 rounded-xl bg-white border border-gray-200 shadow-xl shadow-primary/20 px-4 py-3 flex items-center gap-3"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pass/10">
          <svg className="h-5 w-5 text-pass" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
            ADA Title II
          </div>
          <div className="text-sm font-bold text-gray-900 -mt-0.5">
            Conformant
          </div>
        </div>
      </motion.div>

      {/* Floating "13/13" badge */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 1.2, ease: [0.21, 0.47, 0.32, 0.98] }}
        className="absolute -top-4 -left-3 sm:-left-5 rounded-xl bg-primary text-white shadow-xl shadow-primary/30 px-4 py-3"
      >
        <div className="text-[10px] uppercase tracking-wider font-semibold opacity-80">
          Criteria Passing
        </div>
        <div className="text-xl font-bold -mt-0.5">
          13 / 13
        </div>
      </motion.div>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'pass' | 'fail' | 'default';
}) {
  const valueClass =
    tone === 'pass' ? 'text-pass' : tone === 'fail' ? 'text-fail' : 'text-primary';
  return (
    <div className="rounded border border-gray-200 bg-gray-50 px-2 py-2">
      <div className="text-[7px] text-gray-500 uppercase tracking-wider font-semibold truncate">
        {label}
      </div>
      <div className={`text-[11px] font-bold truncate ${valueClass}`}>{value}</div>
    </div>
  );
}

function CriterionRow({
  sc,
  title,
  pass,
  animated,
  delay,
}: {
  sc: string;
  title: string;
  pass: boolean;
  animated?: boolean;
  delay?: number;
}) {
  const badge = pass ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#d4edda] text-[#155724] px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wider">
      Pass
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#f8d7da] text-[#721c24] px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wider">
      Fail
    </span>
  );

  const content = (
    <div
      className={`flex items-center gap-2 px-2 py-1.5 border-b border-gray-100 last:border-0 text-[10px] ${pass ? 'bg-[rgba(39,174,96,0.03)]' : 'bg-[rgba(231,76,60,0.03)]'}`}
    >
      <span className="font-mono font-bold text-primary w-10 flex-none">{sc}</span>
      <span className="text-gray-700 flex-grow truncate">{title}</span>
      {badge}
    </div>
  );

  if (!animated) return content;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
    >
      {content}
    </motion.div>
  );
}
