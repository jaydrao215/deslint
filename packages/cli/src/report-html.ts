/**
 * Generates a self-contained HTML report file for Vizlint scan results.
 * Tabbed interface — no external dependencies, all CSS/JS embedded inline.
 */

import { relative } from 'node:path';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import type { LintResult, RuleCategory } from './lint-runner.js';
import type { ScoreResult, HistoryEntry } from './score.js';
import { calculateDebt, formatDebt, type DebtResult } from './debt.js';

const _require = createRequire(import.meta.url);
const _pkg = _require('../package.json') as { version: string };

interface ViolationEntry {
  file: string;
  line: number;
  column: number;
  severity: string;
  ruleId: string;
  message: string;
}

interface RuleSummary {
  ruleId: string;
  shortName: string;
  count: number;
  category: string;
  fixable: boolean;
  files: Set<string>;
}

const RULE_CATEGORIES: Record<string, string> = {
  'vizlint/no-arbitrary-colors': 'Colors',
  'vizlint/a11y-color-contrast': 'Colors',
  'vizlint/dark-mode-coverage': 'Colors',
  'vizlint/no-arbitrary-spacing': 'Spacing',
  'vizlint/no-magic-numbers-layout': 'Spacing',
  'vizlint/no-arbitrary-typography': 'Typography',
  'vizlint/responsive-required': 'Responsive',
  'vizlint/consistent-component-spacing': 'Consistency',
  'vizlint/consistent-border-radius': 'Consistency',
  'vizlint/no-arbitrary-zindex': 'Consistency',
  'vizlint/no-inline-styles': 'Consistency',
  'vizlint/max-component-lines': 'Consistency',
  'vizlint/missing-states': 'Responsive',
  'vizlint/image-alt-text': 'Responsive',
};

const FIXABLE_RULES = new Set([
  'vizlint/no-arbitrary-colors',
  'vizlint/no-arbitrary-spacing',
  'vizlint/no-arbitrary-typography',
  'vizlint/dark-mode-coverage',
  'vizlint/no-arbitrary-zindex',
  'vizlint/no-magic-numbers-layout',
]);

// ─── Visual Pattern Types ────────────────────────────────────────────

interface VisualPattern {
  key: string;          // unique grouping key
  ruleId: string;
  count: number;
  files: Set<string>;
  data: Record<string, string>;  // parsed fields from message
}

// ─── Tailwind → hex lookup for contrast rendering ────────────────────

// Full Tailwind color palette for visual rendering (all 22 families × 11 shades + white/black)
// Imported inline to keep report self-contained — mirrors packages/eslint-plugin/src/utils/color-map.ts
const TW_COLOR_HEX: Record<string, string> = {
  'white':'#ffffff','black':'#000000','transparent':'transparent','current':'currentColor',
  'slate-50':'#f8fafc','slate-100':'#f1f5f9','slate-200':'#e2e8f0','slate-300':'#cbd5e1','slate-400':'#94a3b8','slate-500':'#64748b','slate-600':'#475569','slate-700':'#334155','slate-800':'#1e293b','slate-900':'#0f172a','slate-950':'#020617',
  'gray-50':'#f9fafb','gray-100':'#f3f4f6','gray-200':'#e5e7eb','gray-300':'#d1d5db','gray-400':'#9ca3af','gray-500':'#6b7280','gray-600':'#4b5563','gray-700':'#374151','gray-800':'#1f2937','gray-900':'#111827','gray-950':'#030712',
  'zinc-50':'#fafafa','zinc-100':'#f4f4f5','zinc-200':'#e4e4e7','zinc-300':'#d4d4d8','zinc-400':'#a1a1aa','zinc-500':'#71717a','zinc-600':'#52525b','zinc-700':'#3f3f46','zinc-800':'#27272a','zinc-900':'#18181b','zinc-950':'#09090b',
  'neutral-50':'#fafafa','neutral-100':'#f5f5f5','neutral-200':'#e5e5e5','neutral-300':'#d4d4d4','neutral-400':'#a3a3a3','neutral-500':'#737373','neutral-600':'#525252','neutral-700':'#404040','neutral-800':'#262626','neutral-900':'#171717','neutral-950':'#0a0a0a',
  'stone-50':'#fafaf9','stone-100':'#f5f5f4','stone-200':'#e7e5e4','stone-300':'#d6d3d1','stone-400':'#a8a29e','stone-500':'#78716c','stone-600':'#57534e','stone-700':'#44403c','stone-800':'#292524','stone-900':'#1c1917','stone-950':'#0c0a09',
  'red-50':'#fef2f2','red-100':'#fee2e2','red-200':'#fecaca','red-300':'#fca5a5','red-400':'#f87171','red-500':'#ef4444','red-600':'#dc2626','red-700':'#b91c1c','red-800':'#991b1b','red-900':'#7f1d1d','red-950':'#450a0a',
  'orange-50':'#fff7ed','orange-100':'#ffedd5','orange-200':'#fed7aa','orange-300':'#fdba74','orange-400':'#fb923c','orange-500':'#f97316','orange-600':'#ea580c','orange-700':'#c2410c','orange-800':'#9a3412','orange-900':'#7c2d12','orange-950':'#431407',
  'amber-50':'#fffbeb','amber-100':'#fef3c7','amber-200':'#fde68a','amber-300':'#fcd34d','amber-400':'#fbbf24','amber-500':'#f59e0b','amber-600':'#d97706','amber-700':'#b45309','amber-800':'#92400e','amber-900':'#78350f','amber-950':'#451a03',
  'yellow-50':'#fefce8','yellow-100':'#fef9c3','yellow-200':'#fef08a','yellow-300':'#fde047','yellow-400':'#facc15','yellow-500':'#eab308','yellow-600':'#ca8a04','yellow-700':'#a16207','yellow-800':'#854d0e','yellow-900':'#713f12','yellow-950':'#422006',
  'lime-50':'#f7fee7','lime-100':'#ecfccb','lime-200':'#d9f99d','lime-300':'#bef264','lime-400':'#a3e635','lime-500':'#84cc16','lime-600':'#65a30d','lime-700':'#4d7c0f','lime-800':'#3f6212','lime-900':'#365314','lime-950':'#1a2e05',
  'green-50':'#f0fdf4','green-100':'#dcfce7','green-200':'#bbf7d0','green-300':'#86efac','green-400':'#4ade80','green-500':'#22c55e','green-600':'#16a34a','green-700':'#15803d','green-800':'#166534','green-900':'#14532d','green-950':'#052e16',
  'emerald-50':'#ecfdf5','emerald-100':'#d1fae5','emerald-200':'#a7f3d0','emerald-300':'#6ee7b7','emerald-400':'#34d399','emerald-500':'#10b981','emerald-600':'#059669','emerald-700':'#047857','emerald-800':'#065f46','emerald-900':'#064e3b','emerald-950':'#022c22',
  'teal-50':'#f0fdfa','teal-100':'#ccfbf1','teal-200':'#99f6e4','teal-300':'#5eead4','teal-400':'#2dd4bf','teal-500':'#14b8a6','teal-600':'#0d9488','teal-700':'#0f766e','teal-800':'#115e59','teal-900':'#134e4a','teal-950':'#042f2e',
  'cyan-50':'#ecfeff','cyan-100':'#cffafe','cyan-200':'#a5f3fc','cyan-300':'#67e8f9','cyan-400':'#22d3ee','cyan-500':'#06b6d4','cyan-600':'#0891b2','cyan-700':'#0e7490','cyan-800':'#155e75','cyan-900':'#164e63','cyan-950':'#083344',
  'sky-50':'#f0f9ff','sky-100':'#e0f2fe','sky-200':'#bae6fd','sky-300':'#7dd3fc','sky-400':'#38bdf8','sky-500':'#0ea5e9','sky-600':'#0284c7','sky-700':'#0369a1','sky-800':'#075985','sky-900':'#0c4a6e','sky-950':'#082f49',
  'blue-50':'#eff6ff','blue-100':'#dbeafe','blue-200':'#bfdbfe','blue-300':'#93c5fd','blue-400':'#60a5fa','blue-500':'#3b82f6','blue-600':'#2563eb','blue-700':'#1d4ed8','blue-800':'#1e40af','blue-900':'#1e3a8a','blue-950':'#172554',
  'indigo-50':'#eef2ff','indigo-100':'#e0e7ff','indigo-200':'#c7d2fe','indigo-300':'#a5b4fc','indigo-400':'#818cf8','indigo-500':'#6366f1','indigo-600':'#4f46e5','indigo-700':'#4338ca','indigo-800':'#3730a3','indigo-900':'#312e81','indigo-950':'#1e1b4b',
  'violet-50':'#f5f3ff','violet-100':'#ede9fe','violet-200':'#ddd6fe','violet-300':'#c4b5fd','violet-400':'#a78bfa','violet-500':'#8b5cf6','violet-600':'#7c3aed','violet-700':'#6d28d9','violet-800':'#5b21b6','violet-900':'#4c1d95','violet-950':'#2e1065',
  'purple-50':'#faf5ff','purple-100':'#f3e8ff','purple-200':'#e9d5ff','purple-300':'#d8b4fe','purple-400':'#c084fc','purple-500':'#8b5cf6','purple-600':'#7c3aed','purple-700':'#6d28d9','purple-800':'#5b21b6','purple-900':'#4c1d95','purple-950':'#2e1065',
  'fuchsia-50':'#fdf4ff','fuchsia-100':'#fae8ff','fuchsia-200':'#f5d0fe','fuchsia-300':'#f0abfc','fuchsia-400':'#e879f9','fuchsia-500':'#d946ef','fuchsia-600':'#c026d3','fuchsia-700':'#a21caf','fuchsia-800':'#86198f','fuchsia-900':'#701a75','fuchsia-950':'#4a044e',
  'pink-50':'#fdf2f8','pink-100':'#fce7f3','pink-200':'#fbcfe8','pink-300':'#f9a8d4','pink-400':'#f472b6','pink-500':'#ec4899','pink-600':'#db2777','pink-700':'#be185d','pink-800':'#9d174d','pink-900':'#831843','pink-950':'#500724',
  'rose-50':'#fff1f2','rose-100':'#ffe4e6','rose-200':'#fecdd3','rose-300':'#fda4af','rose-400':'#fb7185','rose-500':'#f43f5e','rose-600':'#e11d48','rose-700':'#be123c','rose-800':'#9f1239','rose-900':'#881337','rose-950':'#4c0519',
};

