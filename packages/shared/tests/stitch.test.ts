import { describe, it, expect } from 'vitest';
import { stitchTokensToDTCG, parseW3CTokens } from '../src/index.js';

describe('stitchTokensToDTCG', () => {
  it('expands flat Material 3 dotted keys into a nested DTCG tree', () => {
    const input = {
      'md.sys.color.primary': { value: '#6750A4', type: 'color' },
      'md.sys.color.secondary': { value: '#625B71', type: 'color' },
      'md.sys.color.surface': { value: '#FFFBFE', type: 'color' },
    };
    const result = stitchTokensToDTCG(input);
    expect(result.tokenCount).toBe(3);
    const t = result.dtcg as {
      md: { sys: { color: Record<string, { $value: string; $type: string }> } };
    };
    expect(t.md.sys.color.primary.$value).toBe('#6750A4');
    expect(t.md.sys.color.primary.$type).toBe('color');
    expect(t.md.sys.color.secondary.$value).toBe('#625B71');
    expect(t.md.sys.color.surface.$value).toBe('#FFFBFE');
  });

  it('accepts already-nested input (no dotted keys)', () => {
    const input = {
      md: {
        sys: {
          color: {
            primary: { value: '#6750A4', type: 'color' },
          },
        },
      },
    };
    const result = stitchTokensToDTCG(input);
    expect(result.tokenCount).toBe(1);
    const t = result.dtcg as {
      md: { sys: { color: { primary: { $value: string } } } };
    };
    expect(t.md.sys.color.primary.$value).toBe('#6750A4');
  });

  it('tolerates mixed shapes (flat + nested together)', () => {
    const input = {
      // Flat
      'md.sys.color.primary': { value: '#6750A4', type: 'color' },
      // Nested sibling under the same namespace
      md: {
        sys: {
          color: {
            secondary: { value: '#625B71', type: 'color' },
          },
        },
      },
    };
    const result = stitchTokensToDTCG(input);
    expect(result.tokenCount).toBe(2);
    const t = result.dtcg as {
      md: { sys: { color: Record<string, { $value: string }> } };
    };
    expect(t.md.sys.color.primary.$value).toBe('#6750A4');
    expect(t.md.sys.color.secondary.$value).toBe('#625B71');
  });

  it('preserves alias syntax (MD3 refs resolve through parseW3CTokens)', () => {
    const input = {
      'md.ref.palette.primary60': { value: '#6750A4', type: 'color' },
      'md.sys.color.primary': {
        value: '{md.ref.palette.primary60}',
        type: 'color',
      },
    };
    const result = stitchTokensToDTCG(input);
    expect(result.tokenCount).toBe(2);

    const parsed = parseW3CTokens(result.dtcg);
    const sys = parsed.tokens.find((t) => t.path === 'md.sys.color.primary');
    expect(sys?.value).toBe('#6750A4');
    expect(sys?.aliased).toBe(true);
  });

  it('filters to a single MD3 tier when options.tier is set', () => {
    const input = {
      'md.ref.palette.primary60': { value: '#6750A4', type: 'color' },
      'md.sys.color.primary': { value: '#6750A4', type: 'color' },
      'md.comp.button.container.color': {
        value: '{md.sys.color.primary}',
        type: 'color',
      },
    };

    const sysOnly = stitchTokensToDTCG(input, { tier: 'sys' });
    expect(sysOnly.tokenCount).toBe(1);
    const s = sysOnly.dtcg as { md: { sys: { color: { primary: unknown } } } };
    expect(s.md.sys.color.primary).toBeDefined();
    // ref and comp should be gone
    expect('ref' in (sysOnly.dtcg.md as Record<string, unknown>)).toBe(false);
    expect('comp' in (sysOnly.dtcg.md as Record<string, unknown>)).toBe(false);

    const refOnly = stitchTokensToDTCG(input, { tier: 'ref' });
    expect(refOnly.tokenCount).toBe(1);

    const compOnly = stitchTokensToDTCG(input, { tier: 'comp' });
    expect(compOnly.tokenCount).toBe(1);
  });

  it('normalises MD3 size/shape types onto DTCG dimension', () => {
    const input = {
      'md.sys.shape.corner.medium': { value: '12px', type: 'shape' },
      'md.sys.spacing.md': { value: '16px', type: 'spacing' },
    };
    // `shape` isn't in our normaliser table — it should drop off and
    // let the W3C parser infer from value shape. But `spacing` should
    // become `dimension`.
    const result = stitchTokensToDTCG(input);
    const t = result.dtcg as {
      md: {
        sys: {
          shape: { corner: { medium: Record<string, unknown> } };
          spacing: { md: Record<string, unknown> };
        };
      };
    };
    expect('$type' in t.md.sys.shape.corner.medium).toBe(false);
    expect(t.md.sys.spacing.md.$type).toBe('dimension');
  });

  it('returns an empty result for non-object input', () => {
    expect(stitchTokensToDTCG(null).tokenCount).toBe(0);
    expect(stitchTokensToDTCG([]).tokenCount).toBe(0);
    expect(stitchTokensToDTCG('not-an-object').tokenCount).toBe(0);
  });

  it('passes composite typography values through verbatim', () => {
    const input = {
      'md.sys.typescale.body.large': {
        value: {
          fontFamily: 'Roboto',
          fontWeight: 400,
          fontSize: '16px',
          lineHeight: '24px',
        },
        type: 'typography',
      },
    };
    const result = stitchTokensToDTCG(input);
    expect(result.tokenCount).toBe(1);
    const leaf = (
      result.dtcg as {
        md: {
          sys: {
            typescale: {
              body: { large: { $value: Record<string, unknown> } };
            };
          };
        };
      }
    ).md.sys.typescale.body.large;
    expect(leaf.$value).toMatchObject({ fontFamily: 'Roboto' });
  });

  it('leaves inputs without an md namespace untouched when tier is set', () => {
    // Users sometimes flatten the namespace away before export. A
    // tier filter shouldn't erase everything in that case — we fall
    // back to the whole tree.
    const input = {
      'color.primary': { value: '#6750A4', type: 'color' },
    };
    const result = stitchTokensToDTCG(input, { tier: 'sys' });
    expect(result.tokenCount).toBe(1);
    const t = result.dtcg as { color: { primary: { $value: string } } };
    expect(t.color.primary.$value).toBe('#6750A4');
  });

  it('end-to-end: Stitch → DTCG → DesignSystem buckets tokens correctly', () => {
    const input = {
      'md.sys.color.primary': { value: '#6750A4', type: 'color' },
      'md.sys.color.onPrimary': { value: '#FFFFFF', type: 'color' },
      'md.sys.spacing.md': { value: '16px', type: 'spacing' },
      'md.sys.typescale.body.fontFamily': {
        value: 'Roboto, sans-serif',
        type: 'fontFamily',
      },
    };
    const { dtcg } = stitchTokensToDTCG(input, { tier: 'sys' });
    const parsed = parseW3CTokens(dtcg);
    expect(Object.keys(parsed.designSystem.colors ?? {})).toHaveLength(2);
    expect(Object.keys(parsed.designSystem.spacing ?? {})).toHaveLength(1);
    expect(Object.keys(parsed.designSystem.fonts ?? {})).toHaveLength(1);
  });
});
