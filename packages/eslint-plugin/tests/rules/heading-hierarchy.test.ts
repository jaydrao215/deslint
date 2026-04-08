import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll, expect } from 'vitest';
import rule from '../../src/rules/heading-hierarchy.js';

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

ruleTester.run('heading-hierarchy', rule, {
  valid: [
    // ── Single h1, no other headings ──
    { code: '<h1>Title</h1>' },
    // ── h1 → h2 → h3 (sequential) ──
    {
      code: `
        <div>
          <h1>Page</h1>
          <h2>Section</h2>
          <h3>Subsection</h3>
        </div>
      `,
    },
    // ── h2 → h3 → h2 (closing then sibling) ──
    {
      code: `
        <div>
          <h1>Title</h1>
          <h2>A</h2>
          <h3>A.1</h3>
          <h2>B</h2>
          <h3>B.1</h3>
        </div>
      `,
    },
    // ── Going UP any number of levels is allowed ──
    {
      code: `
        <div>
          <h1>Title</h1>
          <h2>Section</h2>
          <h3>Sub</h3>
          <h4>Sub-sub</h4>
          <h2>Next section</h2>
        </div>
      `,
    },
    // ── Component fragment with no h1 (h2 → h3) — fine ──
    {
      code: `
        <section>
          <h2>Card title</h2>
          <h3>Detail</h3>
        </section>
      `,
    },
    // ── No headings at all ──
    { code: '<div>just text</div>' },
    // ── allowMultipleH1 option ──
    {
      code: `
        <div>
          <h1>One</h1>
          <h1>Two</h1>
        </div>
      `,
      options: [{ allowMultipleH1: true }],
    },
    // ── Non-heading h-prefix elements (e.g. <header>) untouched ──
    { code: '<header><h1>Site</h1></header>' },
  ],

  invalid: [
    // ── h1 → h3 (skipped h2) ──
    {
      code: `
        <div>
          <h1>Title</h1>
          <h3>Detail</h3>
        </div>
      `,
      errors: [
        {
          messageId: 'skippedLevel' as const,
          data: { from: '1', to: '3', expected: '2' },
        },
      ],
    },
    // ── h2 → h4 (skipped h3) ──
    {
      code: `
        <section>
          <h2>Section</h2>
          <h4>Sub-sub</h4>
        </section>
      `,
      errors: [
        {
          messageId: 'skippedLevel' as const,
          data: { from: '2', to: '4', expected: '3' },
        },
      ],
    },
    // ── Two h1s in one file ──
    {
      code: `
        <div>
          <h1>One</h1>
          <h1>Two</h1>
        </div>
      `,
      errors: [{ messageId: 'multipleH1' as const }],
    },
    // ── Three h1s — reports the 2nd and 3rd ──
    {
      code: `
        <div>
          <h1>One</h1>
          <h1>Two</h1>
          <h1>Three</h1>
        </div>
      `,
      errors: [
        { messageId: 'multipleH1' as const },
        { messageId: 'multipleH1' as const },
      ],
    },
    // ── Combined: multiple h1 AND skipped level ──
    // RuleTester sorts errors by source location: h3 (line 4) comes before
    // the second h1 (line 5), so skippedLevel is expected first.
    {
      code: `
        <div>
          <h1>One</h1>
          <h3>Skip</h3>
          <h1>Another</h1>
        </div>
      `,
      errors: [
        {
          messageId: 'skippedLevel' as const,
          data: { from: '1', to: '3', expected: '2' },
        },
        { messageId: 'multipleH1' as const },
      ],
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
    id: 'heading-hierarchy',
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

describe('heading-hierarchy cross-framework (synthetic AST)', () => {
  describe('Plain HTML', () => {
    it('reports skipped level (h1 → h3)', () => {
      const { context, reports } = makeMockContext();
      const visitor = rule.create(context as any);

      visitor.Tag?.({ type: 'Tag', name: 'h1', attributes: [] });
      visitor.Tag?.({ type: 'Tag', name: 'h3', attributes: [] });
      visitor['Program:exit']?.();

      expect(reports).toHaveLength(1);
      expect(reports[0].messageId).toBe('skippedLevel');
      expect(reports[0].data?.from).toBe('1');
      expect(reports[0].data?.to).toBe('3');
    });

    it('reports multiple h1s', () => {
      const { context, reports } = makeMockContext();
      const visitor = rule.create(context as any);

      visitor.Tag?.({ type: 'Tag', name: 'h1', attributes: [] });
      visitor.Tag?.({ type: 'Tag', name: 'h1', attributes: [] });
      visitor['Program:exit']?.();

      expect(reports).toHaveLength(1);
      expect(reports[0].messageId).toBe('multipleH1');
    });

    it('passes on sequential h1 → h2 → h3', () => {
      const { context, reports } = makeMockContext();
      const visitor = rule.create(context as any);

      visitor.Tag?.({ type: 'Tag', name: 'h1', attributes: [] });
      visitor.Tag?.({ type: 'Tag', name: 'h2', attributes: [] });
      visitor.Tag?.({ type: 'Tag', name: 'h3', attributes: [] });
      visitor['Program:exit']?.();

      expect(reports).toHaveLength(0);
    });

    it('allows coming back up multiple levels', () => {
      const { context, reports } = makeMockContext();
      const visitor = rule.create(context as any);

      visitor.Tag?.({ type: 'Tag', name: 'h1', attributes: [] });
      visitor.Tag?.({ type: 'Tag', name: 'h2', attributes: [] });
      visitor.Tag?.({ type: 'Tag', name: 'h3', attributes: [] });
      visitor.Tag?.({ type: 'Tag', name: 'h4', attributes: [] });
      visitor.Tag?.({ type: 'Tag', name: 'h2', attributes: [] });
      visitor['Program:exit']?.();

      expect(reports).toHaveLength(0);
    });
  });

  describe('Vue', () => {
    it('reports skipped level on Vue templateBody', () => {
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
              rawName: 'h2',
              startTag: { attributes: [] },
              children: [],
            },
            {
              type: 'VElement',
              rawName: 'h4',
              startTag: { attributes: [] },
              children: [],
            },
          ],
        },
      });
      visitor['Program:exit']?.();

      expect(reports).toHaveLength(1);
      expect(reports[0].messageId).toBe('skippedLevel');
      expect(reports[0].data?.from).toBe('2');
      expect(reports[0].data?.to).toBe('4');
    });
  });

  describe('Svelte', () => {
    it('reports multiple h1', () => {
      const { context, reports } = makeMockContext();
      const visitor = rule.create(context as any);

      visitor.SvelteElement?.({ name: 'h1', startTag: { attributes: [] } });
      visitor.SvelteElement?.({ name: 'h1', startTag: { attributes: [] } });
      visitor['Program:exit']?.();

      expect(reports).toHaveLength(1);
      expect(reports[0].messageId).toBe('multipleH1');
    });
  });

  describe('Angular', () => {
    it('reports skipped level (h1 → h4)', () => {
      const { context, reports } = makeMockContext();
      const visitor = rule.create(context as any);

      visitor['Element$1']?.({ name: 'h1', attributes: [], inputs: [] });
      visitor['Element$1']?.({ name: 'h4', attributes: [], inputs: [] });
      visitor['Program:exit']?.();

      expect(reports).toHaveLength(1);
      expect(reports[0].messageId).toBe('skippedLevel');
    });
  });

  describe('allowMultipleH1 option', () => {
    it('suppresses multipleH1 reports when enabled', () => {
      const { context, reports } = makeMockContext([{ allowMultipleH1: true }]);
      const visitor = rule.create(context as any);

      visitor.Tag?.({ type: 'Tag', name: 'h1', attributes: [] });
      visitor.Tag?.({ type: 'Tag', name: 'h1', attributes: [] });
      visitor['Program:exit']?.();

      expect(reports).toHaveLength(0);
    });
  });
});
