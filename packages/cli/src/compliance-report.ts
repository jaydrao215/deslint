/**
 * WCAG 2.2 compliance report generator.
 *
 * Produces a self-contained HTML report mapping Vizlint scan results
 * to WCAG 2.2 Success Criteria. The output is designed to be shared
 * with legal / compliance / accessibility reviewers — no external
 * assets, printable, embeds the scan timestamp and project name.
 */

import type { LintResult } from './lint-runner.js';
import type { ComplianceResult, CriterionResult } from '@vizlint/shared';
import { evaluateCompliance } from '@vizlint/shared';

export interface ComplianceReportInput {
  projectName: string;
  scannedAt: Date;
  totalFiles: number;
  lintResult: LintResult;
}

/** Build per-rule file counts from a LintResult for filesByRule. */
function filesByRule(lintResult: LintResult): Record<string, number> {
  const map: Record<string, number> = {};
  for (const file of lintResult.results) {
    const seen = new Set<string>();
    for (const msg of file.messages) {
      if (msg.ruleId && !seen.has(msg.ruleId)) {
        map[msg.ruleId] = (map[msg.ruleId] ?? 0) + 1;
        seen.add(msg.ruleId);
      }
    }
  }
  return map;
}

/** Evaluate compliance from a LintResult. */
export function buildComplianceResult(lintResult: LintResult): ComplianceResult {
  return evaluateCompliance({
    byRule: lintResult.byRule,
    filesByRule: filesByRule(lintResult),
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function statusBadge(status: CriterionResult['status']): string {
  if (status === 'pass') return '<span class="badge pass">Pass</span>';
  if (status === 'fail') return '<span class="badge fail">Fail</span>';
  return '<span class="badge skip">Not evaluated</span>';
}

function levelBadge(level: string): string {
  return `<span class="level level-${level.toLowerCase()}">${escapeHtml(level)}</span>`;
}

/**
 * Render a compliance report as standalone HTML.
 *
 * Inlined CSS, no external fonts, no JS. Safe to email, attach to a
 * SOC2 audit, or print to PDF.
 */
export function renderComplianceHtml(input: ComplianceReportInput): string {
  const compliance = buildComplianceResult(input.lintResult);
  const scannedAtIso = input.scannedAt.toISOString();
  const scannedAtHuman = input.scannedAt.toUTCString();

  const rows = compliance.criteria
    .map((c) => {
      const rulesList = c.criterion.rules
        .map((r) => `<code>${escapeHtml(r)}</code>`)
        .join(', ');
      return `
      <tr class="row-${c.status}">
        <td class="sc-id"><a href="${escapeHtml(c.criterion.url)}" target="_blank" rel="noopener">${escapeHtml(c.criterion.id)}</a></td>
        <td class="sc-title">${escapeHtml(c.criterion.title)}</td>
        <td>${levelBadge(c.criterion.level)}</td>
        <td>${statusBadge(c.status)}</td>
        <td class="num">${c.violations}</td>
        <td class="num">${c.filesAffected}</td>
        <td class="sc-desc">
          <div>${escapeHtml(c.criterion.description)}</div>
          <div class="rules">Evidence: ${rulesList}</div>
        </td>
      </tr>`;
    })
    .join('\n');

  const levelLabel = compliance.levelReached === 'none' ? 'Not Met' : `Level ${compliance.levelReached}`;
  const levelClass = compliance.levelReached === 'none' ? 'fail' : 'pass';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="generator" content="Vizlint Compliance Report">
<title>WCAG 2.2 Compliance Report — ${escapeHtml(input.projectName)}</title>
<style>
  :root {
    --primary: #1A5276;
    --pass: #27AE60;
    --fail: #E74C3C;
    --warn: #F39C12;
    --ink: #1a1a1a;
    --muted: #6c757d;
    --bg: #ffffff;
    --panel: #F8F9FA;
    --border: #e5e7eb;
  }
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', Arial, sans-serif;
    color: var(--ink);
    background: var(--bg);
    margin: 0;
    padding: 2rem;
    max-width: 1100px;
    margin-left: auto;
    margin-right: auto;
    line-height: 1.5;
  }
  h1 {
    color: var(--primary);
    margin: 0 0 0.25rem;
    font-size: 1.75rem;
  }
  .subtitle { color: var(--muted); font-size: 0.9rem; margin-bottom: 2rem; }
  .hero {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
    margin-bottom: 2rem;
  }
  .stat {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 1rem 1.25rem;
  }
  .stat .label {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--muted);
    margin-bottom: 0.25rem;
  }
  .stat .value { font-size: 1.75rem; font-weight: 600; color: var(--primary); }
  .stat .value.pass { color: var(--pass); }
  .stat .value.fail { color: var(--fail); }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
  }
  th, td {
    text-align: left;
    padding: 0.75rem;
    border-bottom: 1px solid var(--border);
    vertical-align: top;
  }
  th {
    background: var(--panel);
    font-weight: 600;
    color: var(--primary);
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  td.num { text-align: right; font-variant-numeric: tabular-nums; }
  td.sc-id a { color: var(--primary); text-decoration: none; font-weight: 600; }
  td.sc-id a:hover { text-decoration: underline; }
  td.sc-title { font-weight: 500; }
  td.sc-desc { color: var(--ink); }
  td.sc-desc .rules {
    font-size: 0.75rem;
    color: var(--muted);
    margin-top: 0.25rem;
  }
  code {
    font-family: 'JetBrains Mono', 'Menlo', monospace;
    font-size: 0.75rem;
    background: var(--panel);
    padding: 0.1rem 0.35rem;
    border-radius: 4px;
  }
  .badge {
    display: inline-block;
    padding: 0.15rem 0.55rem;
    border-radius: 12px;
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .badge.pass { background: #d4edda; color: #155724; }
  .badge.fail { background: #f8d7da; color: #721c24; }
  .badge.skip { background: #e2e3e5; color: #383d41; }
  .level {
    display: inline-block;
    padding: 0.1rem 0.4rem;
    border-radius: 4px;
    font-size: 0.7rem;
    font-weight: 700;
    background: var(--panel);
    border: 1px solid var(--border);
  }
  tr.row-fail { background: rgba(231, 76, 60, 0.03); }
  tr.row-pass { background: rgba(39, 174, 96, 0.02); }
  footer {
    margin-top: 3rem;
    padding-top: 1.5rem;
    border-top: 1px solid var(--border);
    color: var(--muted);
    font-size: 0.8rem;
  }
  @media print {
    body { padding: 0.5in; max-width: none; }
    .stat, table { page-break-inside: avoid; }
  }
</style>
</head>
<body>
  <h1>WCAG 2.2 Compliance Report</h1>
  <div class="subtitle">
    Project: <strong>${escapeHtml(input.projectName)}</strong> &middot;
    Scanned: <time datetime="${scannedAtIso}">${escapeHtml(scannedAtHuman)}</time> &middot;
    ${input.totalFiles} files
  </div>

  <div class="hero">
    <div class="stat">
      <div class="label">Conformance</div>
      <div class="value ${levelClass}">${escapeHtml(levelLabel)}</div>
    </div>
    <div class="stat">
      <div class="label">Pass Rate</div>
      <div class="value">${compliance.passRatePercent}%</div>
    </div>
    <div class="stat">
      <div class="label">Coverage</div>
      <div class="value">${compliance.coveragePercent}%</div>
    </div>
    <div class="stat">
      <div class="label">Violations</div>
      <div class="value ${compliance.totalViolations > 0 ? 'fail' : 'pass'}">${compliance.totalViolations}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>SC</th>
        <th>Title</th>
        <th>Level</th>
        <th>Status</th>
        <th>Violations</th>
        <th>Files</th>
        <th>Detail</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  <footer>
    Generated by Vizlint &middot;
    Based on <a href="https://www.w3.org/TR/WCAG22/" target="_blank" rel="noopener">WCAG 2.2</a> Success Criteria.
    This report reflects the subset of criteria for which Vizlint has automated evidence.
    Full conformance also requires manual review by a qualified accessibility auditor.
  </footer>
</body>
</html>`;
}
