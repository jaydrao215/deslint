import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll, expect } from 'vitest';
import rule from '../../src/rules/aria-validation.js';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('aria-validation', rule, {
  valid: [
    // ── Valid roles ──
    { code: '<div role="button">Click</div>' },
    { code: '<nav role="navigation">…</nav>' },
    { code: '<div role="alert">…</div>' },
    { code: '<ul role="listbox"><li role="option">A</li></ul>' },
    { code: '<div role="dialog" aria-modal="true">…</div>' },

    // ── Space-separated role list (spec-allowed fallback chain) ──
    { code: '<div role="button menuitem">…</div>' },

    // ── Valid aria-* attributes ──
    { code: '<button aria-label="Close">×</button>' },
    { code: '<div aria-labelledby="lbl">…</div>' },
    { code: '<div aria-describedby="desc">…</div>' },
    { code: '<button aria-pressed="true">Bold</button>' },
    { code: '<div aria-live="polite">…</div>' },
    { code: '<input aria-required="true" aria-invalid="false" />' },
    { code: '<div aria-current="page">Home</div>' },
    { code: '<div aria-haspopup="menu">More</div>' },

    // ── camelCase JSX form ──
    { code: '<div ariaLabel="Close">×</div>' },
    { code: '<div ariaLabelledby="lbl">…</div>' },

    // ── Dynamic role / aria value → trust ──
    { code: '<div role={dynamicRole}>…</div>' },
    { code: '<div aria-label={dynamicLabel}>…</div>' },

    // ── Spread props → benefit of doubt ──
    { code: '<div {...props} aria-foobar="x">…</div>' },

    // ── Non-aria attributes untouched ──
    { code: '<div data-testid="x" className="y">…</div>' },
    { code: '<input type="text" name="email" />' },
  ],

  invalid: [
    // ── Invalid role value ──
    {
      code: '<div role="butotn">…</div>',
      errors: [{ messageId: 'invalidRole' as const, data: { role: 'butotn' } }],
    },
    {
      code: '<div role="container">…</div>',
      errors: [{ messageId: 'invalidRole' as const, data: { role: 'container' } }],
    },
    // ── Invalid one in a space-separated list ──
    {
      code: '<div role="button hovercraft">…</div>',
      errors: [{ messageId: 'invalidRole' as const, data: { role: 'hovercraft' } }],
    },
    // ── Misspelled aria attribute → typo suggestion ──
    {
      code: '<div aria-labelby="lbl">…</div>',
      errors: [
        {
          messageId: 'misspelledAria' as const,
          data: { attr: 'aria-labelby', suggestion: 'aria-labelledby' },
        },
      ],
    },
    {
      code: '<div aria-labeledby="lbl">…</div>',
      errors: [
        {
          messageId: 'misspelledAria' as const,
          data: { attr: 'aria-labeledby', suggestion: 'aria-labelledby' },
        },
      ],
    },
    {
      code: '<div aira-label="Close">×</div>',
      errors: [
        {
          messageId: 'misspelledAria' as const,
          data: { attr: 'aira-label', suggestion: 'aria-label' },
        },
      ],
    },
    // ── Unknown aria-* attribute (no typo suggestion) ──
    {
      code: '<div aria-doesnotexist="x">…</div>',
      errors: [
        {
          messageId: 'invalidAriaAttribute' as const,
          data: { attr: 'aria-doesnotexist' },
        },
      ],
    },
    // ── Multiple errors on the same element ──
    {
      code: '<div role="notarole" aria-fakefield="x">…</div>',
      errors: [
        { messageId: 'invalidRole' as const },
        { messageId: 'invalidAriaAttribute' as const },
      ],
    },
  ],
});

// ─── Cross-framework synthetic-AST tests ───────────────────────────────────

interface MockReport {
  messageId?: string;
  data?: Record<string, unknown>;
}

function makeMockContext(): { context: any; reports: MockReport[] } {
  const reports: MockReport[] = [];
  const context = {
    options: [],
    id: 'aria-validation',
    settings: {},
    parserPath: '',
    parserServices: {},
    getFilename: () => 'test.html',
    getSourceCode: () => ({ getText: () => '' }),
    sourceCode: { getText: () => '' },
    report: (r: MockReport) => reports.push(r),
  };
  return { context, reports };
}

describe('aria-validation cross-framework (synthetic AST)', () => {
  describe('Plain HTML', () => {
    it('reports invalid role', () => {
      const { context, reports } = makeMockContext();
      const visitor = rule.create(context as any);

      visitor.Tag?.({
        type: 'Tag',
        name: 'div',
        attributes: [{ key: { value: 'role' }, value: { value: 'fakerole' } }],
        children: [],
      });

      expect(reports).toHaveLength(1);
      expect(reports[0].messageId).toBe('invalidRole');
    });

    it('reports misspelled aria attribute', () => {
      const { context, reports } = makeMockContext();
      const visitor = rule.create(context as any);

      visitor.Tag?.({
        type: 'Tag',
        name: 'div',
        attributes: [
          { key: { value: 'aria-labelby' }, value: { value: 'x' } },
        ],
        children: [],
      });

      expect(reports).toHaveLength(1);
      expect(reports[0].messageId).toBe('misspelledAria');
      expect(reports[0].data?.suggestion).toBe('aria-labelledby');
    });

    it('passes valid aria-label', () => {
      const { context, reports } = makeMockContext();
      const visitor = rule.create(context as any);

      visitor.Tag?.({
        type: 'Tag',
        name: 'button',
        attributes: [
          { key: { value: 'aria-label' }, value: { value: 'Close' } },
        ],
        children: [],
      });

      expect(reports).toHaveLength(0);
    });
  });

  describe('Vue', () => {
    it('reports invalid role', () => {
      const { context, reports } = makeMockContext();
      const visitor = rule.create(context as any);

      visitor.VElement?.({
        type: 'VElement',
        rawName: 'div',
        startTag: {
          attributes: [
            {
              directive: false,
              key: { name: 'role' },
              value: { value: 'fakerole' },
            },
          ],
        },
        children: [],
      });

      expect(reports).toHaveLength(1);
      expect(reports[0].messageId).toBe('invalidRole');
    });
  });

  describe('Angular', () => {
    it('reports unknown aria attribute', () => {
      const { context, reports } = makeMockContext();
      const visitor = rule.create(context as any);

      visitor['Element$1']?.({
        name: 'div',
        attributes: [{ name: 'aria-doesnotexist', value: 'x' }],
        inputs: [],
        children: [],
      });

      expect(reports).toHaveLength(1);
      expect(reports[0].messageId).toBe('invalidAriaAttribute');
    });
  });

  describe('Svelte', () => {
    it('reports misspelled aria attribute', () => {
      const { context, reports } = makeMockContext();
      const visitor = rule.create(context as any);

      visitor.SvelteElement?.({
        name: 'div',
        startTag: {
          attributes: [
            {
              type: 'SvelteAttribute',
              name: 'aria-labelby',
              value: [{ type: 'SvelteLiteral', value: 'x' }],
            },
          ],
        },
        children: [],
      });

      expect(reports).toHaveLength(1);
      expect(reports[0].messageId).toBe('misspelledAria');
    });
  });
});
