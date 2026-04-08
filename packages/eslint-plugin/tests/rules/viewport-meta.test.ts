import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll, expect } from 'vitest';
import rule from '../../src/rules/viewport-meta.js';

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

ruleTester.run('viewport-meta', rule, {
  valid: [
    // ── Standard, accessible viewport ──
    {
      code: '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    },
    {
      code: '<meta name="viewport" content="width=device-width, initial-scale=1.0" />',
    },
    // ── maximum-scale at safe value (≥ 2) ──
    {
      code: '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />',
    },
    {
      code: '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=10" />',
    },
    // ── Other meta tags untouched ──
    { code: '<meta charset="utf-8" />' },
    { code: '<meta name="description" content="user-scalable=no" />' }, // not viewport
    // ── No content attribute → skip ──
    { code: '<meta name="viewport" />' },
    // ── Dynamic content → skip ──
    { code: '<meta name="viewport" content={viewportString} />' },
    // ── Spread → benefit of the doubt ──
    { code: '<meta {...viewportProps} />' },
    // ── Unrelated elements ──
    { code: '<div>content</div>' },
  ],

  invalid: [
    // ── user-scalable=no ──
    {
      code: '<meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no" />',
      errors: [{ messageId: 'userScalableNo' as const }],
    },
    {
      code: '<meta name="viewport" content="user-scalable=no" />',
      errors: [{ messageId: 'userScalableNo' as const }],
    },
    // ── user-scalable=0 (numeric form) ──
    {
      code: '<meta name="viewport" content="width=device-width, user-scalable=0" />',
      errors: [{ messageId: 'userScalableNo' as const }],
    },
    // ── maximum-scale=1 ──
    {
      code: '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />',
      errors: [{ messageId: 'maximumScaleTooLow' as const }],
    },
    {
      code: '<meta name="viewport" content="width=device-width, maximum-scale=1.0" />',
      errors: [{ messageId: 'maximumScaleTooLow' as const }],
    },
    // ── minimum-scale > 1 ──
    {
      code: '<meta name="viewport" content="width=device-width, minimum-scale=2" />',
      errors: [{ messageId: 'minimumScaleTooHigh' as const }],
    },
    // ── Combined failures (multi-report) ──
    {
      code: '<meta name="viewport" content="width=device-width, user-scalable=no, maximum-scale=1" />',
      errors: [
        { messageId: 'userScalableNo' as const },
        { messageId: 'maximumScaleTooLow' as const },
      ],
    },
    // ── Whitespace tolerance ──
    {
      code: '<meta name="viewport" content="width=device-width,  user-scalable = no " />',
      errors: [{ messageId: 'userScalableNo' as const }],
    },
    // ── Case-insensitive name ──
    {
      code: '<meta name="VIEWPORT" content="user-scalable=no" />',
      errors: [{ messageId: 'userScalableNo' as const }],
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
    options: [{}],
    id: 'viewport-meta',
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

describe('viewport-meta cross-framework (synthetic AST)', () => {
  describe('Plain HTML', () => {
    it('reports user-scalable=no on plain HTML <meta>', () => {
      const { context, reports } = makeMockContext();
      const visitor = rule.create(context as any);

      visitor.Tag?.({
        type: 'Tag',
        name: 'meta',
        attributes: [
          { key: { value: 'name' }, value: { value: 'viewport' } },
          {
            key: { value: 'content' },
            value: { value: 'width=device-width, user-scalable=no' },
          },
        ],
      });

      expect(reports).toHaveLength(1);
      expect(reports[0].messageId).toBe('userScalableNo');
    });

    it('passes on accessible viewport', () => {
      const { context, reports } = makeMockContext();
      const visitor = rule.create(context as any);

      visitor.Tag?.({
        type: 'Tag',
        name: 'meta',
        attributes: [
          { key: { value: 'name' }, value: { value: 'viewport' } },
          {
            key: { value: 'content' },
            value: { value: 'width=device-width, initial-scale=1' },
          },
        ],
      });

      expect(reports).toHaveLength(0);
    });

    it('ignores non-viewport meta tags', () => {
      const { context, reports } = makeMockContext();
      const visitor = rule.create(context as any);

      visitor.Tag?.({
        type: 'Tag',
        name: 'meta',
        attributes: [
          { key: { value: 'name' }, value: { value: 'description' } },
          { key: { value: 'content' }, value: { value: 'user-scalable=no' } },
        ],
      });

      expect(reports).toHaveLength(0);
    });
  });

  describe('Vue', () => {
    it('reports maximum-scale=1 on Vue <meta>', () => {
      const { context, reports } = makeMockContext();
      const visitor = rule.create(context as any);

      visitor.VElement?.({
        type: 'VElement',
        rawName: 'meta',
        startTag: {
          attributes: [
            {
              directive: false,
              key: { name: 'name' },
              value: { value: 'viewport' },
            },
            {
              directive: false,
              key: { name: 'content' },
              value: { value: 'width=device-width, maximum-scale=1' },
            },
          ],
        },
      });

      expect(reports).toHaveLength(1);
      expect(reports[0].messageId).toBe('maximumScaleTooLow');
    });
  });

  describe('Svelte', () => {
    it('reports user-scalable=no on Svelte <meta>', () => {
      const { context, reports } = makeMockContext();
      const visitor = rule.create(context as any);

      visitor.SvelteElement?.({
        name: 'meta',
        startTag: {
          attributes: [
            {
              type: 'SvelteAttribute',
              name: 'name',
              value: [{ type: 'SvelteLiteral', value: 'viewport' }],
            },
            {
              type: 'SvelteAttribute',
              name: 'content',
              value: [
                {
                  type: 'SvelteLiteral',
                  value: 'width=device-width, user-scalable=no',
                },
              ],
            },
          ],
        },
      });

      expect(reports).toHaveLength(1);
      expect(reports[0].messageId).toBe('userScalableNo');
    });
  });
});
