import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { formatJson, formatSarif, formatText } from '../src/formatters.js';
import type { LintResult, RuleCategory } from '../src/lint-runner.js';
import type { ScoreResult } from '../src/score.js';

const _require = createRequire(import.meta.url);
const pkg = _require('../package.json') as { version: string };

function makeLintResult(overrides: Partial<LintResult> = {}): LintResult {
  return {
    results: [],
    totalFiles: 5,
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
    parseErrors: 0,
    ...overrides,
  };
}

function makeScoreResult(overrides: Partial<ScoreResult> = {}): ScoreResult {
  return {
    overall: 100,
    grade: 'pass',
    categories: {
      colors: { score: 100, violations: 0, weight: 20 },
      spacing: { score: 100, violations: 0, weight: 20 },
      typography: { score: 100, violations: 0, weight: 20 },
      responsive: { score: 100, violations: 0, weight: 20 },
      consistency: { score: 100, violations: 0, weight: 20 },
    },
    ...overrides,
  };
}

describe('formatJson', () => {
  it('produces valid JSON matching schema', () => {
    const output = formatJson(makeLintResult(), makeScoreResult(), '/project');
    const parsed = JSON.parse(output);

    expect(parsed.version).toBe(pkg.version);
    expect(parsed.timestamp).toBeDefined();
    expect(parsed.score.overall).toBe(100);
    expect(parsed.score.grade).toBe('pass');
    expect(parsed.score.categories).toBeDefined();
    expect(parsed.summary.totalFiles).toBe(5);
    expect(parsed.violations).toEqual([]);
  });

  it('includes violations in output', () => {
    const lintResult = makeLintResult({
      results: [
        {
          filePath: '/project/src/App.tsx',
          messages: [
            {
              ruleId: 'deslint/no-arbitrary-colors',
              severity: 2,
              message: 'Arbitrary color detected',
              line: 5,
              column: 10,
            },
          ],
        },
      ],
      totalViolations: 1,
      bySeverity: { errors: 1, warnings: 0 },
      byRule: { 'deslint/no-arbitrary-colors': 1 },
      byCategory: {
        colors: 1,
        spacing: 0,
        typography: 0,
        responsive: 0,
        consistency: 0,
      },
    });

    const output = formatJson(lintResult, makeScoreResult(), '/project');
    const parsed = JSON.parse(output);

    expect(parsed.violations).toHaveLength(1);
    expect(parsed.violations[0].file).toBe('src/App.tsx');
    expect(parsed.violations[0].severity).toBe('error');
    expect(parsed.violations[0].ruleId).toBe('deslint/no-arbitrary-colors');
    expect(parsed.violations[0].line).toBe(5);
    expect(parsed.violations[0].column).toBe(10);
  });

  it('includes all category scores', () => {
    const output = formatJson(makeLintResult(), makeScoreResult(), '/project');
    const parsed = JSON.parse(output);

    for (const cat of ['colors', 'spacing', 'typography', 'responsive', 'consistency']) {
      expect(parsed.score.categories[cat]).toBeDefined();
      expect(parsed.score.categories[cat].score).toBe(100);
      expect(parsed.score.categories[cat].violations).toBe(0);
    }
  });
});

