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
  ${buildCategoryViolations(byCat['Spacing'], 'Spacing violations')}
</div>

<!-- ═══ TYPOGRAPHY TAB ═══ -->
<div class="tab-content" id="tab-typography">
  <div class="cards cards-3">
    <div class="card"><div class="card-label">Typography Score</div><div class="card-value" style="color:${gradeColor(cats.typography.score)}">${cats.typography.score}</div><div class="bar"><div class="bar-fill" style="width:${cats.typography.score}%;background:${gradeColor(cats.typography.score)}"></div></div></div>
    <div class="card"><div class="card-label">Arbitrary Sizes</div><div class="card-value">${cats.typography.violations}</div><div class="card-sub">font-size, weight, leading, tracking</div></div>
    <div class="card"><div class="card-label">Auto-Fixable</div><div class="card-value" style="color:var(--pass)">${cats.typography.violations}</div><div class="card-sub">All typography violations are fixable</div></div>
  </div>
  ${buildCategoryViolations(byCat['Typography'], 'Typography violations')}
</div>

<!-- ═══ RESPONSIVE TAB ═══ -->
<div class="tab-content" id="tab-responsive">
  <div class="cards cards-3">
    <div class="card"><div class="card-label">Responsive Score</div><div class="card-value" style="color:${gradeColor(cats.responsive.score)}">${cats.responsive.score}</div><div class="bar"><div class="bar-fill" style="width:${cats.responsive.score}%;background:${gradeColor(cats.responsive.score)}"></div></div></div>
    <div class="card"><div class="card-label">Fixed Widths</div><div class="card-value">${(byCat['Responsive'] ?? []).filter(v => v.ruleId === 'vizlint/responsive-required').length}</div><div class="card-sub">missing breakpoints</div></div>
    <div class="card"><div class="card-label">Accessibility</div><div class="card-value">${(byCat['Responsive'] ?? []).filter(v => v.ruleId === 'vizlint/image-alt-text' || v.ruleId === 'vizlint/missing-states').length}</div><div class="card-sub">alt text + state handling</div></div>
  </div>
  ${buildCategoryViolations(byCat['Responsive'], 'Responsive & accessibility violations')}
</div>

<!-- ═══ CONSISTENCY TAB ═══ -->
<div class="tab-content" id="tab-consistency">
  <div class="cards cards-3">
    <div class="card"><div class="card-label">Consistency Score</div><div class="card-value" style="color:${gradeColor(cats.consistency.score)}">${cats.consistency.score}</div><div class="bar"><div class="bar-fill" style="width:${cats.consistency.score}%;background:${gradeColor(cats.consistency.score)}"></div></div></div>
    <div class="card"><div class="card-label">Spacing Divergence</div><div class="card-value">${(byCat['Consistency'] ?? []).filter(v => v.ruleId === 'vizlint/consistent-component-spacing').length}</div><div class="card-sub">same component, different spacing</div></div>
    <div class="card"><div class="card-label">Radius Divergence</div><div class="card-value">${(byCat['Consistency'] ?? []).filter(v => v.ruleId === 'vizlint/consistent-border-radius').length}</div><div class="card-sub">same component, different rounding</div></div>
  </div>
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