function twClassToHex(cls: string): string | null {
  // text-white → white, bg-red-500 → red-500
  const m = cls.match(/^(?:text|bg|border|ring|fill|stroke|accent|caret|outline|decoration|placeholder|divide|shadow)-(.+)$/);
  if (!m) return null;
  return TW_COLOR_HEX[m[1]] ?? null;
}

// ─── Pattern Extraction from Violation Messages ──────────────────────

function extractPatterns(violations: ViolationEntry[]): VisualPattern[] {
  const map = new Map<string, VisualPattern>();

  for (const v of violations) {
    let key = '';
    const data: Record<string, string> = {};

    if (v.ruleId === 'vizlint/a11y-color-contrast') {
      const m = v.message.match(/Contrast ratio ([\d.]+):1 between `([^`]+)` and `([^`]+)` fails WCAG AA \(needs ([\d.]+):1\)/);
      if (m) {
        data.ratio = m[1]; data.textClass = m[2]; data.bgClass = m[3]; data.required = m[4];
        const sugM = v.message.match(/Try `([^`]+)` on `([^`]+)` \(ratio ([\d.]+):1\)/);
        if (sugM) { data.suggestedText = sugM[1]; data.suggestedBg = sugM[2]; data.suggestedRatio = sugM[3]; }
        key = `contrast:${data.textClass}|${data.bgClass}`;
      }
    } else if (v.ruleId === 'vizlint/no-arbitrary-spacing') {
      const m = v.message.match(/Arbitrary spacing `([^`]+)` detected/);
      if (m) {
        data.className = m[1];
        const sugM = v.message.match(/Suggested: `([^`]+)`/);
        if (sugM) data.suggested = sugM[1];
        key = `spacing:${data.className}→${data.suggested ?? '?'}`;
      }
    } else if (v.ruleId === 'vizlint/no-arbitrary-typography') {
      const m = v.message.match(/Arbitrary typography `([^`]+)` detected/);
      if (m) {
        data.className = m[1];
        const sugM = v.message.match(/Suggested: `([^`]+)`/);
        if (sugM) data.suggested = sugM[1];
        key = `typo:${data.className}→${data.suggested ?? '?'}`;
      }
    } else if (v.ruleId === 'vizlint/no-arbitrary-colors') {
      const m = v.message.match(/Arbitrary color `([^`]+)` detected/);
      if (m) {
        data.className = m[1];
        const sugM = v.message.match(/Suggested: `([^`]+)`/);
        if (sugM) data.suggested = sugM[1];
        key = `color:${data.className}→${data.suggested ?? '?'}`;
      }
    } else if (v.ruleId === 'vizlint/dark-mode-coverage') {
      const m = v.message.match(/`([^`]+)` has no `dark:` variant\. Add `([^`]+)`/);
      if (m) {
        data.className = m[1]; data.suggested = m[2];
        key = `dark:${data.className}→${data.suggested}`;
      }
    } else if (v.ruleId === 'vizlint/consistent-border-radius') {
      const m = v.message.match(/`([^`]+)` uses `([^`]+)` but (\d+) of (\d+) instances use `([^`]+)`/);
      if (m) {
        data.component = m[1]; data.actual = m[2]; data.count = m[3]; data.total = m[4]; data.dominant = m[5];
        key = `radius:${data.component}:${data.actual}|${data.dominant}`;
      }
    } else if (v.ruleId === 'vizlint/consistent-component-spacing') {
      const m = v.message.match(/`([^`]+)` uses ([^ ]+) `([^`]+)` but (\d+) of (\d+) instances use `([^`]+)`/);
      if (m) {
        data.component = m[1]; data.category = m[2]; data.actual = m[3]; data.count = m[4]; data.total = m[5]; data.dominant = m[6];
        key = `cspacing:${data.component}:${data.actual}|${data.dominant}`;
      }
    } else if (v.ruleId === 'vizlint/missing-states') {
      const m = v.message.match(/`<(\w+)>` is missing (disabled state|error state|required indicator)/);
      if (m) {
        data.element = m[1]; data.stateType = m[2];
        key = `states:${data.element}:${data.stateType}`;
      }
    } else if (v.ruleId === 'vizlint/responsive-required') {
      const m = v.message.match(/`([^`]+)` sets a fixed ([^ ]+) of (\d+)px/);
      if (m) {
        data.className = m[1]; data.prefix = m[2]; data.px = m[3];
        key = `responsive:${data.className}`;
      }
    } else if (v.ruleId === 'vizlint/no-arbitrary-zindex') {
      const m = v.message.match(/Arbitrary z-index `([^`]+)` detected\. Use scale value `([^`]+)`/);
      if (m) {
        data.className = m[1]; data.suggested = m[2];
        key = `zindex:${data.className}→${data.suggested}`;
      }
    } else if (v.ruleId === 'vizlint/no-magic-numbers-layout') {
      const m = v.message.match(/Arbitrary layout value `([^`]+)` detected\. Use Tailwind scale value `([^`]+)`/);
      if (m) {
        data.className = m[1]; data.suggested = m[2];
        key = `magic:${data.className}→${data.suggested}`;
      }
    } else if (v.ruleId === 'vizlint/image-alt-text') {
      const m = v.message.match(/`<(\w+)>` (?:is missing an `alt`|has an empty `alt`|has meaningless alt text)/);
      if (m) {
        data.element = m[1];
        const altM = v.message.match(/meaningless alt text "([^"]+)"/);
        data.issue = altM ? `meaningless: "${altM[1]}"` : v.message.includes('empty') ? 'empty' : 'missing';
        key = `alt:${data.element}:${data.issue}`;
      }
    }

    if (!key) continue;

    if (!map.has(key)) {
      map.set(key, { key, ruleId: v.ruleId, count: 0, files: new Set(), data });
    }
    const p = map.get(key)!;
    p.count++;
    p.files.add(v.file);
  }

  return [...map.values()].sort((a, b) => b.count - a.count);
}

// ─── Visual Renderers (pure CSS/HTML) ────────────────────────────────

function renderContrastPreview(patterns: VisualPattern[]): string {
  if (patterns.length === 0) return '';
  const items = patterns.slice(0, 6);
  return `<div class="section">
    <div class="section-head">Contrast Issues — Visual <span class="sh-count">${patterns.length} unique pair${patterns.length !== 1 ? 's' : ''}, ${patterns.reduce((s, p) => s + p.count, 0)} total</span></div>
    <div class="section-desc">Each pair shows the actual text-on-background rendering. WCAG AA requires 4.5:1 for normal text, 3:1 for large text.</div>
    <div class="vp-grid">${items.map(p => {
      const textHex = twClassToHex(p.data.textClass) ?? '#ffffff';
      const bgHex = twClassToHex(p.data.bgClass) ?? '#000000';
      const sugTextHex = p.data.suggestedText ? (twClassToHex(p.data.suggestedText) ?? textHex) : null;
      const sugBgHex = p.data.suggestedBg ? (twClassToHex(p.data.suggestedBg) ?? bgHex) : null;
      return `<div class="vp-card">
        <div class="vp-label"><span class="pill pill-err">FAIL</span> ${esc(p.data.ratio)}:1 — needs ${esc(p.data.required)}:1 <span class="vp-count">&times;${p.count}</span></div>
        <div class="vp-contrast-row">
          <div class="vp-contrast-box" style="background:${bgHex};color:${textHex}">
            <div class="vp-contrast-sample">Sample Text</div>
            <div class="vp-contrast-meta">${esc(p.data.textClass)} on ${esc(p.data.bgClass)}</div>
          </div>
          ${sugTextHex || sugBgHex ? `<div class="vp-arrow">&rarr;</div>
          <div class="vp-contrast-box" style="background:${sugBgHex ?? bgHex};color:${sugTextHex ?? textHex};border-color:var(--pass)">
            <div class="vp-contrast-sample">Sample Text</div>
            <div class="vp-contrast-meta">${esc(p.data.suggestedText ?? p.data.textClass)} on ${esc(p.data.suggestedBg ?? p.data.bgClass)}${p.data.suggestedRatio ? ` (${p.data.suggestedRatio}:1)` : ''}</div>
          </div>` : ''}
        </div>
        <div class="vp-files">${p.files.size} file${p.files.size !== 1 ? 's' : ''}</div>
      </div>`;
    }).join('')}</div>
  </div>`;
}

function renderColorPreview(patterns: VisualPattern[]): string {
  if (patterns.length === 0) return '';
  const items = patterns.slice(0, 8);
  return `<div class="section">
    <div class="section-head">Arbitrary Colors — Visual <span class="sh-count">${patterns.length} unique, ${patterns.reduce((s, p) => s + p.count, 0)} total</span></div>
    <div class="vp-grid vp-grid-sm">${items.map(p => {
      const hexM = p.data.className.match(/\[([^\]]+)\]/);
      const hex = hexM?.[1] ?? '#888';
      const sugHex = p.data.suggested ? (twClassToHex(p.data.suggested) ?? null) : null;
      return `<div class="vp-card vp-card-sm">
        <div class="vp-color-row">
          <div class="vp-color-swatch" style="background:${/^#[0-9a-fA-F]{3,8}$/.test(hex) ? hex : 'var(--bg4)'}"></div>
          ${sugHex ? `<div class="vp-arrow-sm">&rarr;</div><div class="vp-color-swatch" style="background:${sugHex};border-color:var(--pass)"></div>` : ''}
        </div>
        <div class="vp-color-label mono">${esc(p.data.className)}</div>
        ${p.data.suggested ? `<div class="vp-color-sug">&rarr; ${esc(p.data.suggested)}</div>` : ''}
        <div class="vp-count-sm">&times;${p.count} in ${p.files.size} file${p.files.size !== 1 ? 's' : ''}</div>
      </div>`;
    }).join('')}</div>
  </div>`;
}

function renderSpacingPreview(patterns: VisualPattern[]): string {
  if (patterns.length === 0) return '';
  const items = patterns.slice(0, 8);
  return `<div class="section">
    <div class="section-head">Spacing Issues — Visual <span class="sh-count">${patterns.length} unique pattern${patterns.length !== 1 ? 's' : ''}, ${patterns.reduce((s, p) => s + p.count, 0)} total</span></div>
    <div class="section-desc">Each bar shows the arbitrary value vs. the nearest design token. Tokenized spacing keeps your layout on a consistent rhythm.</div>
    <div class="vp-spacing-list">${items.map(p => {
      const valM = p.data.className.match(/\[([\d.]+)(px|rem|em)?\]/);
      const arbPx = valM ? (valM[2] === 'rem' ? parseFloat(valM[1]) * 16 : parseFloat(valM[1])) : 0;
      const sugM = p.data.suggested?.match(/^[a-z]+-(\d+(?:\.\d+)?)$/);
      const sugPx = sugM ? parseFloat(sugM[1]) * 4 : arbPx; // tw scale: 1 unit = 4px
      const maxPx = Math.max(arbPx, sugPx, 1);
      const scale = 200 / maxPx; // max bar width 200px
      return `<div class="vp-spacing-row">
        <div class="vp-spacing-bars">
          <div class="vp-spacing-pair">
            <div class="vp-spacing-bar vp-bar-before" style="width:${Math.max(arbPx * scale, 2)}px">${Math.round(arbPx)}px</div>
            <span class="mono vp-spacing-cls">${esc(p.data.className)}</span>
          </div>
          ${p.data.suggested ? `<div class="vp-spacing-pair">
            <div class="vp-spacing-bar vp-bar-after" style="width:${Math.max(sugPx * scale, 2)}px">${Math.round(sugPx)}px</div>
            <span class="mono vp-spacing-cls" style="color:var(--pass)">${esc(p.data.suggested)}</span>
          </div>` : ''}
        </div>
        <div class="vp-count-sm">&times;${p.count} in ${p.files.size} file${p.files.size !== 1 ? 's' : ''}</div>
      </div>`;
    }).join('')}</div>
  </div>`;
}

function renderTypographyPreview(patterns: VisualPattern[]): string {
  if (patterns.length === 0) return '';
  const items = patterns.slice(0, 6);
  const TW_FONT_SIZE: Record<string, number> = {
    'text-xs': 12, 'text-sm': 14, 'text-base': 16, 'text-lg': 18,
    'text-xl': 20, 'text-2xl': 24, 'text-3xl': 30, 'text-4xl': 36,
    'text-5xl': 48, 'text-6xl': 60, 'text-7xl': 72, 'text-8xl': 96, 'text-9xl': 128,
  };
  return `<div class="section">
    <div class="section-head">Typography Issues — Visual <span class="sh-count">${patterns.length} unique, ${patterns.reduce((s, p) => s + p.count, 0)} total</span></div>
    <div class="section-desc">Each row renders text at the arbitrary size vs. the nearest scale value. Sticking to the type scale keeps hierarchy consistent.</div>
    <div class="vp-typo-list">${items.map(p => {
      const valM = p.data.className.match(/\[([\d.]+)(px|rem|em)?\]/);
      const arbPx = valM ? (valM[2] === 'rem' ? parseFloat(valM[1]) * 16 : parseFloat(valM[1])) : 16;
      const clampedPx = Math.min(Math.max(arbPx, 10), 48); // clamp for display
      const sugPx = p.data.suggested ? (TW_FONT_SIZE[p.data.suggested] ?? 16) : null;
      const clampedSugPx = sugPx ? Math.min(Math.max(sugPx, 10), 48) : null;
      return `<div class="vp-typo-row">
        <div class="vp-typo-pair">
          <div class="vp-typo-sample" style="font-size:${clampedPx}px"><span style="color:var(--fail)">Aa</span> <span class="mono" style="font-size:12px;color:var(--text3)">${esc(p.data.className)} (${Math.round(arbPx)}px)</span></div>
          ${clampedSugPx ? `<div class="vp-typo-sample" style="font-size:${clampedSugPx}px"><span style="color:var(--pass)">Aa</span> <span class="mono" style="font-size:12px;color:var(--text3)">${esc(p.data.suggested!)} (${sugPx}px)</span></div>` : ''}
        </div>
        <div class="vp-count-sm">&times;${p.count} in ${p.files.size} file${p.files.size !== 1 ? 's' : ''}</div>
      </div>`;
    }).join('')}</div>
  </div>`;
}

function renderDarkModePreview(patterns: VisualPattern[]): string {
  if (patterns.length === 0) return '';
  const items = patterns.slice(0, 6);
  return `<div class="section">
    <div class="section-head">Dark Mode Gaps — Visual <span class="sh-count">${patterns.length} unique, ${patterns.reduce((s, p) => s + p.count, 0)} total</span></div>
    <div class="section-desc">Light mode looks fine. Dark mode breaks. Each card shows what happens when the user switches themes.</div>
    <div class="vp-grid">${items.map(p => {
      const hex = twClassToHex(p.data.className) ?? '#ffffff';
      const darkHex = twClassToHex(p.data.suggested) ?? '#1f2937';
      return `<div class="vp-card">
        <div class="vp-label mono">${esc(p.data.className)} <span class="vp-count">&times;${p.count}</span></div>
        <div class="vp-dark-row">
          <div class="vp-dark-panel" style="background:#f9fafb">
            <div class="vp-dark-elem" style="background:${hex};color:${hex === '#ffffff' ? '#111' : '#fff'}">Card</div>
            <div class="vp-dark-mode-label">Light &#10003;</div>
          </div>
          <div class="vp-dark-panel" style="background:#111827">
            <div class="vp-dark-elem" style="background:${hex};color:${hex === '#ffffff' ? '#111' : '#fff'}">Card</div>
            <div class="vp-dark-mode-label" style="color:var(--fail)">Dark &#10007;</div>
          </div>
          <div class="vp-dark-panel" style="background:#111827">
            <div class="vp-dark-elem" style="background:${darkHex};color:#fff">Card</div>
            <div class="vp-dark-mode-label" style="color:var(--pass)">Fixed &#10003;</div>
          </div>
        </div>
        <div class="vp-files">${p.files.size} file${p.files.size !== 1 ? 's' : ''} &mdash; add <code class="mono" style="color:var(--pass)">${esc(p.data.suggested)}</code></div>
      </div>`;
    }).join('')}</div>
  </div>`;
}

function renderMissingStatesPreview(patterns: VisualPattern[]): string {
  if (patterns.length === 0) return '';
  const items = patterns.slice(0, 6);
  return `<div class="section">
    <div class="section-head">Missing States — Visual <span class="sh-count">${patterns.length} unique, ${patterns.reduce((s, p) => s + p.count, 0)} total</span></div>
    <div class="section-desc">Interactive elements need visible feedback for every state. Missing states break keyboard navigation and accessibility.</div>
    <div class="vp-grid vp-grid-sm">${items.map(p => {
      const el = p.data.element ?? 'button';
      const isBtn = el === 'button' || el === 'Button';
      const stateLabel = p.data.stateType === 'disabled state' ? 'disabled' : p.data.stateType === 'error state' ? 'aria-invalid' : 'required';
      return `<div class="vp-card vp-card-sm">
        <div class="vp-label mono">&lt;${esc(el)}&gt; — ${stateLabel} <span class="vp-count">&times;${p.count}</span></div>
        <div class="vp-states-row">
          <div class="vp-state-box">
            <div class="vp-state-elem ${isBtn ? 'vp-state-btn' : 'vp-state-input'}">${isBtn ? 'Submit' : ''}</div>
            <div class="vp-state-label">Default &#10003;</div>
          </div>
          <div class="vp-state-box">
            <div class="vp-state-elem ${isBtn ? 'vp-state-btn' : 'vp-state-input'} vp-state-missing">${isBtn ? 'Submit' : ''}</div>
            <div class="vp-state-label" style="color:var(--fail)">${stateLabel} &#10007;</div>
          </div>
        </div>
        <div class="vp-files">${p.files.size} file${p.files.size !== 1 ? 's' : ''}</div>
      </div>`;
    }).join('')}</div>
  </div>`;
}

function renderConsistencyPreview(patterns: VisualPattern[]): string {
  // Combine border-radius + component-spacing patterns
  if (patterns.length === 0) return '';
  const items = patterns.slice(0, 6);
  const RADIUS_MAP: Record<string, string> = {
    'rounded-none':'0','rounded-sm':'2px','rounded':'4px','rounded-md':'6px',
    'rounded-lg':'8px','rounded-xl':'12px','rounded-2xl':'16px','rounded-3xl':'24px','rounded-full':'9999px',
  };
  return `<div class="section">
    <div class="section-head">Consistency Issues — Visual <span class="sh-count">${patterns.length} unique, ${patterns.reduce((s, p) => s + p.count, 0)} total</span></div>
    <div class="section-desc">Same component, different values. Standardize to the dominant pattern for visual consistency.</div>
    <div class="vp-grid">${items.map(p => {
      if (p.ruleId === 'vizlint/consistent-border-radius') {
        const actR = RADIUS_MAP[p.data.actual] ?? '8px';
        const domR = RADIUS_MAP[p.data.dominant] ?? '8px';
        return `<div class="vp-card">
          <div class="vp-label mono">${esc(p.data.component)} <span class="vp-count">&times;${p.count}</span></div>
          <div class="vp-consistency-row">
            <div class="vp-consistency-box">
              <div class="vp-radius-demo" style="border-radius:${actR}"></div>
              <div class="mono" style="font-size:.7rem;color:var(--fail)">${esc(p.data.actual)}</div>
            </div>
            <div class="vp-arrow">&rarr;</div>
            <div class="vp-consistency-box">
              <div class="vp-radius-demo" style="border-radius:${domR}"></div>
              <div class="mono" style="font-size:.7rem;color:var(--pass)">${esc(p.data.dominant)} (${p.data.count}/${p.data.total})</div>
            </div>
          </div>
        </div>`;
      }
      // consistent-component-spacing
      return `<div class="vp-card">
        <div class="vp-label mono">${esc(p.data.component)} — ${esc(p.data.category ?? '')} <span class="vp-count">&times;${p.count}</span></div>
        <div class="vp-consistency-row">
          <div class="vp-consistency-box">
            <div class="mono" style="font-size:.85rem;color:var(--fail)">${esc(p.data.actual)}</div>
            <div style="font-size:.65rem;color:var(--text4)">this instance</div>
          </div>
          <div class="vp-arrow">&rarr;</div>
          <div class="vp-consistency-box">
            <div class="mono" style="font-size:.85rem;color:var(--pass)">${esc(p.data.dominant)}</div>
            <div style="font-size:.65rem;color:var(--text4)">${p.data.count}/${p.data.total} instances</div>
          </div>
        </div>
      </div>`;
    }).join('')}</div>
  </div>`;
}

function renderResponsivePreview(patterns: VisualPattern[]): string {
  if (patterns.length === 0) return '';
  const items = patterns.slice(0, 6);
  return `<div class="section">
    <div class="section-head">Responsive Issues — Visual <span class="sh-count">${patterns.length} unique, ${patterns.reduce((s, p) => s + p.count, 0)} total</span></div>
    <div class="section-desc">Fixed-width elements overflow on mobile. These components have no responsive breakpoints.</div>
    <div class="vp-grid">${items.map(p => {
      const px = parseInt(p.data.px ?? '600', 10);
      return `<div class="vp-card">
        <div class="vp-label mono">${esc(p.data.className)} <span class="vp-count">&times;${p.count}</span></div>
        <div class="vp-responsive-row">
          <div class="vp-viewport vp-vp-desktop">
            <div class="vp-vp-elem" style="width:${Math.min(px / 4, 100)}%"></div>
            <div class="vp-vp-label">Desktop &#10003;</div>
          </div>
          <div class="vp-viewport vp-vp-mobile">
            <div class="vp-vp-elem vp-vp-overflow" style="width:${Math.min(px / 2, 200)}%"></div>
            <div class="vp-vp-label" style="color:var(--fail)">Mobile &#10007;</div>
          </div>
        </div>
        <div class="vp-files">${p.data.px}px fixed — ${p.files.size} file${p.files.size !== 1 ? 's' : ''}</div>
      </div>`;
    }).join('')}</div>
  </div>`;
}

/** Build visual previews for a given category tab */
function buildVisualPreviews(allPatterns: VisualPattern[], category: string): string {
  const catRules: Record<string, string[]> = {
    'Colors': ['vizlint/a11y-color-contrast', 'vizlint/no-arbitrary-colors', 'vizlint/dark-mode-coverage'],
    'Spacing': ['vizlint/no-arbitrary-spacing', 'vizlint/no-magic-numbers-layout'],
    'Typography': ['vizlint/no-arbitrary-typography'],
    'Responsive': ['vizlint/responsive-required', 'vizlint/missing-states', 'vizlint/image-alt-text'],
    'Consistency': ['vizlint/consistent-component-spacing', 'vizlint/consistent-border-radius', 'vizlint/no-arbitrary-zindex', 'vizlint/no-inline-styles', 'vizlint/max-component-lines'],
  };
  const rules = catRules[category] ?? [];
  const catPatterns = allPatterns.filter(p => rules.includes(p.ruleId));
  if (catPatterns.length === 0) return '';

  let html = '';
  if (category === 'Colors') {
    html += renderContrastPreview(catPatterns.filter(p => p.ruleId === 'vizlint/a11y-color-contrast'));
    html += renderColorPreview(catPatterns.filter(p => p.ruleId === 'vizlint/no-arbitrary-colors'));
    html += renderDarkModePreview(catPatterns.filter(p => p.ruleId === 'vizlint/dark-mode-coverage'));
  } else if (category === 'Spacing') {
    html += renderSpacingPreview(catPatterns);
  } else if (category === 'Typography') {
    html += renderTypographyPreview(catPatterns);
  } else if (category === 'Responsive') {
    html += renderResponsivePreview(catPatterns.filter(p => p.ruleId === 'vizlint/responsive-required'));
    html += renderMissingStatesPreview(catPatterns.filter(p => p.ruleId === 'vizlint/missing-states'));
  } else if (category === 'Consistency') {
    html += renderConsistencyPreview(catPatterns.filter(p => p.ruleId === 'vizlint/consistent-border-radius' || p.ruleId === 'vizlint/consistent-component-spacing'));
  }
  return html;
}

function gradeColor(score: number): string {
  if (score >= 80) return '#27AE60';
  if (score >= 60) return '#F39C12';
  return '#E74C3C';
}

function gradeLabel(grade: string): string {
  if (grade === 'pass') return 'PASS';
  if (grade === 'warn') return 'NEEDS WORK';
  return 'FAIL';
}

/**
 * Generate and write the HTML report to .vizlint/report.html
 */
export function generateHtmlReport(
  lintResult: LintResult,
  scoreResult: ScoreResult,
  cwd: string,
): string {
  const reportDir = resolve(cwd, '.vizlint');
  const reportPath = resolve(reportDir, 'report.html');

  if (!existsSync(reportDir)) {
    mkdirSync(reportDir, { recursive: true });
  }

  // Collect violations
  const violations: ViolationEntry[] = [];
  for (const result of lintResult.results) {
    for (const msg of result.messages) {
      if (!msg.ruleId || !msg.ruleId.startsWith('vizlint/')) continue;
      violations.push({
        file: relative(cwd, result.filePath),
        line: msg.line,
        column: msg.column,
        severity: msg.severity === 2 ? 'error' : 'warning',
        ruleId: msg.ruleId,
        message: msg.message,
      });
    }
  }

  // Rule summaries
  const ruleMap = new Map<string, RuleSummary>();
  for (const v of violations) {
    if (!ruleMap.has(v.ruleId)) {
      ruleMap.set(v.ruleId, {
        ruleId: v.ruleId,
        shortName: v.ruleId.replace('vizlint/', ''),
        count: 0,
        category: RULE_CATEGORIES[v.ruleId] ?? 'Other',
        fixable: FIXABLE_RULES.has(v.ruleId),
        files: new Set(),
      });
    }
    const r = ruleMap.get(v.ruleId)!;
    r.count++;
    r.files.add(v.file);
  }
  const ruleSummaries = [...ruleMap.values()].sort((a, b) => b.count - a.count);

  // File hotspots
  const fileMap = new Map<string, number>();
  for (const v of violations) {
    fileMap.set(v.file, (fileMap.get(v.file) ?? 0) + 1);
  }
  const fileHotspots = [...fileMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

  // Color analysis
  const colorViolations = violations.filter(v => v.ruleId === 'vizlint/no-arbitrary-colors');
  const colorMap = new Map<string, { hex: string; suggestion: string; count: number }>();
  for (const v of colorViolations) {
    const hexMatch = v.message.match(/`(?:bg|text|border|ring|shadow|fill|stroke|accent|caret|outline|decoration|placeholder|divide)-\[([^\]]+)\]`/);
    const sugMatch = v.message.match(/Suggested: `([^`]+)`/);
    if (hexMatch) {
      const hex = hexMatch[1];
      if (!colorMap.has(hex)) {
        colorMap.set(hex, { hex, suggestion: sugMatch?.[1] ?? '', count: 0 });
      }
      colorMap.get(hex)!.count++;
    }
  }
  const arbitraryColors = [...colorMap.values()].sort((a, b) => b.count - a.count);

  // Contrast violations
  const contrastViolations = violations
    .filter(v => v.ruleId === 'vizlint/a11y-color-contrast')
    .slice(0, 10);

  // Load history
  let history: HistoryEntry[] = [];
  const historyPath = resolve(cwd, '.vizlint', 'history.json');
  if (existsSync(historyPath)) {
    try {
      history = JSON.parse(readFileSync(historyPath, 'utf-8'));
    } catch { /* ignore */ }
  }

  const debt = calculateDebt(lintResult);

  const html = buildHtml({
    version: _pkg.version,
    timestamp: new Date().toISOString(),
    projectName: cwd.split('/').pop() ?? 'Project',
    score: scoreResult,
    debt,
    summary: {
      totalFiles: lintResult.totalFiles,
      filesWithViolations: lintResult.filesWithViolations,
      totalViolations: violations.length,
      errors: lintResult.bySeverity.errors,
      warnings: lintResult.bySeverity.warnings,
    },
    ruleSummaries,
    fileHotspots,
    violations: violations.slice(0, 500),
    arbitraryColors,
    contrastViolations,
    history: history.slice(-20),
  });

  writeFileSync(reportPath, html);
  return reportPath;
}

