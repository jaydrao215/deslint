import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import type { LintResult, RuleCategory } from './lint-runner.js';

const DEFAULT_WEIGHTS: Record<RuleCategory, number> = {
  colors: 20,
  spacing: 20,
  typography: 20,
  responsive: 20,
  consistency: 20,
};

export interface ScoreResult {
  overall: number;
  categories: Record<RuleCategory, CategoryScore>;
  grade: 'pass' | 'warn' | 'fail';
}

export interface CategoryScore {
  score: number;
  violations: number;
  weight: number;
}

export interface HistoryEntry {
  timestamp: string;
  overall: number;
  categories: Record<RuleCategory, number>;
  totalFiles: number;
  totalViolations: number;
  /** Per-rule counts. Optional for pre-v0.6 backwards compat; budget's
   *  maxNewRuleViolations check silently skips when absent. */
  byRule?: Record<string, number>;
}

export function calculateScore(
  lintResult: LintResult,
  weights?: Partial<Record<RuleCategory, number>>,
): ScoreResult {
  const w = { ...DEFAULT_WEIGHTS, ...weights };

  const totalWeight = Object.values(w).reduce((a, b) => a + b, 0);
  const normalizedWeights: Record<RuleCategory, number> = {} as any;
  for (const [cat, weight] of Object.entries(w)) {
    normalizedWeights[cat as RuleCategory] = (weight / totalWeight) * 100;
  }

  const categories: Record<RuleCategory, CategoryScore> = {} as any;
  const fileCount = Math.max(lintResult.totalFiles, 1);

  for (const cat of Object.keys(DEFAULT_WEIGHTS) as RuleCategory[]) {
    const violations = lintResult.byCategory[cat] ?? 0;
    const violationRate = violations / fileCount;
    const score = Math.round(Math.max(0, Math.min(100, 100 - violationRate * 50)));
    categories[cat] = { score, violations, weight: normalizedWeights[cat] };
  }

  let overall = 0;
  for (const cat of Object.keys(DEFAULT_WEIGHTS) as RuleCategory[]) {
    overall += categories[cat].score * (normalizedWeights[cat] / 100);
  }
  overall = Math.round(overall);

  const grade: ScoreResult['grade'] =
    overall >= 80 ? 'pass' : overall >= 60 ? 'warn' : 'fail';

  return { overall, categories, grade };
}

export function saveHistory(
  projectDir: string,
  lintResult: LintResult,
  scoreResult: ScoreResult,
): void {
  const historyPath = resolve(projectDir, '.deslint', 'history.json');
  const dir = dirname(historyPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  let history: HistoryEntry[] = [];
  if (existsSync(historyPath)) {
    try { history = JSON.parse(readFileSync(historyPath, 'utf-8')); } catch {}
  }

  const entry: HistoryEntry = {
    timestamp: new Date().toISOString(),
    overall: scoreResult.overall,
    categories: {} as Record<RuleCategory, number>,
    totalFiles: lintResult.totalFiles,
    totalViolations: lintResult.totalViolations,
    byRule: { ...lintResult.byRule },
  };

  for (const [cat, data] of Object.entries(scoreResult.categories)) {
    entry.categories[cat as RuleCategory] = data.score;
  }

  history.push(entry);
  writeFileSync(historyPath, JSON.stringify(history, null, 2) + '\n');
}
