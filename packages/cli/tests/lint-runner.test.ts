import { describe, it, expect } from 'vitest';
import { RULE_CATEGORY_MAP } from '../src/lint-runner.js';

describe('RULE_CATEGORY_MAP', () => {
  it('maps all 5 Vizlint rules to categories', () => {
    expect(RULE_CATEGORY_MAP['vizlint/no-arbitrary-colors']).toBe('colors');
    expect(RULE_CATEGORY_MAP['vizlint/no-arbitrary-spacing']).toBe('spacing');
    expect(RULE_CATEGORY_MAP['vizlint/no-arbitrary-typography']).toBe('typography');
    expect(RULE_CATEGORY_MAP['vizlint/responsive-required']).toBe('responsive');
    expect(RULE_CATEGORY_MAP['vizlint/consistent-component-spacing']).toBe('consistency');
  });

  it('covers all 5 score categories', () => {
    const categories = new Set(Object.values(RULE_CATEGORY_MAP));
    expect(categories.size).toBe(5);
    expect(categories.has('colors')).toBe(true);
    expect(categories.has('spacing')).toBe(true);
    expect(categories.has('typography')).toBe(true);
    expect(categories.has('responsive')).toBe(true);
    expect(categories.has('consistency')).toBe(true);
  });
});
