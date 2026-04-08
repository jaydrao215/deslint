import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll, expect } from 'vitest';
import rule from '../../src/rules/lang-attribute.js';

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

ruleTester.run('lang-attribute', rule, {
  valid: [
    // ── Standard 2-letter codes ──
    { code: '<html lang="en"><body /></html>' },
    { code: '<html lang="fr"><body /></html>' },
    { code: '<html lang="zh"><body /></html>' },
    { code: '<html lang="de"><body /></html>' },

    // ── Primary + region ──
    { code: '<html lang="en-US"><body /></html>' },
    { code: '<html lang="en-GB"><body /></html>' },
    { code: '<html lang="zh-CN"><body /></html>' },
    { code: '<html lang="pt-BR"><body /></html>' },

    // ── Primary + script + region ──
    { code: '<html lang="sr-Cyrl-RS"><body /></html>' },
    { code: '<html lang="zh-Hant-TW"><body /></html>' },

    // ── 3-letter primary (ISO 639-3) ──
    { code: '<html lang="fil"><body /></html>' },

    // ── Spread attributes: benefit of the doubt ──
    { code: '<html {...htmlProps}><body /></html>' },

    // ── Non-html elements are ignored ──
    { code: '<div>Content</div>' },
    { code: '<body><p>Text</p></body>' },

    // ── Dynamic lang expression: skipped ──
    { code: '<html lang={locale}><body /></html>' },
  ],

  invalid: [
    // ── Missing lang entirely — autofix adds default "en" ──
    {
      code: '<html><body /></html>',
      errors: [{ messageId: 'missingLang' as const }],
      output: '<html lang="en"><body /></html>',
    },

    // ── Missing lang with configured defaultLang ──
    {
      code: '<html><body /></html>',
      options: [{ defaultLang: 'fr' }],
      errors: [{ messageId: 'missingLang' as const }],
      output: '<html lang="fr"><body /></html>',
    },

    // ── Empty lang attribute ──
    {
      code: '<html lang=""><body /></html>',
      errors: [{ messageId: 'emptyLang' as const }],
    },

    // ── Whitespace-only lang ──
    {
      code: '<html lang="   "><body /></html>',
      errors: [{ messageId: 'emptyLang' as const }],
    },

    // ── Invalid BCP 47 — "english" (full word, not a code) ──
    {
      code: '<html lang="english"><body /></html>',
      errors: [
        {
          messageId: 'invalidLang' as const,
          data: { lang: 'english' },
        },
      ],
    },

    // ── Invalid BCP 47 — "true" (common AI mistake) ──
    {
      code: '<html lang="true"><body /></html>',
      errors: [
        {
          messageId: 'invalidLang' as const,
          data: { lang: 'true' },
        },
      ],
    },

    // ── Invalid BCP 47 — numeric value ──
    {
      code: '<html lang="1"><body /></html>',
      errors: [{ messageId: 'invalidLang' as const }],
    },

    // ── Invalid BCP 47 — underscore instead of hyphen ──
    {
      code: '<html lang="en_US"><body /></html>',
      errors: [{ messageId: 'invalidLang' as const }],
    },
  ],
});

// ─── Cross-framework synthetic-AST tests (S4 via S1 abstraction) ───────────

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
    id: 'lang-attribute',
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

