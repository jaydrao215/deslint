/**
 * Format the PR comment body for the Design Health Score report.
 */

import type { GateResult } from '@deslint/shared';
import { buildFixPlan } from '@deslint/shared';
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

function shortRule(ruleId: string): string {
  return ruleId.replace(/^deslint\//, '');
}

function formatRuleList(rules: Array<{ ruleId: string; count: number }>): string {
  return rules
    .slice(0, 3)
    .map((rule) => `\`${shortRule(rule.ruleId)}\` (${rule.count})`)
    .join(', ');
}

function formatFixPlanSection(result: ScanResult): string[] {
  const plan = buildFixPlan({
    totalViolations: result.totalViolations,
    byRule: result.byRule,
    messages: result.inlineViolations.map((v) => ({
      ruleId: v.ruleId,
      severity: v.severity,
      message: v.message,
    })),
  });

  if (!plan.hasWork || plan.parseOnly) return [];

  const lines: string[] = ['### Fix Plan', ''];

  if (plan.autoFixable.count > 0) {
    lines.push(
      `- **Auto-fix now:** ${plan.autoFixable.count} issue${plan.autoFixable.count === 1 ? '' : 's'} across ${formatRuleList(plan.autoFixable.rules)}`,
    );
    lines.push(`  \`${plan.autoFixable.command}\``);
  }

  if (plan.tokenDecisions.count > 0) {
    const repeated = plan.tokenDecisions.repeatedValues > 0
      ? ` (${plan.tokenDecisions.repeatedValues} repeated value${plan.tokenDecisions.repeatedValues === 1 ? '' : 's'})`
      : '';
    lines.push(
      `- **Needs design decision:** ${plan.tokenDecisions.count} token candidate${plan.tokenDecisions.count === 1 ? '' : 's'}${repeated}`,
    );
    lines.push(`  \`${plan.tokenDecisions.command}\``);
  }

  if (plan.accessibility.count > 0) {
    const label = plan.accessibility.errors > 0 ? 'Accessibility blockers' : 'Accessibility risks';
    const suffix = plan.accessibility.errors > 0
      ? ` (${plan.accessibility.errors} error${plan.accessibility.errors === 1 ? '' : 's'})`
      : '';
    lines.push(
      `- **${label}:** ${plan.accessibility.count} WCAG-mapped issue${plan.accessibility.count === 1 ? '' : 's'}${suffix}`,
    );
    lines.push('  `npx deslint compliance`');
  }

  if (plan.topDebt.length > 0) {
    lines.push(
      `- **Highest debt:** ${plan.topDebt.map((rule) => `${formatDebt(rule.effortMinutes)} \`${shortRule(rule.ruleId)}\``).join(' · ')}`,
    );
  }

  lines.push('');
  return lines;
}

/**
 * Format the Design Health Score comment for a PR.
 */
export function formatComment(
  result: ScanResult,
  minScore: number,
  gateResult?: GateResult,
): string {
  // Null score = scan had no applicable input. Render a distinct "N/A"
  // banner so reviewers don't mistake it for a 0 or 100.
  if (result.score === null) {
    const reason = result.applicability?.reason
      ?? 'No class or style attributes detected in the scanned files.';
    const lines: string[] = [
      '## :grey_question: Deslint Design Review',
      '',
      '**Design Health Score: N/A**',
      '',
      `> ${reason}`,
      '',
      `| Metric | Value |`,
      `|--------|-------|`,
      `| Files scanned | ${result.filesScanned} |`,
      `| Files with violations | ${result.filesWithViolations} |`,
      `| Total violations | ${result.totalViolations} |`,
      '',
    ];
    appendParseErrorBanner(lines, result);
    lines.push('---');
    lines.push('*Powered by [Deslint](https://deslint.com) — Design quality gate for AI-generated code*');
    return lines.join('\n');
  }

  const score = result.score;
  const badge = scoreBadge(score);
  const passedThreshold = minScore === 0 || score >= minScore;
  const thresholdLine = minScore > 0
    ? `\n> Minimum threshold: **${minScore}** — ${passedThreshold ? ':white_check_mark: Passed' : ':x: Failed'}`
    : '';

  const lines: string[] = [
    `## ${badge} Deslint Design Review`,
    '',
    `**Design Health Score: ${score}/100**${thresholdLine}`,
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

  lines.push(...formatFixPlanSection(result));

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

  if (result.totalViolations === 0 && result.parseErrors === 0) {
    lines.push(':tada: **No design violations found!** Your code follows design best practices.');
    lines.push('');
  }

  appendParseErrorBanner(lines, result);

  lines.push('---');
  lines.push('*Powered by [Deslint](https://deslint.com) — Design quality gate for AI-generated code*');

  return lines.join('\n');
}

/**
 * Surface parser failures as a distinct diagnostic banner rather than
 * letting them inflate the violation counts or appear as `unknown` in
 * Top Violations. The Design Health Score is computed from deslint-rule
 * hits only — parse errors mean "couldn't analyze this file," not
 * "this file has a design problem."
 */
function appendParseErrorBanner(lines: string[], result: ScanResult): void {
  if (result.parseErrors <= 0) return;
  const fileCount = result.filesWithParseErrors;
  const fileLabel = fileCount === 1 ? 'file' : 'files';
  lines.push(':warning: **Parser errors**');
  lines.push('');
  lines.push(
    `${fileCount} ${fileLabel} couldn't be analyzed ` +
      `(${result.parseErrors} parser error${result.parseErrors !== 1 ? 's' : ''}). ` +
      'These are excluded from the Design Health Score.',
  );
  lines.push('');
  lines.push('Most common causes:');
  lines.push('- Real syntax errors in the source file.');
  lines.push(
    '- File types the Action doesn\'t bundle a parser for yet ' +
      '(`.vue`, `.svelte`, `.angular.html`). TypeScript and JSX are supported.',
  );
  lines.push('');
}
