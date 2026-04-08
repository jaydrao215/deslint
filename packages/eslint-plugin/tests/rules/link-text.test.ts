import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll, expect } from 'vitest';
import rule from '../../src/rules/link-text.js';

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

ruleTester.run('link-text', rule, {
  valid: [
    // ── Descriptive link text ──
    { code: '<a href="/docs">Read the API reference</a>' },
    { code: '<a href="/about">About our company</a>' },
    { code: '<a href="/blog/post-1">Why we use Tailwind</a>' },

    // ── aria-label provides accessible name ──
    { code: '<a href="/x" aria-label="Go to homepage">→</a>' },
    { code: '<a href="/x" aria-label="Read more about WCAG"><Icon /></a>' },

    // ── aria-labelledby (we trust the reference) ──
    { code: '<a href="/x" aria-labelledby="title-1">click here</a>' },

    // ── title attribute ──
    { code: '<a href="/x" title="Open the docs">→</a>' },

    // ── Dynamic children: skipped ──
    { code: '<a href="/x">{label}</a>' },
    { code: '<a href="/x">{t("link.label")}</a>' },

    // ── Dynamic aria-label: skipped ──
    { code: '<a href="/x" aria-label={dynamicLabel}>more</a>' },

    // ── Spread: benefit of the doubt ──
    { code: '<a {...linkProps}>more</a>' },

    // ── Generic word as part of a longer phrase: NOT exact match → fine ──
    { code: '<a href="/docs">Read more about Wallace\'s biography</a>' },
    { code: '<a href="/help">Click here for FAQ on shipping costs</a>' },

    // ── Non-anchor elements untouched ──
    { code: '<button>click here</button>' },
    { code: '<div>read more</div>' },

    // ── PascalCase <Link> with descriptive text → fine ──
    { code: '<Link href="/api">View API reference</Link>' },
    { code: '<Link href="/x" aria-label="Open settings"><Icon /></Link>' },

    // ── Lowercase <link rel="stylesheet"> must NOT match Link component ──
    { code: '<link rel="stylesheet" href="/x.css" />' },

    // ── Custom component name not in linkComponents → ignored ──
    { code: '<MyButton>click here</MyButton>' },
  ],

  invalid: [
    // ── "Click here" — exact match ──
    {
      code: '<a href="/x">click here</a>',
      errors: [
        {
          messageId: 'genericLinkText' as const,
          data: { text: 'click here' },
        },
      ],
    },
    // ── Capital + punctuation tolerance ──
    {
      code: '<a href="/x">Click Here!</a>',
      errors: [{ messageId: 'genericLinkText' as const }],
    },
    {
      code: '<a href="/x">Read More →</a>',
      errors: [{ messageId: 'genericLinkText' as const }],
    },
    // ── "More" alone ──
    {
      code: '<a href="/x">more</a>',
      errors: [{ messageId: 'genericLinkText' as const }],
    },
    {
      code: '<a href="/x">Learn more</a>',
      errors: [{ messageId: 'genericLinkText' as const }],
    },
    // ── "here" ──
    {
      code: '<a href="/x">here</a>',
      errors: [{ messageId: 'genericLinkText' as const }],
    },
    // ── Empty link with no children ──
    {
      code: '<a href="/x"></a>',
      errors: [{ messageId: 'emptyLink' as const }],
    },
    // ── Whitespace-only link ──
    {
      code: '<a href="/x">   </a>',
      errors: [{ messageId: 'emptyLink' as const }],
    },
    // ── Empty aria-label falls through to text checks → emptyLink ──
    {
      code: '<a href="/x" aria-label=""></a>',
      errors: [{ messageId: 'emptyLink' as const }],
    },
    // ── additionalGenericTexts option ──
    {
      code: '<a href="/x">tap here</a>',
      options: [{ additionalGenericTexts: ['tap here'] }],
      errors: [{ messageId: 'genericLinkText' as const }],
    },
    // ── Default linkComponents catches Next.js <Link> ──
    {
      code: '<Link href="/x">click here</Link>',
      errors: [{ messageId: 'genericLinkText' as const }],
    },
    {
      code: '<NextLink href="/x">read more</NextLink>',
      errors: [{ messageId: 'genericLinkText' as const }],
    },
    {
      code: '<Link href="/x"></Link>',
      errors: [{ messageId: 'emptyLink' as const }],
    },
    // ── Custom linkComponents list ──
    {
      code: '<RouterLink to="/x">click here</RouterLink>',
      options: [{ linkComponents: ['RouterLink'] }],
      errors: [{ messageId: 'genericLinkText' as const }],
    },
    // ── Nested element with static text → still works ──
    {
      code: '<a href="/x"><span>read more</span></a>',
      errors: [{ messageId: 'genericLinkText' as const }],
    },
  ],
});

