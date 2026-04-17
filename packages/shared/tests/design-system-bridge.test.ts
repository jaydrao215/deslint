import { describe, it, expect } from 'vitest';
import {
  applyDesignSystemToRules,
  parseCssLengthToPx,
} from '../src/design-system-bridge.js';

describe('parseCssLengthToPx', () => {
  it('parses integer px', () => {
    expect(parseCssLengthToPx('16px')).toBe(16);
  });

  it('parses decimal px', () => {
    expect(parseCssLengthToPx('1.5px')).toBe(1.5);
  });

  it('parses rem assuming 16px base', () => {
    expect(parseCssLengthToPx('1rem')).toBe(16);
    expect(parseCssLengthToPx('0.5rem')).toBe(8);
    expect(parseCssLengthToPx('1.25rem')).toBe(20);
  });

  it('parses em assuming 16px base', () => {
    expect(parseCssLengthToPx('2em')).toBe(32);
  });

  it('parses negative values', () => {
    expect(parseCssLengthToPx('-8px')).toBe(-8);
  });

  it('tolerates surrounding whitespace', () => {
    expect(parseCssLengthToPx('  12px  ')).toBe(12);
  });

  it('returns null for percent', () => {
    expect(parseCssLengthToPx('50%')).toBeNull();
  });

  it('returns null for viewport units', () => {
    expect(parseCssLengthToPx('100vh')).toBeNull();
    expect(parseCssLengthToPx('50vw')).toBeNull();
  });

  it('returns null for calc expressions', () => {
    expect(parseCssLengthToPx('calc(16px + 1rem)')).toBeNull();
  });

  it('returns null for var references', () => {
    expect(parseCssLengthToPx('var(--space-sm)')).toBeNull();
  });

  it('returns null for unit-less numbers', () => {
    expect(parseCssLengthToPx('16')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseCssLengthToPx('')).toBeNull();
  });
});

