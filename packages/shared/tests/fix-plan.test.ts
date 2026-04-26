import { describe, expect, it } from 'vitest';
import { buildFixPlan } from '../src/fix-plan.js';

describe('buildFixPlan', () => {
  it('returns no work for clean scans', () => {
    const plan = buildFixPlan({
      totalViolations: 0,
      byRule: {},
    });

    expect(plan.hasWork).toBe(false);
    expect(plan.recommendedCommands).toEqual([]);
  });

  it('does not suggest design fixes for parse-only scans', () => {
    const plan = buildFixPlan({
      totalViolations: 3,
      parseErrors: 3,
      byRule: { unknown: 3 },
    });

    expect(plan.hasWork).toBe(true);
    expect(plan.parseOnly).toBe(true);
    expect(plan.autoFixable.count).toBe(0);
    expect(plan.topDebt).toEqual([]);
  });

  it('counts concrete ESLint fixes when messages include fix objects', () => {
    const plan = buildFixPlan({
      totalViolations: 3,
      byRule: {
        'deslint/no-arbitrary-spacing': 2,
        'deslint/a11y-color-contrast': 1,
      },
      messages: [
        {
          ruleId: 'deslint/no-arbitrary-spacing',
          severity: 1,
          message: 'Arbitrary spacing `p-[13px]` detected. Suggested: `p-3`',
          fix: { range: [0, 1], text: 'p-3' },
        },
        {
          ruleId: 'deslint/no-arbitrary-spacing',
          severity: 1,
          message: 'Arbitrary spacing `mt-[17px]` detected.',
        },
        {
          ruleId: 'deslint/a11y-color-contrast',
          severity: 1,
          message: 'Contrast ratio 2.1:1 fails WCAG AA.',
        },
      ],
    });

    expect(plan.autoFixable.count).toBe(1);
    expect(plan.autoFixable.command).toBe('npx deslint fix --all');
    expect(plan.tokenDecisions.count).toBe(1);
    expect(plan.accessibility.count).toBe(1);
    expect(plan.recommendedCommands).toEqual([
      'npx deslint fix --all',
      'npx deslint suggest-tokens .',
      'npx deslint compliance',
    ]);
  });

  it('falls back to known fixable rules for summary-only callers', () => {
    const plan = buildFixPlan({
      totalViolations: 5,
      byRule: {
        'deslint/no-arbitrary-colors': 2,
        'deslint/form-labels': 3,
      },
    });

    expect(plan.autoFixable.count).toBe(2);
    expect(plan.accessibility.count).toBe(3);
  });

  it('groups repeated token decision values', () => {
    const plan = buildFixPlan({
      totalViolations: 3,
      byRule: { 'deslint/no-arbitrary-spacing': 3 },
      messages: [
        { ruleId: 'deslint/no-arbitrary-spacing', severity: 1, message: 'Arbitrary spacing `max-w-[820px]` detected.' },
        { ruleId: 'deslint/no-arbitrary-spacing', severity: 1, message: 'Arbitrary spacing `max-w-[820px]` detected.' },
        { ruleId: 'deslint/no-arbitrary-spacing', severity: 1, message: 'Arbitrary spacing `p-[19px]` detected.' },
      ],
    });

    expect(plan.tokenDecisions.count).toBe(3);
    expect(plan.tokenDecisions.repeatedValues).toBe(1);
  });

  it('sorts top debt by remediation effort', () => {
    const plan = buildFixPlan({
      totalViolations: 9,
      byRule: {
        'deslint/no-arbitrary-spacing': 8,
        'deslint/a11y-color-contrast': 2,
        'deslint/max-component-lines': 1,
      },
    });

    expect(plan.topDebt.map((r) => r.ruleId)).toEqual([
      'deslint/max-component-lines',
      'deslint/a11y-color-contrast',
      'deslint/no-arbitrary-spacing',
    ]);
  });
});