describe('lang-attribute cross-framework (synthetic AST)', () => {
  describe('Plain HTML (via @html-eslint/parser stub)', () => {
    it('reports missingLang on <html> without lang', () => {
      const { context, reports } = makeMockContext();
      const visitor = rule.create(context as any);

      visitor.Tag?.({
        type: 'Tag',
        name: 'html',
        attributes: [],
      });

      expect(reports).toHaveLength(1);
      expect(reports[0].messageId).toBe('missingLang');
    });

    it('passes on <html lang="en">', () => {
      const { context, reports } = makeMockContext();
      const visitor = rule.create(context as any);

      visitor.Tag?.({
        type: 'Tag',
        name: 'html',
        attributes: [
          {
            key: { value: 'lang' },
            value: { value: 'en' },
          },
        ],
      });

      expect(reports).toHaveLength(0);
    });

    it('reports emptyLang on <html lang="">', () => {
      const { context, reports } = makeMockContext();
      const visitor = rule.create(context as any);

      visitor.Tag?.({
        type: 'Tag',
        name: 'html',
        attributes: [
          {
            key: { value: 'lang' },
            value: { value: '' },
          },
        ],
      });

      expect(reports).toHaveLength(1);
      expect(reports[0].messageId).toBe('emptyLang');
    });

    it('reports invalidLang on non-BCP-47 value', () => {
      const { context, reports } = makeMockContext();
      const visitor = rule.create(context as any);

      visitor.Tag?.({
        type: 'Tag',
        name: 'html',
        attributes: [
          {
            key: { value: 'lang' },
            value: { value: 'english' },
          },
        ],
      });

      expect(reports).toHaveLength(1);
      expect(reports[0].messageId).toBe('invalidLang');
    });

    it('ignores non-html tags', () => {
      const { context, reports } = makeMockContext();
      const visitor = rule.create(context as any);

      visitor.Tag?.({
        type: 'Tag',
        name: 'div',
        attributes: [],
      });

      expect(reports).toHaveLength(0);
    });
  });

  describe('Vue', () => {
    it('reports missingLang on <html> root', () => {
      const { context, reports } = makeMockContext();
      const visitor = rule.create(context as any);

      visitor.VElement?.({
        type: 'VElement',
        rawName: 'html',
        startTag: { attributes: [] },
      });

      expect(reports).toHaveLength(1);
      expect(reports[0].messageId).toBe('missingLang');
    });

    it('passes on <html lang="fr">', () => {
      const { context, reports } = makeMockContext();
      const visitor = rule.create(context as any);

      visitor.VElement?.({
        type: 'VElement',
        rawName: 'html',
        startTag: {
          attributes: [
            {
              directive: false,
              key: { name: 'lang' },
              value: { value: 'fr' },
            },
          ],
        },
      });

      expect(reports).toHaveLength(0);
    });

    it('skips when :lang="expr" is bound (dynamic)', () => {
      const { context, reports } = makeMockContext();
      const visitor = rule.create(context as any);

      visitor.VElement?.({
        type: 'VElement',
        rawName: 'html',
        startTag: {
          attributes: [
            {
              directive: true,
              key: { name: { name: 'bind' }, argument: { name: 'lang' } },
              value: { expression: { type: 'Identifier', name: 'locale' } },
            },
          ],
        },
      });

      expect(reports).toHaveLength(0);
    });
  });

  describe('Angular', () => {
    it('reports missingLang on <html>', () => {
      const { context, reports } = makeMockContext();
      const visitor = rule.create(context as any);

      visitor['Element$1']?.({
        name: 'html',
        attributes: [],
        inputs: [],
      });

      expect(reports).toHaveLength(1);
      expect(reports[0].messageId).toBe('missingLang');
    });

    it('passes on static <html lang="pt-BR">', () => {
      const { context, reports } = makeMockContext();
      const visitor = rule.create(context as any);

      visitor['Element$1']?.({
        name: 'html',
        attributes: [{ name: 'lang', value: 'pt-BR' }],
        inputs: [],
      });

      expect(reports).toHaveLength(0);
    });
  });

  describe('Svelte', () => {
    it('reports missingLang on <html>', () => {
      const { context, reports } = makeMockContext();
      const visitor = rule.create(context as any);

      visitor.SvelteElement?.({
        name: 'html',
        startTag: { attributes: [] },
      });

      expect(reports).toHaveLength(1);
      expect(reports[0].messageId).toBe('missingLang');
    });

    it('passes on <html lang="en-GB">', () => {
      const { context, reports } = makeMockContext();
      const visitor = rule.create(context as any);

      visitor.SvelteElement?.({
        name: 'html',
        startTag: {
          attributes: [
            {
              type: 'SvelteAttribute',
              name: 'lang',
              value: [{ type: 'SvelteLiteral', value: 'en-GB' }],
            },
          ],
        },
      });

      expect(reports).toHaveLength(0);
    });
  });

  describe('defaultLang option', () => {
    it('uses "fr" when configured for missing lang on plain HTML', () => {
      const { context, reports } = makeMockContext([{ defaultLang: 'fr' }]);
      const visitor = rule.create(context as any);

      visitor.Tag?.({
        type: 'Tag',
        name: 'html',
        attributes: [],
      });

      expect(reports).toHaveLength(1);
      expect(reports[0].messageId).toBe('missingLang');
      // Note: autofix for non-JSX frameworks is deferred (JSX-only today),
      // so defaultLang only affects the fix payload on JSX. The report
      // still fires for all frameworks.
    });
  });
});
