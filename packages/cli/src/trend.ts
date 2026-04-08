/**
 * `deslint trend` — analyzes the .deslint/history.json log to show score
 * changes over time, per-category deltas, and regression alerts.
 *
 * History is already saved on every `deslint scan` run via saveHistory()
 * in score.ts. This command is a read-only view over that data.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import chalk from 'chalk';
import type { HistoryEntry } from './score.js';
import type { RuleCategory } from './lint-runner.js';

export interface TrendOptions {
  /** Number of recent entries to include in the summary (default 10). */
  limit?: number;
  /** Output format. `text` renders an ASCII table and sparkline. */
  format?: 'text' | 'json';
  /**
   * Regression alert threshold — flag deltas of this many points or more.
   * Default 5.
   */
  alertThreshold?: number;
}

export interface TrendSummary {
  /** Total history entries on disk. */
  totalEntries: number;
  /** Entries actually included after `limit` truncation. */
  windowEntries: number;
  /** First entry in the window. */
  first?: HistoryEntry;
  /** Most recent entry in the window. */
  latest?: HistoryEntry;
  /** Score delta from first → latest (positive = improving). */
  scoreDelta: number;
  /** Highest score observed in the window. */
  highScore: number;
  /** Lowest score observed in the window. */
  lowScore: number;
  /** Average score across the window. */
  averageScore: number;
  /** Per-category delta from first → latest. */
  categoryDeltas: Record<RuleCategory, number>;
  /** Regressions >= alertThreshold between consecutive entries. */
  regressions: Array<{
    from: HistoryEntry;
    to: HistoryEntry;
    delta: number;
  }>;
}

const CATEGORIES: RuleCategory[] = [
  'colors',
  'spacing',
  'typography',
  'responsive',
  'consistency',
];

/** Read history.json from a project directory. Returns [] on missing/invalid. */
export function loadHistory(projectDir: string): HistoryEntry[] {
  const historyPath = resolve(projectDir, '.deslint', 'history.json');
  if (!existsSync(historyPath)) return [];
  try {
    const raw = JSON.parse(readFileSync(historyPath, 'utf-8'));
    if (!Array.isArray(raw)) return [];
    return raw as HistoryEntry[];
  } catch {
    return [];
  }
}

/**
 * Compute a trend summary from a history log.
 * Pure function — takes the array, returns stats.
 */
export function analyzeTrend(
  history: HistoryEntry[],
  options: TrendOptions = {},
): TrendSummary {
  const limit = options.limit ?? 10;
  const alertThreshold = options.alertThreshold ?? 5;

  const window = history.slice(-limit);
  const totalEntries = history.length;
  const windowEntries = window.length;

  if (windowEntries === 0) {
    return {
      totalEntries,
      windowEntries,
      scoreDelta: 0,
      highScore: 0,
      lowScore: 0,
      averageScore: 0,
      categoryDeltas: {
        colors: 0,
        spacing: 0,
        typography: 0,
        responsive: 0,
        consistency: 0,
      },
      regressions: [],
    };
  }

  const first = window[0];
  const latest = window[window.length - 1];
  const scoreDelta = latest.overall - first.overall;

  let highScore = window[0].overall;
  let lowScore = window[0].overall;
  let totalScore = 0;
  for (const entry of window) {
    if (entry.overall > highScore) highScore = entry.overall;
    if (entry.overall < lowScore) lowScore = entry.overall;
    totalScore += entry.overall;
  }
  const averageScore = Math.round(totalScore / windowEntries);

  const categoryDeltas: Record<RuleCategory, number> = {
    colors: (latest.categories.colors ?? 0) - (first.categories.colors ?? 0),
    spacing: (latest.categories.spacing ?? 0) - (first.categories.spacing ?? 0),
    typography: (latest.categories.typography ?? 0) - (first.categories.typography ?? 0),
    responsive: (latest.categories.responsive ?? 0) - (first.categories.responsive ?? 0),
    consistency: (latest.categories.consistency ?? 0) - (first.categories.consistency ?? 0),
  };

  const regressions: TrendSummary['regressions'] = [];
  for (let i = 1; i < window.length; i++) {
    const from = window[i - 1];
    const to = window[i];
    const delta = from.overall - to.overall;
    if (delta >= alertThreshold) {
      regressions.push({ from, to, delta });
    }
  }

  return {
    totalEntries,
    windowEntries,
    first,
    latest,
    scoreDelta,
    highScore,
    lowScore,
    averageScore,
    categoryDeltas,
    regressions,
  };
}

