import { describe, it, expect } from 'vitest';
import { evaluateCompliance, WCAG_CRITERIA, formatComplianceSummary } from '../src/compliance.js';

describe('evaluateCompliance', () => {
  it('returns full pass when no mapped rule has violations', () => {
    const result = evaluateCompliance({ byRule: {} });
    expect(result.summary.passed).toBe(WCAG_CRITERIA.length);
    expect(result.summary.failed).toBe(0);
    expect(result.totalViolations).toBe(0);
    expect(result.passRatePercent).toBe(100);
    expect(result.levelReached).toBe('AA'); // highest level where all pass
  });

  it('marks a criterion as failing when its mapped rule has violations', () => {
    const result = evaluateCompliance({
      byRule: { 'vizlint/a11y-color-contrast': 3 },
    });
    const contrast = result.criteria.find((c) => c.criterion.id === '1.4.3');
    expect(contrast?.status).toBe('fail');
    expect(contrast?.violations).toBe(3);
    expect(result.summary.failed).toBeGreaterThan(0);
  });

  it('downgrades level reached when a failing criterion drops conformance', () => {
    // A-level criterion failing — cannot claim any level.
    const result = evaluateCompliance({
      byRule: { 'vizlint/image-alt-text': 1 },
    });
    expect(result.levelReached).toBe('none');
  });

  it('still reaches Level A when only an AA criterion fails', () => {
    const result = evaluateCompliance({
      byRule: { 'vizlint/responsive-required': 1 }, // 1.4.10 is AA
    });
    expect(result.levelReached).toBe('A');
  });

  it('counts affected files when filesByRule is provided', () => {
    const result = evaluateCompliance({
      byRule: { 'vizlint/a11y-color-contrast': 5 },
      filesByRule: { 'vizlint/a11y-color-contrast': 2 },
    });
    const contrast = result.criteria.find((c) => c.criterion.id === '1.4.3');
    expect(contrast?.filesAffected).toBe(2);
  });

  it('marks criteria as not-evaluated when none of their rules are enabled', () => {
    const result = evaluateCompliance({
      byRule: {},
      enabledRules: new Set(['vizlint/no-arbitrary-colors']),
    });
    // None of the WCAG-mapped rules are in the enabled set, so every
    // criterion is not-evaluated.
    expect(result.summary.notEvaluated).toBe(WCAG_CRITERIA.length);
    expect(result.summary.passed).toBe(0);
    expect(result.levelReached).toBe('none');
  });

  it('coverage percent reflects evaluated / total', () => {
    const result = evaluateCompliance({ byRule: {} });
    expect(result.coveragePercent).toBe(100);
  });

  it('sums total violations across all mapped rules', () => {
    const result = evaluateCompliance({
      byRule: {
        'vizlint/a11y-color-contrast': 4,
        'vizlint/image-alt-text': 2,
        'vizlint/responsive-required': 1,
        'vizlint/no-arbitrary-colors': 99, // not WCAG-mapped, should be ignored
      },
    });
    expect(result.totalViolations).toBe(7);
  });
});

describe('formatComplianceSummary', () => {
  it('reports Level AA when fully clean', () => {
    const result = evaluateCompliance({ byRule: {} });
    const text = formatComplianceSummary(result);
    expect(text).toContain('Level AA');
    expect(text).toContain('Passing:');
  });

  it('reports Not Met when any A criterion fails', () => {
    const result = evaluateCompliance({
      byRule: { 'vizlint/image-alt-text': 1 },
    });
    const text = formatComplianceSummary(result);
    expect(text).toContain('Not Met');
  });
});
