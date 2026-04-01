import { describe, it, expect } from 'vitest';
import { createClassVisitor } from '../../src/utils/class-visitor.js';

describe('createClassVisitor', () => {
  it('returns visitor with all expected selectors', () => {
    const visitor = createClassVisitor(() => {});
    // React/JSX
    expect(visitor).toHaveProperty('JSXAttribute');
    // Vue
    expect(visitor).toHaveProperty('VAttribute[key.name="class"]');
    expect(visitor).toHaveProperty('VAttribute[directive=true][key.name.name="bind"][key.argument.name="class"]');
    // Svelte
    expect(visitor).toHaveProperty('SvelteAttribute[name="class"]');
    expect(visitor).toHaveProperty('SvelteDirective[kind="Class"]');
    // Angular
    expect(visitor).toHaveProperty('BoundAttribute[name="ngClass"]');
    expect(visitor).toHaveProperty('TextAttribute[name="class"]');
    expect(visitor).toHaveProperty('BoundAttribute[name="class"]');
  });

  it('JSXAttribute calls check with className value', () => {
    const calls: string[] = [];
    const visitor = createClassVisitor((value) => { calls.push(value); });

    // Simulate JSX className="bg-red-500 p-4"
    visitor.JSXAttribute({
      name: { type: 'JSXIdentifier', name: 'className' },
      value: { type: 'Literal', value: 'bg-red-500 p-4' },
    } as any);

    expect(calls).toEqual(['bg-red-500 p-4']);
  });

  it('JSXAttribute skips non-class attributes', () => {
    const calls: string[] = [];
    const visitor = createClassVisitor((value) => { calls.push(value); });

    visitor.JSXAttribute({
      name: { type: 'JSXIdentifier', name: 'style' },
      value: { type: 'Literal', value: 'bg-[#FF0000]' },
    } as any);

    expect(calls).toEqual([]);
  });

  it('TextAttribute[name="class"] handles Angular static class', () => {
    const calls: string[] = [];
    const visitor = createClassVisitor((value) => { calls.push(value); });

    // Simulate Angular TextAttribute
    visitor['TextAttribute[name="class"]']({
      name: 'class',
      value: 'bg-[#FF0000] p-4',
    });

    expect(calls).toEqual(['bg-[#FF0000] p-4']);
  });

  it('BoundAttribute[name="ngClass"] extracts keys from object syntax', () => {
    const calls: string[] = [];
    const visitor = createClassVisitor((value) => { calls.push(value); });

    // Simulate Angular [ngClass]="{'bg-[#FF0000]': isActive, 'p-4': true}"
    visitor['BoundAttribute[name="ngClass"]']({
      name: 'ngClass',
      value: {
        source: "{'bg-[#FF0000]': isActive, 'p-4': true}",
      },
    });

    expect(calls).toContain('bg-[#FF0000]');
    expect(calls).toContain('p-4');
  });

  it('BoundAttribute[name="ngClass"] handles double-quoted keys', () => {
    const calls: string[] = [];
    const visitor = createClassVisitor((value) => { calls.push(value); });

    visitor['BoundAttribute[name="ngClass"]']({
      name: 'ngClass',
      value: {
        source: '{"text-[#333]": condition}',
      },
    });

    expect(calls).toContain('text-[#333]');
  });

  it('does not crash on unexpected node shapes', () => {
    const visitor = createClassVisitor(() => {});

    // Should not throw
    expect(() => visitor.JSXAttribute({} as any)).not.toThrow();
    expect(() => visitor.JSXAttribute(null as any)).not.toThrow();
    expect(() => visitor['TextAttribute[name="class"]'](null as any)).not.toThrow();
    expect(() => visitor['BoundAttribute[name="ngClass"]']({} as any)).not.toThrow();
    expect(() => visitor['BoundAttribute[name="class"]']({} as any)).not.toThrow();
  });

  it('handles JSXExpressionContainer with string literal', () => {
    const calls: string[] = [];
    const visitor = createClassVisitor((value) => { calls.push(value); });

    visitor.JSXAttribute({
      name: { type: 'JSXIdentifier', name: 'className' },
      value: {
        type: 'JSXExpressionContainer',
        expression: { type: 'Literal', value: 'bg-[#FF0000]' },
      },
    } as any);

    expect(calls).toEqual(['bg-[#FF0000]']);
  });

  it('handles JSXExpressionContainer with cn() call', () => {
    const calls: string[] = [];
    const visitor = createClassVisitor((value) => { calls.push(value); });

    visitor.JSXAttribute({
      name: { type: 'JSXIdentifier', name: 'className' },
      value: {
        type: 'JSXExpressionContainer',
        expression: {
          type: 'CallExpression',
          callee: { type: 'Identifier', name: 'cn' },
          arguments: [
            { type: 'Literal', value: 'bg-[#FF0000]' },
            { type: 'Literal', value: 'p-4' },
          ],
        },
      },
    } as any);

    expect(calls).toEqual(['bg-[#FF0000]', 'p-4']);
  });

  // ─── Vue :class binding tests ───

  it('Vue :class with string literal', () => {
    const calls: string[] = [];
    const visitor = createClassVisitor((value) => { calls.push(value); });

    const selector = 'VAttribute[directive=true][key.name.name="bind"][key.argument.name="class"]';
    visitor[selector]({
      value: {
        expression: {
          type: 'Literal',
          value: 'bg-red-500 p-4',
        },
      },
    });

    expect(calls).toEqual(['bg-red-500 p-4']);
  });

  it('Vue :class with object expression', () => {
    const calls: string[] = [];
    const visitor = createClassVisitor((value) => { calls.push(value); });

    const selector = 'VAttribute[directive=true][key.name.name="bind"][key.argument.name="class"]';
    visitor[selector]({
      value: {
        expression: {
          type: 'ObjectExpression',
          properties: [
            {
              type: 'Property',
              key: { type: 'Literal', value: 'bg-[#FF0000]' },
            },
            {
              type: 'Property',
              key: { type: 'Literal', value: 'p-4' },
            },
          ],
        },
      },
    });

    expect(calls).toContain('bg-[#FF0000]');
    expect(calls).toContain('p-4');
  });

  it('Vue :class with array expression', () => {
    const calls: string[] = [];
    const visitor = createClassVisitor((value) => { calls.push(value); });

    const selector = 'VAttribute[directive=true][key.name.name="bind"][key.argument.name="class"]';
    visitor[selector]({
      value: {
        expression: {
          type: 'ArrayExpression',
          elements: [
            { type: 'Literal', value: 'bg-blue-500' },
            { type: 'Literal', value: 'text-white' },
          ],
        },
      },
    });

    expect(calls).toEqual(['bg-blue-500', 'text-white']);
  });

  it('Vue :class with object identifier keys', () => {
    const calls: string[] = [];
    const visitor = createClassVisitor((value) => { calls.push(value); });

    const selector = 'VAttribute[directive=true][key.name.name="bind"][key.argument.name="class"]';
    visitor[selector]({
      value: {
        expression: {
          type: 'ObjectExpression',
          properties: [
            {
              type: 'Property',
              key: { type: 'Identifier', name: 'active' },
            },
          ],
        },
      },
    });

    expect(calls).toEqual(['active']);
  });

  // ─── Svelte tests ───

  it('SvelteAttribute[name="class"] handles static class value array', () => {
    const calls: string[] = [];
    const visitor = createClassVisitor((value) => { calls.push(value); });

    visitor['SvelteAttribute[name="class"]']({
      name: 'class',
      value: [
        { type: 'SvelteLiteral', value: 'bg-red-500 p-4' },
      ],
    });

    expect(calls).toEqual(['bg-red-500 p-4']);
  });

  it('SvelteAttribute[name="class"] handles mustache tag with string literal', () => {
    const calls: string[] = [];
    const visitor = createClassVisitor((value) => { calls.push(value); });

    visitor['SvelteAttribute[name="class"]']({
      name: 'class',
      value: [
        { type: 'SvelteLiteral', value: 'bg-red-500 ' },
        {
          type: 'SvelteMustacheTag',
          expression: { type: 'Literal', value: 'p-4' },
        },
      ],
    });

    expect(calls).toEqual(['bg-red-500 ', 'p-4']);
  });

  it('SvelteAttribute[name="class"] handles template literal in mustache', () => {
    const calls: string[] = [];
    const visitor = createClassVisitor((value) => { calls.push(value); });

    visitor['SvelteAttribute[name="class"]']({
      name: 'class',
      value: [
        {
          type: 'SvelteMustacheTag',
          expression: {
            type: 'TemplateLiteral',
            quasis: [
              { value: { raw: 'bg-[#FF0000] ' } },
              { value: { raw: ' text-white' } },
            ],
          },
        },
      ],
    });

    expect(calls).toEqual(['bg-[#FF0000] ', ' text-white']);
  });

  it('SvelteAttribute[name="class"] handles string fallback', () => {
    const calls: string[] = [];
    const visitor = createClassVisitor((value) => { calls.push(value); });

    visitor['SvelteAttribute[name="class"]']({
      name: 'class',
      value: 'bg-blue-500 p-2',
    });

    expect(calls).toEqual(['bg-blue-500 p-2']);
  });

  it('SvelteDirective[kind="Class"] extracts directive name', () => {
    const calls: string[] = [];
    const visitor = createClassVisitor((value) => { calls.push(value); });

    visitor['SvelteDirective[kind="Class"]']({
      kind: 'Class',
      key: { name: 'active' },
    });

    expect(calls).toEqual(['active']);
  });

  it('SvelteAttribute[name="class"] handles boolean attribute gracefully', () => {
    const calls: string[] = [];
    const visitor = createClassVisitor((value) => { calls.push(value); });

    // class without value (boolean attribute)
    visitor['SvelteAttribute[name="class"]']({
      name: 'class',
      value: true,
    });

    expect(calls).toEqual([]);
  });

  // ─── Crash safety for new selectors ───

  it('does not crash on unexpected Vue/Svelte node shapes', () => {
    const visitor = createClassVisitor(() => {});

    const vueSelector = 'VAttribute[directive=true][key.name.name="bind"][key.argument.name="class"]';
    expect(() => visitor[vueSelector]({} as any)).not.toThrow();
    expect(() => visitor[vueSelector](null as any)).not.toThrow();
    expect(() => visitor[vueSelector]({ value: null })).not.toThrow();

    expect(() => visitor['SvelteAttribute[name="class"]']({} as any)).not.toThrow();
    expect(() => visitor['SvelteAttribute[name="class"]'](null as any)).not.toThrow();

    expect(() => visitor['SvelteDirective[kind="Class"]']({} as any)).not.toThrow();
    expect(() => visitor['SvelteDirective[kind="Class"]'](null as any)).not.toThrow();
  });
});
