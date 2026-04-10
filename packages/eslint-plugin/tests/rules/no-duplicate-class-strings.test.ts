import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import rule from '../../src/rules/no-duplicate-class-strings.js';

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

ruleTester.run('no-duplicate-class-strings', rule, {
  valid: [
    // ── Unique class strings — not flagged ──
    { code: '<div className="flex items-center gap-4" />' },

    // ── Only 2 occurrences — below default threshold of 3 ──
    {
      code: `
        const A = () => <div className="flex items-center gap-4" />;
        const B = () => <div className="flex items-center gap-4" />;
      `,
    },

    // ── Short class strings (< 3 classes) — not flagged even if repeated ──
    {
      code: `
        const A = () => <div className="p-4 m-2" />;
        const B = () => <div className="p-4 m-2" />;
        const C = () => <div className="p-4 m-2" />;
      `,
    },

    // ── Single class repeated — below minClassCount ──
    {
      code: `
        const A = () => <div className="p-4" />;
        const B = () => <div className="p-4" />;
        const C = () => <div className="p-4" />;
      `,
    },

    // ── Different class strings ──
    {
      code: `
        const A = () => <div className="flex items-center gap-4" />;
        const B = () => <div className="grid items-center gap-4" />;
        const C = () => <div className="block items-center gap-4" />;
      `,
    },

    // ── Custom threshold = 5, only 3 occurrences ──
    {
      code: `
        const A = () => <div className="flex items-center gap-4" />;
        const B = () => <div className="flex items-center gap-4" />;
        const C = () => <div className="flex items-center gap-4" />;
      `,
      options: [{ threshold: 5 }],
    },
  ],
  invalid: [
    // ── 3 occurrences of same class string (default threshold) ──
    {
      code: `
        const A = () => <div className="flex items-center gap-4" />;
        const B = () => <div className="flex items-center gap-4" />;
        const C = () => <div className="flex items-center gap-4" />;
      `,
      errors: [
        { messageId: 'duplicateClassString' },
        { messageId: 'duplicateClassString' },
        { messageId: 'duplicateClassString' },
      ],
    },

    // ── Same classes in different order (normalized) ──
    {
      code: `
        const A = () => <div className="flex items-center gap-4" />;
        const B = () => <div className="gap-4 flex items-center" />;
        const C = () => <div className="items-center gap-4 flex" />;
      `,
      errors: [
        { messageId: 'duplicateClassString' },
        { messageId: 'duplicateClassString' },
        { messageId: 'duplicateClassString' },
      ],
    },

    // ── 4 occurrences ──
    {
      code: `
        const A = () => <div className="rounded-lg border border-gray-200 p-4" />;
        const B = () => <div className="rounded-lg border border-gray-200 p-4" />;
        const C = () => <div className="rounded-lg border border-gray-200 p-4" />;
        const D = () => <div className="rounded-lg border border-gray-200 p-4" />;
      `,
      errors: [
        { messageId: 'duplicateClassString' },
        { messageId: 'duplicateClassString' },
        { messageId: 'duplicateClassString' },
        { messageId: 'duplicateClassString' },
      ],
    },

    // ── Custom threshold = 2 ──
    {
      code: `
        const A = () => <div className="flex items-center gap-4" />;
        const B = () => <div className="flex items-center gap-4" />;
      `,
      options: [{ threshold: 2 }],
      errors: [
        { messageId: 'duplicateClassString' },
        { messageId: 'duplicateClassString' },
      ],
    },

    // ── Custom minClassCount = 2 ──
    {
      code: `
        const A = () => <div className="p-4 m-2" />;
        const B = () => <div className="p-4 m-2" />;
        const C = () => <div className="p-4 m-2" />;
      `,
      options: [{ minClassCount: 2 }],
      errors: [
        { messageId: 'duplicateClassString' },
        { messageId: 'duplicateClassString' },
        { messageId: 'duplicateClassString' },
      ],
    },

    // ── cn() wrapper detection ──
    {
      code: `
        const A = () => <div className={cn("flex items-center gap-4")} />;
        const B = () => <div className={cn("flex items-center gap-4")} />;
        const C = () => <div className={cn("flex items-center gap-4")} />;
      `,
      errors: [
        { messageId: 'duplicateClassString' },
        { messageId: 'duplicateClassString' },
        { messageId: 'duplicateClassString' },
      ],
    },

    // ── Template literal detection ──
    {
      code: `
        const A = () => <div className={\`flex items-center gap-4\`} />;
        const B = () => <div className={\`flex items-center gap-4\`} />;
        const C = () => <div className={\`flex items-center gap-4\`} />;
      `,
      errors: [
        { messageId: 'duplicateClassString' },
        { messageId: 'duplicateClassString' },
        { messageId: 'duplicateClassString' },
      ],
    },
  ],
});
