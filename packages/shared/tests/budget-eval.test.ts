import { describe, it, expect } from 'vitest';
import { evaluateBudget, formatBudgetResult } from '../src/budget-eval.js';
import type { BudgetScanSnapshot } from '../src/budget-eval.js';
import type { Budget } from '../src/budget-schema.js';

function snap(overrides: Partial<BudgetScanSnapshot> = {}): BudgetScanSnapshot {
  return {
    overall: 90,
    categories: {
      colors: 90,
      spacing: 90,
      typography: 90,
      responsive: 90,
      consistency: 90,
    },
    totalViolations: 0,
    debtMinutes: 0,
    byRule: {},
    ...overrides,
  };
}

describe('evaluateBudget', () => {
  it('passes silently when no budget is configured', () => {
    const result = evaluateBudget(undefined, snap());
    expect(result.passed).toBe(true);
    expect(result.enforced).toBe(false);
    expect(result.conditionsChecked).toBe(0);
    expect(result.breaches).toEqual([]);
  });

  it('passes when every configured condition is met', () => {
    const budget: Budget = {
      enforce: true,
      maxViolations: 10,
      minOverallScore: 80,
    };
    const result = evaluateBudget(budget, snap({ overall: 85, totalViolations: 5 }));
    expect(result.passed).toBe(true);
    expect(result.enforced).toBe(true);
    expect(result.conditionsChecked).toBe(2);
  });

  it('reuses quality-gate checks for overlapping fields', () => {
    const budget: Budget = {
      enforce: false,
      minOverallScore: 80,
      maxDebtMinutes: 60,
      maxViolations: 5,
    };
    const result = evaluateBudget(
      budget,
      snap({ overall: 70, debtMinutes: 100, totalViolations: 10 }),
    );
    expect(result.passed).toBe(false);
    const conditions = result.breaches.map((b) => b.condition).sort();
    expect(conditions).toEqual(['maxDebtMinutes', 'maxViolations', 'minOverallScore']);
  });

  it('fails on per-rule absolute cap', () => {
    const budget: Budget = {
      enforce: false,
      maxRuleViolations: { 'deslint/no-arbitrary-colors': 2 },
    };
    const result = evaluateBudget(
      budget,
      snap({ byRule: { 'deslint/no-arbitrary-colors': 5 } }),
    );
    expect(result.passed).toBe(false);
    expect(result.breaches).toHaveLength(1);
    expect(result.breaches[0].condition).toBe('maxRuleViolations');
    expect(result.breaches[0].ruleId).toBe('deslint/no-arbitrary-colors');
    expect(result.breaches[0].actual).toBe(5);
    expect(result.breaches[0].threshold).toBe(2);
  });

  it('passes when rule-cap rule is absent from current scan', () => {
    const budget: Budget = {
      enforce: false,
      maxRuleViolations: { 'deslint/no-arbitrary-colors': 2 },
    };
    const result = evaluateBudget(budget, snap({ byRule: {} }));
    expect(result.passed).toBe(true);
    expect(result.conditionsChecked).toBe(1);
  });

  it('fails on per-rule new-violations cap vs previous', () => {
    const budget: Budget = {
      enforce: true,
      maxNewRuleViolations: { 'deslint/no-arbitrary-colors': 0 },
    };
    const prev = snap({ byRule: { 'deslint/no-arbitrary-colors': 3 } });
    const curr = snap({ byRule: { 'deslint/no-arbitrary-colors': 5 } });
    const result = evaluateBudget(budget, curr, prev);
    expect(result.passed).toBe(false);
    expect(result.breaches[0].condition).toBe('maxNewRuleViolations');
    expect(result.breaches[0].actual).toBe(2);
  });

  it('does not count removed violations as negative "added"', () => {
    const budget: Budget = {
      enforce: false,
      maxNewRuleViolations: { 'deslint/no-arbitrary-colors': 0 },
    };
    const prev = snap({ byRule: { 'deslint/no-arbitrary-colors': 5 } });
    const curr = snap({ byRule: { 'deslint/no-arbitrary-colors': 2 } });
    const result = evaluateBudget(budget, curr, prev);
    expect(result.passed).toBe(true);
  });

  it('skips maxNewRuleViolations when no previous snapshot is provided', () => {
    const budget: Budget = {
      enforce: false,
      maxNewRuleViolations: { 'deslint/no-arbitrary-colors': 0 },
    };
    const result = evaluateBudget(budget, snap({ byRule: { 'deslint/no-arbitrary-colors': 99 } }));
    expect(result.passed).toBe(true);
    expect(result.conditionsChecked).toBe(0);
  });

  it('fails on per-category regression cap', () => {
    const budget: Budget = {
      enforce: false,
      maxCategoryRegression: { colors: 3 },
    };
    const prev = snap({
      categories: { colors: 90, spacing: 90, typography: 90, responsive: 90, consistency: 90 },
    });
    const curr = snap({
      categories: { colors: 80, spacing: 90, typography: 90, responsive: 90, consistency: 90 },
    });
    const result = evaluateBudget(budget, curr, prev);
    expect(result.passed).toBe(false);
    expect(result.breaches[0].condition).toBe('maxCategoryRegression');
    expect(result.breaches[0].category).toBe('colors');
    expect(result.breaches[0].actual).toBe(10);
  });

  it('skips maxCategoryRegression when no previous snapshot is provided', () => {
    const budget: Budget = {
      enforce: false,
      maxCategoryRegression: { colors: 3 },
    };
    const result = evaluateBudget(budget, snap());
    expect(result.passed).toBe(true);
    expect(result.conditionsChecked).toBe(0);
  });

  it('enforced reflects budget.enforce flag', () => {
    const warnOnly = evaluateBudget({ enforce: false, maxViolations: 0 }, snap({ totalViolations: 5 }));
    expect(warnOnly.passed).toBe(false);
    expect(warnOnly.enforced).toBe(false);

    const strict = evaluateBudget({ enforce: true, maxViolations: 0 }, snap({ totalViolations: 5 }));
    expect(strict.passed).toBe(false);
    expect(strict.enforced).toBe(true);
  });

  it('is idempotent for the same inputs', () => {
    const budget: Budget = { enforce: false, maxViolations: 10, minOverallScore: 80 };
    const s = snap({ overall: 85, totalViolations: 5 });
    expect(evaluateBudget(budget, s)).toEqual(evaluateBudget(budget, s));
  });
});

describe('formatBudgetResult', () => {
  it('prints "not configured" for an empty budget', () => {
    const out = formatBudgetResult(
      evaluateBudget({ enforce: false }, snap()),
    );
    expect(out).toMatch(/not configured/);
  });

  it('prints PASSED summary when all conditions pass', () => {
    const out = formatBudgetResult(
      evaluateBudget({ enforce: false, maxViolations: 10 }, snap({ totalViolations: 0 })),
    );
    expect(out).toMatch(/PASSED/);
    expect(out).toMatch(/1 condition/);
  });

  it('prints FAILED summary with breach messages when conditions fail', () => {
    const out = formatBudgetResult(
      evaluateBudget({ enforce: false, maxViolations: 0 }, snap({ totalViolations: 5 })),
    );
    expect(out).toMatch(/FAILED/);
    expect(out).toMatch(/warn-only/);
  });

  it('does not print warn-only footer when enforced', () => {
    const out = formatBudgetResult(
      evaluateBudget({ enforce: true, maxViolations: 0 }, snap({ totalViolations: 5 })),
    );
    expect(out).toMatch(/FAILED/);
    expect(out).not.toMatch(/warn-only/);
  });
});
