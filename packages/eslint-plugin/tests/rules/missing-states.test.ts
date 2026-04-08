import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll, expect } from 'vitest';
import rule from '../../src/rules/missing-states.js';

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

ruleTester.run('missing-states', rule, {
  valid: [
    // ── Input with both disabled and aria-invalid ──
    {
      code: '<input disabled aria-invalid="false" />',
    },

    // ── Input with expression-based disabled ──
    {
      code: '<input disabled={isDisabled} aria-invalid={hasError} />',
    },

    // ── Select with all required attributes ──
    {
      code: '<select disabled aria-invalid="false"><option>A</option></select>',
    },

    // ── Textarea with all required attributes ──
    {
      code: '<textarea disabled aria-invalid="false" />',
    },

    // ── Button with disabled (no aria-invalid needed for buttons) ──
    {
      code: '<button disabled>Submit</button>',
    },

    // ── Non-form elements: no checks needed ──
    { code: '<div className="p-4">Hello</div>' },
    { code: '<span>Text</span>' },
    { code: '<p>Paragraph</p>' },

    // ── Spread attributes: benefit of the doubt ──
    {
      code: '<input {...props} />',
    },

    // ── aria-disabled as alternative to disabled ──
    {
      code: '<input aria-disabled="true" aria-invalid="false" />',
    },

    // ── Custom form elements list: div is not in default list ──
    {
      code: '<div />',
    },

    // ── Disabled + aria-invalid both off: no checks ──
    {
      code: '<input />',
      options: [{ requireDisabled: false, requireAriaInvalid: false }],
    },

    // ── Only requireDisabled, and it's present ──
    {
      code: '<input disabled />',
      options: [{ requireAriaInvalid: false }],
    },

    // ── Only requireAriaInvalid, and it's present ──
    {
      code: '<input aria-invalid="false" />',
      options: [{ requireDisabled: false }],
    },
  ],

  invalid: [
    // ── Input without disabled ──
    {
      code: '<input aria-invalid="false" />',
      errors: [{ messageId: 'missingDisabled' as const }],
    },

    // ── Input without aria-invalid ──
    {
      code: '<input disabled />',
      errors: [{ messageId: 'missingAriaInvalid' as const }],
    },

    // ── Input without any state attributes: 2 errors ──
    {
      code: '<input />',
      errors: [
        { messageId: 'missingDisabled' as const },
        { messageId: 'missingAriaInvalid' as const },
      ],
    },

    // ── Select without disabled ──
    {
      code: '<select aria-invalid="false"><option>A</option></select>',
      errors: [{ messageId: 'missingDisabled' as const }],
    },

    // ── Textarea without aria-invalid ──
    {
      code: '<textarea disabled />',
      errors: [{ messageId: 'missingAriaInvalid' as const }],
    },

    // ── Button without disabled (no aria-invalid error for buttons) ──
    {
      code: '<button>Click me</button>',
      errors: [{ messageId: 'missingDisabled' as const }],
    },

    // ── requireAriaRequired enabled ──
    {
      code: '<input disabled aria-invalid="false" />',
      options: [{ requireAriaRequired: true }],
      errors: [{ messageId: 'missingAriaRequired' as const }],
    },

    // ── Custom form elements list ──
    {
      code: '<custom-input />',
      options: [{ formElements: ['custom-input'], requireAriaInvalid: false }],
      errors: [{ messageId: 'missingDisabled' as const }],
    },

    // ── Multiple form elements in same file ──
    {
      code: '<><input /><select><option>A</option></select></>',
      errors: [
        { messageId: 'missingDisabled' as const },
        { messageId: 'missingAriaInvalid' as const },
        { messageId: 'missingDisabled' as const },
        { messageId: 'missingAriaInvalid' as const },
      ],
    },
  ],
});

// ─── Cross-framework synthetic-AST tests (S3 via S1 abstraction) ───────────
// Drive the rule's visitor directly with mock context + synthetic framework
// nodes. Validates that missing-states fires on Svelte/Angular/Vue form
// elements now that it uses createElementVisitor.

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
    id: 'missing-states',
    settings: {},
    parserPath: '',
    parserServices: {},
    getFilename: () => 'test.svelte',
    getSourceCode: () => ({ getText: () => '' }),
    report: (r: MockReport) => reports.push(r),
  };
  return { context, reports };
}

