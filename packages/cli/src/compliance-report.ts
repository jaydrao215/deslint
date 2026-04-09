/**
 * WCAG 2.2 compliance report generator.
 *
 * Produces a self-contained HTML report mapping Deslint scan results
 * to WCAG 2.2 Success Criteria. The output is designed to be shared
 * with legal / compliance / accessibility reviewers — no external
 * assets, printable, embeds the scan timestamp and project name.
 */

import type { LintResult } from './lint-runner.js';
import type {
  ComplianceResult,
  CriterionResult,
  LevelSummary,
  WcagLevel,
} from '@deslint/shared';
import { evaluateCompliance } from '@deslint/shared';

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

function renderCriterionRow(c: CriterionResult): string {
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
}

function renderLevelSection(
  level: WcagLevel,
  criteria: CriterionResult[],
  summary: LevelSummary | undefined,
): string {
  // No criteria at this level in our map → skip the whole section
  // instead of rendering an empty table.
  if (criteria.length === 0 || !summary) return '';

  const conformanceBadge = summary.conformant
    ? `<span class="badge pass">Conformant</span>`
    : summary.evaluated === 0
      ? `<span class="badge skip">Not evaluated</span>`
      : `<span class="badge fail">Not conformant</span>`;

  const rows = criteria.map(renderCriterionRow).join('\n');

  return `
  <section class="level-section" data-level="${level}">
    <div class="level-header">
      <h2>Level ${level} <span class="level-count">(${summary.passed}/${summary.evaluated} passing${summary.notEvaluated > 0 ? `, ${summary.notEvaluated} not evaluated` : ''})</span></h2>
      ${conformanceBadge}
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
  </section>`;
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

  const levelOrder: WcagLevel[] = ['A', 'AA', 'AAA'];
  const levelSections = levelOrder
    .map((lvl) => {
      const summary = compliance.byLevel.find((b) => b.level === lvl);
      const atLevel = compliance.criteria.filter((c) => c.criterion.level === lvl);
      return renderLevelSection(lvl, atLevel, summary);
    })
    .filter((s) => s.length > 0)
    .join('\n');

  const levelLabel = compliance.levelReached === 'none' ? 'Not Met' : `Level ${compliance.levelReached}`;
  const levelClass = compliance.levelReached === 'none' ? 'fail' : 'pass';

  const wcag21Label =
    compliance.wcag21.levelReached === 'none'
      ? 'Not Met'
      : `Level ${compliance.wcag21.levelReached}`;
  const wcag21Class = compliance.wcag21.levelReached === 'none' ? 'fail' : 'pass';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="generator" content="Deslint Compliance Report">
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
    grid-template-columns: repeat(5, 1fr);
    gap: 1rem;
    margin-bottom: 2rem;
  }
  @media (max-width: 900px) {
    .hero { grid-template-columns: repeat(2, 1fr); }
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
  .level-section { margin-bottom: 2.5rem; }
  .level-section:last-of-type { margin-bottom: 1.5rem; }
  .level-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
  }
  .level-header h2 {
    color: var(--primary);
    margin: 0;
    font-size: 1.1rem;
  }
  .level-header .level-count {
    color: var(--muted);
    font-weight: 400;
    font-size: 0.85rem;
  }
  .wcag21-note {
    background: var(--panel);
    border-left: 3px solid var(--primary);
    padding: 0.75rem 1rem;
    margin: 0 0 2rem;
    font-size: 0.85rem;
    color: var(--ink);
  }
  .wcag21-note strong { color: var(--primary); }
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
      <div class="label">WCAG 2.2</div>
      <div class="value ${levelClass}">${escapeHtml(levelLabel)}</div>
    </div>
    <div class="stat">
      <div class="label">WCAG 2.1 AA<sup>*</sup></div>
      <div class="value ${wcag21Class}">${escapeHtml(wcag21Label)}</div>
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

  <div class="wcag21-note">
    <strong>ADA Title II note:</strong> The public-entity ADA Title II rule adopts
    <a href="https://www.w3.org/TR/WCAG21/" target="_blank" rel="noopener">WCAG 2.1</a> Level AA as its
    technical standard. Every criterion Deslint evaluates here also exists in WCAG 2.1, so this
    report doubles as 2.1 evidence for the ${compliance.wcag21.evaluated} of ${compliance.wcag21.totalMapped}
    criteria we cover. <sup>*</sup> "WCAG 2.1 AA" above reflects conformance over that 2.1 subset only;
    full 2.1 AA conformance requires auditing the criteria Deslint doesn't statically detect.
  </div>
  ${levelSections}

  <footer>
    Generated by Deslint &middot;
    Based on <a href="https://www.w3.org/TR/WCAG22/" target="_blank" rel="noopener">WCAG 2.2</a> Success Criteria.
    This report reflects the subset of criteria for which Deslint has automated evidence.
    Full conformance also requires manual review by a qualified accessibility auditor.
  </footer>
</body>
</html>`;
}