interface ReportData {
  version: string;
  timestamp: string;
  projectName: string;
  score: ScoreResult;
  debt: DebtResult;
  summary: {
    totalFiles: number;
    filesWithViolations: number;
    totalViolations: number;
    errors: number;
    warnings: number;
  };
  ruleSummaries: RuleSummary[];
  fileHotspots: [string, number][];
  violations: ViolationEntry[];
  arbitraryColors: { hex: string; suggestion: string; count: number }[];
  contrastViolations: ViolationEntry[];
  history: HistoryEntry[];
}

// ─── HTML Builder ─────────────────────────────────────────────────────

function buildHtml(data: ReportData): string {
  const sc = gradeColor(data.score.overall);
  const cats = data.score.categories;
  const catKeys: RuleCategory[] = ['colors', 'spacing', 'typography', 'responsive', 'consistency'];
  const catLabel: Record<string, string> = { colors: 'Colors', spacing: 'Spacing', typography: 'Typography', responsive: 'Responsive', consistency: 'Consistency' };
  const catIcon: Record<string, string> = { colors: '&#9673;', spacing: '&#8942;', typography: 'Aa', responsive: '&#9635;', consistency: '&#8801;' };
  const fixableCount = data.ruleSummaries.filter((r: RuleSummary) => r.fixable).reduce((s: number, r: RuleSummary) => s + r.count, 0);

  // Group violations by category for tabs
  const byCat: Record<string, ViolationEntry[]> = {};
  for (const v of data.violations) {
    const cat = RULE_CATEGORIES[v.ruleId] ?? 'Other';
    if (!byCat[cat]) byCat[cat] = [];
    byCat[cat].push(v);
  }

  // Extract visual patterns for grouped previews
  const allPatterns = extractPatterns(data.violations);

  const jsonData = JSON.stringify({
    violations: data.violations,
    ruleSummaries: data.ruleSummaries.map(r => ({ ...r, files: [...r.files] })),
    fileHotspots: data.fileHotspots,
  }).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Vizlint — ${esc(data.projectName)}</title>
<style>
:root {
  --bg:     #09090b; --bg2:    #111113; --bg3:    #18181b; --bg4:    #27272a;
  --border: #27272a; --border2:#3f3f46;
  --text:   #fafafa; --text2:  #a1a1aa; --text3:  #71717a; --text4:  #52525b;
  --pass:   #22c55e; --warn:   #eab308; --fail:   #ef4444;
  --blue:   #3b82f6; --purple: #a855f7; --cyan:   #06b6d4;
  --font:   'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --mono:   'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
}
* { margin:0; padding:0; box-sizing:border-box; }
body { background:var(--bg); color:var(--text); font-family:var(--font); font-size:14px; line-height:1.6; -webkit-font-smoothing:antialiased; }

/* Shell */
.shell { display:grid; grid-template-columns:220px 1fr; min-height:100vh; }

/* Sidebar */
.sidebar { background:var(--bg2); border-right:1px solid var(--border); padding:1.5rem 0; position:sticky; top:0; height:100vh; overflow-y:auto; display:flex; flex-direction:column; }
.sidebar .logo { padding:0 1.25rem; margin-bottom:1.5rem; }
.sidebar .logo h1 { font-size:1rem; font-weight:600; display:flex; align-items:center; gap:.5rem; }
.sidebar .logo .diamond { color:var(--blue); }
.sidebar .logo .sub { font-size:.7rem; color:var(--text3); margin-top:.15rem; }

.sidebar .score-pill { margin:0 1rem 1.5rem; background:var(--bg3); border:1px solid var(--border); border-radius:12px; padding:1rem; text-align:center; }
.sidebar .score-pill .big { font-size:2.5rem; font-weight:700; line-height:1; }
.sidebar .score-pill .out-of { font-size:.75rem; color:var(--text3); }
.sidebar .score-pill .badge { display:inline-block; font-size:.65rem; font-weight:600; text-transform:uppercase; letter-spacing:.08em; padding:.15rem .5rem; border-radius:4px; margin-top:.5rem; }

.nav { flex:1; }
.nav-item { display:flex; align-items:center; gap:.65rem; padding:.6rem 1.25rem; cursor:pointer; color:var(--text2); font-size:.85rem; border-left:2px solid transparent; transition:all .15s; }
.nav-item:hover { color:var(--text); background:var(--bg3); }
.nav-item.active { color:var(--text); background:var(--bg3); border-left-color:var(--blue); }
.nav-item .icon { width:18px; text-align:center; font-size:.85rem; }
.nav-item .count { margin-left:auto; font-size:.7rem; background:var(--bg4); color:var(--text3); padding:.1rem .4rem; border-radius:4px; font-family:var(--mono); }

.sidebar-footer { padding:.75rem 1.25rem; border-top:1px solid var(--border); font-size:.7rem; color:var(--text4); }

/* Main */
.main { padding:2rem 2.5rem; overflow-y:auto; }

/* Tab Content */
.tab-content { display:none; }
.tab-content.active { display:block; }

/* Cards */
.cards { display:grid; gap:1rem; margin-bottom:2rem; }
.cards-5 { grid-template-columns:repeat(5,1fr); }
.cards-4 { grid-template-columns:repeat(4,1fr); }
.cards-3 { grid-template-columns:repeat(3,1fr); }
.card { background:var(--bg2); border:1px solid var(--border); border-radius:10px; padding:1.1rem; }
.card .card-label { font-size:.7rem; text-transform:uppercase; letter-spacing:.06em; color:var(--text3); margin-bottom:.4rem; }
.card .card-value { font-size:1.75rem; font-weight:700; line-height:1.1; }
.card .card-sub { font-size:.75rem; color:var(--text3); margin-top:.25rem; }
.card .bar { height:3px; background:var(--bg4); border-radius:2px; margin-top:.65rem; }
.card .bar-fill { height:100%; border-radius:2px; }

/* Section */
.section { margin-bottom:2rem; }
.section-head { font-size:.95rem; font-weight:600; margin-bottom:.75rem; display:flex; align-items:center; gap:.5rem; }
.section-head .sh-count { font-size:.75rem; color:var(--text3); font-weight:400; }
.section-desc { font-size:.8rem; color:var(--text3); margin-bottom:1rem; }

/* Table */
.tbl { width:100%; border-collapse:collapse; }
.tbl th { text-align:left; font-size:.65rem; text-transform:uppercase; letter-spacing:.06em; color:var(--text4); padding:.6rem .75rem; border-bottom:1px solid var(--border); font-weight:500; }
.tbl td { padding:.6rem .75rem; border-bottom:1px solid var(--border); font-size:.82rem; }
.tbl tr:hover td { background:var(--bg3); }
.mono { font-family:var(--mono); font-size:.78rem; }
.pill { font-size:.6rem; padding:.12rem .35rem; border-radius:3px; font-weight:500; white-space:nowrap; }
.pill-fix { background:rgba(34,197,94,.12); color:var(--pass); }
.pill-cat { background:var(--bg4); color:var(--text3); }
.pill-err { background:rgba(239,68,68,.12); color:var(--fail); }
.pill-warn { background:rgba(234,179,8,.12); color:var(--warn); }

/* Hotspot bars */
.hotspot { display:flex; align-items:center; gap:.75rem; padding:.45rem .75rem; border-bottom:1px solid var(--border); }
.hotspot:hover { background:var(--bg3); }
.hotspot .h-count { min-width:32px; text-align:right; font-weight:600; font-size:.82rem; }
.hotspot .h-bar-bg { flex:0 0 100px; height:5px; background:var(--bg4); border-radius:3px; overflow:hidden; }
.hotspot .h-bar { height:100%; border-radius:3px; background:var(--blue); }
.hotspot .h-file { flex:1; font-family:var(--mono); font-size:.75rem; color:var(--text2); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

/* Color swatches */
.swatches { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:.75rem; }
.swatch { display:flex; align-items:center; gap:.75rem; background:var(--bg2); border:1px solid var(--border); border-radius:8px; padding:.65rem .75rem; }
.swatch .sw-box { width:36px; height:36px; border-radius:6px; border:1px solid var(--border2); flex-shrink:0; }
.swatch .sw-hex { font-family:var(--mono); font-size:.78rem; }
.swatch .sw-sug { font-size:.72rem; color:var(--pass); }
.swatch .sw-n { font-size:.65rem; color:var(--text4); }

/* Violation list */
.v-item { padding:.55rem .75rem; border-bottom:1px solid var(--border); font-size:.8rem; }
.v-item:hover { background:var(--bg3); }
.v-item.sev-error { border-left:3px solid var(--fail); }
.v-item.sev-warning { border-left:3px solid var(--warn); }
.v-file { font-family:var(--mono); font-size:.72rem; color:var(--text3); }
.v-rule { font-family:var(--mono); font-size:.68rem; color:var(--blue); margin-left:.5rem; }
.v-msg { color:var(--text2); margin-top:.1rem; font-size:.78rem; }
.v-filters { display:flex; gap:.4rem; margin-bottom:.75rem; flex-wrap:wrap; }
.v-filters button { background:var(--bg3); border:1px solid var(--border); color:var(--text2); padding:.3rem .6rem; border-radius:5px; font-size:.72rem; cursor:pointer; font-family:var(--font); transition:all .1s; }
.v-filters button:hover, .v-filters button.on { background:var(--blue); color:#fff; border-color:var(--blue); }
.more-btn { display:block; margin:1rem auto; background:var(--bg3); border:1px solid var(--border); color:var(--text2); padding:.5rem 1.5rem; border-radius:6px; cursor:pointer; font-family:var(--font); font-size:.8rem; }
.more-btn:hover { background:var(--bg4); }

/* Trend */
.trend-box { background:var(--bg2); border:1px solid var(--border); border-radius:10px; padding:1.25rem; }
.trend-box svg { width:100%; height:100px; }
.trend-line { fill:none; stroke:var(--blue); stroke-width:2; }
.trend-area { fill:url(#tg); opacity:.25; }
.trend-dot { fill:var(--blue); }
.trend-empty { text-align:center; color:var(--text4); padding:1.5rem; font-size:.8rem; }

/* Responsive */
@media (max-width:900px) {
  .shell { grid-template-columns:1fr; }
  .sidebar { position:fixed; left:-250px; z-index:100; width:250px; transition:left .2s; }
  .sidebar.open { left:0; }
  .mob-toggle { display:block !important; }
  .cards-5 { grid-template-columns:repeat(2,1fr); }
}
.mob-toggle { display:none; position:fixed; top:.75rem; left:.75rem; z-index:99; background:var(--bg3); border:1px solid var(--border); color:var(--text); width:36px; height:36px; border-radius:8px; cursor:pointer; font-size:1.1rem; }

/* ─── Visual Previews ─── */
.vp-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(320px,1fr)); gap:1rem; margin-bottom:1rem; }
.vp-grid-sm { grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); }
.vp-card { background:var(--bg2); border:1px solid var(--border); border-radius:10px; padding:1rem; }
.vp-card-sm { padding:.75rem; }
.vp-label { font-size:.78rem; color:var(--text2); margin-bottom:.65rem; display:flex; align-items:center; gap:.4rem; flex-wrap:wrap; }
.vp-count { margin-left:auto; font-size:.7rem; color:var(--text3); font-family:var(--mono); }
.vp-count-sm { font-size:.65rem; color:var(--text4); margin-top:.4rem; }
.vp-files { font-size:.65rem; color:var(--text4); margin-top:.5rem; }
.vp-arrow { color:var(--text4); font-size:1.2rem; padding:0 .5rem; display:flex; align-items:center; }
.vp-arrow-sm { color:var(--text4); font-size:.9rem; padding:0 .3rem; }

/* Contrast */
.vp-contrast-row { display:flex; align-items:stretch; gap:0; }
.vp-contrast-box { flex:1; padding:1rem .75rem; border:2px solid var(--border); border-radius:8px; text-align:center; }
.vp-contrast-sample { font-size:1.25rem; font-weight:600; margin-bottom:.25rem; }
.vp-contrast-meta { font-size:.6rem; font-family:var(--mono); opacity:.8; }

/* Colors */
.vp-color-row { display:flex; align-items:center; gap:0; }
.vp-color-swatch { width:42px; height:42px; border-radius:8px; border:2px solid var(--border); flex-shrink:0; }
.vp-color-label { font-size:.72rem; color:var(--text2); margin-top:.4rem; }
.vp-color-sug { font-size:.7rem; color:var(--pass); margin-top:.15rem; }

/* Spacing */
.vp-spacing-list { display:flex; flex-direction:column; gap:.5rem; }
.vp-spacing-row { display:flex; align-items:center; gap:1rem; padding:.5rem .75rem; background:var(--bg2); border:1px solid var(--border); border-radius:8px; }
.vp-spacing-bars { flex:1; }
.vp-spacing-pair { display:flex; align-items:center; gap:.5rem; margin-bottom:.3rem; }
.vp-spacing-pair:last-child { margin-bottom:0; }
.vp-spacing-bar { height:16px; border-radius:3px; display:flex; align-items:center; padding:0 6px; font-size:.6rem; font-family:var(--mono); color:#fff; min-width:20px; }
.vp-bar-before { background:var(--fail); opacity:.7; }
.vp-bar-after { background:var(--pass); opacity:.8; }
.vp-spacing-cls { font-size:.72rem; color:var(--text3); }

/* Typography */
.vp-typo-list { display:flex; flex-direction:column; gap:.65rem; }
.vp-typo-row { display:flex; align-items:center; gap:1rem; padding:.65rem .75rem; background:var(--bg2); border:1px solid var(--border); border-radius:8px; }
.vp-typo-pair { flex:1; }
.vp-typo-sample { margin-bottom:.35rem; line-height:1.2; display:flex; align-items:baseline; gap:.5rem; }
.vp-typo-sample:last-child { margin-bottom:0; }

/* Dark mode */
.vp-dark-row { display:flex; gap:.5rem; }
.vp-dark-panel { flex:1; border-radius:8px; padding:.65rem; text-align:center; border:1px solid var(--border); }
.vp-dark-elem { padding:.5rem; border-radius:6px; font-size:.8rem; font-weight:500; }
.vp-dark-mode-label { font-size:.6rem; margin-top:.35rem; color:var(--text3); }

/* States */
.vp-states-row { display:flex; gap:.75rem; margin:.5rem 0; }
.vp-state-box { text-align:center; }
.vp-state-elem { border-radius:6px; font-size:.75rem; }
.vp-state-btn { background:var(--blue); color:#fff; padding:.4rem .8rem; cursor:default; }
.vp-state-input { background:var(--bg3); border:1px solid var(--border2); padding:.35rem .6rem; width:80px; height:28px; border-radius:5px; }
.vp-state-missing { opacity:.4; position:relative; }
.vp-state-missing::after { content:'?'; position:absolute; top:-4px; right:-4px; background:var(--fail); color:#fff; width:14px; height:14px; border-radius:50%; font-size:.55rem; display:flex; align-items:center; justify-content:center; }
.vp-state-label { font-size:.6rem; margin-top:.25rem; color:var(--text3); }

/* Consistency / radius */
.vp-consistency-row { display:flex; align-items:center; gap:0; justify-content:center; }
.vp-consistency-box { text-align:center; padding:.5rem; }
.vp-radius-demo { width:48px; height:48px; background:var(--blue); margin:0 auto .35rem; }

/* Responsive viewport */
.vp-responsive-row { display:flex; gap:.75rem; margin:.5rem 0; }
.vp-viewport { border:1px solid var(--border2); border-radius:6px; padding:.5rem; overflow:hidden; position:relative; }
.vp-vp-desktop { flex:2; height:50px; }
.vp-vp-mobile { flex:1; height:50px; max-width:80px; }
.vp-vp-elem { background:var(--blue); opacity:.5; height:30px; border-radius:3px; }
.vp-vp-overflow { background:var(--fail); opacity:.5; }
.vp-vp-label { font-size:.55rem; text-align:center; color:var(--text3); margin-top:.25rem; }
</style>
</head>
<body>
<button class="mob-toggle" onclick="document.querySelector('.sidebar').classList.toggle('open')">&#9776;</button>
<div class="shell">

<!-- Sidebar -->
<aside class="sidebar">
  <div class="logo">
    <h1><span class="diamond">&#9672;</span> Vizlint</h1>
    <div class="sub">${esc(data.projectName)}</div>
  </div>

  <div class="score-pill">
    <div class="big" style="color:${sc}">${data.score.overall}</div>
    <div class="out-of">/ 100</div>
    <div class="badge" style="background:${sc}20;color:${sc}">${gradeLabel(data.score.grade)}</div>
  </div>

  <nav class="nav">
    <div class="nav-item active" data-tab="overview"><span class="icon">&#9632;</span> Overview</div>
    <div class="nav-item" data-tab="colors"><span class="icon">&#9673;</span> Colors <span class="count">${cats.colors.violations}</span></div>
    <div class="nav-item" data-tab="spacing"><span class="icon">&#8942;</span> Spacing <span class="count">${cats.spacing.violations}</span></div>
    <div class="nav-item" data-tab="typography"><span class="icon">Aa</span> Typography <span class="count">${cats.typography.violations}</span></div>
    <div class="nav-item" data-tab="responsive"><span class="icon">&#9635;</span> Responsive <span class="count">${cats.responsive.violations}</span></div>
    <div class="nav-item" data-tab="consistency"><span class="icon">&#8801;</span> Consistency <span class="count">${cats.consistency.violations}</span></div>
    <div class="nav-item" data-tab="files"><span class="icon">&#128196;</span> Files <span class="count">${data.fileHotspots.length}</span></div>
    <div class="nav-item" data-tab="all"><span class="icon">&#9998;</span> All Violations <span class="count">${data.summary.totalViolations}</span></div>
  </nav>

  <div class="sidebar-footer">
    Vizlint v${data.version}<br>
    ${new Date(data.timestamp).toLocaleString()}
  </div>
</aside>

<!-- Main Content -->
<main class="main">

<!-- ═══ OVERVIEW TAB ═══ -->
<div class="tab-content active" id="tab-overview">
  <div class="cards cards-5">
    ${catKeys.map(k => {
      const c = cats[k]; const cc = gradeColor(c.score);
      return `<div class="card">
      <div class="card-label">${catIcon[k]} ${catLabel[k]}</div>
      <div class="card-value" style="color:${cc}">${c.score}</div>
      <div class="card-sub">${c.violations} violation${c.violations!==1?'s':''}</div>
      <div class="bar"><div class="bar-fill" style="width:${c.score}%;background:${cc}"></div></div>
    </div>`;
    }).join('')}
  </div>

  <div class="cards cards-4">
    <div class="card">
      <div class="card-label">Files Scanned</div>
      <div class="card-value">${data.summary.totalFiles}</div>
    </div>
    <div class="card">
      <div class="card-label">Files With Issues</div>
      <div class="card-value" style="color:${data.summary.filesWithViolations > 0 ? 'var(--warn)' : 'var(--pass)'}">${data.summary.filesWithViolations}</div>
      <div class="card-sub">${data.summary.totalFiles > 0 ? Math.round(data.summary.filesWithViolations / data.summary.totalFiles * 100) : 0}% of project</div>
    </div>
    <div class="card">
      <div class="card-label">Auto-Fixable</div>
      <div class="card-value" style="color:var(--pass)">${fixableCount}</div>
      <div class="card-sub">Run vizlint fix --all</div>
    </div>
    <div class="card">
      <div class="card-label">Active Rules</div>
      <div class="card-value">${data.ruleSummaries.length}</div>
      <div class="card-sub">of 14 available</div>
    </div>
  </div>

  ${data.debt.totalMinutes > 0 ? `
  <div class="section">
    <div class="section-head">Design Debt <span class="sh-count">${formatDebt(data.debt.totalMinutes)} estimated remediation effort</span></div>
    <div class="section-desc">Estimated time to resolve all violations, calibrated from real auto-fix data. Auto-fixable rules take 2&ndash;3 minutes; design and accessibility decisions take longer.</div>
    <table class="tbl"><thead><tr><th>Rule</th><th>Violations</th><th>Per&nbsp;violation</th><th>Total effort</th></tr></thead><tbody>
      ${data.debt.breakdown.slice(0, 10).map(b => `<tr>
        <td><span class="mono" style="color:var(--blue)">${esc(b.ruleId.replace(/^vizlint\//, ''))}</span></td>
        <td style="color:var(--text3)">${b.violations}</td>
        <td style="color:var(--text3)">${b.minutesPerViolation}m</td>
        <td style="font-weight:600">${esc(formatDebt(b.totalMinutes))}</td>
      </tr>`).join('')}
    </tbody></table>
  </div>` : ''}

  ${data.history.length > 1 ? `
  <div class="section">
    <div class="section-head">Score Trend</div>
    <div class="trend-box">${buildTrendSvg(data.history)}</div>
  </div>` : ''}

  ${allPatterns.length > 0 ? `<div class="section">
    <div class="section-head">Top Issues — Visual Preview <span class="sh-count">${allPatterns.length} unique patterns</span></div>
    <div class="section-desc">Grouped by pattern — each card represents multiple identical violations across your codebase. Click a category tab for the full visual breakdown.</div>
    ${(() => {
      const top = allPatterns.slice(0, 4);
      const byRule: Record<string, VisualPattern[]> = {};
      for (const p of top) { if (!byRule[p.ruleId]) byRule[p.ruleId] = []; byRule[p.ruleId].push(p); }
      let out = '';
      if (byRule['vizlint/a11y-color-contrast']) out += renderContrastPreview(byRule['vizlint/a11y-color-contrast']);
      if (byRule['vizlint/no-arbitrary-spacing'] || byRule['vizlint/no-magic-numbers-layout']) out += renderSpacingPreview([...(byRule['vizlint/no-arbitrary-spacing'] ?? []), ...(byRule['vizlint/no-magic-numbers-layout'] ?? [])]);
      if (byRule['vizlint/no-arbitrary-typography']) out += renderTypographyPreview(byRule['vizlint/no-arbitrary-typography']);
      if (byRule['vizlint/missing-states']) out += renderMissingStatesPreview(byRule['vizlint/missing-states']);
      if (byRule['vizlint/no-arbitrary-colors']) out += renderColorPreview(byRule['vizlint/no-arbitrary-colors']);
      if (byRule['vizlint/dark-mode-coverage']) out += renderDarkModePreview(byRule['vizlint/dark-mode-coverage']);
      if (byRule['vizlint/consistent-border-radius'] || byRule['vizlint/consistent-component-spacing']) out += renderConsistencyPreview([...(byRule['vizlint/consistent-border-radius'] ?? []), ...(byRule['vizlint/consistent-component-spacing'] ?? [])]);
      if (byRule['vizlint/responsive-required']) out += renderResponsivePreview(byRule['vizlint/responsive-required']);
      return out;
    })()}
  </div>` : ''}

  <div class="section">
    <div class="section-head">Rules Breakdown</div>
    <table class="tbl"><thead><tr><th>Rule</th><th>Category</th><th>Violations</th><th>Files</th><th></th></tr></thead><tbody>
      ${data.ruleSummaries.map(r => `<tr>
        <td><span class="mono" style="color:var(--blue)">${esc(r.shortName)}</span></td>
        <td><span class="pill pill-cat">${esc(r.category)}</span></td>
        <td style="font-weight:600">${r.count}</td>
        <td style="color:var(--text3)">${r.files.size}</td>
        <td>${r.fixable ? '<span class="pill pill-fix">Fixable</span>' : ''}</td>
      </tr>`).join('')}
    </tbody></table>
  </div>
</div>

<!-- ═══ COLORS TAB ═══ -->
<div class="tab-content" id="tab-colors">
  <div class="cards cards-3">
    <div class="card"><div class="card-label">Color Score</div><div class="card-value" style="color:${gradeColor(cats.colors.score)}">${cats.colors.score}</div><div class="bar"><div class="bar-fill" style="width:${cats.colors.score}%;background:${gradeColor(cats.colors.score)}"></div></div></div>
    <div class="card"><div class="card-label">Arbitrary Colors</div><div class="card-value">${data.arbitraryColors.length}</div><div class="card-sub">unique hardcoded values</div></div>
    <div class="card"><div class="card-label">Contrast Failures</div><div class="card-value" style="color:${data.contrastViolations.length > 0 ? 'var(--fail)' : 'var(--pass)'}">${data.contrastViolations.length}</div><div class="card-sub">WCAG AA violations</div></div>
  </div>

  ${buildVisualPreviews(allPatterns, 'Colors')}

  ${data.arbitraryColors.length > 0 ? `
  <div class="section">
    <div class="section-head">Hardcoded Colors <span class="sh-count">${data.arbitraryColors.length} found</span></div>
    <div class="section-desc">These hex values should be replaced with design tokens. Run <code style="background:var(--bg4);padding:.1rem .3rem;border-radius:3px;font-family:var(--mono);font-size:.75rem">vizlint fix --all</code> to auto-fix.</div>
    <div class="swatches">
      ${data.arbitraryColors.map(c => `<div class="swatch">
        <div class="sw-box" style="background:${esc(c.hex)}"></div>
        <div><div class="sw-hex">${esc(c.hex)}</div>${c.suggestion ? `<div class="sw-sug">&rarr; ${esc(c.suggestion)}</div>` : ''}<div class="sw-n">${c.count}&times;</div></div>
      </div>`).join('')}
    </div>
  </div>` : '<div class="section"><div class="section-desc" style="padding:2rem;text-align:center;color:var(--pass)">No arbitrary colors found. All color values use design tokens.</div></div>'}

  ${data.contrastViolations.length > 0 ? `
  <div class="section">
    <div class="section-head">Contrast Failures <span class="sh-count">WCAG AA 4.5:1 minimum</span></div>
    <table class="tbl"><thead><tr><th>Ratio</th><th>Issue</th><th>File</th></tr></thead><tbody>
      ${data.contrastViolations.map(v => {
        const rm = v.message.match(/ratio ([\d.]+):1/);
        return `<tr>
          <td><span style="color:var(--fail);font-weight:600">${rm ? rm[1] + ':1' : '?'}</span></td>
          <td style="font-size:.78rem">${esc(v.message.slice(0, 140))}</td>
          <td class="mono" style="font-size:.72rem;color:var(--text3)">${esc(v.file)}:${v.line}</td>
        </tr>`;
      }).join('')}
    </tbody></table>
  </div>` : ''}

  ${buildCategoryViolations(byCat['Colors'], 'Color violations')}
</div>

<!-- ═══ SPACING TAB ═══ -->
<div class="tab-content" id="tab-spacing">
  <div class="cards cards-3">
    <div class="card"><div class="card-label">Spacing Score</div><div class="card-value" style="color:${gradeColor(cats.spacing.score)}">${cats.spacing.score}</div><div class="bar"><div class="bar-fill" style="width:${cats.spacing.score}%;background:${gradeColor(cats.spacing.score)}"></div></div></div>
    <div class="card"><div class="card-label">Arbitrary Spacing</div><div class="card-value">${(byCat['Spacing'] ?? []).filter(v => v.ruleId === 'vizlint/no-arbitrary-spacing').length}</div><div class="card-sub">hardcoded px/rem values</div></div>
    <div class="card"><div class="card-label">Magic Layout Numbers</div><div class="card-value">${(byCat['Spacing'] ?? []).filter(v => v.ruleId === 'vizlint/no-magic-numbers-layout').length}</div><div class="card-sub">grid/flex arbitrary values</div></div>
  </div>
  ${buildVisualPreviews(allPatterns, 'Spacing')}
  ${buildCategoryViolations(byCat['Spacing'], 'Spacing violations')}
</div>

<!-- ═══ TYPOGRAPHY TAB ═══ -->
<div class="tab-content" id="tab-typography">
  <div class="cards cards-3">
    <div class="card"><div class="card-label">Typography Score</div><div class="card-value" style="color:${gradeColor(cats.typography.score)}">${cats.typography.score}</div><div class="bar"><div class="bar-fill" style="width:${cats.typography.score}%;background:${gradeColor(cats.typography.score)}"></div></div></div>
    <div class="card"><div class="card-label">Arbitrary Sizes</div><div class="card-value">${cats.typography.violations}</div><div class="card-sub">font-size, weight, leading, tracking</div></div>
    <div class="card"><div class="card-label">Auto-Fixable</div><div class="card-value" style="color:var(--pass)">${cats.typography.violations}</div><div class="card-sub">All typography violations are fixable</div></div>
  </div>
  ${buildVisualPreviews(allPatterns, 'Typography')}
  ${buildCategoryViolations(byCat['Typography'], 'Typography violations')}
</div>

<!-- ═══ RESPONSIVE TAB ═══ -->
<div class="tab-content" id="tab-responsive">
  <div class="cards cards-3">
    <div class="card"><div class="card-label">Responsive Score</div><div class="card-value" style="color:${gradeColor(cats.responsive.score)}">${cats.responsive.score}</div><div class="bar"><div class="bar-fill" style="width:${cats.responsive.score}%;background:${gradeColor(cats.responsive.score)}"></div></div></div>
    <div class="card"><div class="card-label">Fixed Widths</div><div class="card-value">${(byCat['Responsive'] ?? []).filter(v => v.ruleId === 'vizlint/responsive-required').length}</div><div class="card-sub">missing breakpoints</div></div>
    <div class="card"><div class="card-label">Accessibility</div><div class="card-value">${(byCat['Responsive'] ?? []).filter(v => v.ruleId === 'vizlint/image-alt-text' || v.ruleId === 'vizlint/missing-states').length}</div><div class="card-sub">alt text + state handling</div></div>
  </div>
  ${buildVisualPreviews(allPatterns, 'Responsive')}
  ${buildCategoryViolations(byCat['Responsive'], 'Responsive & accessibility violations')}
</div>

<!-- ═══ CONSISTENCY TAB ═══ -->
<div class="tab-content" id="tab-consistency">
  <div class="cards cards-3">
    <div class="card"><div class="card-label">Consistency Score</div><div class="card-value" style="color:${gradeColor(cats.consistency.score)}">${cats.consistency.score}</div><div class="bar"><div class="bar-fill" style="width:${cats.consistency.score}%;background:${gradeColor(cats.consistency.score)}"></div></div></div>
    <div class="card"><div class="card-label">Spacing Divergence</div><div class="card-value">${(byCat['Consistency'] ?? []).filter(v => v.ruleId === 'vizlint/consistent-component-spacing').length}</div><div class="card-sub">same component, different spacing</div></div>
    <div class="card"><div class="card-label">Radius Divergence</div><div class="card-value">${(byCat['Consistency'] ?? []).filter(v => v.ruleId === 'vizlint/consistent-border-radius').length}</div><div class="card-sub">same component, different rounding</div></div>
  </div>
  ${buildVisualPreviews(allPatterns, 'Consistency')}
  ${buildCategoryViolations(byCat['Consistency'], 'Consistency violations')}
</div>

<!-- ═══ FILES TAB ═══ -->
<div class="tab-content" id="tab-files">
  <div class="section">
    <div class="section-head">File Hotspots <span class="sh-count">Top ${data.fileHotspots.length} files by violation count</span></div>
    <div class="section-desc">Files with the most design quality violations. Start fixing from the top.</div>
    ${data.fileHotspots.map(([file, count]) => {
      const maxC = data.fileHotspots[0]?.[1] ?? 1;
      return `<div class="hotspot">
        <span class="h-count">${count}</span>
        <div class="h-bar-bg"><div class="h-bar" style="width:${(count/maxC)*100}%"></div></div>
        <span class="h-file">${esc(file)}</span>
      </div>`;
    }).join('')}
  </div>
</div>

<!-- ═══ ALL VIOLATIONS TAB ═══ -->
<div class="tab-content" id="tab-all">
  <div class="section">
    <div class="section-head">All Violations <span class="sh-count">${data.summary.totalViolations}${data.summary.totalViolations > 500 ? ' (showing first 500)' : ''}</span></div>
    <div class="v-filters">
      <button class="on" data-f="all">All</button>
      ${[...new Set(data.violations.map(v => v.ruleId.replace('vizlint/', '')))].map(r =>
        `<button data-f="${esc(r)}">${esc(r)}</button>`
      ).join('')}
    </div>
    <div id="v-list">
      ${data.violations.slice(0, 80).map((v, i) => `<div class="v-item sev-${v.severity}" data-r="${esc(v.ruleId.replace('vizlint/', ''))}" data-i="${i}">
        <div class="v-file">${esc(v.file)}:${v.line}<span class="v-rule">${esc(v.ruleId.replace('vizlint/', ''))}</span></div>
        <div class="v-msg">${esc(v.message)}</div>
      </div>`).join('')}
    </div>
    ${data.violations.length > 80 ? `<button class="more-btn" id="more-btn">Show more (${data.violations.length - 80} remaining)</button>` : ''}
  </div>
</div>

</main>
</div>

<script>
const DATA = ${jsonData};
let shown = 80;

// Tab navigation
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    item.classList.add('active');
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById('tab-' + item.dataset.tab)?.classList.add('active');
    // Close mobile sidebar
    document.querySelector('.sidebar')?.classList.remove('open');
  });
});

// Violation filters
document.querySelectorAll('.v-filters button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.v-filters button').forEach(b => b.classList.remove('on'));
    btn.classList.add('on');
    const f = btn.dataset.f;
    document.querySelectorAll('.v-item').forEach(el => {
      el.style.display = (f === 'all' || el.dataset.r === f) ? '' : 'none';
    });
  });
});