describe('applyDesignSystemToRules', () => {
  it('returns empty result when designSystem is undefined', () => {
    const result = applyDesignSystemToRules(undefined);
    expect(result.rules).toEqual({});
    expect(result.warnings).toEqual([]);
  });

  it('returns empty result for an empty designSystem', () => {
    const result = applyDesignSystemToRules({});
    expect(result.rules).toEqual({});
    expect(result.warnings).toEqual([]);
  });

  it('skips colors field when object is empty', () => {
    const result = applyDesignSystemToRules({ colors: {} });
    expect(result.rules).toEqual({});
  });

  it('skips spacing field when object is empty', () => {
    const result = applyDesignSystemToRules({ spacing: {} });
    expect(result.rules).toEqual({});
  });

  // ── Colors ────────────────────────────────────────────────────────────

  it('wires colors into no-arbitrary-colors at default warn severity', () => {
    const result = applyDesignSystemToRules({
      colors: { 'brand-primary': '#1A5276', 'brand-accent': '#27AE60' },
    });
    expect(result.rules['deslint/no-arbitrary-colors']).toEqual([
      'warn',
      {
        customTokens: { 'brand-primary': '#1A5276', 'brand-accent': '#27AE60' },
      },
    ]);
    expect(result.warnings).toEqual([]);
  });

  it('preserves user severity when wiring colors', () => {
    const result = applyDesignSystemToRules(
      { colors: { brand: '#1A5276' } },
      { existingRules: { 'deslint/no-arbitrary-colors': 'error' } },
    );
    expect(result.rules['deslint/no-arbitrary-colors']).toEqual([
      'error',
      { customTokens: { brand: '#1A5276' } },
    ]);
  });

  it('merges with existing non-conflicting color options', () => {
    const result = applyDesignSystemToRules(
      { colors: { brand: '#1A5276' } },
      {
        existingRules: {
          'deslint/no-arbitrary-colors': [
            'error',
            { allowlist: ['#FF0000'], allowCssVariables: false },
          ],
        },
      },
    );
    expect(result.rules['deslint/no-arbitrary-colors']).toEqual([
      'error',
      {
        allowlist: ['#FF0000'],
        allowCssVariables: false,
        customTokens: { brand: '#1A5276' },
      },
    ]);
  });

  it('skips colors when user already set customTokens explicitly', () => {
    const result = applyDesignSystemToRules(
      { colors: { brand: '#1A5276' } },
      {
        existingRules: {
          'deslint/no-arbitrary-colors': [
            'warn',
            { customTokens: { 'my-brand': '#000000' } },
          ],
        },
      },
    );
    expect(result.rules['deslint/no-arbitrary-colors']).toBeUndefined();
  });

  it('skips colors when user disabled the rule', () => {
    const result = applyDesignSystemToRules(
      { colors: { brand: '#1A5276' } },
      { existingRules: { 'deslint/no-arbitrary-colors': 'off' } },
    );
    expect(result.rules['deslint/no-arbitrary-colors']).toBeUndefined();
  });

  it('accepts bare rule id in existingRules (no deslint/ prefix)', () => {
    const result = applyDesignSystemToRules(
      { colors: { brand: '#1A5276' } },
      { existingRules: { 'no-arbitrary-colors': 'error' } },
    );
    expect(result.rules['deslint/no-arbitrary-colors']?.[0]).toBe('error');
  });

  // ── Spacing ───────────────────────────────────────────────────────────

  it('wires spacing into no-arbitrary-spacing with px conversion', () => {
    const result = applyDesignSystemToRules({
      spacing: { sm: '0.5rem', md: '1rem', lg: '1.5rem', '18': '72px' },
    });
    expect(result.rules['deslint/no-arbitrary-spacing']).toEqual([
      'warn',
      { customScale: { sm: 8, md: 16, lg: 24, '18': 72 } },
    ]);
    expect(result.warnings).toEqual([]);
  });

  it('preserves user severity when wiring spacing', () => {
    const result = applyDesignSystemToRules(
      { spacing: { sm: '0.5rem' } },
      { existingRules: { 'deslint/no-arbitrary-spacing': 'error' } },
    );
    expect(result.rules['deslint/no-arbitrary-spacing']?.[0]).toBe('error');
  });

  it('merges with existing non-conflicting spacing options', () => {
    const result = applyDesignSystemToRules(
      { spacing: { sm: '0.5rem' } },
      {
        existingRules: {
          'deslint/no-arbitrary-spacing': [
            'warn',
            { skipConstraints: false, minPxThreshold: 0 },
          ],
        },
      },
    );
    expect(result.rules['deslint/no-arbitrary-spacing']).toEqual([
      'warn',
      { skipConstraints: false, minPxThreshold: 0, customScale: { sm: 8 } },
    ]);
  });

  it('skips spacing when user set customScale explicitly', () => {
    const result = applyDesignSystemToRules(
      { spacing: { sm: '0.5rem' } },
      {
        existingRules: {
          'deslint/no-arbitrary-spacing': ['warn', { customScale: { sm: 8 } }],
        },
      },
    );
    expect(result.rules['deslint/no-arbitrary-spacing']).toBeUndefined();
  });

  it('skips spacing when user disabled the rule', () => {
    const result = applyDesignSystemToRules(
      { spacing: { sm: '0.5rem' } },
      { existingRules: { 'deslint/no-arbitrary-spacing': 'off' } },
    );
    expect(result.rules['deslint/no-arbitrary-spacing']).toBeUndefined();
  });

  it('warns and skips unparseable spacing tokens', () => {
    const result = applyDesignSystemToRules({
      spacing: { sm: '0.5rem', fluid: '50%', viewport: '100vh', ok: '16px' },
    });
    expect(result.rules['deslint/no-arbitrary-spacing']?.[1]).toEqual({
      customScale: { sm: 8, ok: 16 },
    });
    expect(result.warnings).toHaveLength(2);
    expect(result.warnings[0]).toContain('fluid');
    expect(result.warnings[0]).toContain('50%');
    expect(result.warnings[1]).toContain('viewport');
  });

  it('emits no rule when every spacing token is unparseable', () => {
    const result = applyDesignSystemToRules({
      spacing: { fluid: '50%', vp: '100vh' },
    });
    expect(result.rules['deslint/no-arbitrary-spacing']).toBeUndefined();
    expect(result.warnings).toHaveLength(2);
  });

  // ── Combined & independence ──────────────────────────────────────────

  it('wires colors and spacing independently in the same call', () => {
    const result = applyDesignSystemToRules({
      colors: { brand: '#1A5276' },
      spacing: { sm: '0.5rem' },
    });
    expect(result.rules['deslint/no-arbitrary-colors']).toBeDefined();
    expect(result.rules['deslint/no-arbitrary-spacing']).toBeDefined();
  });

  it('does not bridge fonts or borderRadius (known gap)', () => {
    const result = applyDesignSystemToRules({
      fonts: { body: 'Inter', heading: 'Inter' },
      borderRadius: { sm: '0.25rem', lg: '0.75rem' },
    });
    expect(result.rules).toEqual({});
  });

  it('does not mutate the caller-provided designSystem.colors', () => {
    const colors = { brand: '#1A5276' };
    const result = applyDesignSystemToRules({ colors });
    const produced = (result.rules['deslint/no-arbitrary-colors'] as [unknown, { customTokens: Record<string, string> }])[1].customTokens;
    produced.mutated = '#FFFFFF';
    expect(colors).toEqual({ brand: '#1A5276' });
  });
});
