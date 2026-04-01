import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import type { LintResult, RuleCategory } from './lint-runner.js';

/** Default category weights (each 20% = equal weight across 5 categories) */
const DEFAULT_WEIGHTS: Record<RuleCategory, number> = {
  colors: 20,
  spacing: 20,
  typography: 20,
  responsive: 20,
  consistency: 20,
};

export interface ScoreResult {
  /** Overall score 0-100 */
  overall: number;
  /** Sub-scores by category */
  categories: Record<RuleCategory, CategoryScore>;
  /** Score grade based on thresholds */
  grade: 'pass' | 'warn' | 'fail';
}

export interface CategoryScore {
  /** Score 0-100 for this category */
  score: number;
  /** Number of violations */
  violations: number;
  /** Weight applied to overall score */
  weight: number;
}

export interface HistoryEntry {
  timestamp: string;
  overall: number;
  categories: Record<RuleCategory, number>;
  totalFiles: number;
  totalViolations: number;
}

/**
 * Calculate Design Health Score from lint results.
 *
 * Formula per category:
 *   score = max(0, 100 - (violations * penalty))
 *   penalty scales with file count to normalize across project sizes
 *
 * Overall = weighted average of category scores.
 */
export function calculateScore(
  lintResult: LintResult,
  weights?: Partial<Record<RuleCategory, number>>,
): ScoreResult {
  const w = { ...DEFAULT_WEIGHTS, ...weights };

  // Normalize weights to sum to 100
  const totalWeight = Object.values(w).reduce((a, b) => a + b, 0);
  const normalizedWeights: Record<RuleCategory, number> = {} as any;
  for (const [cat, weight] of Object.entries(w)) {
    normalizedWeights[cat as RuleCategory] = (weight / totalWeight) * 100;
  }

  const categories: Record<RuleCategory, CategoryScore> = {} as any;

  // Penalty per violation: scaled so ~1 violation per file = ~50% score
  // For a 10-file project, 10 violations → score ~50
  // For a 100-file project, 100 violations → score ~50
  const fileCount = Math.max(lintResult.totalFiles, 1);

  for (const cat of Object.keys(DEFAULT_WEIGHTS) as RuleCategory[]) {
    const violations = lintResult.byCategory[cat] ?? 0;
    const violationRate = violations / fileCount;
    // Each violation per file costs ~50 points; clamped to 0-100
    const score = Math.round(Math.max(0, Math.min(100, 100 - violationRate * 50)));

    categories[cat] = {
      score,
      violations,
      weight: normalizedWeights[cat],
    };
  }

  // Weighted average
  let overall = 0;
  for (const cat of Object.keys(DEFAULT_WEIGHTS) as RuleCategory[]) {
    overall += categories[cat].score * (normalizedWeights[cat] / 100);
  }
  overall = Math.round(overall);

  const grade: ScoreResult['grade'] =
    overall >= 80 ? 'pass' : overall >= 60 ? 'warn' : 'fail';

  return { overall, categories, grade };
}

/**
 * Save score to history file for trend tracking.
 */
export function saveHistory(
  projectDir: string,
  lintResult: LintResult,
  scoreResult: ScoreResult,
): void {
  const historyPath = resolve(projectDir, '.vizlint', 'history.json');
  const dir = dirname(historyPath);

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  let history: HistoryEntry[] = [];
  if (existsSync(historyPath)) {
    try {
      history = JSON.parse(readFileSync(historyPath, 'utf-8'));
    } catch {
      history = [];
    }
  }

  const entry: HistoryEntry = {
    timestamp: new Date().toISOString(),
    overall: scoreResult.overall,
    categories: {} as Record<RuleCategory, number>,
    totalFiles: lintResult.totalFiles,
    totalViolations: lintResult.totalViolations,
  };

  for (const [cat, data] of Object.entries(scoreResult.categories)) {
    entry.categories[cat as RuleCategory] = data.score;
  }

  history.push(entry);
  writeFileSync(historyPath, JSON.stringify(history, null, 2) + '\n');
}
