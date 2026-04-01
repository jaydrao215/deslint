import chalk from 'chalk';
import { relative } from 'node:path';
import { createRequire } from 'node:module';
import type { LintResult } from './lint-runner.js';
import type { ScoreResult, CategoryScore } from './score.js';
import type { RuleCategory } from './lint-runner.js';

const _require = createRequire(import.meta.url);
const _pkg = _require('../package.json') as { version: string };

export type OutputFormat = 'text' | 'json' | 'sarif';

// ── Text Formatter (colored terminal output) ─────────────────────────

function scoreColor(score: number): (text: string) => string {
  if (score >= 80) return chalk.green;
  if (score >= 60) return chalk.yellow;
  return chalk.red;
}

function severityLabel(severity: number): string {
  return severity === 2 ? chalk.red('error') : chalk.yellow('warning');
}

function categoryLabel(cat: RuleCategory): string {
  const labels: Record<RuleCategory, string> = {
    colors: 'Colors',
    spacing: 'Spacing',
    typography: 'Typography',
    responsive: 'Responsive',
    consistency: 'Consistency',
  };
  return labels[cat];
}

function scoreBar(score: number): string {
  const width = 20;
  const filled = Math.round((score / 100) * width);
  const empty = width - filled;
  const color = scoreColor(score);
  return color('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
}

export function formatText(
  lintResult: LintResult,
  scoreResult: ScoreResult,
  cwd: string,
): string {
  const lines: string[] = [];

  // ── Header ──
  lines.push('');
  lines.push(chalk.bold('  Vizlint Design Health Report'));
  lines.push(chalk.gray('  ─'.repeat(24)));
  lines.push('');

  // ── Score ──
  const colorFn = scoreColor(scoreResult.overall);
  lines.push(`  Design Health Score: ${colorFn(chalk.bold(String(scoreResult.overall)))}${chalk.gray('/100')}`);
  lines.push('');

  // ── Category breakdown ──
  for (const cat of ['colors', 'spacing', 'typography', 'responsive', 'consistency'] as RuleCategory[]) {
    const data: CategoryScore = scoreResult.categories[cat];
    const label = categoryLabel(cat).padEnd(12);
    const bar = scoreBar(data.score);
    const scoreStr = String(data.score).padStart(3);
    const violations = data.violations > 0
      ? chalk.gray(` (${data.violations} violation${data.violations !== 1 ? 's' : ''})`)
      : '';
    lines.push(`  ${label} ${bar} ${scoreStr}${violations}`);
  }
  lines.push('');

  // ── Summary ──
  lines.push(chalk.gray(`  Files scanned: ${lintResult.totalFiles}`));
  lines.push(chalk.gray(`  Files with issues: ${lintResult.filesWithViolations}`));

  if (lintResult.totalViolations > 0) {
    lines.push(`  Total violations: ${chalk.red(String(lintResult.bySeverity.errors))} error${lintResult.bySeverity.errors !== 1 ? 's' : ''}, ${chalk.yellow(String(lintResult.bySeverity.warnings))} warning${lintResult.bySeverity.warnings !== 1 ? 's' : ''}`);
  } else {
    lines.push(chalk.green('  No violations found!'));
  }
  lines.push('');

  // ── Per-file violations (only files with issues) ──
  if (lintResult.totalViolations > 0) {
    for (const result of lintResult.results) {
      if (result.messages.length === 0) continue;

      const filePath = relative(cwd, result.filePath);
      lines.push(chalk.underline(filePath));

      for (const msg of result.messages) {
        const loc = `${msg.line}:${msg.column}`;
        const sev = severityLabel(msg.severity);
        const rule = chalk.gray(msg.ruleId ?? '');
        lines.push(`  ${chalk.gray(loc.padEnd(8))} ${sev.padEnd(18)} ${msg.message}  ${rule}`);
      }
      lines.push('');
    }

    // ── False positive reporting ──
    lines.push(chalk.gray('  ─'.repeat(24)));
    lines.push(`  ${chalk.dim('See a false positive?')} ${chalk.cyan('https://github.com/vizlint/vizlint/issues/new?labels=false-positive')}`);
    lines.push('');
  }

  return lines.join('\n');
}

// ── JSON Formatter ───────────────────────────────────────────────────

export interface JsonReport {
  version: string;
  timestamp: string;
  score: {
    overall: number;
    grade: string;
    categories: Record<RuleCategory, { score: number; violations: number }>;
  };
  summary: {
    totalFiles: number;
    filesWithViolations: number;
    totalViolations: number;
    errors: number;
    warnings: number;
  };
  violations: Array<{
    file: string;
    line: number;
    column: number;
    severity: 'error' | 'warning';
    ruleId: string;
    message: string;
  }>;
}

export function formatJson(
  lintResult: LintResult,
  scoreResult: ScoreResult,
  cwd: string,
): string {
  const report: JsonReport = {
    version: _pkg.version,
    timestamp: new Date().toISOString(),
    score: {
      overall: scoreResult.overall,
      grade: scoreResult.grade,
      categories: {} as any,
    },
    summary: {
      totalFiles: lintResult.totalFiles,
      filesWithViolations: lintResult.filesWithViolations,
      totalViolations: lintResult.totalViolations,
      errors: lintResult.bySeverity.errors,
      warnings: lintResult.bySeverity.warnings,
    },
    violations: [],
  };

  for (const [cat, data] of Object.entries(scoreResult.categories)) {
    report.score.categories[cat as RuleCategory] = {
      score: data.score,
      violations: data.violations,
    };
  }

  for (const result of lintResult.results) {
    for (const msg of result.messages) {
      report.violations.push({
        file: relative(cwd, result.filePath),
        line: msg.line,
        column: msg.column,
        severity: msg.severity === 2 ? 'error' : 'warning',
        ruleId: msg.ruleId ?? 'unknown',
        message: msg.message,
      });
    }
  }

  return JSON.stringify(report, null, 2);
}

// ── SARIF 2.1.0 Formatter ───────────────────────────────────────────

export function formatSarif(
  lintResult: LintResult,
  _scoreResult: ScoreResult,
  cwd: string,
): string {
  const results: any[] = [];

  for (const fileResult of lintResult.results) {
    for (const msg of fileResult.messages) {
      results.push({
        ruleId: msg.ruleId ?? 'unknown',
        level: msg.severity === 2 ? 'error' : 'warning',
        message: { text: msg.message },
        locations: [
          {
            physicalLocation: {
              artifactLocation: {
                uri: relative(cwd, fileResult.filePath),
                uriBaseId: '%SRCROOT%',
              },
              region: {
                startLine: msg.line,
                startColumn: msg.column,
                ...(msg.endLine ? { endLine: msg.endLine } : {}),
                ...(msg.endColumn ? { endColumn: msg.endColumn } : {}),
              },
            },
          },
        ],
      });
    }
  }

  const sarif = {
    $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/main/sarif-2.1/schema/sarif-schema-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'Vizlint',
            version: _pkg.version,
            informationUri: 'https://vizlint.dev',
            rules: Object.keys(lintResult.byRule).map((ruleId) => ({
              id: ruleId,
              shortDescription: { text: ruleId },
            })),
          },
        },
        results,
      },
    ],
  };

  return JSON.stringify(sarif, null, 2);
}

/**
 * Format lint results in the specified output format.
 */
export function format(
  outputFormat: OutputFormat,
  lintResult: LintResult,
  scoreResult: ScoreResult,
  cwd: string,
): string {
  switch (outputFormat) {
    case 'text':
      return formatText(lintResult, scoreResult, cwd);
    case 'json':
      return formatJson(lintResult, scoreResult, cwd);
    case 'sarif':
      return formatSarif(lintResult, scoreResult, cwd);
  }
}
