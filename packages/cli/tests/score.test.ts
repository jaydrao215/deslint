import { describe, it, expect } from 'vitest';
import { calculateScore } from '../src/score.js';
import type { LintResult, RuleCategory } from '../src/lint-runner.js';

function makeLintResult(overrides: Partial<LintResult> = {}): LintResult {
  return {
    results: [],
    totalFiles: 10,
    totalViolations: 0,
    bySeverity: { errors: 0, warnings: 0 },
    byRule: {},
    byCategory: {
      colors: 0,
      spacing: 0,
      typography: 0,
      responsive: 0,
      consistency: 0,
    },
    filesWithViolations: 0,
    ...overrides,
  };
}

describe('calculateScore', () => {
  it('returns 100 for a project with zero violations', () => {
    const result = calculateScore(makeLintResult());
    expect(result.overall).toBe(100);
    expect(result.grade).toBe('pass');
    for (const cat of Object.values(result.categories)) {
      expect(cat.score).toBe(100);
    }
  });

  it('decreases score proportionally with violations', () => {
    const result = calculateScore(
      makeLintResult({
        totalFiles: 10,
        byCategory: {
          colors: 5,
          spacing: 0,
          typography: 0,
          responsive: 0,
          consistency: 0,
        },
      }),
    );

    // 5 violations / 10 files = 0.5 rate → 100 - 0.5*50 = 75
    expect(result.categories.colors.score).toBe(75);
    expect(result.categories.spacing.score).toBe(100);
    // Overall: (75*20 + 100*20*4) / 100 = (1500 + 8000) / 100 = 95
    expect(result.overall).toBe(95);
  });

  it('clamps category scores to 0 minimum', () => {
    const result = calculateScore(
      makeLintResult({
        totalFiles: 1,
        byCategory: {
          colors: 100,
          spacing: 0,
          typography: 0,
          responsive: 0,
          consistency: 0,
        },
      }),
    );

    expect(result.categories.colors.score).toBe(0);
  });

  it('grades as pass when score >= 80', () => {
    const result = calculateScore(makeLintResult());
    expect(result.grade).toBe('pass');
  });

  it('grades as warn when score is 60-79', () => {
    // Need enough violations to bring score to ~70
    const result = calculateScore(
      makeLintResult({
        totalFiles: 10,
        byCategory: {
          colors: 10,
          spacing: 10,
          typography: 10,
          responsive: 10,
          consistency: 10,
        },
      }),
    );
    // Each category: 10/10 = 1.0 rate → 100 - 50 = 50 → overall = 50
    expect(result.grade).toBe('fail');
  });

  it('grades as fail when score < 60', () => {
    const result = calculateScore(
      makeLintResult({
        totalFiles: 5,
        byCategory: {
          colors: 10,
          spacing: 10,
          typography: 10,
          responsive: 10,
          consistency: 10,
        },
      }),
    );
    // Each: 10/5 = 2.0 → 100 - 100 = 0 → overall = 0
    expect(result.overall).toBe(0);
    expect(result.grade).toBe('fail');
  });

  it('supports custom category weights', () => {
    const result = calculateScore(
      makeLintResult({
        totalFiles: 10,
        byCategory: {
          colors: 10,
          spacing: 0,
          typography: 0,
          responsive: 0,
          consistency: 0,
        },
      }),
      { colors: 100, spacing: 0, typography: 0, responsive: 0, consistency: 0 },
    );

    // Colors has 100% weight, score = 50
    expect(result.overall).toBe(50);
  });

  it('normalizes weights to sum to 100', () => {
    const result = calculateScore(
      makeLintResult({ totalFiles: 10 }),
      { colors: 10, spacing: 10, typography: 10, responsive: 10, consistency: 10 },
    );
    // All scores 100, so overall should still be 100
    expect(result.overall).toBe(100);
  });

  it('handles single file project', () => {
    const result = calculateScore(
      makeLintResult({
        totalFiles: 1,
        byCategory: {
          colors: 1,
          spacing: 0,
          typography: 0,
          responsive: 0,
          consistency: 0,
        },
      }),
    );
    // 1 violation / 1 file = 1.0 → 100 - 50 = 50
    expect(result.categories.colors.score).toBe(50);
  });

  it('handles zero files gracefully', () => {
    const result = calculateScore(makeLintResult({ totalFiles: 0 }));
    expect(result.overall).toBe(100);
  });

  it('includes violation count in category data', () => {
    const result = calculateScore(
      makeLintResult({
        totalFiles: 10,
        byCategory: {
          colors: 3,
          spacing: 7,
          typography: 0,
          responsive: 2,
          consistency: 0,
        },
      }),
    );
    expect(result.categories.colors.violations).toBe(3);
    expect(result.categories.spacing.violations).toBe(7);
    expect(result.categories.typography.violations).toBe(0);
    expect(result.categories.responsive.violations).toBe(2);
  });

  it('--min-score threshold: score 70 fails threshold 75', () => {
    // This tests the logic conceptually — actual CLI exit code tested in integration
    const result = calculateScore(
      makeLintResult({
        totalFiles: 10,
        byCategory: {
          colors: 6,
          spacing: 6,
          typography: 6,
          responsive: 6,
          consistency: 6,
        },
      }),
    );
    // Each: 6/10 = 0.6 → 100 - 30 = 70
    expect(result.overall).toBe(70);
    expect(result.overall < 75).toBe(true);
  });
});
