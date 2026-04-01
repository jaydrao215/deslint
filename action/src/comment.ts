/**
 * Format the PR comment body for the Design Health Score report.
 */

import type { ScanResult } from './scan.js';

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
export function formatComment(result: ScanResult, minScore: number): string {
  const badge = scoreBadge(result.score);
  const passedThreshold = minScore === 0 || result.score >= minScore;
  const thresholdLine = minScore > 0
    ? `\n> Minimum threshold: **${minScore}** — ${passedThreshold ? ':white_check_mark: Passed' : ':x: Failed'}`
    : '';

  const lines: string[] = [
    `## ${badge} Vizlint Design Review`,
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
    '',
  ];

  // Category breakdown
  if (result.categories.length > 0) {
    lines.push('### Score Breakdown');
    lines.push('');
    lines.push('| Category | Score | Violations |');
    lines.push('|----------|-------|------------|');

    for (const cat of result.categories) {
      const status = categoryStatus(cat.score, 20);
      const name = cat.name.charAt(0).toUpperCase() + cat.name.slice(1);
      lines.push(`| ${status} ${name} | ${cat.score}/20 | ${cat.violations} |`);
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
      const ruleName = v.ruleId.replace('vizlint/', '');
      lines.push(`| \`${ruleName}\` | ${v.count} | ${severityIcon} ${v.severity} |`);
    }

    lines.push('');
  }

  if (result.totalViolations === 0) {
    lines.push(':tada: **No design violations found!** Your code follows design best practices.');
    lines.push('');
  }

  lines.push('---');
  lines.push('*Powered by [Vizlint](https://vizlint.dev) — Design quality gate for AI-generated code*');

  return lines.join('\n');
}
