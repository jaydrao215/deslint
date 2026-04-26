import { describe, expect, it } from 'vitest';
import { buildFixPlan } from '@deslint/shared';
import { buildHtml } from '../src/report-html/template.js';
import type { ReportData } from '../src/report-html/types.js';

function makeReportData(overrides: Partial<ReportData> = {}): ReportData {
  const byRule = {
    'deslint/no-arbitrary-spacing': 2,
    'deslint/form-labels': 1,
  };
  return {
    version: '0.0.0-test',
    timestamp: '2026-04-26T00:00:00.000Z',
    projectName: 'project',
    score: {
      overall: 88,
      grade: 'pass',
      categories: {
        colors: { score: 100, violations: 0, weight: 20 },
        spacing: { score: 80, violations: 2, weight: 20 },
        typography: { score: 100, violations: 0, weight: 20 },
        responsive: { score: 100, violations: 0, weight: 20 },
        consistency: { score: 90, violations: 1, weight: 20 },
      },
    },
    debt: {
      totalMinutes: 7,
      totalHours: 0.116,
      byCategory: {
        colors: 0,
        spacing: 4,
        typography: 0,
        responsive: 0,
        consistency: 3,
      },
      breakdown: [
        {
          ruleId: 'deslint/no-arbitrary-spacing',
          violations: 2,
          minutesPerViolation: 2,
          totalMinutes: 4,
        },
      ],
    },
    summary: {
      totalFiles: 3,
      filesWithViolations: 2,
      totalViolations: 3,
      errors: 0,
      warnings: 3,
    },
    ruleSummaries: [
      {
        ruleId: 'deslint/no-arbitrary-spacing',
        shortName: 'no-arbitrary-spacing',
        count: 2,
        category: 'Spacing',
        fixable: true,
        files: new Set(['src/App.tsx']),
      },
    ],
    fixPlan: buildFixPlan({
      totalViolations: 3,
      byRule,
    }),
    fileHotspots: [['src/App.tsx', 2]],
    violations: [],
    arbitraryColors: [],
    contrastViolations: [],
    history: [],
    ...overrides,
  };
}

describe('buildHtml — Fix Plan', () => {
  it('renders recommended next actions when the scan has work', () => {
    const html = buildHtml(makeReportData());

    expect(html).toContain('Recommended next actions');
    expect(html).toContain('Auto-fix now');
    expect(html).toContain('npx deslint fix --all');
    expect(html).toContain('Accessibility risks');
  });

  it('omits recommended next actions for clean scans', () => {
    const html = buildHtml(makeReportData({
      summary: {
        totalFiles: 3,
        filesWithViolations: 0,
        totalViolations: 0,
        errors: 0,
        warnings: 0,
      },
      ruleSummaries: [],
      fixPlan: buildFixPlan({ totalViolations: 0, byRule: {} }),
      fileHotspots: [],
      debt: {
        totalMinutes: 0,
        totalHours: 0,
        byCategory: {
          colors: 0,
          spacing: 0,
          typography: 0,
          responsive: 0,
          consistency: 0,
        },
        breakdown: [],
      },
    }));

    expect(html).not.toContain('Recommended next actions');
  });
});
