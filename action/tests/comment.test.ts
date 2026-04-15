import { describe, it, expect } from 'vitest';
import { formatComment } from '../src/comment.js';
import type { ScanResult } from '../src/scan.js';

function makeScanResult(overrides: Partial<ScanResult> = {}): ScanResult {
  return {
    score: 80,
    totalViolations: 5,
    errors: 1,
    warnings: 4,
    topViolations: [
      { ruleId: 'deslint/no-arbitrary-colors', count: 3, severity: 'warning' },
      { ruleId: 'deslint/no-inline-styles', count: 2, severity: 'error' },
    ],
    categories: [
      { name: 'colors', violations: 3, score: 85 },
      { name: 'spacing', violations: 0, score: 100 },
      { name: 'typography', violations: 0, score: 100 },
      { name: 'responsive', violations: 1, score: 95 },
      { name: 'consistency', violations: 1, score: 95 },
    ],
    filesScanned: 10,
    filesWithViolations: 3,
    debtMinutes: 0,
    ...overrides,
  };
}

describe('formatComment', () => {
  it('includes the Design Health Score', () => {
    const result = makeScanResult({ score: 85 });
    const comment = formatComment(result, 0);
    expect(comment).toContain('Design Health Score: 85/100');
  });

  it('includes score breakdown table', () => {
    const comment = formatComment(makeScanResult(), 0);
    expect(comment).toContain('Score Breakdown');
    expect(comment).toContain('Colors');
    expect(comment).toContain('Spacing');
    expect(comment).toContain('Typography');
    expect(comment).toContain('Responsive');
    expect(comment).toContain('Consistency');
  });

  it('includes top violations table', () => {
    const comment = formatComment(makeScanResult(), 0);
    expect(comment).toContain('Top Violations');
    expect(comment).toContain('no-arbitrary-colors');
    expect(comment).toContain('no-inline-styles');
  });

  it('includes summary metrics', () => {
    const comment = formatComment(makeScanResult(), 0);
    expect(comment).toContain('Files scanned | 10');
    expect(comment).toContain('Files with violations | 3');
    expect(comment).toContain('Total violations | 5');
    expect(comment).toContain('Errors | 1');
    expect(comment).toContain('Warnings | 4');
  });

  it('shows pass when score meets threshold', () => {
    const comment = formatComment(makeScanResult({ score: 80 }), 70);
    expect(comment).toContain('Passed');
    expect(comment).not.toContain('Failed');
  });

  it('shows fail when score below threshold', () => {
    const comment = formatComment(makeScanResult({ score: 50 }), 70);
    expect(comment).toContain('Failed');
  });

  it('omits threshold line when min-score is 0', () => {
    const comment = formatComment(makeScanResult(), 0);
    expect(comment).not.toContain('Minimum threshold');
  });

  it('shows celebration message when no violations', () => {
    const comment = formatComment(
      makeScanResult({
        totalViolations: 0,
        errors: 0,
        warnings: 0,
        topViolations: [],
        categories: [
          { name: 'colors', violations: 0, score: 100 },
          { name: 'spacing', violations: 0, score: 100 },
          { name: 'typography', violations: 0, score: 100 },
          { name: 'responsive', violations: 0, score: 100 },
          { name: 'consistency', violations: 0, score: 100 },
        ],
      }),
      0,
    );
    expect(comment).toContain('No design violations found');
  });

  it('uses green badge for score >= 90', () => {
    const comment = formatComment(makeScanResult({ score: 95 }), 0);
    expect(comment).toContain(':white_check_mark:');
  });

  it('uses orange badge for score 70-89', () => {
    const comment = formatComment(makeScanResult({ score: 75 }), 0);
    expect(comment).toContain(':large_orange_diamond:');
  });

  it('uses red badge for score < 70', () => {
    const comment = formatComment(makeScanResult({ score: 50 }), 0);
    expect(comment).toContain(':red_circle:');
  });

  it('includes Deslint branding', () => {
    const comment = formatComment(makeScanResult(), 0);
    expect(comment).toContain('Powered by');
    expect(comment).toContain('Deslint');
  });
});
