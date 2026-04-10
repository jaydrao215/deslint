import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import rule from '../../src/rules/spacing-rhythm-consistency.js';

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

ruleTester.run('spacing-rhythm-consistency', rule, {
  valid: [
    // ── All elements use same padding — consistent rhythm ──
    {
      code: `
        const A = () => (
          <>
            <div className="p-4 bg-white">Card 1</div>
            <div className="p-4 bg-white">Card 2</div>
            <div className="p-4 bg-white">Card 3</div>
            <div className="p-4 bg-white">Card 4</div>
          </>
        );
      `,
    },

    // ── Below threshold (< 3 occurrences) — not enough data ──
    {
      code: `
        const A = () => (
          <>
            <div className="p-4">Card 1</div>
            <div className="p-3">Card 2</div>
          </>
        );
      `,
    },

    // ── No spacing classes — skip ──
    {
      code: `
        const A = () => (
          <>
            <div className="bg-white text-black">Card 1</div>
            <div className="bg-white text-black">Card 2</div>
            <div className="bg-white text-black">Card 3</div>
          </>
        );
      `,
    },

    // ── Different prefixes — each tracked independently ──
    {
      code: `
        const A = () => (
          <>
            <div className="p-4 m-2">Card 1</div>
            <div className="p-4 m-2">Card 2</div>
            <div className="p-4 m-2">Card 3</div>
          </>
        );
      `,
    },
  ],

  invalid: [
    // ── Majority use p-4 but one drifts to p-3 ──
    {
      code: `
        const A = () => (
          <>
            <div className="p-4">Card 1</div>
            <div className="p-4">Card 2</div>
            <div className="p-3">Card 3</div>
            <div className="p-4">Card 4</div>
          </>
        );
      `,
      errors: [{ messageId: 'inconsistentSpacing' }],
    },

    // ── Majority use gap-4 but one uses gap-6 ──
    {
      code: `
        const A = () => (
          <>
            <div className="gap-4">Row 1</div>
            <div className="gap-4">Row 2</div>
            <div className="gap-6">Row 3</div>
            <div className="gap-4">Row 4</div>
          </>
        );
      `,
      errors: [{ messageId: 'inconsistentSpacing' }],
    },

    // ── Multiple drift instances ──
    {
      code: `
        const A = () => (
          <>
            <div className="m-4">Item 1</div>
            <div className="m-4">Item 2</div>
            <div className="m-4">Item 3</div>
            <div className="m-2">Item 4</div>
            <div className="m-3">Item 5</div>
          </>
        );
      `,
      errors: [
        { messageId: 'inconsistentSpacing' },
        { messageId: 'inconsistentSpacing' },
      ],
    },
  ],
});