// ─── Cross-framework synthetic-AST tests ───────────────────────────────────

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
    id: 'link-text',
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

describe('link-text cross-framework (synthetic AST)', () => {
  describe('Plain HTML', () => {
    it('reports generic "click here"', () => {
      const { context, reports } = makeMockContext();
      const visitor = rule.create(context as any);

      visitor.Tag?.({
        type: 'Tag',
        name: 'a',
        attributes: [{ key: { value: 'href' }, value: { value: '/x' } }],
        children: [{ type: 'Text', value: 'click here' }],
      });

      expect(reports).toHaveLength(1);
      expect(reports[0].messageId).toBe('genericLinkText');
    });

    it('passes on descriptive text', () => {
      const { context, reports } = makeMockContext();
      const visitor = rule.create(context as any);

      visitor.Tag?.({
        type: 'Tag',
        name: 'a',
        attributes: [{ key: { value: 'href' }, value: { value: '/x' } }],
        children: [{ type: 'Text', value: 'Read the API reference' }],
      });

      expect(reports).toHaveLength(0);
    });

    it('reports empty link (no children)', () => {
      const { context, reports } = makeMockContext();
      const visitor = rule.create(context as any);

      visitor.Tag?.({
        type: 'Tag',
        name: 'a',
        attributes: [{ key: { value: 'href' }, value: { value: '/x' } }],
        children: [],
      });

      expect(reports).toHaveLength(1);
      expect(reports[0].messageId).toBe('emptyLink');
    });

    it('passes when aria-label is set', () => {
      const { context, reports } = makeMockContext();
      const visitor = rule.create(context as any);

      visitor.Tag?.({
        type: 'Tag',
        name: 'a',
        attributes: [
          { key: { value: 'href' }, value: { value: '/x' } },
          { key: { value: 'aria-label' }, value: { value: 'Go home' } },
        ],
        children: [{ type: 'Text', value: 'click here' }],
      });

      expect(reports).toHaveLength(0);
    });
  });

  describe('Vue', () => {
    it('reports generic text on Vue <a>', () => {
      const { context, reports } = makeMockContext();
      const visitor = rule.create(context as any);

      visitor.VElement?.({
        type: 'VElement',
        rawName: 'a',
        startTag: {
          attributes: [
            {
              directive: false,
              key: { name: 'href' },
              value: { value: '/x' },
            },
          ],
        },
        children: [{ type: 'VText', value: 'read more' }],
      });

      expect(reports).toHaveLength(1);
      expect(reports[0].messageId).toBe('genericLinkText');
    });
  });

  describe('Svelte', () => {
    it('reports empty link', () => {
      const { context, reports } = makeMockContext();
      const visitor = rule.create(context as any);

      visitor.SvelteElement?.({
        name: 'a',
        startTag: {
          attributes: [
            {
              type: 'SvelteAttribute',
              name: 'href',
              value: [{ type: 'SvelteLiteral', value: '/x' }],
            },
          ],
        },
        children: [],
      });

      expect(reports).toHaveLength(1);
      expect(reports[0].messageId).toBe('emptyLink');
    });
  });

  describe('Angular', () => {
    it('reports generic text on Angular <a>', () => {
      const { context, reports } = makeMockContext();
      const visitor = rule.create(context as any);

      visitor['Element$1']?.({
        name: 'a',
        attributes: [{ name: 'href', value: '/x' }],
        inputs: [],
        children: [{ type: 'Text', value: 'click here' }],
      });

      expect(reports).toHaveLength(1);
      expect(reports[0].messageId).toBe('genericLinkText');
    });
  });
});