// Show more
const moreBtn = document.getElementById('more-btn');
if (moreBtn) {
  moreBtn.addEventListener('click', () => {
    const list = document.getElementById('v-list');
    const batch = DATA.violations.slice(shown, shown + 80);
    for (const v of batch) {
      const d = document.createElement('div');
      d.className = 'v-item sev-' + v.severity;
      d.dataset.r = v.ruleId.replace('vizlint/', '');
      d.innerHTML = '<div class="v-file">' + esc(v.file) + ':' + v.line + '<span class="v-rule">' + esc(v.ruleId.replace('vizlint/', '')) + '</span></div><div class="v-msg">' + esc(v.message) + '</div>';
      list.appendChild(d);
    }
    shown += batch.length;
    if (shown >= DATA.violations.length) moreBtn.remove();
    else moreBtn.textContent = 'Show more (' + (DATA.violations.length - shown) + ' remaining)';
  });
}

function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
</script>
</body>
</html>`;
}

function buildCategoryViolations(violations: ViolationEntry[] | undefined, title: string): string {
  if (!violations || violations.length === 0) {
    return `<div class="section"><div class="section-desc" style="padding:2rem;text-align:center;color:var(--pass)">No ${title.toLowerCase()} found.</div></div>`;
  }
  const shown = violations.slice(0, 30);
  return `<div class="section">
    <div class="section-head">${title} <span class="sh-count">${violations.length} total</span></div>
    ${shown.map(v => `<div class="v-item sev-${v.severity}">
      <div class="v-file">${esc(v.file)}:${v.line}<span class="v-rule">${esc(v.ruleId.replace('vizlint/', ''))}</span></div>
      <div class="v-msg">${esc(v.message)}</div>
    </div>`).join('')}
    ${violations.length > 30 ? `<div style="text-align:center;padding:.75rem;color:var(--text4);font-size:.78rem">+ ${violations.length - 30} more — see All Violations tab</div>` : ''}
  </div>`;
}

function buildTrendSvg(history: HistoryEntry[]): string {
  if (history.length < 2) return '<div class="trend-empty">Run more scans to see trends.</div>';
  const w = 800, h = 100, pad = 16;
  const plotW = w - pad * 2, plotH = h - pad * 2;
  const min = Math.min(...history.map(e => e.overall), 50);
  const range = 100 - min || 1;
  const pts = history.map((e, i) => ({
    x: pad + (i / (history.length - 1)) * plotW,
    y: pad + plotH - ((e.overall - min) / range) * plotH,
    s: e.overall, d: e.timestamp,
  }));
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' ');
  const area = line + ` L${pts[pts.length - 1].x},${h - pad} L${pts[0].x},${h - pad} Z`;
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
    <defs><linearGradient id="tg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#3b82f6" stop-opacity=".3"/><stop offset="100%" stop-color="#3b82f6" stop-opacity="0"/></linearGradient></defs>
    <path class="trend-area" d="${area}"/><path class="trend-line" d="${line}"/>
    ${pts.map(p => `<circle class="trend-dot" cx="${p.x}" cy="${p.y}" r="3"><title>${p.s}/100 — ${new Date(p.d).toLocaleDateString()}</title></circle>`).join('')}
  </svg>`;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
