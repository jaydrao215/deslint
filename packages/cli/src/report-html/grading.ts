import { esc } from './types.js';
import type { ViolationEntry } from './types.js';
import type { HistoryEntry } from '../score.js';

export function gradeColor(score: number): string {
  if (score >= 80) return '#10B981';
  if (score >= 60) return '#F59E0B';
  return '#EF4444';
}

export function letterGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

export type QualityGate = 'PASSED' | 'AT_RISK' | 'FAILED';

// PASSED requires both a healthy score AND zero error-severity violations —
// a single blocker fails the gate regardless of overall score, matching the
// behaviour of CI quality gates users expect from SonarQube / Codacy.
export function computeQualityGate(score: number, errors: number): QualityGate {
  if (errors > 0 || score < 70) return 'FAILED';
  if (score < 85) return 'AT_RISK';
  return 'PASSED';
}

export function formatUtcTimestamp(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;
}

// Split `path/to/file.tsx` into a dim prefix and a bold basename so long
// paths in hotspot lists and violation groups remain scannable at a glance.
export function formatFilePath(file: string): string {
  const idx = file.lastIndexOf('/');
  if (idx < 0) return `<b>${esc(file)}</b>`;
  return `${esc(file.slice(0, idx + 1))}<b>${esc(file.slice(idx + 1))}</b>`;
}

export function groupViolationsByFile(violations: ViolationEntry[]): { file: string; items: ViolationEntry[] }[] {
  const byFile = new Map<string, ViolationEntry[]>();
  for (const v of violations) {
    const list = byFile.get(v.file) ?? [];
    list.push(v);
    byFile.set(v.file, list);
  }
  return [...byFile.entries()]
    .map(([file, items]) => ({ file, items }))
    .sort((a, b) => b.items.length - a.items.length);
}

export function buildGradeRing(score: number, color: string, letter: string): string {
  const r = 68;
  const circumference = 2 * Math.PI * r;
  const dash = (Math.max(0, Math.min(100, score)) / 100) * circumference;
  return `<svg viewBox="0 0 160 160" role="img" aria-label="Score ${score} out of 100">
    <circle class="ring-track" cx="80" cy="80" r="${r}"></circle>
    <circle class="ring-fill" cx="80" cy="80" r="${r}" stroke="${color}" stroke-dasharray="${dash.toFixed(2)} ${(circumference - dash).toFixed(2)}"></circle>
  </svg>
  <div class="grade-ring-center">
    <div class="grade-letter" style="color:${color}">${letter}</div>
    <div class="grade-score">${score} / 100</div>
  </div>`;
}

export function buildTrendSvg(history: HistoryEntry[]): string {
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
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="Score trend">
    <defs><linearGradient id="tg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#534AB7" stop-opacity=".22"/><stop offset="100%" stop-color="#534AB7" stop-opacity="0"/></linearGradient></defs>
    <path class="trend-area" d="${area}"/><path class="trend-line" d="${line}"/>
    ${pts.map(p => `<circle class="trend-dot" cx="${p.x}" cy="${p.y}" r="3"><title>${p.s}/100 — ${new Date(p.d).toLocaleDateString()}</title></circle>`).join('')}
  </svg>`;
}
