import { describe, it, expect } from 'vitest';
import {
  createElementVisitor,
  getAttribute,
  getStaticAttributeValue,
  hasSpreadAttribute,
  type NormalizedElement,
} from '../../src/utils/element-visitor.js';

/**
 * Tests for the framework-agnostic element visitor — sprint item S1.
 *
 * These tests use SYNTHETIC AST shapes rather than real parser output, which
 * keeps the suite fast, parser-version-agnostic, and lets us verify the
 * dispatch contract without pulling in vue/svelte/angular parsers. Real
 * parser integration is exercised by rule-level tests that use
 * `@typescript-eslint/rule-tester`.
 */

function collector() {
  const seen: NormalizedElement[] = [];
  return { seen, check: (el: NormalizedElement) => seen.push(el) };
}

describe('createElementVisitor', () => {
  it('returns visitor with all framework dispatch selectors', () => {
    const visitor = createElementVisitor({ check: () => {} });
    expect(visitor).toHaveProperty('JSXOpeningElement');
    expect(visitor).toHaveProperty('Program');
    expect(visitor).toHaveProperty('VElement');
    expect(visitor).toHaveProperty('SvelteElement');
    expect(visitor).toHaveProperty('Element$1');
    expect(visitor).toHaveProperty('Element');
    expect(visitor).toHaveProperty('Tag');
  });

  // ─── React / JSX ────────────────────────────────────────────────────────

  describe('JSX dispatch', () => {
    it('normalizes a simple <img alt="hi" />', () => {
      const { seen, check } = collector();
      const visitor = createElementVisitor({ check });

      visitor.JSXOpeningElement({
        type: 'JSXOpeningElement',
        name: { type: 'JSXIdentifier', name: 'img' },
        attributes: [
          {
            type: 'JSXAttribute',
            name: { type: 'JSXIdentifier', name: 'alt' },
            value: { type: 'Literal', value: 'hi' },
          },
        ],
      } as any);

      expect(seen).toHaveLength(1);
      expect(seen[0].framework).toBe('jsx');
      expect(seen[0].tagName).toBe('img');
      expect(seen[0].hasSpread).toBe(false);
      expect(seen[0].attributes).toHaveLength(1);
      expect(seen[0].attributes[0]).toMatchObject({
        name: 'alt',
        value: 'hi',
        isSpread: false,
      });
    });

    it('detects JSX spread attributes', () => {
      const { seen, check } = collector();
      const visitor = createElementVisitor({ check });

      visitor.JSXOpeningElement({
        type: 'JSXOpeningElement',
        name: { type: 'JSXIdentifier', name: 'img' },
        attributes: [
          { type: 'JSXSpreadAttribute', argument: { type: 'Identifier', name: 'props' } },
        ],
      } as any);

      expect(seen).toHaveLength(1);
      expect(seen[0].hasSpread).toBe(true);
    });

    it('returns null for dynamic attribute values', () => {
      const { seen, check } = collector();
      const visitor = createElementVisitor({ check });

      visitor.JSXOpeningElement({
        type: 'JSXOpeningElement',
        name: { type: 'JSXIdentifier', name: 'img' },
        attributes: [
          {
            type: 'JSXAttribute',
            name: { type: 'JSXIdentifier', name: 'alt' },
            value: {
              type: 'JSXExpressionContainer',
              expression: { type: 'Identifier', name: 'title' },
            },
          },
        ],
      } as any);

      expect(seen[0].attributes[0].value).toBeNull();
    });

    it('unwraps JSXExpressionContainer with string literal', () => {
      const { seen, check } = collector();
      const visitor = createElementVisitor({ check });

      visitor.JSXOpeningElement({
        type: 'JSXOpeningElement',
        name: { type: 'JSXIdentifier', name: 'img' },
        attributes: [
          {
            type: 'JSXAttribute',
            name: { type: 'JSXIdentifier', name: 'alt' },
            value: {
              type: 'JSXExpressionContainer',
              expression: { type: 'Literal', value: 'static' },
            },
          },
        ],
      } as any);

      expect(seen[0].attributes[0].value).toBe('static');
    });

    it('treats value-less attribute as empty string', () => {
      const { seen, check } = collector();
      const visitor = createElementVisitor({ check });

      visitor.JSXOpeningElement({
        type: 'JSXOpeningElement',
        name: { type: 'JSXIdentifier', name: 'img' },
        attributes: [
          {
            type: 'JSXAttribute',
            name: { type: 'JSXIdentifier', name: 'alt' },
            value: null,
          },
        ],
      } as any);

      expect(seen[0].attributes[0].value).toBe('');
    });

    it('handles JSXNamespacedName tag', () => {
      const { seen, check } = collector();
      const visitor = createElementVisitor({ check });

      visitor.JSXOpeningElement({
        type: 'JSXOpeningElement',
        name: {
          type: 'JSXNamespacedName',
          namespace: { name: 'svg' },
          name: { name: 'image' },
        },
        attributes: [],
      } as any);

      expect(seen[0].tagName).toBe('svg:image');
    });

    it('skips JSXMemberExpression tags (e.g. Foo.Bar)', () => {
      const { seen, check } = collector();
      const visitor = createElementVisitor({ check });

      visitor.JSXOpeningElement({
        type: 'JSXOpeningElement',
        name: {
          type: 'JSXMemberExpression',
          object: { type: 'JSXIdentifier', name: 'Foo' },
          property: { type: 'JSXIdentifier', name: 'Bar' },
        },
        attributes: [],
      } as any);

      expect(seen).toHaveLength(0);
    });
  });

  // ─── tagNames filter ────────────────────────────────────────────────────

  describe('tagNames filter', () => {
    it('only fires for listed tag names (case-insensitive)', () => {
      const { seen, check } = collector();
      const visitor = createElementVisitor({ check, tagNames: ['img', 'Image'] });

      visitor.JSXOpeningElement({
        type: 'JSXOpeningElement',
        name: { type: 'JSXIdentifier', name: 'img' },
        attributes: [],
      } as any);
      visitor.JSXOpeningElement({
        type: 'JSXOpeningElement',
        name: { type: 'JSXIdentifier', name: 'div' },
        attributes: [],
      } as any);
      visitor.JSXOpeningElement({
        type: 'JSXOpeningElement',
        name: { type: 'JSXIdentifier', name: 'Image' },
        attributes: [],
      } as any);

      expect(seen.map((e) => e.tagName)).toEqual(['img', 'Image']);
    });
  });

  // ─── Vue ────────────────────────────────────────────────────────────────

  describe('Vue dispatch', () => {
    it('walks Program.templateBody and normalizes VElements', () => {
      const { seen, check } = collector();
      const visitor = createElementVisitor({ check });

      visitor.Program({
        templateBody: {
          type: 'VElement',
          rawName: 'template',
          startTag: { attributes: [] },
          children: [
            {
              type: 'VElement',
              rawName: 'img',
              startTag: {
                attributes: [
                  {
                    directive: false,
                    key: { name: 'alt' },
                    value: { value: 'hi' },
                  },
                ],
              },
              children: [],
            },
          ],
        },
      } as any);

      const imgs = seen.filter((e) => e.tagName === 'img');
      expect(imgs).toHaveLength(1);
      expect(imgs[0].framework).toBe('vue');
      expect(imgs[0].attributes[0]).toMatchObject({ name: 'alt', value: 'hi' });
    });

    it('VElement selector fallback also dispatches', () => {
      const { seen, check } = collector();
      const visitor = createElementVisitor({ check });

      visitor.VElement({
        type: 'VElement',
        rawName: 'button',
        startTag: {
          attributes: [
            {
              directive: false,
              key: { name: 'type' },
              value: { value: 'submit' },
            },
          ],
        },
      });

      expect(seen).toHaveLength(1);
      expect(seen[0].tagName).toBe('button');
      expect(seen[0].attributes[0].value).toBe('submit');
    });

    it('detects v-bind="..." as spread', () => {
      const { seen, check } = collector();
      const visitor = createElementVisitor({ check });

      visitor.VElement({
        type: 'VElement',
        rawName: 'img',
        startTag: {
          attributes: [
            {
              directive: true,
              key: { name: { name: 'bind' }, argument: null },
            },
          ],
        },
      });

      expect(seen[0].hasSpread).toBe(true);
    });

    it('bound :alt="expr" normalizes with null value', () => {
      const { seen, check } = collector();
      const visitor = createElementVisitor({ check });

      visitor.VElement({
        type: 'VElement',
        rawName: 'img',
        startTag: {
          attributes: [
            {
              directive: true,
              key: { name: { name: 'bind' }, argument: { name: 'alt' } },
              value: { expression: { type: 'Identifier', name: 'title' } },
            },
          ],
        },
      });

      expect(seen[0].attributes[0]).toMatchObject({ name: 'alt', value: null });
    });
  });

  // ─── Svelte ─────────────────────────────────────────────────────────────

  describe('Svelte dispatch', () => {
    it('normalizes SvelteElement with static attribute', () => {
      const { seen, check } = collector();
      const visitor = createElementVisitor({ check });

      visitor.SvelteElement({
        name: 'img',
        startTag: {
          attributes: [
            {
              type: 'SvelteAttribute',
              name: 'alt',
              value: [{ type: 'SvelteLiteral', value: 'hi' }],
            },
          ],
        },
      });

      expect(seen[0].framework).toBe('svelte');
      expect(seen[0].tagName).toBe('img');
      expect(seen[0].attributes[0]).toMatchObject({ name: 'alt', value: 'hi' });
    });

    it('returns null value for mustache-interpolated Svelte attribute', () => {
      const { seen, check } = collector();
      const visitor = createElementVisitor({ check });

      visitor.SvelteElement({
        name: 'img',
        startTag: {
          attributes: [
            {
              type: 'SvelteAttribute',
              name: 'alt',
              value: [
                { type: 'SvelteLiteral', value: 'hi ' },
                {
                  type: 'SvelteMustacheTag',
                  expression: { type: 'Identifier', name: 'title' },
                },
              ],
            },
          ],
        },
      });

      expect(seen[0].attributes[0].value).toBeNull();
    });

    it('detects SvelteSpreadAttribute', () => {
      const { seen, check } = collector();
      const visitor = createElementVisitor({ check });

      visitor.SvelteElement({
        name: 'img',
        startTag: {
          attributes: [
            { type: 'SvelteSpreadAttribute', argument: { type: 'Identifier', name: 'props' } },
          ],
        },
      });

      expect(seen[0].hasSpread).toBe(true);
    });
  });

  // ─── Angular ────────────────────────────────────────────────────────────

  describe('Angular dispatch', () => {
    it('Element$1 normalizes static + bound attributes', () => {
      const { seen, check } = collector();
      const visitor = createElementVisitor({ check });

      visitor['Element$1']({
        name: 'img',
        attributes: [{ name: 'alt', value: 'hi' }],
        inputs: [{ name: 'src' }],
      });

      expect(seen[0].framework).toBe('angular');
      expect(seen[0].tagName).toBe('img');
      expect(seen[0].attributes).toHaveLength(2);
      expect(getStaticAttributeValue(seen[0], 'alt')).toBe('hi');
      expect(getStaticAttributeValue(seen[0], 'src')).toBeNull();
    });

    it('Element selector only fires for Angular-shaped nodes', () => {
      const { seen, check } = collector();
      const visitor = createElementVisitor({ check });

      // Without inputs/outputs, the Element selector should skip
      visitor.Element({ name: 'img', attributes: [] });
      expect(seen).toHaveLength(0);

      // With inputs/outputs, it should dispatch
      visitor.Element({
        name: 'img',
        attributes: [{ name: 'alt', value: 'hi' }],
        inputs: [],
        outputs: [],
      });
      expect(seen).toHaveLength(1);
    });

    it('flags structural directives (*ngIf, *ngFor) as hasSpread', () => {
      const { seen, check } = collector();
      const visitor = createElementVisitor({ check });

      visitor['Element$1']({
        name: 'div',
        attributes: [],
        inputs: [],
        templateAttrs: [{ name: 'ngIf' }],
      });

      expect(seen[0].hasSpread).toBe(true);
    });
  });

  // ─── HTML stub ──────────────────────────────────────────────────────────

  describe('HTML dispatch (S2 stub)', () => {
    it('normalizes an @html-eslint/parser Tag shape', () => {
      const { seen, check } = collector();
      const visitor = createElementVisitor({ check });

      visitor.Tag({
        type: 'Tag',
        name: 'img',
        attributes: [
          {
            key: { value: 'alt' },
            value: { value: 'hi' },
          },
        ],
      });

      expect(seen).toHaveLength(1);
      expect(seen[0].framework).toBe('html');
      expect(seen[0].tagName).toBe('img');
      expect(seen[0].attributes[0]).toMatchObject({ name: 'alt', value: 'hi' });
    });
  });

  // ─── Crash safety (CLAUDE.md: try/catch everywhere) ─────────────────────

  describe('crash safety', () => {
    it('never throws on unexpected node shapes', () => {
      const visitor = createElementVisitor({ check: () => {} });

      expect(() => visitor.JSXOpeningElement(null as any)).not.toThrow();
      expect(() => visitor.JSXOpeningElement({} as any)).not.toThrow();
      expect(() => visitor.Program(null as any)).not.toThrow();
      expect(() => visitor.Program({ templateBody: null } as any)).not.toThrow();
      expect(() => visitor.VElement(null as any)).not.toThrow();
      expect(() => visitor.VElement({} as any)).not.toThrow();
      expect(() => visitor.SvelteElement(null as any)).not.toThrow();
      expect(() => visitor.SvelteElement({} as any)).not.toThrow();
      expect(() => visitor['Element$1'](null as any)).not.toThrow();
      expect(() => visitor['Element$1']({} as any)).not.toThrow();
      expect(() => visitor.Element(null as any)).not.toThrow();
      expect(() => visitor.Element({} as any)).not.toThrow();
      expect(() => visitor.Tag(null as any)).not.toThrow();
      expect(() => visitor.Tag({} as any)).not.toThrow();
    });

    it('does not dispatch when tagName is unresolvable', () => {
      const { seen, check } = collector();
      const visitor = createElementVisitor({ check });

      visitor.JSXOpeningElement({
        type: 'JSXOpeningElement',
        name: { type: 'JSXIdentifier' }, // missing .name
        attributes: [],
      } as any);

      expect(seen).toHaveLength(0);
    });
  });
});

