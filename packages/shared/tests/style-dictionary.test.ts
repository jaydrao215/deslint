import { describe, it, expect } from 'vitest';
import { styleDictionaryToDTCG, parseW3CTokens } from '../src/index.js';

describe('styleDictionaryToDTCG', () => {
  it('converts legacy Style Dictionary leaves to DTCG', () => {
    const input = {
      color: {
        brand: {
          primary: { value: '#1A5276', type: 'color' },
          secondary: { value: '#E67E22', type: 'color' },
        },
      },
    };
    const result = styleDictionaryToDTCG(input);
    expect(result.tokenCount).toBe(2);
    expect(result.skipped).toEqual([]);
    expect(result.dtcg).toEqual({
      color: {
        brand: {
          primary: { $value: '#1A5276', $type: 'color' },
          secondary: { $value: '#E67E22', $type: 'color' },
        },
      },
    });
  });

  it('passes DTCG leaves through unchanged', () => {
    const input = {
      spacing: {
        sm: { $value: '4px', $type: 'dimension' },
      },
    };
    const result = styleDictionaryToDTCG(input);
    expect(result.tokenCount).toBe(1);
    expect(result.dtcg.spacing).toEqual({
      sm: { $value: '4px', $type: 'dimension' },
    });
  });

  it('normalises legacy type labels to DTCG equivalents', () => {
    const input = {
      space: {
        xs: { value: '4px', type: 'spacing' },
        sm: { value: '8px', type: 'size' },
      },
      radius: {
        md: { value: '6px', type: 'border-radius' },
      },
      font: {
        body: { value: 'Inter, sans-serif', type: 'font-family' },
      },
      shadow: {
        card: { value: '0 2px 4px rgba(0,0,0,0.1)', type: 'shadow' },
      },
      anim: {
        fast: { value: '150ms', type: 'duration' },
      },
    };
    const result = styleDictionaryToDTCG(input);
    expect(result.tokenCount).toBe(6);
    const t = result.dtcg as Record<string, Record<string, { $type: string }>>;
    expect(t.space.xs.$type).toBe('dimension');
    expect(t.space.sm.$type).toBe('dimension');
    expect(t.radius.md.$type).toBe('dimension');
    expect(t.font.body.$type).toBe('fontFamily');
    expect(t.shadow.card.$type).toBe('shadow');
    expect(t.anim.fast.$type).toBe('duration');
  });

  it('drops unknown type labels so the W3C parser can infer from path', () => {
    const input = {
      color: {
        accent: { value: '#FF00FF', type: 'mysterious-custom-type' },
      },
    };
    const result = styleDictionaryToDTCG(input);
    expect(result.tokenCount).toBe(1);
    const leaf = (result.dtcg as { color: { accent: Record<string, unknown> } })
      .color.accent;
    expect(leaf.$value).toBe('#FF00FF');
    expect('$type' in leaf).toBe(false);
  });

  it('keeps raw type when normalizeTypes is disabled', () => {
    const input = {
      space: { sm: { value: '4px', type: 'spacing' } },
    };
    const result = styleDictionaryToDTCG(input, { normalizeTypes: false });
    const leaf = (result.dtcg as { space: { sm: { $type: string } } }).space.sm;
    expect(leaf.$type).toBe('spacing');
  });

  it('carries description / comment fields over to $description', () => {
    const input = {
      color: {
        brand: {
          primary: {
            value: '#1A5276',
            type: 'color',
            comment: 'Primary brand colour for CTAs',
          },
          secondary: {
            value: '#E67E22',
            type: 'color',
            description: 'Secondary accent',
          },
        },
      },
    };
    const result = styleDictionaryToDTCG(input);
    const t = result.dtcg as {
      color: { brand: Record<string, { $description?: string }> };
    };
    expect(t.color.brand.primary.$description).toBe(
      'Primary brand colour for CTAs',
    );
    expect(t.color.brand.secondary.$description).toBe('Secondary accent');
  });

  it('preserves alias syntax so parseW3CTokens can resolve references', () => {
    const input = {
      color: {
        base: {
          blue500: { value: '#1A5276', type: 'color' },
        },
        brand: {
          primary: { value: '{color.base.blue500}', type: 'color' },
        },
      },
    };
    const result = styleDictionaryToDTCG(input);
    expect(result.tokenCount).toBe(2);

    const parsed = parseW3CTokens(result.dtcg);
    const brand = parsed.tokens.find((t) => t.path === 'color.brand.primary');
    expect(brand?.value).toBe('#1A5276');
    expect(brand?.aliased).toBe(true);
    // The DesignSystem bucket should contain the resolved color under
    // a key the Deslint rules can match against.
    expect(parsed.designSystem.colors).toBeDefined();
    expect(
      Object.values(parsed.designSystem.colors ?? {}),
    ).toContain('#1A5276');
  });

  it('skips nullish values and reports them', () => {
    const input = {
      color: {
        placeholder: { value: null, type: 'color' },
      },
    };
    const result = styleDictionaryToDTCG(input);
    expect(result.tokenCount).toBe(0);
    expect(result.skipped).toEqual([
      { path: 'color.placeholder', reason: 'empty_value' },
    ]);
  });

  it('skips Style Dictionary build metadata keys', () => {
    const input = {
      color: {
        brand: {
          primary: {
            value: '#1A5276',
            type: 'color',
            // Build-time metadata Style Dictionary sometimes writes
            // back into the tree — not tokens.
            attributes: { category: 'color', type: 'brand' },
            filePath: 'tokens/color.json',
            isSource: true,
          },
        },
        attributes: { tier: 'primitive' },
      },
    };
    const result = styleDictionaryToDTCG(input);
    expect(result.tokenCount).toBe(1);
    // `attributes` at the group level must not emit a spurious leaf.
    expect(
      'attributes' in (result.dtcg as Record<string, unknown>),
    ).toBe(false);
    expect((result.dtcg as { color: { attributes?: unknown } }).color.attributes)
      .toBeUndefined();
  });

  it('ignores top-level $schema hints common in Style Dictionary v4', () => {
    const input = {
      $schema: 'https://schemas.amazon.com/style-dictionary/tokens.json',
      color: {
        brand: { primary: { value: '#1A5276', type: 'color' } },
      },
    };
    const result = styleDictionaryToDTCG(input);
    expect(result.tokenCount).toBe(1);
    expect('$schema' in result.dtcg).toBe(false);
  });

  it('passes through composite object values (typography, shadow)', () => {
    const input = {
      typography: {
        heading: {
          value: {
            fontFamily: 'Inter',
            fontWeight: 700,
            fontSize: '32px',
          },
          type: 'typography',
        },
      },
    };
    const result = styleDictionaryToDTCG(input);
    expect(result.tokenCount).toBe(1);
    const leaf = (
      result.dtcg as {
        typography: { heading: { $value: Record<string, unknown> } };
      }
    ).typography.heading;
    expect(leaf.$value).toEqual({
      fontFamily: 'Inter',
      fontWeight: 700,
      fontSize: '32px',
    });
  });

  it('returns an empty result for non-object input rather than throwing', () => {
    expect(styleDictionaryToDTCG(null).tokenCount).toBe(0);
    expect(styleDictionaryToDTCG('nope').tokenCount).toBe(0);
    expect(styleDictionaryToDTCG(42).tokenCount).toBe(0);
  });

  it('feeds parseW3CTokens a bucketed DesignSystem end-to-end', () => {
    // Representative slice of what a real Style Dictionary export
    // looks like — colours, spacing, radii, fonts — so this is the
    // closest to a smoke test that the whole pipeline stays stable.
    const input = {
      color: {
        brand: {
          primary: { value: '#1A5276', type: 'color' },
          accent: { value: '#E67E22', type: 'color' },
        },
      },
      space: {
        xs: { value: '4px', type: 'spacing' },
        sm: { value: '8px', type: 'spacing' },
        md: { value: '16px', type: 'spacing' },
      },
      radius: {
        sm: { value: '4px', type: 'border-radius' },
        md: { value: '8px', type: 'border-radius' },
      },
      font: {
        body: { value: 'Inter, sans-serif', type: 'font-family' },
      },
    };

    const dtcg = styleDictionaryToDTCG(input).dtcg;
    const parsed = parseW3CTokens(dtcg);

    expect(Object.keys(parsed.designSystem.colors ?? {})).toHaveLength(2);
    expect(Object.keys(parsed.designSystem.spacing ?? {})).toHaveLength(3);
    expect(Object.keys(parsed.designSystem.borderRadius ?? {})).toHaveLength(2);
    expect(Object.keys(parsed.designSystem.fonts ?? {})).toHaveLength(1);
  });
});