/** Build a compact ASCII sparkline from a list of scores. */
export function sparkline(scores: number[]): string {
  if (scores.length === 0) return '';
  const chars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const range = max - min || 1;
  return scores
    .map((s) => {
      const i = Math.min(
        chars.length - 1,
        Math.floor(((s - min) / range) * (chars.length - 1)),
      );
      return chars[i];
    })
    .join('');
}

function formatDelta(delta: number): string {
  if (delta > 0) return chalk.green(`+${delta}`);
  if (delta < 0) return chalk.red(`${delta}`);
  return chalk.gray('0');
}

function scoreColor(score: number): (t: string) => string {
  if (score >= 80) return chalk.green;
  if (score >= 60) return chalk.yellow;
  return chalk.red;
}

/** Render a trend summary as formatted text. */
export function formatTrendText(
  summary: TrendSummary,
  history: HistoryEntry[],
  options: TrendOptions = {},
): string {
  const lines: string[] = [];
  const limit = options.limit ?? 10;

  lines.push('');
  lines.push(chalk.bold('  Deslint Design Health Trend'));
  lines.push(chalk.gray('  ─'.repeat(24)));
  lines.push('');

  if (summary.windowEntries === 0) {
    lines.push(chalk.yellow('  No history yet. Run `deslint scan` at least once to record a score.'));
    lines.push('');
    return lines.join('\n');
  }

  if (summary.windowEntries === 1) {
    const only = summary.latest!;
    lines.push(`  Only one entry recorded so far: ${scoreColor(only.overall)(String(only.overall))}/100 on ${new Date(only.timestamp).toLocaleDateString()}.`);
    lines.push(chalk.gray('  Run another scan to see trend data.'));
    lines.push('');
    return lines.join('\n');
  }

  const window = history.slice(-limit);
  const latest = summary.latest!;
  const first = summary.first!;

  // Headline
  const colorFn = scoreColor(latest.overall);
  const deltaStr = formatDelta(summary.scoreDelta);
  const versusLabel = chalk.gray(' vs ' + summary.windowEntries + ' scans ago)');
  lines.push(
    '  Current score: ' +
      colorFn(chalk.bold(String(latest.overall))) +
      chalk.gray('/100') +
      '  ' +
      chalk.gray('(') +
      deltaStr +
      versusLabel,
  );
  lines.push('');

  // Sparkline
  const spark = sparkline(window.map((e) => e.overall));
  lines.push('  ' + chalk.cyan(spark) + '  ' + chalk.gray(window.length + ' scans'));
  lines.push(
    `  ${chalk.gray('high')} ${summary.highScore}  ${chalk.gray('low')} ${summary.lowScore}  ${chalk.gray('avg')} ${summary.averageScore}`,
  );
  lines.push('');

  // Per-category deltas
  lines.push(chalk.bold('  Category deltas (first → latest):'));
  for (const cat of CATEGORIES) {
    const from = first.categories[cat] ?? 0;
    const to = latest.categories[cat] ?? 0;
    const delta = to - from;
    const label = cat.padEnd(12);
    lines.push(
      `    ${label} ${String(from).padStart(3)} → ${String(to).padStart(3)}  ${formatDelta(delta)}`,
    );
  }
  lines.push('');

  // Regressions
  if (summary.regressions.length > 0) {
    lines.push(chalk.red(chalk.bold(`  ⚠ ${summary.regressions.length} regression${summary.regressions.length === 1 ? '' : 's'} detected:`)));
    for (const r of summary.regressions) {
      const fromDate = new Date(r.from.timestamp).toLocaleString();
      const toDate = new Date(r.to.timestamp).toLocaleString();
      lines.push(
        chalk.gray(`    ${fromDate} (${r.from.overall}) → ${toDate} (${r.to.overall})  ${chalk.red(`-${r.delta}`)}`),
      );
    }
    lines.push('');
  } else {
    lines.push(chalk.gray('  No regressions in window.'));
    lines.push('');
  }

  // Recent entries table
  lines.push(chalk.bold('  Recent scans:'));
  lines.push(chalk.gray('    date                    score  files  violations'));
  for (const entry of window.slice().reverse().slice(0, 10)) {
    const date = new Date(entry.timestamp).toLocaleString().padEnd(22);
    const score = scoreColor(entry.overall)(String(entry.overall).padStart(5));
    const files = String(entry.totalFiles).padStart(5);
    const viols = String(entry.totalViolations).padStart(10);
    lines.push(`    ${date} ${score}  ${files}  ${viols}`);
  }
  lines.push('');

  return lines.join('\n');
}

/** Render a trend summary as JSON. */
export function formatTrendJson(summary: TrendSummary): string {
  return JSON.stringify(summary, null, 2);
}
