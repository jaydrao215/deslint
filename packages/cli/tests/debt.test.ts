import { describe, it, expect } from 'vitest';
import { calculateDebt, formatDebt, RULE_EFFORT_MINUTES } from '../src/debt.js';
import type { LintResult } from '../src/lint-runner.js';

function makeLintResult(byRule: Record<string, number> = {}): LintResult {
  const totalViolations = Object.values(byRule).reduce((s, n) => s + n, 0);
  return {
    results: [],
    totalFiles: 10,
    totalViolations,
    bySeverity: { errors: 0, warnings: totalViolations },
    byRule,
    byCategory: {
      colors: 0,
      spacing: 0,
      typography: 0,
      responsive: 0,
      consistency: 0,
    },
    filesWithViolations: 0,
  };
}

describe('calculateDebt', () => {
  it('returns zero debt for a clean project', () => {
    const debt = calculateDebt(makeLintResult({}));
    expect(debt.totalMinutes).toBe(0);
    expect(debt.totalHours).toBe(0);
    expect(debt.breakdown).toEqual([]);
  });

  it('estimates effort using per-rule minute calibration', () => {
    const debt = calculateDebt(
      makeLintResult({
        'deslint/no-arbitrary-spacing': 10, // 10 * 2 = 20m
        'deslint/responsive-required': 3,   // 3 * 10 = 30m
      }),
    );
    expect(debt.totalMinutes).toBe(50);
    expect(debt.totalHours).toBe(0.8);
  });

  it('groups debt by score category', () => {
    const debt = calculateDebt(
      makeLintResult({
        'deslint/no-arbitrary-colors': 5,    // colors: 5*2 = 10
        'deslint/no-arbitrary-spacing': 10,  // spacing: 10*2 = 20
        'deslint/no-inline-styles': 4,       // consistency: 4*5 = 20
      }),
    );
    expect(debt.byCategory.colors).toBe(10);
    expect(debt.byCategory.spacing).toBe(20);
    expect(debt.byCategory.consistency).toBe(20);
    expect(debt.byCategory.typography).toBe(0);
    expect(debt.byCategory.responsive).toBe(0);
  });

  it('sorts breakdown by total effort descending', () => {
    const debt = calculateDebt(
      makeLintResult({
        'deslint/no-arbitrary-spacing': 10, // 20m
        'deslint/max-component-lines': 2,   // 60m
        'deslint/no-arbitrary-colors': 5,   // 10m
      }),
    );
    expect(debt.breakdown[0].ruleId).toBe('deslint/max-component-lines');
    expect(debt.breakdown[0].totalMinutes).toBe(60);
    expect(debt.breakdown[1].ruleId).toBe('deslint/no-arbitrary-spacing');
    expect(debt.breakdown[2].ruleId).toBe('deslint/no-arbitrary-colors');
  });

  it('skips rules with zero violations', () => {
    const debt = calculateDebt(
      makeLintResult({
        'deslint/no-arbitrary-spacing': 5,
        'deslint/no-arbitrary-colors': 0,
      }),
    );
    expect(debt.breakdown).toHaveLength(1);
    expect(debt.breakdown[0].ruleId).toBe('deslint/no-arbitrary-spacing');
  });

  it('uses default effort for unknown rule ids', () => {
    const debt = calculateDebt(makeLintResult({ 'deslint/custom-rule': 4 }));
    // Default is 3 minutes
    expect(debt.totalMinutes).toBe(12);
    expect(debt.breakdown[0].minutesPerViolation).toBe(3);
  });

  it('rounds totalHours to one decimal', () => {
    const debt = calculateDebt(
      makeLintResult({ 'deslint/no-arbitrary-spacing': 31 }), // 62m = 1.0333h
    );
    expect(debt.totalHours).toBe(1);
  });

  it('exposes calibration table for inspection', () => {
    expect(RULE_EFFORT_MINUTES['deslint/no-arbitrary-spacing']).toBe(2);
    expect(RULE_EFFORT_MINUTES['deslint/responsive-required']).toBe(10);
    expect(RULE_EFFORT_MINUTES['deslint/max-component-lines']).toBe(30);
  });
});

describe('formatDebt', () => {
  it('returns 0m for zero or negative input', () => {
    expect(formatDebt(0)).toBe('0m');
    expect(formatDebt(-5)).toBe('0m');
  });

  it('formats minutes under an hour as Xm', () => {
    expect(formatDebt(45)).toBe('45m');
    expect(formatDebt(59)).toBe('59m');
  });

  it('formats hours and minutes', () => {
    expect(formatDebt(60)).toBe('1h');
    expect(formatDebt(90)).toBe('1h 30m');
    expect(formatDebt(125)).toBe('2h 5m');
  });

  it('formats large debt as days with hours', () => {
    expect(formatDebt(480)).toBe('1d (8h)');
    expect(formatDebt(2400)).toBe('5d (40h)');
  });
});
