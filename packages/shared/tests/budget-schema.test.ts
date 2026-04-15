import { describe, it, expect } from 'vitest';
import {
  BudgetSchema,
  parseBudget,
  safeParseBudget,
  normalizeBudgetRuleKeys,
} from '../src/budget-schema.js';

describe('BudgetSchema', () => {
  it('accepts a minimal empty budget and defaults enforce to false', () => {
    const b = parseBudget({});
    expect(b.enforce).toBe(false);
  });

  it('accepts a fully-populated budget', () => {
    const b = parseBudget({
      enforce: true,
      maxViolations: 100,
      maxRuleViolations: { 'deslint/no-arbitrary-colors': 5 },
      maxDebtMinutes: 120,
      minOverallScore: 80,
      minCategoryScores: { colors: 70, spacing: 75 },
      maxScoreRegression: 5,
      maxCategoryRegression: { colors: 3 },
      maxNewRuleViolations: { 'deslint/no-arbitrary-spacing': 0 },
    });
    expect(b.enforce).toBe(true);
    expect(b.maxViolations).toBe(100);
    expect(b.maxRuleViolations?.['deslint/no-arbitrary-colors']).toBe(5);
  });

  it('rejects unknown top-level fields (strict mode)', () => {
    const result = safeParseBudget({ unknownField: 1 });
    expect(result.success).toBe(false);
  });

  it('rejects out-of-range scores', () => {
    expect(safeParseBudget({ minOverallScore: 101 }).success).toBe(false);
    expect(safeParseBudget({ minOverallScore: -1 }).success).toBe(false);
    expect(safeParseBudget({ maxScoreRegression: 120 }).success).toBe(false);
  });

  it('rejects non-integer violation caps', () => {
    expect(safeParseBudget({ maxViolations: 3.5 }).success).toBe(false);
  });

  it('rejects unknown category keys in minCategoryScores', () => {
    expect(safeParseBudget({ minCategoryScores: { bogus: 50 } }).success).toBe(false);
  });
});

describe('normalizeBudgetRuleKeys', () => {
  it('upgrades short-form rule ids to fully-qualified form', () => {
    const b = parseBudget({
      maxRuleViolations: { 'no-arbitrary-colors': 3 },
      maxNewRuleViolations: { 'no-arbitrary-spacing': 0 },
    });
    const n = normalizeBudgetRuleKeys(b);
    expect(n.maxRuleViolations).toEqual({ 'deslint/no-arbitrary-colors': 3 });
    expect(n.maxNewRuleViolations).toEqual({ 'deslint/no-arbitrary-spacing': 0 });
  });

  it('leaves already-qualified rule ids untouched', () => {
    const b = parseBudget({
      maxRuleViolations: { 'deslint/image-alt-text': 1 },
    });
    const n = normalizeBudgetRuleKeys(b);
    expect(n.maxRuleViolations).toEqual({ 'deslint/image-alt-text': 1 });
  });

  it('does not mutate the input budget', () => {
    const b = parseBudget({ maxRuleViolations: { 'no-arbitrary-colors': 3 } });
    const before = JSON.stringify(b);
    normalizeBudgetRuleKeys(b);
    expect(JSON.stringify(b)).toBe(before);
  });

  it('is a no-op when maxRuleViolations/maxNewRuleViolations are absent', () => {
    const b = parseBudget({});
    const n = normalizeBudgetRuleKeys(b);
    expect(n.maxRuleViolations).toBeUndefined();
    expect(n.maxNewRuleViolations).toBeUndefined();
  });
});

describe('safeParseBudget', () => {
  it('returns success=false on invalid input without throwing', () => {
    const result = safeParseBudget(null);
    expect(result.success).toBe(false);
  });

  it('returns success=true with parsed data on valid input', () => {
    const result = safeParseBudget({ maxViolations: 10 });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.maxViolations).toBe(10);
  });
});

describe('BudgetSchema export', () => {
  it('is a zod schema (has parse method)', () => {
    expect(typeof BudgetSchema.parse).toBe('function');
  });
});
