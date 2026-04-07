import { describe, it, expect } from 'vitest';
import { parseW3CTokens } from '../src/tokens/w3c-parser.js';

describe('parseW3CTokens', () => {
  it('returns empty result for an empty document', () => {
    const result = parseW3CTokens({});
    expect(result.tokens).toEqual([]);
    expect(result.designSystem.colors).toBeUndefined();
    expect(result.unmapped).toEqual([]);
    expect(result.unresolvedAliases).toEqual([]);
  });

  it('parses a flat color group', () => {
    const result = parseW3CTokens({
      colors: {
        primary: { $value: '#1A5276', $type: 'color' },
        accent: { $value: '#27AE60', $type: 'color' },
      },
    });
    expect(result.tokens).toHaveLength(2);
    expect(result.designSystem.colors).toEqual({
      primary: '#1A5276',
      accent: '#27AE60',
    });
  });

  it('parses nested groups using dotted paths and tail-keyed tokens', () => {
    const result = parseW3CTokens({
      colors: {
        brand: {
          primary: { $value: '#1A5276', $type: 'color' },
          secondary: { $value: '#E74C3C', $type: 'color' },
        },
      },
    });
    expect(result.designSystem.colors).toEqual({
      'brand-primary': '#1A5276',
      'brand-secondary': '#E74C3C',
    });
  });

  it('inherits $type from parent group', () => {
    const result = parseW3CTokens({
      colors: {
        $type: 'color',
        primary: { $value: '#1A5276' },
        secondary: { $value: '#E74C3C' },
      },
    });
    expect(result.designSystem.colors).toEqual({
      primary: '#1A5276',
      secondary: '#E74C3C',
    });
  });

  it('resolves alias references', () => {
    const result = parseW3CTokens({
      colors: {
        base: { $value: '#1A5276', $type: 'color' },
        primary: { $value: '{colors.base}', $type: 'color' },
      },
    });
    const primary = result.tokens.find((t) => t.path === 'colors.primary');
    expect(primary?.value).toBe('#1A5276');
    expect(primary?.aliased).toBe(true);
  });

  it('handles alias chains up to depth', () => {
    const result = parseW3CTokens({
      colors: {
        a: { $value: '#111111', $type: 'color' },
        b: { $value: '{colors.a}', $type: 'color' },
        c: { $value: '{colors.b}', $type: 'color' },
      },
    });
    const c = result.tokens.find((t) => t.path === 'colors.c');
    expect(c?.value).toBe('#111111');
  });

  it('records unresolved aliases without crashing', () => {
    const result = parseW3CTokens({
      colors: {
        primary: { $value: '{colors.missing}', $type: 'color' },
      },
    });
    expect(result.unresolvedAliases).toContain('colors.primary → colors.missing');
    expect(result.designSystem.colors).toBeUndefined();
  });

  it('breaks alias cycles without hanging', () => {
    const result = parseW3CTokens({
      colors: {
        a: { $value: '{colors.b}', $type: 'color' },
        b: { $value: '{colors.a}', $type: 'color' },
      },
    });
    // No throw, no infinite loop. Tokens may be missing from the output.
    expect(result.tokens.length).toBeLessThanOrEqual(2);
  });

  it('maps dimensions under a radius group to borderRadius', () => {
    const result = parseW3CTokens({
      radius: {
        sm: { $value: '4px', $type: 'dimension' },
        md: { $value: '8px', $type: 'dimension' },
      },
      spacing: {
        md: { $value: '16px', $type: 'dimension' },
      },
    });
    expect(result.designSystem.borderRadius).toEqual({ sm: '4px', md: '8px' });
    expect(result.designSystem.spacing).toEqual({ md: '16px' });
  });

  it('maps fontFamily tokens into fonts', () => {
    const result = parseW3CTokens({
      fonts: {
        body: { $value: 'Inter', $type: 'fontFamily' },
        heading: { $value: 'DM Sans', $type: 'fontFamily' },
      },
    });
    expect(result.designSystem.fonts).toEqual({
      body: 'Inter',
      heading: 'DM Sans',
    });
  });

  it('records unmapped types without dropping the tree', () => {
    const result = parseW3CTokens({
      motion: {
        fast: { $value: '200ms', $type: 'duration' },
      },
      colors: {
        primary: { $value: '#1A5276', $type: 'color' },
      },
    });
    expect(result.unmapped).toContain('motion.fast');
    expect(result.designSystem.colors).toEqual({ primary: '#1A5276' });
  });

  it('infers types from value shape when $type is missing (Style Dictionary output)', () => {
    const result = parseW3CTokens({
      color: {
        primary: { $value: '#1A5276' },
      },
      spacing: {
        md: { $value: '1rem' },
      },
    });
    expect(result.designSystem.colors).toEqual({ primary: '#1A5276' });
    expect(result.designSystem.spacing).toEqual({ md: '1rem' });
  });

  it('captures descriptions when present', () => {
    const result = parseW3CTokens({
      colors: {
        primary: {
          $value: '#1A5276',
          $type: 'color',
          $description: 'Primary brand color',
        },
      },
    });
    expect(result.tokens[0].description).toBe('Primary brand color');
  });
});