describe('formatSarif', () => {
  it('produces valid SARIF 2.1.0 structure', () => {
    const output = formatSarif(makeLintResult(), makeScoreResult(), '/project');
    const parsed = JSON.parse(output);

    expect(parsed.version).toBe('2.1.0');
    expect(parsed.$schema).toContain('sarif-schema-2.1.0');
    expect(parsed.runs).toHaveLength(1);
    expect(parsed.runs[0].tool.driver.name).toBe('Deslint');
    expect(parsed.runs[0].results).toEqual([]);
  });

  it('includes violations as SARIF results', () => {
    const lintResult = makeLintResult({
      results: [
        {
          filePath: '/project/src/Card.tsx',
          messages: [
            {
              ruleId: 'deslint/no-arbitrary-spacing',
              severity: 1,
              message: 'Arbitrary spacing detected',
              line: 12,
              column: 5,
              endLine: 12,
              endColumn: 20,
            },
          ],
        },
      ],
      totalViolations: 1,
      byRule: { 'deslint/no-arbitrary-spacing': 1 },
    });

    const output = formatSarif(lintResult, makeScoreResult(), '/project');
    const parsed = JSON.parse(output);

    expect(parsed.runs[0].results).toHaveLength(1);
    const result = parsed.runs[0].results[0];
    expect(result.ruleId).toBe('deslint/no-arbitrary-spacing');
    expect(result.level).toBe('warning');
    expect(result.locations[0].physicalLocation.artifactLocation.uri).toBe('src/Card.tsx');
    expect(result.locations[0].physicalLocation.region.startLine).toBe(12);
    expect(result.locations[0].physicalLocation.region.endLine).toBe(12);
  });

  it('maps severity 2 to error level', () => {
    const lintResult = makeLintResult({
      results: [
        {
          filePath: '/project/src/App.tsx',
          messages: [
            {
              ruleId: 'deslint/no-arbitrary-colors',
              severity: 2,
              message: 'Error',
              line: 1,
              column: 1,
            },
          ],
        },
      ],
      byRule: { 'deslint/no-arbitrary-colors': 1 },
    });

    const output = formatSarif(lintResult, makeScoreResult(), '/project');
    const parsed = JSON.parse(output);
    expect(parsed.runs[0].results[0].level).toBe('error');
  });

  it('includes rule definitions in tool driver', () => {
    const lintResult = makeLintResult({
      byRule: {
        'deslint/no-arbitrary-colors': 3,
        'deslint/no-arbitrary-spacing': 2,
      },
    });

    const output = formatSarif(lintResult, makeScoreResult(), '/project');
    const parsed = JSON.parse(output);
    expect(parsed.runs[0].tool.driver.rules).toHaveLength(2);
  });
});

// ── Bug 2 regression: score must be "unavailable" when all violations are parse errors ──
// When every violation has ruleId === null (parse error), byCategory stays all-zero
// and calculateScore() returns 100. The formatter must detect this and suppress the
// bogus score, showing "unavailable" instead.

describe('formatText — parse error score suppression (Bug 2 regression)', () => {
  // Simulate the exact scenario from the bug: 24 files fail to parse,
  // 0 design-rule violations, so byCategory is all zeros.
  function makeAllParseErrorResult(): LintResult {
    return makeLintResult({
      totalFiles: 24,
      totalViolations: 23,
      bySeverity: { errors: 23, warnings: 0 },
      filesWithViolations: 23,
      parseErrors: 23,
      byRule: { unknown: 23 },
    });
  }

  it('renders "unavailable" instead of a numeric score when all violations are parse errors', () => {
    const lintResult = makeAllParseErrorResult();
    // calculateScore still returns 100 — that's what the fix must override in the formatter
    const scoreResult = makeScoreResult({ overall: 100 });
    const output = formatText(lintResult, scoreResult, '/project');

    expect(output).toContain('unavailable');
    expect(output).not.toContain('/100');
  });

  it('does not render category score bars when all violations are parse errors', () => {
    const lintResult = makeAllParseErrorResult();
    const scoreResult = makeScoreResult({ overall: 100 });
    const output = formatText(lintResult, scoreResult, '/project');

    // The category bars render "Colors", "Spacing", etc. — none should appear
    expect(output).not.toMatch(/Colors\s+█/);
    expect(output).not.toMatch(/Spacing\s+█/);
  });

  it('includes the parse error count in the unavailable message', () => {
    const lintResult = makeAllParseErrorResult();
    const scoreResult = makeScoreResult({ overall: 100 });
    const output = formatText(lintResult, scoreResult, '/project');

    expect(output).toContain('23');
  });

  it('still renders score bars normally when there are no parse errors', () => {
    const lintResult = makeLintResult({
      totalFiles: 5,
      totalViolations: 2,
      bySeverity: { errors: 2, warnings: 0 },
      filesWithViolations: 1,
      parseErrors: 0,
      byCategory: { colors: 2, spacing: 0, typography: 0, responsive: 0, consistency: 0 },
    });
    const scoreResult = makeScoreResult({ overall: 80 });
    const output = formatText(lintResult, scoreResult, '/project');

    expect(output).toContain('/100');
    expect(output).not.toContain('unavailable');
  });

  it('includes parseErrors in JSON output summary', () => {
    const lintResult = makeAllParseErrorResult();
    const scoreResult = makeScoreResult({ overall: 100 });
    const output = formatJson(lintResult, scoreResult, '/project');
    const parsed = JSON.parse(output);

    expect(parsed.summary.parseErrors).toBe(23);
  });
});
