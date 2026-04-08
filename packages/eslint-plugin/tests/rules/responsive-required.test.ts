import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll, expect } from 'vitest';
import rule from '../../src/rules/responsive-required.js';

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

ruleTester.run('responsive-required', rule, {
  valid: [
    // ── Fixed width WITH both sm: AND md: variants — NOT flagged ──
    { code: '<div className="w-[800px] sm:w-full md:w-auto" />' },
    { code: '<div className="w-[1200px] sm:w-full md:w-1/2" />' },
    { code: '<div className="w-[600px] sm:w-full md:max-w-full" />' },

    // ── One breakpoint required and covered ──
    {
      code: '<div className="w-[800px] sm:w-full" />',
      options: [{ requiredBreakpoints: ['sm'] }],
    },

    // ── Icon/avatar sizing below threshold (< 64px) — NOT flagged ──
    { code: '<div className="w-[32px]" />' },
    { code: '<div className="w-[48px]" />' },
    { code: '<div className="w-[63px]" />' },

    // ── Standard Tailwind classes (no arbitrary) — NOT flagged ──
    { code: '<div className="w-full h-screen" />' },
    { code: '<div className="w-1/2 max-w-xl" />' },
    { code: '<div className="w-8 h-8" />' },

    // ── Percentage/viewport units — NOT flagged ──
    { code: '<div className="w-[50%]" />' },
    { code: '<div className="w-[100vw]" />' },

    // ── Configured custom threshold — value below is icon-sized ──
    {
      code: '<div className="w-[70px]" />',
      options: [{ iconSizeThreshold: 80 }],
    },

    // ── Ignored prefixes option ──
    {
      code: '<div className="w-[800px]" />',
      options: [{ ignoredPrefixes: ['w-'] }],
    },

    // ── max-w WITH responsive coverage — NOT flagged ──
    { code: '<div className="max-w-[800px] sm:w-full md:w-auto" />' },
    { code: '<div className="max-w-[1240px] sm:max-w-full md:max-w-screen-lg" />' },
    { code: '<div className="max-w-[800px] sm:max-w-[600px]" />', options: [{ requiredBreakpoints: ['sm'] }] },

    // ── min-w WITH responsive coverage — NOT flagged ──
    { code: '<div className="min-w-[200px] sm:min-w-0 md:min-w-full" />' },

    // ── Custom required breakpoints — satisfied ──
    {
      code: '<div className="w-[800px] lg:w-full" />',
      options: [{ requiredBreakpoints: ['lg'] }],
    },
  ],

  invalid: [
    // ── w-[Npx] with no responsive variants ──
    {
      code: '<div className="w-[800px]" />',
      errors: [{ messageId: 'missingResponsive' as const }],
    },
    {
      code: '<div className="w-[1200px]" />',
      errors: [{ messageId: 'missingResponsive' as const }],
    },
    {
      code: '<div className="w-[600px]" />',
      errors: [{ messageId: 'missingResponsive' as const }],
    },

    // ── rem-based fixed width ──
    {
      code: '<div className="w-[50rem]" />',
      errors: [{ messageId: 'missingResponsive' as const }],
    },

    // ── Only sm: covered — md: still missing (default requires sm+md) ──
    {
      code: '<div className="w-[800px] sm:w-full" />',
      errors: [{ messageId: 'missingResponsive' as const }],
    },

    // ── Only md: covered — sm: still missing ──
    {
      code: '<div className="w-[800px] md:w-full" />',
      errors: [{ messageId: 'missingResponsive' as const }],
    },

    // ── Exactly at threshold — flagged (threshold is exclusive lower bound) ──
    {
      code: '<div className="w-[64px]" />',
      errors: [{ messageId: 'missingResponsive' as const }],
    },

    // ── Large fixed width without responsive, other classes present ──
    {
      code: '<div className="bg-white p-4 w-[900px] text-sm" />',
      errors: [{ messageId: 'missingResponsive' as const }],
    },

    // ── Custom required breakpoints — sm+lg required, only sm provided ──
    {
      code: '<div className="w-[800px] sm:w-full" />',
      options: [{ requiredBreakpoints: ['sm', 'lg'] }],
      errors: [{ messageId: 'missingResponsive' as const }],
    },

    // ── sm+md+lg required, only sm+md provided ──
    {
      code: '<div className="w-[800px] sm:w-full md:w-1/2" />',
      options: [{ requiredBreakpoints: ['sm', 'md', 'lg'] }],
      errors: [{ messageId: 'missingResponsive' as const }],
    },

    // ── max-w without responsive variants — flagged ──
    {
      code: '<div className="max-w-[800px]" />',
      errors: [{ messageId: 'missingResponsive' as const }],
    },
    {
      code: '<div className="max-w-[1240px]" />',
      errors: [{ messageId: 'missingResponsive' as const }],
    },
    // max-w with only one breakpoint when two are required
    {
      code: '<div className="max-w-[800px] sm:max-w-full" />',
      errors: [{ messageId: 'missingResponsive' as const }],
    },

    // ── min-w without responsive variants — flagged ──
    {
      code: '<div className="min-w-[200px]" />',
      errors: [{ messageId: 'missingResponsive' as const }],
    },
  ],
});

// ─── Cross-framework synthetic-AST tests (S3 via S1 abstraction) ───────────

interface MockReport {
  messageId?: string;
  data?: Record<string, unknown>;
}

function makeMockContext(options: unknown[] = [{}]): {
  context: any;
  reports: MockReport[];
} {
  const reports: MockReport[] = [];
  const context = {
    options,
    id: 'responsive-required',
    settings: {},
    parserPath: '',
    parserServices: {},
    getFilename: () => 'test.svelte',
    getSourceCode: () => ({ getText: () => '' }),
    sourceCode: { getText: () => '' },
    report: (r: MockReport) => reports.push(r),
  };
  return { context, reports };
}

