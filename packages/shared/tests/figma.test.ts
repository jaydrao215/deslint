import { describe, it, expect } from 'vitest';
import {
  figmaVariablesToDTCG,
  parseW3CTokens,
  type FigmaVariablesResponse,
} from '../src/tokens/index.js';

/**
 * Fixture builder for a minimal Figma Variables API response. Keeps
 * the tests readable — each test just tweaks the parts it cares about
 * instead of restating the whole envelope. We cast through `unknown`
 * so tests can write concise literals without restating every field
 * of the FigmaVariable type.
 */
function fixture(partial: {
  variables?: Record<string, unknown>;
  collections?: Record<string, unknown>;
}): FigmaVariablesResponse {
  return {
    status: 200,
    error: false,
    meta: {
      variables: partial.variables,
      variableCollections: partial.collections,
    },
  } as unknown as FigmaVariablesResponse;
}

const DEFAULT_COLLECTION = {
  id: 'c1',
  name: 'Primitives',
  modes: [{ modeId: 'm1', name: 'Light' }],
  defaultModeId: 'm1',
};

describe('figmaVariablesToDTCG', () => {
  it('returns an empty document when there are no variables', () => {
    const result = figmaVariablesToDTCG(fixture({}));
    expect(result.dtcg).toEqual({});
    expect(result.tokenCount).toBe(0);
    expect(result.skipped).toEqual([]);
    expect(result.collectionsSeen).toEqual([]);
  });

  it('converts a single solid COLOR variable to a 6-digit hex DTCG leaf (alpha=1 → no alpha byte)', () => {
    const result = figmaVariablesToDTCG(
      fixture({
        collections: { c1: DEFAULT_COLLECTION },
        variables: {
          v1: {
            id: 'v1',
            name: 'brand/primary',
            variableCollectionId: 'c1',
            resolvedType: 'COLOR',
            // r=0.1 → 26 (0x1a); g=0.32 → 82 (0x52); b=0.46 → 117 (0x75)
            valuesByMode: { m1: { r: 0.1, g: 0.32, b: 0.46, a: 1 } },
          },
        },
      }),
    );

    expect(result.tokenCount).toBe(1);
    expect(result.collectionsSeen).toEqual(['Primitives']);

    const primitives = result.dtcg['primitives'] as Record<string, unknown>;
    const brand = primitives['brand'] as Record<string, unknown>;
    const primary = brand['primary'] as { $value: string; $type: string };
    expect(primary.$type).toBe('color');
    expect(primary.$value).toBe('#1a5275');
    expect(primary.$value.length).toBe(7); // 6 hex digits + leading #
  });

  it('rounds Figma 0–1 RGB channels to the nearest byte and emits 6-digit hex', () => {
    const result = figmaVariablesToDTCG(
      fixture({
        collections: { c1: DEFAULT_COLLECTION },
        variables: {
          v1: {
            id: 'v1',
            name: 'brand',
            variableCollectionId: 'c1',
            resolvedType: 'COLOR',
            // 26/255 = 0.101961; 82/255 = 0.321569; 118/255 = 0.462745
            valuesByMode: { m1: { r: 26 / 255, g: 82 / 255, b: 118 / 255 } },
          },
        },
      }),
    );
    const leaf = (result.dtcg['primitives'] as any)['brand'] as { $value: string };
    expect(leaf.$value).toBe('#1a5276');
  });

  it('emits 8-digit hex when alpha < 1', () => {
    const result = figmaVariablesToDTCG(
      fixture({
        collections: { c1: DEFAULT_COLLECTION },
        variables: {
          v1: {
            id: 'v1',
            name: 'overlay',
            variableCollectionId: 'c1',
            resolvedType: 'COLOR',
            valuesByMode: { m1: { r: 0, g: 0, b: 0, a: 0.5 } },
          },
        },
      }),
    );
    const leaf = (result.dtcg['primitives'] as any)['overlay'] as { $value: string };
    expect(leaf.$value).toBe('#00000080');
  });

  it('clamps out-of-range channels to [0, 1]', () => {
    const result = figmaVariablesToDTCG(
      fixture({
        collections: { c1: DEFAULT_COLLECTION },
        variables: {
          v1: {
            id: 'v1',
            name: 'weird',
            variableCollectionId: 'c1',
            resolvedType: 'COLOR',
            // Figma should never send this, but defensive clamp test
            valuesByMode: { m1: { r: 2, g: -0.5, b: 1 } },
          },
        },
      }),
    );
    const leaf = (result.dtcg['primitives'] as any)['weird'] as { $value: string };
    expect(leaf.$value).toBe('#ff00ff');
  });

  it('converts FLOAT with GAP scope to a px dimension', () => {
    const result = figmaVariablesToDTCG(
      fixture({
        collections: { c1: DEFAULT_COLLECTION },
        variables: {
          v1: {
            id: 'v1',
            name: 'spacing/md',
            variableCollectionId: 'c1',
            resolvedType: 'FLOAT',
            valuesByMode: { m1: 16 },
            scopes: ['GAP'],
          },
        },
      }),
    );
    const leaf = (result.dtcg['primitives'] as any)['spacing']['md'] as {
      $value: string;
      $type: string;
    };
    expect(leaf.$type).toBe('dimension');
    expect(leaf.$value).toBe('16px');
  });

  it('routes CORNER_RADIUS scope through DTCG dimension → borderRadius bucket via parseW3CTokens', () => {
    const result = figmaVariablesToDTCG(
      fixture({
        collections: { c1: DEFAULT_COLLECTION },
        variables: {
          v1: {
            id: 'v1',
            name: 'radius/lg',
            variableCollectionId: 'c1',
            resolvedType: 'FLOAT',
            valuesByMode: { m1: 12 },
            scopes: ['CORNER_RADIUS'],
          },
        },
      }),
    );
    const parsed = parseW3CTokens(result.dtcg);
    // The `radius.` segment anywhere in the dotted path bucket-routes
    // to borderRadius via the W3C parser's heuristic. The emitted key
    // is the full path joined with hyphens because the collection
    // name ("primitives") isn't one of the parser's category prefixes
    // — that's intentional, it preserves collection namespacing.
    expect(parsed.designSystem.borderRadius).toEqual({
      'primitives-radius-lg': '12px',
    });
    expect(parsed.designSystem.spacing).toBeUndefined();
  });

  it('trims trailing zeros on fractional dimensions', () => {
    const result = figmaVariablesToDTCG(
      fixture({
        collections: { c1: DEFAULT_COLLECTION },
        variables: {
          v1: {
            id: 'v1',
            name: 'spacing/half',
            variableCollectionId: 'c1',
            resolvedType: 'FLOAT',
            valuesByMode: { m1: 4.5 },
            scopes: ['GAP'],
          },
        },
      }),
    );
    const leaf = (result.dtcg['primitives'] as any)['spacing']['half'] as {
      $value: string;
    };
    expect(leaf.$value).toBe('4.5px');
  });

  it('skips FLOAT variables scoped to FONT_WEIGHT', () => {
    const result = figmaVariablesToDTCG(
      fixture({
        collections: { c1: DEFAULT_COLLECTION },
        variables: {
          v1: {
            id: 'v1',
            name: 'weight/bold',
            variableCollectionId: 'c1',
            resolvedType: 'FLOAT',
            valuesByMode: { m1: 700 },
            scopes: ['FONT_WEIGHT'],
          },
        },
      }),
    );
    expect(result.tokenCount).toBe(0);
    expect(result.skipped).toEqual([
      { name: 'weight/bold', reason: 'unsupported_type:FLOAT' },
    ]);
  });

  it('accepts STRING variables whose name hints at a font family', () => {
    const result = figmaVariablesToDTCG(
      fixture({
        collections: { c1: DEFAULT_COLLECTION },
        variables: {
          v1: {
            id: 'v1',
            name: 'font-family/body',
            variableCollectionId: 'c1',
            resolvedType: 'STRING',
            valuesByMode: { m1: 'Inter, system-ui, sans-serif' },
          },
        },
      }),
    );
    const leaf = (result.dtcg['primitives'] as any)['font-family']['body'] as {
      $value: string;
      $type: string;
    };
    expect(leaf.$type).toBe('fontFamily');
    expect(leaf.$value).toBe('Inter, system-ui, sans-serif');
  });

  it('skips STRING variables that are not font families', () => {
    const result = figmaVariablesToDTCG(
      fixture({
        collections: { c1: DEFAULT_COLLECTION },
        variables: {
          v1: {
            id: 'v1',
            name: 'copy/hero-headline',
            variableCollectionId: 'c1',
            resolvedType: 'STRING',
            valuesByMode: { m1: 'Ship faster.' },
          },
        },
      }),
    );
    expect(result.tokenCount).toBe(0);
    expect(result.skipped).toEqual([
      { name: 'copy/hero-headline', reason: 'unsupported_type:STRING' },
    ]);
  });

  it('skips BOOLEAN variables', () => {
    const result = figmaVariablesToDTCG(
      fixture({
        collections: { c1: DEFAULT_COLLECTION },
        variables: {
          v1: {
            id: 'v1',
            name: 'flags/experimental',
            variableCollectionId: 'c1',
            resolvedType: 'BOOLEAN',
            valuesByMode: { m1: true },
          },
        },
      }),
    );
    expect(result.tokenCount).toBe(0);
    expect(result.skipped[0]?.reason).toBe('unsupported_type:BOOLEAN');
  });

  it('excludes variables flagged hiddenFromPublishing by default', () => {
    const result = figmaVariablesToDTCG(
      fixture({
        collections: { c1: DEFAULT_COLLECTION },
        variables: {
          v1: {
            id: 'v1',
            name: 'wip/experimental',
            variableCollectionId: 'c1',
            resolvedType: 'COLOR',
            hiddenFromPublishing: true,
            valuesByMode: { m1: { r: 1, g: 0, b: 1 } },
          },
        },
      }),
    );
    expect(result.tokenCount).toBe(0);
    expect(result.skipped).toEqual([{ name: 'wip/experimental', reason: 'hidden' }]);
  });

  it('includes hidden variables when excludeHidden: false', () => {
    const result = figmaVariablesToDTCG(
      fixture({
        collections: { c1: DEFAULT_COLLECTION },
        variables: {
          v1: {
            id: 'v1',
            name: 'wip/experimental',
            variableCollectionId: 'c1',
            resolvedType: 'COLOR',
            hiddenFromPublishing: true,
            valuesByMode: { m1: { r: 1, g: 0, b: 1 } },
          },
        },
      }),
      { excludeHidden: false },
    );
    expect(result.tokenCount).toBe(1);
  });

  it('drops variables whose collection is missing from the response', () => {
    const result = figmaVariablesToDTCG(
      fixture({
        collections: {}, // no collections
        variables: {
          v1: {
            id: 'v1',
            name: 'orphan',
            variableCollectionId: 'c1',
            resolvedType: 'COLOR',
            valuesByMode: { m1: { r: 0, g: 0, b: 0 } },
          },
        },
      }),
    );
    expect(result.tokenCount).toBe(0);
    expect(result.skipped).toEqual([{ name: 'orphan', reason: 'collection_missing' }]);
  });

  it('uses the mode matching `options.mode` when provided', () => {
    const result = figmaVariablesToDTCG(
      fixture({
        collections: {
          c1: {
            id: 'c1',
            name: 'Semantic',
            modes: [
              { modeId: 'm1', name: 'Light' },
              { modeId: 'm2', name: 'Dark' },
            ],
            defaultModeId: 'm1',
          },
        },
        variables: {
          v1: {
            id: 'v1',
            name: 'bg',
            variableCollectionId: 'c1',
            resolvedType: 'COLOR',
            valuesByMode: {
              m1: { r: 1, g: 1, b: 1 }, // Light = white
              m2: { r: 0, g: 0, b: 0 }, // Dark = black
            },
          },
        },
      }),
      { mode: 'Dark' },
    );
    const leaf = (result.dtcg['semantic'] as any)['bg'] as { $value: string };
    expect(leaf.$value).toBe('#000000');
  });

  it('falls back to defaultModeId when the requested mode is not in the collection', () => {
    const result = figmaVariablesToDTCG(
      fixture({
        collections: {
          c1: {
            id: 'c1',
            name: 'Semantic',
            modes: [{ modeId: 'm1', name: 'Light' }],
            defaultModeId: 'm1',
          },
        },
        variables: {
          v1: {
            id: 'v1',
            name: 'bg',
            variableCollectionId: 'c1',
            resolvedType: 'COLOR',
            valuesByMode: { m1: { r: 1, g: 1, b: 1 } },
          },
        },
      }),
      { mode: 'Dark' }, // not in this collection
    );
    const leaf = (result.dtcg['semantic'] as any)['bg'] as { $value: string };
    expect(leaf.$value).toBe('#ffffff');
  });

  it('mode matching is case-insensitive', () => {
    const result = figmaVariablesToDTCG(
      fixture({
        collections: {
          c1: {
            id: 'c1',
            name: 'Sem',
            modes: [
              { modeId: 'm1', name: 'Light' },
              { modeId: 'm2', name: 'Dark' },
            ],
            defaultModeId: 'm1',
          },
        },
        variables: {
          v1: {
            id: 'v1',
            name: 'bg',
            variableCollectionId: 'c1',
            resolvedType: 'COLOR',
            valuesByMode: {
              m1: { r: 1, g: 1, b: 1 },
              m2: { r: 0, g: 0, b: 0 },
            },
          },
        },
      }),
      { mode: 'dArK' },
    );
    const leaf = (result.dtcg['sem'] as any)['bg'] as { $value: string };
    expect(leaf.$value).toBe('#000000');
  });

  it('resolves a VARIABLE_ALIAS to a DTCG {path} reference when both variables are emittable', () => {
    const result = figmaVariablesToDTCG(
      fixture({
        collections: { c1: DEFAULT_COLLECTION },
        variables: {
          base: {
            id: 'base',
            name: 'brand/blue-500',
            variableCollectionId: 'c1',
            resolvedType: 'COLOR',
            valuesByMode: { m1: { r: 0.1, g: 0.32, b: 0.46 } },
          },
          semantic: {
            id: 'semantic',
            name: 'bg/primary',
            variableCollectionId: 'c1',
            resolvedType: 'COLOR',
            valuesByMode: {
              m1: { type: 'VARIABLE_ALIAS', id: 'base' },
            },
          },
        },
      }),
    );

    // Now feed the emitted DTCG through the existing parser and assert
    // that alias resolution round-trips into the DesignSystem shape.
    const parsed = parseW3CTokens(result.dtcg);
    expect(parsed.unresolvedAliases).toEqual([]);
    // Both tokens land in colors — the aliased one resolves to the
    // same concrete hex as the base token. 0.46 * 255 rounds to 117,
    // not 118, so the expected base is #1a5275.
    const colors = parsed.designSystem.colors ?? {};
    const values = Object.values(colors);
    expect(values).toContain('#1a5275');
    // Two distinct named entries both pointing at the same hex.
    expect(Object.keys(colors).length).toBeGreaterThanOrEqual(2);
    expect(new Set(values).size).toBe(1);
  });

  it('drops aliases whose target is filtered out (hidden, remote, unsupported type)', () => {
    const result = figmaVariablesToDTCG(
      fixture({
        collections: { c1: DEFAULT_COLLECTION },
        variables: {
          base: {
            id: 'base',
            name: 'brand/blue-500',
            variableCollectionId: 'c1',
            resolvedType: 'COLOR',
            hiddenFromPublishing: true, // base is hidden
            valuesByMode: { m1: { r: 0.1, g: 0.32, b: 0.46 } },
          },
          alias: {
            id: 'alias',
            name: 'bg/primary',
            variableCollectionId: 'c1',
            resolvedType: 'COLOR',
            valuesByMode: { m1: { type: 'VARIABLE_ALIAS', id: 'base' } },
          },
        },
      }),
    );
    expect(result.tokenCount).toBe(0);
    expect(result.skipped.map((s) => s.reason)).toContain('unresolved_alias');
  });

  it('drops variables marked remote: true (team library references)', () => {
    const result = figmaVariablesToDTCG(
      fixture({
        collections: { c1: DEFAULT_COLLECTION },
        variables: {
          v1: {
            id: 'v1',
            name: 'shared/brand',
            variableCollectionId: 'c1',
            resolvedType: 'COLOR',
            remote: true,
            valuesByMode: { m1: { r: 0, g: 0, b: 0 } },
          },
        },
      }),
    );
    expect(result.tokenCount).toBe(0);
    expect(result.skipped).toEqual([{ name: 'shared/brand', reason: 'remote_library' }]);
  });

  it('namespaces tokens from different collections so names cannot collide', () => {
    const result = figmaVariablesToDTCG(
      fixture({
        collections: {
          a: { id: 'a', name: 'Primitives', modes: [{ modeId: 'm', name: 'Base' }], defaultModeId: 'm' },
          b: { id: 'b', name: 'Semantic',   modes: [{ modeId: 'm', name: 'Base' }], defaultModeId: 'm' },
        },
        variables: {
          p: {
            id: 'p',
            name: 'primary',
            variableCollectionId: 'a',
            resolvedType: 'COLOR',
            valuesByMode: { m: { r: 1, g: 0, b: 0 } },
          },
          s: {
            id: 's',
            name: 'primary',
            variableCollectionId: 'b',
            resolvedType: 'COLOR',
            valuesByMode: { m: { r: 0, g: 1, b: 0 } },
          },
        },
      }),
    );
    expect(result.tokenCount).toBe(2);
    expect(result.collectionsSeen.sort()).toEqual(['Primitives', 'Semantic']);
    const primitivesPrimary = (result.dtcg['primitives'] as any)['primary'] as { $value: string };
    const semanticPrimary = (result.dtcg['semantic'] as any)['primary'] as { $value: string };
    expect(primitivesPrimary.$value).toBe('#ff0000');
    expect(semanticPrimary.$value).toBe('#00ff00');
  });

  it('sanitizes names containing characters outside [a-z0-9-]', () => {
    const result = figmaVariablesToDTCG(
      fixture({
        collections: { c1: DEFAULT_COLLECTION },
        variables: {
          v1: {
            id: 'v1',
            name: 'Brand / Primary 500!',
            variableCollectionId: 'c1',
            resolvedType: 'COLOR',
            valuesByMode: { m1: { r: 1, g: 1, b: 1 } },
          },
        },
      }),
    );
    // "Brand" → "brand", " Primary 500!" → "primary-500"
    const primitives = result.dtcg['primitives'] as any;
    const brand = primitives['brand'];
    const leaf = brand['primary-500'] as { $value: string };
    expect(leaf.$value).toBe('#ffffff');
  });

  it('preserves $description when provided', () => {
    const result = figmaVariablesToDTCG(
      fixture({
        collections: { c1: DEFAULT_COLLECTION },
        variables: {
          v1: {
            id: 'v1',
            name: 'brand',
            variableCollectionId: 'c1',
            resolvedType: 'COLOR',
            description: 'The main brand colour',
            valuesByMode: { m1: { r: 0, g: 0, b: 0 } },
          },
        },
      }),
    );
    const leaf = (result.dtcg['primitives'] as any)['brand'] as {
      $description?: string;
    };
    expect(leaf.$description).toBe('The main brand colour');
  });

  it('records a slug_collision when two variables slug to the same DTCG path', () => {
    // "Brand / Primary" and "brand/primary" both slug to
    // primitives.brand.primary. First-come-first-served: the first
    // entry in `variables` wins, the second is reported explicitly.
    const result = figmaVariablesToDTCG(
      fixture({
        collections: { c1: DEFAULT_COLLECTION },
        variables: {
          v1: {
            id: 'v1',
            name: 'Brand / Primary',
            variableCollectionId: 'c1',
            resolvedType: 'COLOR',
            valuesByMode: { m1: { r: 1, g: 0, b: 0 } }, // red wins
          },
          v2: {
            id: 'v2',
            name: 'brand/primary',
            variableCollectionId: 'c1',
            resolvedType: 'COLOR',
            valuesByMode: { m1: { r: 0, g: 1, b: 0 } }, // green loses
          },
        },
      }),
    );
    expect(result.tokenCount).toBe(1);
    const leaf = (result.dtcg['primitives'] as any)['brand']['primary'] as {
      $value: string;
    };
    expect(leaf.$value).toBe('#ff0000');
    expect(result.skipped).toEqual([
      { name: 'brand/primary', reason: 'slug_collision' },
    ]);
  });

  it('resolves a multi-hop alias chain A → B → C without cycles', () => {
    const result = figmaVariablesToDTCG(
      fixture({
        collections: { c1: DEFAULT_COLLECTION },
        variables: {
          c: {
            id: 'c',
            name: 'brand/blue-500',
            variableCollectionId: 'c1',
            resolvedType: 'COLOR',
            valuesByMode: { m1: { r: 0, g: 0, b: 1 } }, // concrete
          },
          b: {
            id: 'b',
            name: 'brand/primary',
            variableCollectionId: 'c1',
            resolvedType: 'COLOR',
            valuesByMode: { m1: { type: 'VARIABLE_ALIAS', id: 'c' } },
          },
          a: {
            id: 'a',
            name: 'bg/surface',
            variableCollectionId: 'c1',
            resolvedType: 'COLOR',
            valuesByMode: { m1: { type: 'VARIABLE_ALIAS', id: 'b' } },
          },
        },
      }),
    );
    expect(result.tokenCount).toBe(3);
    expect(result.skipped).toEqual([]);
    // All three survive; the parser should resolve A → B → C to #0000ff.
    const parsed = parseW3CTokens(result.dtcg);
    expect(parsed.unresolvedAliases).toEqual([]);
    const colors = parsed.designSystem.colors ?? {};
    const values = Object.values(colors);
    expect(values).toContain('#0000ff');
    expect(new Set(values).size).toBe(1);
  });

  it('drops a self-referential alias cycle without looping forever', () => {
    const result = figmaVariablesToDTCG(
      fixture({
        collections: { c1: DEFAULT_COLLECTION },
        variables: {
          v1: {
            id: 'v1',
            name: 'looping',
            variableCollectionId: 'c1',
            resolvedType: 'COLOR',
            valuesByMode: { m1: { type: 'VARIABLE_ALIAS', id: 'v1' } },
          },
        },
      }),
    );
    expect(result.tokenCount).toBe(0);
    expect(result.skipped).toEqual([{ name: 'looping', reason: 'unresolved_alias' }]);
  });

  it('rejects STRING fontFamily values that are not CSS-shaped lists', () => {
    // Name says "font-family" but value is a single bare word — we
    // deliberately reject it to keep marketing copy out of the tree.
    const result = figmaVariablesToDTCG(
      fixture({
        collections: { c1: DEFAULT_COLLECTION },
        variables: {
          v1: {
            id: 'v1',
            name: 'font-family/body',
            variableCollectionId: 'c1',
            resolvedType: 'STRING',
            valuesByMode: { m1: 'Inter' }, // ambiguous — no comma, not a generic
          },
        },
      }),
    );
    expect(result.tokenCount).toBe(0);
    expect(result.skipped).toEqual([
      { name: 'font-family/body', reason: 'unsupported_type:STRING' },
    ]);
  });

  it('accepts a single well-known generic family as a fontFamily value', () => {
    const result = figmaVariablesToDTCG(
      fixture({
        collections: { c1: DEFAULT_COLLECTION },
        variables: {
          v1: {
            id: 'v1',
            name: 'font-family/system',
            variableCollectionId: 'c1',
            resolvedType: 'STRING',
            valuesByMode: { m1: 'system-ui' },
          },
        },
      }),
    );
    expect(result.tokenCount).toBe(1);
    const leaf = (result.dtcg['primitives'] as any)['font-family']['system'] as {
      $value: string;
      $type: string;
    };
    expect(leaf.$type).toBe('fontFamily');
    expect(leaf.$value).toBe('system-ui');
  });

  it('feeds cleanly through parseW3CTokens end-to-end', () => {
    const result = figmaVariablesToDTCG(
      fixture({
        collections: { c1: DEFAULT_COLLECTION },
        variables: {
          color: {
            id: 'color',
            name: 'brand/primary',
            variableCollectionId: 'c1',
            resolvedType: 'COLOR',
            valuesByMode: { m1: { r: 0.1, g: 0.32, b: 0.46 } },
          },
          spacing: {
            id: 'spacing',
            name: 'spacing/md',
            variableCollectionId: 'c1',
            resolvedType: 'FLOAT',
            valuesByMode: { m1: 16 },
            scopes: ['GAP'],
          },
          radius: {
            id: 'radius',
            name: 'radius/lg',
            variableCollectionId: 'c1',
            resolvedType: 'FLOAT',
            valuesByMode: { m1: 12 },
            scopes: ['CORNER_RADIUS'],
          },
          font: {
            id: 'font',
            name: 'font-family/body',
            variableCollectionId: 'c1',
            resolvedType: 'STRING',
            // Must be a CSS-shaped family list, not a bare word — the
            // value gate rejects "Inter" alone as ambiguous (could be
            // marketing copy). A proper fallback stack passes.
            valuesByMode: { m1: 'Inter, sans-serif' },
          },
        },
      }),
    );

    const parsed = parseW3CTokens(result.dtcg);
    expect(parsed.unresolvedAliases).toEqual([]);

    // At least one entry in each of the four buckets
    expect(parsed.designSystem.colors).toBeDefined();
    expect(parsed.designSystem.spacing).toBeDefined();
    expect(parsed.designSystem.borderRadius).toBeDefined();
    expect(parsed.designSystem.fonts).toBeDefined();
  });
});