// ─── Helpers ──────────────────────────────────────────────────────────────

describe('element-visitor helpers', () => {
  const makeEl = (attrs: Array<{ name: string; value: string | null }>): NormalizedElement => ({
    tagName: 'img',
    attributes: attrs.map((a) => ({ ...a, node: {}, isSpread: false })),
    hasSpread: false,
    node: {},
    framework: 'jsx',
  });

  describe('getAttribute', () => {
    it('finds by exact name', () => {
      const el = makeEl([{ name: 'alt', value: 'hi' }]);
      expect(getAttribute(el, 'alt')?.value).toBe('hi');
    });

    it('is case-insensitive', () => {
      const el = makeEl([{ name: 'ALT', value: 'hi' }]);
      expect(getAttribute(el, 'alt')?.value).toBe('hi');
    });

    it('normalizes camelCase to kebab-case', () => {
      const el = makeEl([{ name: 'ariaLabel', value: 'close' }]);
      expect(getAttribute(el, 'aria-label')?.value).toBe('close');
    });

    it('returns null for missing', () => {
      const el = makeEl([{ name: 'alt', value: 'hi' }]);
      expect(getAttribute(el, 'src')).toBeNull();
    });
  });

  describe('getStaticAttributeValue', () => {
    it('returns the static string', () => {
      const el = makeEl([{ name: 'alt', value: 'hi' }]);
      expect(getStaticAttributeValue(el, 'alt')).toBe('hi');
    });

    it('returns null for dynamic (value=null) attributes', () => {
      const el = makeEl([{ name: 'alt', value: null }]);
      expect(getStaticAttributeValue(el, 'alt')).toBeNull();
    });

    it('returns null for missing attributes', () => {
      const el = makeEl([]);
      expect(getStaticAttributeValue(el, 'alt')).toBeNull();
    });

    it('returns empty string for value-less boolean attribute', () => {
      const el = makeEl([{ name: 'disabled', value: '' }]);
      expect(getStaticAttributeValue(el, 'disabled')).toBe('');
    });
  });

  describe('hasSpreadAttribute', () => {
    it('reflects NormalizedElement.hasSpread', () => {
      const el = makeEl([]);
      expect(hasSpreadAttribute(el)).toBe(false);
      expect(hasSpreadAttribute({ ...el, hasSpread: true })).toBe(true);
    });
  });
});
