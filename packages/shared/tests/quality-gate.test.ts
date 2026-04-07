import { describe, it, expect } from 'vitest';
import { evaluateQualityGate, formatGateResult } from '../src/quality-gate.js';
import type { GateScanSnapshot } from '../src/quality-gate.js';
import type { QualityGate } from '../src/config-schema.js';

function snapshot(overrides: Partial<GateScanSnapshot> = {}): GateScanSnapshot {
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
    ...overrides,
  };
}

describe('evaluateQualityGate', () => {
  it('passes silently when no gate is configured', () => {
    const result = evaluateQualityGate(undefined, snapshot());
    expect(result.passed).toBe(true);
    expect(result.enforced).toBe(false);
    expect(result.conditionsChecked).toBe(0);
    expect(result.failures).toEqual([]);
  });

  it('passes when all conditions are met', () => {
    const gate: QualityGate = {
      enforce: true,
      minOverallScore: 80,
      maxViolations: 10,
    };
    const result = evaluateQualityGate(gate, snapshot({ overall: 85, totalViolations: 5 }));
    expect(result.passed).toBe(true);
    expect(result.enforced).toBe(true);
    expect(result.conditionsChecked).toBe(2);
  });

  it('fails when overall score is below minimum', () => {
    const gate: QualityGate = { enforce: false, minOverallScore: 80 };
    const result = evaluateQualityGate(gate, snapshot({ overall: 75 }));
    expect(result.passed).toBe(false);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0].condition).toBe('minOverallScore');
    expect(result.failures[0].actual).toBe(75);
    expect(result.failures[0].threshold).toBe(80);
  });

  it('fails per-category when below category threshold', () => {
    const gate: QualityGate = {
      enforce: false,
      minCategoryScores: { colors: 90, spacing: 50 },
    };
    const result = evaluateQualityGate(
      gate,
      snapshot({ categories: { colors: 60, spacing: 80, typography: 90, responsive: 90, consistency: 90 } }),
    );
    expect(result.passed).toBe(false);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0].category).toBe('colors');
  });

  it('fails when total violations exceed maximum', () => {
    const gate: QualityGate = { enforce: false, maxViolations: 5 };
    const result = evaluateQualityGate(gate, snapshot({ totalViolations: 12 }));
    expect(result.passed).toBe(false);
    expect(result.failures[0].condition).toBe('maxViolations');
  });

  it('fails when debt exceeds maximum', () => {
    const gate: QualityGate = { enforce: false, maxDebtMinutes: 60 };
    const result = evaluateQualityGate(gate, snapshot({ debtMinutes: 90 }));
    expect(result.passed).toBe(false);
    expect(result.failures[0].condition).toBe('maxDebtMinutes');
  });

  it('detects score regressions against previous snapshot', () => {
    const gate: QualityGate = { enforce: false, maxScoreRegression: 5 };
    const result = evaluateQualityGate(
      gate,
      snapshot({ overall: 80 }),
      snapshot({ overall: 95 }),
    );
    expect(result.passed).toBe(false);
    expect(result.failures[0].condition).toBe('maxScoreRegression');
    expect(result.failures[0].actual).toBe(15);
  });

  it('does not flag regressions within tolerance', () => {
    const gate: QualityGate = { enforce: false, maxScoreRegression: 5 };
    const result = evaluateQualityGate(
      gate,
      snapshot({ overall: 92 }),
      snapshot({ overall: 95 }),
    );
    expect(result.passed).toBe(true);
  });

  it('skips regression check when no previous snapshot', () => {
    const gate: QualityGate = { enforce: false, maxScoreRegression: 5 };
    const result = evaluateQualityGate(gate, snapshot({ overall: 80 }));
    expect(result.passed).toBe(true);
    expect(result.conditionsChecked).toBe(0);
  });

  it('reports multiple simultaneous failures', () => {
    const gate: QualityGate = {
      enforce: true,
      minOverallScore: 90,
      maxViolations: 5,
      maxDebtMinutes: 30,
    };
    const result = evaluateQualityGate(
      gate,
      snapshot({ overall: 70, totalViolations: 20, debtMinutes: 120 }),
    );
    expect(result.failures).toHaveLength(3);
    expect(result.passed).toBe(false);
    expect(result.enforced).toBe(true);
  });

  it('respects enforce flag in result', () => {
    const enforced = evaluateQualityGate(
      { enforce: true, minOverallScore: 90 },
      snapshot({ overall: 80 }),
    );
    const warnOnly = evaluateQualityGate(
      { enforce: false, minOverallScore: 90 },
      snapshot({ overall: 80 }),
    );
    expect(enforced.enforced).toBe(true);
    expect(warnOnly.enforced).toBe(false);
    // Both fail evaluation; only `enforced` flag differs.
    expect(enforced.passed).toBe(false);
    expect(warnOnly.passed).toBe(false);
  });
});

describe('formatGateResult', () => {
  it('reports not configured when no conditions checked', () => {
    const result = evaluateQualityGate(undefined, snapshot());
    expect(formatGateResult(result)).toBe('Quality gate: not configured');
  });

  it('reports passed status', () => {
    const result = evaluateQualityGate({ minOverallScore: 80 }, snapshot({ overall: 90 }));
    expect(formatGateResult(result)).toContain('PASSED');
    expect(formatGateResult(result)).toContain('1 condition checked');
  });

  it('reports failure messages and warn-only hint', () => {
    const result = evaluateQualityGate(
      { enforce: false, minOverallScore: 90 },
      snapshot({ overall: 70 }),
    );
    const text = formatGateResult(result);
    expect(text).toContain('FAILED');
    expect(text).toContain('Overall score 70 is below minimum 90');
    expect(text).toContain('warn-only mode');
  });

  it('omits warn-only hint when enforced', () => {
    const result = evaluateQualityGate(
      { enforce: true, minOverallScore: 90 },
      snapshot({ overall: 70 }),
    );
    expect(formatGateResult(result)).not.toContain('warn-only');
  });
});