describe('missing-states cross-framework (synthetic AST)', () => {
  describe('Svelte', () => {
    it('reports missingDisabled + missingAriaInvalid on bare <input>', () => {
      const { context, reports } = makeMockContext();
      const visitor = rule.create(context as any);

      visitor.SvelteElement?.({
        name: 'input',
        startTag: { attributes: [] },
      });

      expect(reports.map((r) => r.messageId)).toEqual([
        'missingDisabled',
        'missingAriaInvalid',
      ]);
    });

    it('passes when Svelte <input> has both disabled and aria-invalid', () => {
      const { context, reports } = makeMockContext();
      const visitor = rule.create(context as any);

      visitor.SvelteElement?.({
        name: 'input',
        startTag: {
          attributes: [
            {
              type: 'SvelteAttribute',
              name: 'disabled',
              value: true, // boolean attribute
            },
            {
              type: 'SvelteAttribute',
              name: 'aria-invalid',
              value: [{ type: 'SvelteLiteral', value: 'false' }],
            },
          ],
        },
      });

      expect(reports).toHaveLength(0);
    });

    it('accepts aria-disabled as equivalent to disabled', () => {
      const { context, reports } = makeMockContext();
      const visitor = rule.create(context as any);

      visitor.SvelteElement?.({
        name: 'input',
        startTag: {
          attributes: [
            {
              type: 'SvelteAttribute',
              name: 'aria-disabled',
              value: [{ type: 'SvelteLiteral', value: 'true' }],
            },
            {
              type: 'SvelteAttribute',
              name: 'aria-invalid',
              value: [{ type: 'SvelteLiteral', value: 'false' }],
            },
          ],
        },
      });

      expect(reports).toHaveLength(0);
    });

    it('Svelte <button> only needs disabled (not aria-invalid)', () => {
      const { context, reports } = makeMockContext();
      const visitor = rule.create(context as any);

      visitor.SvelteElement?.({
        name: 'button',
        startTag: {
          attributes: [
            { type: 'SvelteAttribute', name: 'disabled', value: true },
          ],
        },
      });

      expect(reports).toHaveLength(0);
    });

    it('skips non-form elements', () => {
      const { context, reports } = makeMockContext();
      const visitor = rule.create(context as any);

      visitor.SvelteElement?.({
        name: 'div',
        startTag: { attributes: [] },
      });

      expect(reports).toHaveLength(0);
    });

    it('gives benefit of the doubt on SvelteSpreadAttribute', () => {
      const { context, reports } = makeMockContext();
      const visitor = rule.create(context as any);

      visitor.SvelteElement?.({
        name: 'input',
        startTag: {
          attributes: [
            {
              type: 'SvelteSpreadAttribute',
              argument: { type: 'Identifier', name: 'props' },
            },
          ],
        },
      });

      expect(reports).toHaveLength(0);
    });
  });

  describe('Angular', () => {
    it('reports both on bare <input>', () => {
      const { context, reports } = makeMockContext();
      const visitor = rule.create(context as any);

      visitor['Element$1']?.({
        name: 'input',
        attributes: [],
        inputs: [],
      });

      expect(reports.map((r) => r.messageId)).toEqual([
        'missingDisabled',
        'missingAriaInvalid',
      ]);
    });

    it('accepts bound [disabled]=expr as satisfying the disabled requirement', () => {
      const { context, reports } = makeMockContext();
      const visitor = rule.create(context as any);

      visitor['Element$1']?.({
        name: 'input',
        attributes: [],
        inputs: [{ name: 'disabled' }, { name: 'aria-invalid' }],
      });

      // Both attributes present (bound). Rule accepts presence of
      // attribute regardless of static vs. dynamic value.
      expect(reports).toHaveLength(0);
    });

    it('Angular <select> missing disabled reports', () => {
      const { context, reports } = makeMockContext();
      const visitor = rule.create(context as any);

      visitor['Element$1']?.({
        name: 'select',
        attributes: [{ name: 'aria-invalid', value: 'false' }],
        inputs: [],
      });

      expect(reports).toHaveLength(1);
      expect(reports[0].messageId).toBe('missingDisabled');
    });

    it('Angular <button> with disabled passes', () => {
      const { context, reports } = makeMockContext();
      const visitor = rule.create(context as any);

      visitor['Element$1']?.({
        name: 'button',
        attributes: [{ name: 'disabled', value: '' }],
        inputs: [],
      });

      expect(reports).toHaveLength(0);
    });

    it('skips elements with *ngIf (hasSpread → benefit of the doubt)', () => {
      const { context, reports } = makeMockContext();
      const visitor = rule.create(context as any);

      visitor['Element$1']?.({
        name: 'input',
        attributes: [],
        inputs: [],
        templateAttrs: [{ name: 'ngIf' }],
      });

      expect(reports).toHaveLength(0);
    });
  });

  describe('Vue', () => {
    it('reports both on bare <input>', () => {
      const { context, reports } = makeMockContext();
      const visitor = rule.create(context as any);

      visitor.VElement?.({
        type: 'VElement',
        rawName: 'input',
        startTag: { attributes: [] },
      });

      expect(reports.map((r) => r.messageId)).toEqual([
        'missingDisabled',
        'missingAriaInvalid',
      ]);
    });

    it('Vue <input> with static disabled + aria-invalid passes', () => {
      const { context, reports } = makeMockContext();
      const visitor = rule.create(context as any);

      visitor.VElement?.({
        type: 'VElement',
        rawName: 'input',
        startTag: {
          attributes: [
            {
              directive: false,
              key: { name: 'disabled' },
              value: { value: '' },
            },
            {
              directive: false,
              key: { name: 'aria-invalid' },
              value: { value: 'false' },
            },
          ],
        },
      });

      expect(reports).toHaveLength(0);
    });

    it('Vue :disabled="..." bound attribute counts as present', () => {
      const { context, reports } = makeMockContext();
      const visitor = rule.create(context as any);

      visitor.VElement?.({
        type: 'VElement',
        rawName: 'input',
        startTag: {
          attributes: [
            {
              directive: true,
              key: { name: { name: 'bind' }, argument: { name: 'disabled' } },
              value: { expression: { type: 'Identifier', name: 'isDisabled' } },
            },
            {
              directive: true,
              key: { name: { name: 'bind' }, argument: { name: 'aria-invalid' } },
              value: { expression: { type: 'Identifier', name: 'hasError' } },
            },
          ],
        },
      });

      expect(reports).toHaveLength(0);
    });

    it('gives benefit of the doubt on v-bind="..." spread', () => {
      const { context, reports } = makeMockContext();
      const visitor = rule.create(context as any);

      visitor.VElement?.({
        type: 'VElement',
        rawName: 'input',
        startTag: {
          attributes: [
            {
              directive: true,
              key: { name: { name: 'bind' }, argument: null },
            },
          ],
        },
      });

      expect(reports).toHaveLength(0);
    });

    it('walks Vue templateBody via Program handler', () => {
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
              rawName: 'input',
              startTag: { attributes: [] },
              children: [],
            },
          ],
        },
      });

      expect(reports.map((r) => r.messageId)).toEqual([
        'missingDisabled',
        'missingAriaInvalid',
      ]);
    });
  });

  describe('requireAriaRequired option', () => {
    it('reports on Svelte <input> when opted in', () => {
      const { context, reports } = makeMockContext([
        { requireDisabled: false, requireAriaInvalid: false, requireAriaRequired: true },
      ]);
      const visitor = rule.create(context as any);

      visitor.SvelteElement?.({
        name: 'input',
        startTag: { attributes: [] },
      });

      expect(reports).toHaveLength(1);
      expect(reports[0].messageId).toBe('missingAriaRequired');
    });

    it('passes when required is present', () => {
      const { context, reports } = makeMockContext([
        { requireDisabled: false, requireAriaInvalid: false, requireAriaRequired: true },
      ]);
      const visitor = rule.create(context as any);

      visitor.SvelteElement?.({
        name: 'input',
        startTag: {
          attributes: [
            { type: 'SvelteAttribute', name: 'required', value: true },
          ],
        },
      });

      expect(reports).toHaveLength(0);
    });
  });
});
