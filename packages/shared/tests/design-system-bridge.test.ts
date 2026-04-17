import { describe, it, expect } from 'vitest';
import {
  applyDesignSystemToRules,
  parseCssLengthToPx,
  parseEmToMilliEm,
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

  it('does not bridge fonts (no consumer rule)', () => {
    const result = applyDesignSystemToRules({
      fonts: { body: 'Inter', heading: 'Inter' },
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

  // ── Typography ────────────────────────────────────────────────────────

  it('wires typography.fontSize to no-arbitrary-typography.customScale.fontSize in px', () => {
    const result = applyDesignSystemToRules({
      typography: {
        fontSize: { body: '1rem', h1: '2.25rem', caption: '12px' },
      },
    });
    expect(result.rules['deslint/no-arbitrary-typography']).toEqual([
      'warn',
      { customScale: { fontSize: { body: 16, h1: 36, caption: 12 } } },
    ]);
  });

  it('wires typography.fontWeight as numeric passthrough', () => {
    const result = applyDesignSystemToRules({
      typography: { fontWeight: { regular: 400, bold: 700 } },
    });
    expect(result.rules['deslint/no-arbitrary-typography']).toEqual([
      'warn',
      { customScale: { fontWeight: { regular: 400, bold: 700 } } },
    ]);
  });

  it('wires typography.leading to px', () => {
    const result = applyDesignSystemToRules({
      typography: { leading: { tight: '1.25rem', snug: '24px' } },
    });
    expect(result.rules['deslint/no-arbitrary-typography']).toEqual([
      'warn',
      { customScale: { leading: { tight: 20, snug: 24 } } },
    ]);
  });

  it('wires typography.tracking em → milli-em', () => {
    const result = applyDesignSystemToRules({
      typography: { tracking: { tight: '-0.02em', wide: '0.05em' } },
    });
    expect(result.rules['deslint/no-arbitrary-typography']).toEqual([
      'warn',
      { customScale: { tracking: { tight: -20, wide: 50 } } },
    ]);
  });

  it('emits one typography rule with all four sub-scales populated', () => {
    const result = applyDesignSystemToRules({
      typography: {
        fontSize: { body: '1rem' },
        fontWeight: { regular: 400 },
        leading: { tight: '1.25rem' },
        tracking: { tight: '-0.02em' },
      },
    });
    expect(result.rules['deslint/no-arbitrary-typography']).toEqual([
      'warn',
      {
        customScale: {
          fontSize: { body: 16 },
          fontWeight: { regular: 400 },
          leading: { tight: 20 },
          tracking: { tight: -20 },
        },
      },
    ]);
  });

  it('warns and skips unparseable typography tokens', () => {
    const result = applyDesignSystemToRules({
      typography: {
        fontSize: { body: '1rem', bad: '50%' },
        tracking: { tight: 'bogus' },
        fontWeight: { heavy: 1200 },
      },
    });
    const [sev, opts] = result.rules['deslint/no-arbitrary-typography'] as [
      string,
      { customScale: Record<string, Record<string, number>> },
    ];
    expect(sev).toBe('warn');
    expect(opts.customScale.fontSize).toEqual({ body: 16 });
    expect(opts.customScale.tracking).toBeUndefined();
    expect(opts.customScale.fontWeight).toBeUndefined();
    expect(result.warnings).toHaveLength(3);
  });

  it('skips typography when user already set customScale', () => {
    const result = applyDesignSystemToRules(
      { typography: { fontSize: { body: '1rem' } } },
      {
        existingRules: {
          'deslint/no-arbitrary-typography': [
            'warn',
            { customScale: { fontSize: { body: 16 } } },
          ],
        },
      },
    );
    expect(result.rules['deslint/no-arbitrary-typography']).toBeUndefined();
  });

  it('skips typography when rule is disabled', () => {
    const result = applyDesignSystemToRules(
      { typography: { fontSize: { body: '1rem' } } },
      { existingRules: { 'deslint/no-arbitrary-typography': 'off' } },
    );
    expect(result.rules['deslint/no-arbitrary-typography']).toBeUndefined();
  });

  it('preserves user severity and non-conflicting options when wiring typography', () => {
    const result = applyDesignSystemToRules(
      { typography: { fontSize: { body: '1rem' } } },
      {
        existingRules: {
          'deslint/no-arbitrary-typography': ['error', { allowlist: ['text-[13px]'] }],
        },
      },
    );
    expect(result.rules['deslint/no-arbitrary-typography']).toEqual([
      'error',
      { allowlist: ['text-[13px]'], customScale: { fontSize: { body: 16 } } },
    ]);
  });

  it('emits no typography rule when every sub-field is empty', () => {
    const result = applyDesignSystemToRules({ typography: {} });
    expect(result.rules['deslint/no-arbitrary-typography']).toBeUndefined();
  });

  // ── Border radius ────────────────────────────────────────────────────

  it('wires borderRadius into no-arbitrary-border-radius.customScale in px', () => {
    const result = applyDesignSystemToRules({
      borderRadius: { sm: '0.25rem', lg: '0.75rem', full: '9999px' },
    });
    expect(result.rules['deslint/no-arbitrary-border-radius']).toEqual([
      'warn',
      { customScale: { sm: 4, lg: 12, full: 9999 } },
    ]);
  });

  it('preserves user severity when wiring borderRadius', () => {
    const result = applyDesignSystemToRules(
      { borderRadius: { sm: '0.25rem' } },
      { existingRules: { 'deslint/no-arbitrary-border-radius': 'error' } },
    );
    expect(result.rules['deslint/no-arbitrary-border-radius']?.[0]).toBe('error');
  });

  it('skips borderRadius when user set customScale', () => {
    const result = applyDesignSystemToRules(
      { borderRadius: { sm: '0.25rem' } },
      {
        existingRules: {
          'deslint/no-arbitrary-border-radius': [
            'warn',
            { customScale: { sm: 4 } },
          ],
        },
      },
    );
    expect(result.rules['deslint/no-arbitrary-border-radius']).toBeUndefined();
  });

  it('skips borderRadius when rule disabled', () => {
    const result = applyDesignSystemToRules(
      { borderRadius: { sm: '0.25rem' } },
      { existingRules: { 'deslint/no-arbitrary-border-radius': 'off' } },
    );
    expect(result.rules['deslint/no-arbitrary-border-radius']).toBeUndefined();
  });

  it('warns and skips unparseable borderRadius tokens', () => {
    const result = applyDesignSystemToRules({
      borderRadius: { sm: '0.25rem', weird: '50%' },
    });
    expect(result.rules['deslint/no-arbitrary-border-radius']).toEqual([
      'warn',
      { customScale: { sm: 4 } },
    ]);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('weird');
  });
});

describe('parseEmToMilliEm', () => {
  it('parses positive em', () => {
    expect(parseEmToMilliEm('0.05em')).toBe(50);
  });
  it('parses negative em', () => {
    expect(parseEmToMilliEm('-0.02em')).toBe(-20);
  });
  it('parses zero em', () => {
    expect(parseEmToMilliEm('0em')).toBe(0);
  });
  it('tolerates surrounding whitespace', () => {
    expect(parseEmToMilliEm('  0.1em ')).toBe(100);
  });
  it('returns null for px', () => {
    expect(parseEmToMilliEm('16px')).toBeNull();
  });
  it('returns null for rem', () => {
    expect(parseEmToMilliEm('1rem')).toBeNull();
  });
  it('returns null for bare numbers', () => {
    expect(parseEmToMilliEm('0.05')).toBeNull();
  });
  it('returns null for empty string', () => {
    expect(parseEmToMilliEm('')).toBeNull();
  });
});