describe('responsive-required cross-framework (synthetic AST)', () => {
  describe('Svelte', () => {
    it('reports fixed width without responsive variants on <div>', () => {
      const { context, reports } = makeMockContext();
      const visitor = rule.create(context as any);

      visitor.SvelteElement?.({
        name: 'div',
        startTag: {
          attributes: [
            {
              type: 'SvelteAttribute',
              name: 'class',
              value: [{ type: 'SvelteLiteral', value: 'w-[800px]' }],
            },
          ],
        },
      });

      expect(reports).toHaveLength(1);
      expect(reports[0].messageId).toBe('missingResponsive');
      expect(reports[0].data?.className).toBe('w-[800px]');
    });

    it('passes when responsive variants are present', () => {
      const { context, reports } = makeMockContext();
      const visitor = rule.create(context as any);

      visitor.SvelteElement?.({
        name: 'div',
        startTag: {
          attributes: [
            {
              type: 'SvelteAttribute',
              name: 'class',
              value: [
                { type: 'SvelteLiteral', value: 'w-[800px] sm:w-full md:w-auto' },
              ],
            },
          ],
        },
      });

      expect(reports).toHaveLength(0);
    });

    it('ignores small icon/avatar widths', () => {
      const { context, reports } = makeMockContext();
      const visitor = rule.create(context as any);

      visitor.SvelteElement?.({
        name: 'div',
        startTag: {
          attributes: [
            {
              type: 'SvelteAttribute',
              name: 'class',
              value: [{ type: 'SvelteLiteral', value: 'w-[32px]' }],
            },
          ],
        },
      });

      expect(reports).toHaveLength(0);
    });

    it('reports max-w-[Npx] without coverage', () => {
      const { context, reports } = makeMockContext();
      const visitor = rule.create(context as any);

      visitor.SvelteElement?.({
        name: 'div',
        startTag: {
          attributes: [
            {
              type: 'SvelteAttribute',
              name: 'class',
              value: [{ type: 'SvelteLiteral', value: 'max-w-[1240px]' }],
            },
          ],
        },
      });

      expect(reports).toHaveLength(1);
    });

    it('skips when class is mustache-interpolated (dynamic)', () => {
      const { context, reports } = makeMockContext();
      const visitor = rule.create(context as any);

      visitor.SvelteElement?.({
        name: 'div',
        startTag: {
          attributes: [
            {
              type: 'SvelteAttribute',
              name: 'class',
              value: [
                {
                  type: 'SvelteMustacheTag',
                  expression: { type: 'Identifier', name: 'cls' },
                },
              ],
            },
          ],
        },
      });

      // Dynamic → value is null → collectElementClasses returns empty → no report
      expect(reports).toHaveLength(0);
    });
  });

  describe('Angular', () => {
    it('reports fixed width on static class attribute', () => {
      const { context, reports } = makeMockContext();
      const visitor = rule.create(context as any);

      visitor['Element$1']?.({
        name: 'div',
        attributes: [{ name: 'class', value: 'w-[900px]' }],
        inputs: [],
      });

      expect(reports).toHaveLength(1);
      expect(reports[0].data?.className).toBe('w-[900px]');
    });

    it('passes when responsive variants cover required breakpoints', () => {
      const { context, reports } = makeMockContext();
      const visitor = rule.create(context as any);

      visitor['Element$1']?.({
        name: 'div',
        attributes: [
          { name: 'class', value: 'w-[800px] sm:w-full md:w-1/2' },
        ],
        inputs: [],
      });

      expect(reports).toHaveLength(0);
    });

    it('skips [class]="expr" bound attribute (dynamic)', () => {
      const { context, reports } = makeMockContext();
      const visitor = rule.create(context as any);

      visitor['Element$1']?.({
        name: 'div',
        attributes: [],
        inputs: [{ name: 'class' }],
      });

      expect(reports).toHaveLength(0);
    });
  });

  describe('Vue', () => {
    it('reports fixed width on static class attribute', () => {
      const { context, reports } = makeMockContext();
      const visitor = rule.create(context as any);

      visitor.VElement?.({
        type: 'VElement',
        rawName: 'div',
        startTag: {
          attributes: [
            {
              directive: false,
              key: { name: 'class' },
              value: { value: 'w-[1200px]' },
            },
          ],
        },
      });

      expect(reports).toHaveLength(1);
      expect(reports[0].data?.className).toBe('w-[1200px]');
    });

    it('passes with responsive variants', () => {
      const { context, reports } = makeMockContext();
      const visitor = rule.create(context as any);

      visitor.VElement?.({
        type: 'VElement',
        rawName: 'div',
        startTag: {
          attributes: [
            {
              directive: false,
              key: { name: 'class' },
              value: { value: 'w-[800px] sm:w-full md:w-auto' },
            },
          ],
        },
      });

      expect(reports).toHaveLength(0);
    });

    it('walks templateBody through Program handler', () => {
      const { context, reports } = makeMockContext();
      const visitor = rule.create(context as any);

      visitor.Program?.({
        templateBody: {
          type: 'VElement',
          rawName: 'template',
          startTag: { attributes: [] },
          children: [
            {
              type: 'VElement',
              rawName: 'div',
              startTag: {
                attributes: [
                  {
                    directive: false,
                    key: { name: 'class' },
                    value: { value: 'min-w-[200px]' },
                  },
                ],
              },
              children: [],
            },
          ],
        },
      });

      expect(reports).toHaveLength(1);
      expect(reports[0].data?.className).toBe('min-w-[200px]');
    });
  });
});
