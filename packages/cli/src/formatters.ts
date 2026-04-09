import chalk from 'chalk';
import { relative } from 'node:path';
import { createRequire } from 'node:module';
import type { LintResult } from './lint-runner.js';
import type { ScoreResult, CategoryScore } from './score.js';
import type { RuleCategory } from './lint-runner.js';
import { calculateDebt, formatDebt } from './debt.js';

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
  lines.push(chalk.bold('  Deslint Design Health Report'));
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

  // ── Design Debt ──
  const debt = calculateDebt(lintResult);
  if (debt.totalMinutes > 0) {
    const debtColor = debt.totalHours >= 8 ? chalk.red : debt.totalHours >= 2 ? chalk.yellow : chalk.gray;
    lines.push(`  Design debt: ${debtColor(formatDebt(debt.totalMinutes))} ${chalk.gray('estimated remediation effort')}`);
    // Top 3 contributors
    const top = debt.breakdown.slice(0, 3);
    if (top.length > 0) {
      for (const entry of top) {
        const ruleShort = entry.ruleId.replace(/^deslint\//, '');
        lines.push(
          chalk.gray(
            `    ${formatDebt(entry.totalMinutes).padStart(8)}  ${ruleShort} (${entry.violations}× ${entry.minutesPerViolation}m)`,
          ),
        );
      }
    }
  }
  lines.push('');

  // ── Per-file violations (grouped by class for repeated violations) ──
  if (lintResult.totalViolations > 0) {
    // Group violations: key = ruleId + first backtick-quoted token (or full message)
    const grouped = new Map<string, {
      ruleId: string;
      message: string;
      severity: number;
      cls: string;
      locations: Array<{ file: string; line: number; column: number }>;
    }>();

    for (const result of lintResult.results) {
      if (result.messages.length === 0) continue;
      const file = relative(cwd, result.filePath);
      for (const msg of result.messages) {
        // Extract class token from message for grouping (e.g. `max-w-[800px]`)
        const clsMatch = msg.message.match(/`([^`]+)`/);
        const cls = clsMatch ? clsMatch[1] : msg.message.slice(0, 40);
        const key = `${msg.ruleId ?? ''}::${cls}`;
        if (!grouped.has(key)) {
          grouped.set(key, {
            ruleId: msg.ruleId ?? 'unknown',
            message: msg.message,
            severity: msg.severity,
            cls,
            locations: [],
          });
        }
        grouped.get(key)!.locations.push({ file, line: msg.line, column: msg.column });
      }
    }

    // Separate singletons (appear once) from repeated (appear 2+)
    const singletons: typeof grouped extends Map<string, infer V> ? V[] : never[] = [];
    const repeated: typeof singletons = [];
    for (const entry of grouped.values()) {
      if (entry.locations.length === 1) singletons.push(entry);
      else repeated.push(entry);
    }
    // Sort repeated by count desc
    repeated.sort((a, b) => b.locations.length - a.locations.length);

    // ── Grouped (repeated) violations ──
    if (repeated.length > 0) {
      lines.push(chalk.bold('  Grouped violations (same class, multiple locations):'));
      lines.push('');
      for (const entry of repeated) {
        const fileSet = new Set(entry.locations.map(l => l.file));
        const sev = severityLabel(entry.severity);
        const rule = chalk.gray(entry.ruleId);
        const count = chalk.bold(String(entry.locations.length));
        lines.push(
          `  ${sev}  ${chalk.cyan(entry.cls)}  ${count} occurrences across ${fileSet.size} file${fileSet.size !== 1 ? 's' : ''}  ${rule}`,
        );
        // Show compact file list
        for (const file of fileSet) {
          const linesInFile = entry.locations
            .filter(l => l.file === file)
            .map(l => l.line)
            .sort((a, b) => a - b);
          lines.push(chalk.gray(`    ${file}  lines ${linesInFile.join(', ')}`));
        }
        // Show the message once (stripped of repeated cls prefix)
        lines.push(chalk.dim(`    ${entry.message}`));
        lines.push('');
      }
    }

    // ── Singleton violations (per-file, traditional view) ──
    if (singletons.length > 0) {
      // Re-group singletons by file for a cleaner display
      const byFile = new Map<string, typeof singletons>();
      for (const entry of singletons) {
        const file = entry.locations[0].file;
        if (!byFile.has(file)) byFile.set(file, []);
        byFile.get(file)!.push(entry);
      }
      if (repeated.length > 0) {
        lines.push(chalk.bold('  Individual violations:'));
        lines.push('');
      }
      for (const [file, entries] of byFile) {
        lines.push(chalk.underline(file));
        for (const entry of entries) {
          const loc = `${entry.locations[0].line}:${entry.locations[0].column}`;
          const sev = severityLabel(entry.severity);
          const rule = chalk.gray(entry.ruleId);
          lines.push(`  ${chalk.gray(loc.padEnd(8))} ${sev.padEnd(18)} ${entry.message}  ${rule}`);
        }
        lines.push('');
      }
    }

    // ── Tip for unfixable grouped violations ──
    if (repeated.some(e => e.ruleId === 'deslint/no-arbitrary-spacing')) {
      lines.push(chalk.dim('  Tip: run `deslint suggest-tokens .` to get design guidance for these custom values.'));
      lines.push('');
    }

    // ── False positive reporting ──
    lines.push(chalk.gray('  ─'.repeat(24)));
    lines.push(`  ${chalk.dim('See a false positive?')} ${chalk.cyan('https://github.com/jaydrao215/deslint/issues/new?labels=false-positive')}`);
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
  debt: {
    totalMinutes: number;
    totalHours: number;
    byCategory: Record<RuleCategory, number>;
    breakdown: Array<{
      ruleId: string;
      violations: number;
      minutesPerViolation: number;
      totalMinutes: number;
    }>;
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
  const debt = calculateDebt(lintResult);
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
    debt: {
      totalMinutes: debt.totalMinutes,
      totalHours: debt.totalHours,
      byCategory: debt.byCategory,
      breakdown: debt.breakdown,
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
            name: 'Deslint',
            version: _pkg.version,
            informationUri: 'https://deslint.com',
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
