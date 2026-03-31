import { describe, it, expect } from 'vitest';
import { createClassVisitor } from '../../src/utils/class-visitor.js';

describe('createClassVisitor', () => {
  it('returns visitor with all expected selectors', () => {
    const visitor = createClassVisitor(() => {});
    expect(visitor).toHaveProperty('JSXAttribute');
    expect(visitor).toHaveProperty('VAttribute[key.name="class"]');
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
});
