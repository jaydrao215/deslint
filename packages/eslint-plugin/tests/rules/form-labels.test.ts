import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll, expect } from 'vitest';
import rule from '../../src/rules/form-labels.js';

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

ruleTester.run('form-labels', rule, {
  valid: [
    // ── Wrapping <label> ──
    { code: '<label>Name <input type="text" /></label>' },
    { code: '<label><span>Email</span><input type="email" /></label>' },
    { code: '<label>Bio<textarea></textarea></label>' },
    { code: '<label>Country<select><option>US</option></select></label>' },

    // ── <label htmlFor="..."> + matching id ──
    { code: '<><label htmlFor="name">Name</label><input id="name" /></>' },
    { code: '<><label htmlFor="bio">Bio</label><textarea id="bio"></textarea></>' },

    // ── aria-label / aria-labelledby ──
    { code: '<input type="text" aria-label="Search" />' },
    { code: '<input type="text" aria-labelledby="lbl-1" />' },
    { code: '<textarea aria-label="Description"></textarea>' },
    { code: '<select aria-label="Country"><option>US</option></select>' },

    // ── Non-labelable input types ──
    { code: '<input type="hidden" name="csrf" value="x" />' },
    { code: '<input type="submit" value="Save" />' },
    { code: '<input type="reset" value="Reset" />' },
    { code: '<input type="button" value="Click" />' },
    { code: '<input type="image" alt="Submit" src="/btn.png" />' },

    // ── Spread props → benefit of the doubt ──
    { code: '<input {...register("name")} />' },
    { code: '<input type="text" {...props} />' },

    // ── Dynamic aria-label ──
    { code: '<input type="text" aria-label={dynamicLabel} />' },

    // ── Non-form elements untouched ──
    { code: '<button>Click me</button>' },
    { code: '<div>Hello</div>' },

    // ── PascalCase custom components are NOT native form controls ──
    // (regression: shadcn-ui/taxonomy ships <Input>, MUI ships <TextField>,
    // both render their own internal native input + label. We have no way
    // to verify their internals statically — give them benefit of doubt.)
    { code: '<Input type="search" placeholder="Search" />' },
    { code: '<TextField label="Email" />' },
    { code: '<Select><Option>US</Option></Select>' },
    { code: '<Textarea />' },
  ],

  invalid: [
    // ── Bare input — no label at all ──
    {
      code: '<input type="text" />',
      errors: [
        {
          messageId: 'missingLabel' as const,
          data: { tag: 'input' },
        },
      ],
    },
    // ── Bare textarea ──
    {
      code: '<textarea></textarea>',
      errors: [{ messageId: 'missingLabel' as const, data: { tag: 'textarea' } }],
    },
    // ── Bare select ──
    {
      code: '<select><option>US</option></select>',
      errors: [{ messageId: 'missingLabel' as const, data: { tag: 'select' } }],
    },
    // ── input with type="text" default (no type attr) ──
    {
      code: '<input />',
      errors: [{ messageId: 'missingLabel' as const, data: { tag: 'input' } }],
    },
    // ── label[for] points to wrong id ──
    {
      code: '<><label htmlFor="other">Name</label><input id="name" /></>',
      errors: [{ messageId: 'missingLabel' as const, data: { tag: 'input' } }],
    },
    // ── Empty aria-label still fails ──
    {
      code: '<input type="text" aria-label="" />',
      errors: [{ messageId: 'missingLabel' as const, data: { tag: 'input' } }],
    },
    // ── Multiple bare controls — multiple reports ──
    {
      code: '<form><input /><textarea /></form>',
      errors: [
        { messageId: 'missingLabel' as const, data: { tag: 'input' } },
        { messageId: 'missingLabel' as const, data: { tag: 'textarea' } },
      ],
    },
    // ── Bare native <input> inside a PascalCase <Label> still reports ──
    // (we treat custom components as opaque — they may not render htmlFor)
    {
      code: '<Label>Name <input type="text" /></Label>',
      errors: [{ messageId: 'missingLabel' as const, data: { tag: 'input' } }],
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
    id: 'form-labels',
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

describe('form-labels cross-framework (synthetic AST)', () => {
  describe('Plain HTML', () => {
    it('reports bare <input>', () => {
      const { context, reports } = makeMockContext();
      const visitor = rule.create(context as any);

      visitor.Tag?.({
        type: 'Tag',
        name: 'input',
        attributes: [{ key: { value: 'type' }, value: { value: 'text' } }],
        children: [],
      });
      // Force onComplete via Program:exit
      visitor['Program:exit']?.();

      expect(reports).toHaveLength(1);
      expect(reports[0].messageId).toBe('missingLabel');
    });

    it('passes when wrapped in <label>', () => {
      const { context, reports } = makeMockContext();
      const visitor = rule.create(context as any);

      const inputNode = {
        type: 'Tag',
        name: 'input',
        attributes: [],
        children: [],
      };
      const labelNode = {
        type: 'Tag',
        name: 'label',
        attributes: [],
        children: [
          { type: 'Text', value: 'Name ' },
          inputNode,
        ],
      };
      visitor.Tag?.(labelNode);
      visitor.Tag?.(inputNode);
      visitor['Program:exit']?.();

      expect(reports).toHaveLength(0);
    });

    it('passes with <label for> matching id', () => {
      const { context, reports } = makeMockContext();
      const visitor = rule.create(context as any);

      const labelNode = {
        type: 'Tag',
        name: 'label',
        attributes: [{ key: { value: 'for' }, value: { value: 'name' } }],
        children: [{ type: 'Text', value: 'Name' }],
      };
      const inputNode = {
        type: 'Tag',
        name: 'input',
        attributes: [{ key: { value: 'id' }, value: { value: 'name' } }],
        children: [],
      };
      visitor.Tag?.(labelNode);
      visitor.Tag?.(inputNode);
      visitor['Program:exit']?.();

      expect(reports).toHaveLength(0);
    });

    it('skips type="hidden"', () => {
      const { context, reports } = makeMockContext();
      const visitor = rule.create(context as any);

      visitor.Tag?.({
        type: 'Tag',
        name: 'input',
        attributes: [{ key: { value: 'type' }, value: { value: 'hidden' } }],
        children: [],
      });
      visitor['Program:exit']?.();

      expect(reports).toHaveLength(0);
    });
  });

  describe('Vue', () => {
    it('reports bare <input>', () => {
      const { context, reports } = makeMockContext();
      const visitor = rule.create(context as any);

      visitor.VElement?.({
        type: 'VElement',
        rawName: 'input',
        startTag: { attributes: [] },
        children: [],
      });
      visitor['Program:exit']?.();

      expect(reports).toHaveLength(1);
      expect(reports[0].messageId).toBe('missingLabel');
    });

    it('passes when wrapped in <label>', () => {
      const { context, reports } = makeMockContext();
      const visitor = rule.create(context as any);

      const inputNode: any = {
        type: 'VElement',
        rawName: 'input',
        startTag: { attributes: [] },
        children: [],
      };
      const labelNode: any = {
        type: 'VElement',
        rawName: 'label',
        startTag: { attributes: [] },
        children: [inputNode],
      };
      visitor.VElement?.(labelNode);
      visitor.VElement?.(inputNode);
      visitor['Program:exit']?.();

      expect(reports).toHaveLength(0);
    });
  });

  describe('Angular', () => {
    it('reports bare <input>', () => {
      const { context, reports } = makeMockContext();
      const visitor = rule.create(context as any);

      visitor['Element$1']?.({
        name: 'input',
        attributes: [],
        inputs: [],
        children: [],
      });
      visitor['Program:exit']?.();

      expect(reports).toHaveLength(1);
      expect(reports[0].messageId).toBe('missingLabel');
    });

    it('passes when wrapped in <label>', () => {
      const { context, reports } = makeMockContext();
      const visitor = rule.create(context as any);

      const inputNode: any = {
        name: 'input',
        attributes: [],
        inputs: [],
        children: [],
      };
      const labelNode: any = {
        name: 'label',
        attributes: [],
        inputs: [],
        children: [inputNode],
      };
      visitor['Element$1']?.(labelNode);
      visitor['Element$1']?.(inputNode);
      visitor['Program:exit']?.();

      expect(reports).toHaveLength(0);
    });
  });

  describe('Svelte', () => {
    it('reports bare <input>', () => {
      const { context, reports } = makeMockContext();
      const visitor = rule.create(context as any);

      visitor.SvelteElement?.({
        name: 'input',
        startTag: { attributes: [] },
        children: [],
      });
      visitor['Program:exit']?.();

      expect(reports).toHaveLength(1);
      expect(reports[0].messageId).toBe('missingLabel');
    });
  });
});
