/**
 * Format the PR comment body for the Design Health Score report.
 */

import type { GateResult } from '@deslint/shared';
import type { ScanResult } from './scan.js';

function formatDebt(minutes: number): string {
  if (minutes <= 0) return '0m';
  if (minutes < 60) return `${minutes}m`;
  const hours = minutes / 60;
  if (hours < 8) {
    const h = Math.floor(hours);
    const m = minutes - h * 60;
    return m === 0 ? `${h}h` : `${h}h ${m}m`;
  }
  const days = Math.round((hours / 8) * 10) / 10;
  const roundedHours = Math.round(hours * 10) / 10;
  return `${days}d (${roundedHours}h)`;
}

/**
 * Produce a score badge emoji based on score thresholds.
 */
function scoreBadge(score: number): string {
  if (score >= 90) return ':white_check_mark:';
  if (score >= 70) return ':large_orange_diamond:';
  return ':red_circle:';
}

/**
 * Produce a category status indicator.
 */
function categoryStatus(score: number, maxScore: number): string {
  const pct = maxScore > 0 ? (score / maxScore) * 100 : 100;
  if (pct >= 90) return ':green_circle:';
  if (pct >= 50) return ':yellow_circle:';
  return ':red_circle:';
}

/**
 * Format the Design Health Score comment for a PR.
 */
export function formatComment(
  result: ScanResult,
  minScore: number,
  gateResult?: GateResult,
): string {
  const badge = scoreBadge(result.score);
  const passedThreshold = minScore === 0 || result.score >= minScore;
  const thresholdLine = minScore > 0
    ? `\n> Minimum threshold: **${minScore}** — ${passedThreshold ? ':white_check_mark: Passed' : ':x: Failed'}`
    : '';

  const lines: string[] = [
    `## ${badge} Deslint Design Review`,
    '',
    `**Design Health Score: ${result.score}/100**${thresholdLine}`,
    '',
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Files scanned | ${result.filesScanned} |`,
    `| Files with violations | ${result.filesWithViolations} |`,
    `| Total violations | ${result.totalViolations} |`,
    `| Errors | ${result.errors} |`,
    `| Warnings | ${result.warnings} |`,
    `| Design debt | ${formatDebt(result.debtMinutes)} |`,
    '',
  ];

  // Quality gate status (only if configured)
  if (gateResult && gateResult.conditionsChecked > 0) {
    const gateBadge = gateResult.passed ? ':white_check_mark:' : ':x:';
    const enforceLabel = gateResult.enforced ? '' : ' _(warn-only)_';
    lines.push(`### ${gateBadge} Quality Gate${enforceLabel}`);
    lines.push('');
    if (gateResult.passed) {
      lines.push(`All ${gateResult.conditionsChecked} configured condition${gateResult.conditionsChecked === 1 ? '' : 's'} passed.`);
    } else {
      lines.push(`**${gateResult.failures.length} of ${gateResult.conditionsChecked} conditions failed:**`);
      lines.push('');
      for (const f of gateResult.failures) {
        lines.push(`- ${f.message}`);
      }
      if (!gateResult.enforced) {
        lines.push('');
        lines.push('> Set `"qualityGate": { "enforce": true }` in `.deslintrc.json` to fail the check on gate failures.');
      }
    }
    lines.push('');
  }

  // Category breakdown
  if (result.categories.length > 0) {
    lines.push('### Score Breakdown');
    lines.push('');
    lines.push('| Category | Score | Violations |');
    lines.push('|----------|-------|------------|');

    for (const cat of result.categories) {
      const status = categoryStatus(cat.score, 100);
      const name = cat.name.charAt(0).toUpperCase() + cat.name.slice(1);
      lines.push(`| ${status} ${name} | ${cat.score}/100 | ${cat.violations} |`);
    }

    lines.push('');
  }

  // Top violations
  if (result.topViolations.length > 0) {
    lines.push('### Top Violations');
    lines.push('');
    lines.push('| Rule | Count | Severity |');
    lines.push('|------|-------|----------|');

    for (const v of result.topViolations) {
      const severityIcon = v.severity === 'error' ? ':red_circle:' : ':yellow_circle:';
      const ruleName = v.ruleId.replace('deslint/', '');
      lines.push(`| \`${ruleName}\` | ${v.count} | ${severityIcon} ${v.severity} |`);
    }

    lines.push('');
  }

  if (result.totalViolations === 0) {
    lines.push(':tada: **No design violations found!** Your code follows design best practices.');
    lines.push('');
  }

  lines.push('---');
  lines.push('*Powered by [Deslint](https://deslint.com) — Design quality gate for AI-generated code*');

  return lines.join('\n');
}
