import { describe, it, expect } from 'vitest';
import {
  evaluateCompliance,
  WCAG_CRITERIA,
  WCAG_21_CRITERIA_IDS,
  formatComplianceSummary,
} from '../src/compliance.js';

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
      byRule: { 'deslint/a11y-color-contrast': 3 },
    });
    const contrast = result.criteria.find((c) => c.criterion.id === '1.4.3');
    expect(contrast?.status).toBe('fail');
    expect(contrast?.violations).toBe(3);
    expect(result.summary.failed).toBeGreaterThan(0);
  });

  it('downgrades level reached when a failing criterion drops conformance', () => {
    // A-level criterion failing — cannot claim any level.
    const result = evaluateCompliance({
      byRule: { 'deslint/image-alt-text': 1 },
    });
    expect(result.levelReached).toBe('none');
  });

  it('still reaches Level A when only an AA criterion fails', () => {
    const result = evaluateCompliance({
      byRule: { 'deslint/responsive-required': 1 }, // 1.4.10 is AA
    });
    expect(result.levelReached).toBe('A');
  });

  it('counts affected files when filesByRule is provided', () => {
    const result = evaluateCompliance({
      byRule: { 'deslint/a11y-color-contrast': 5 },
      filesByRule: { 'deslint/a11y-color-contrast': 2 },
    });
    const contrast = result.criteria.find((c) => c.criterion.id === '1.4.3');
    expect(contrast?.filesAffected).toBe(2);
  });

  it('marks criteria as not-evaluated when none of their rules are enabled', () => {
    const result = evaluateCompliance({
      byRule: {},
      enabledRules: new Set(['deslint/no-arbitrary-colors']),
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
        'deslint/a11y-color-contrast': 4,
        'deslint/image-alt-text': 2,
        'deslint/responsive-required': 1,
        'deslint/no-arbitrary-colors': 99, // not WCAG-mapped, should be ignored
      },
    });
    expect(result.totalViolations).toBe(7);
  });
});

describe('evaluateCompliance byLevel', () => {
  it('includes one entry per level with at least one mapped criterion', () => {
    const result = evaluateCompliance({ byRule: {} });
    const levels = result.byLevel.map((l) => l.level);
    // Our current map has Level A and Level AA criteria only — no AAA.
    expect(levels).toContain('A');
    expect(levels).toContain('AA');
    expect(levels).not.toContain('AAA');
  });

  it('marks both levels conformant when nothing fails', () => {
    const result = evaluateCompliance({ byRule: {} });
    for (const lvl of result.byLevel) {
      expect(lvl.conformant).toBe(true);
      expect(lvl.failed).toBe(0);
      expect(lvl.passed).toBe(lvl.evaluated);
    }
  });

  it('Level A stays conformant when only an AA criterion fails', () => {
    const result = evaluateCompliance({
      // 1.4.10 Reflow is AA
      byRule: { 'deslint/responsive-required': 1 },
    });
    const a = result.byLevel.find((l) => l.level === 'A');
    const aa = result.byLevel.find((l) => l.level === 'AA');
    expect(a?.conformant).toBe(true);
    expect(aa?.conformant).toBe(false);
    expect(aa?.failed).toBe(1);
  });

  it('both levels non-conformant when an A criterion fails', () => {
    const result = evaluateCompliance({
      byRule: { 'deslint/image-alt-text': 1 },
    });
    const a = result.byLevel.find((l) => l.level === 'A');
    const aa = result.byLevel.find((l) => l.level === 'AA');
    // A itself fails, AA uses at-or-below, so both are non-conformant.
    expect(a?.conformant).toBe(false);
    expect(aa?.conformant).toBe(false);
  });

  it('per-level counts sum to overall summary', () => {
    const result = evaluateCompliance({
      byRule: {
        'deslint/image-alt-text': 1, // 1.1.1 A — fail
        'deslint/responsive-required': 1, // 1.4.10 AA — fail
      },
    });
    const totalFromLevels = result.byLevel.reduce((s, l) => s + l.total, 0);
    const passedFromLevels = result.byLevel.reduce((s, l) => s + l.passed, 0);
    const failedFromLevels = result.byLevel.reduce((s, l) => s + l.failed, 0);
    expect(totalFromLevels).toBe(WCAG_CRITERIA.length);
    expect(passedFromLevels).toBe(result.summary.passed);
    expect(failedFromLevels).toBe(result.summary.failed);
  });
});

describe('evaluateCompliance wcag21 equivalence', () => {
  it('includes every currently-mapped criterion in the 2.1 subset', () => {
    // Sanity check that we haven't added a 2.2-only criterion without
    // updating WCAG_21_CRITERIA_IDS — that would silently break the
    // ADA Title II equivalence claim.
    const unknown = WCAG_CRITERIA.filter((c) => !WCAG_21_CRITERIA_IDS.has(c.id));
    expect(unknown).toEqual([]);
  });

  it('reaches AA on the 2.1 subset when nothing fails', () => {
    const result = evaluateCompliance({ byRule: {} });
    expect(result.wcag21.levelReached).toBe('AA');
    expect(result.wcag21.failed).toBe(0);
    expect(result.wcag21.totalMapped).toBe(WCAG_CRITERIA.length);
  });

  it('drops to Level A when only an AA criterion fails', () => {
    const result = evaluateCompliance({
      byRule: { 'deslint/responsive-required': 1 },
    });
    expect(result.wcag21.levelReached).toBe('A');
    expect(result.wcag21.failed).toBe(1);
  });

  it('drops to none when an A criterion fails', () => {
    const result = evaluateCompliance({
      byRule: { 'deslint/image-alt-text': 1 },
    });
    expect(result.wcag21.levelReached).toBe('none');
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
      byRule: { 'deslint/image-alt-text': 1 },
    });
    const text = formatComplianceSummary(result);
    expect(text).toContain('Not Met');
  });
});
