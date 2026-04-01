import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import rule from '../../src/rules/no-arbitrary-zindex.js';

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

/** Helper for invalid test with fix + suggestion */
function zErr(output: string, suggested: string) {
  return {
    messageId: 'arbitraryZIndex' as const,
    suggestions: [
      {
        messageId: 'suggestScale' as const,
        data: { suggested },
        output,
      },
    ],
  };
}

ruleTester.run('no-arbitrary-zindex', rule, {
  valid: [
    // ── Standard z-index classes ──
    { code: '<div className="z-0" />' },
    { code: '<div className="z-10" />' },
    { code: '<div className="z-20" />' },
    { code: '<div className="z-30" />' },
    { code: '<div className="z-40" />' },
    { code: '<div className="z-50" />' },
    { code: '<div className="z-auto" />' },

    // ── z-index with other classes ──
    { code: '<div className="z-10 relative p-4" />' },

    // ── No z-index class ──
    { code: '<div className="p-4 m-2 flex" />' },

    // ── Allowlisted arbitrary value ──
    {
      code: '<div className="z-[9999]" />',
      options: [{ allowlist: [9999] }],
    },

    // ── Responsive variant with valid z-index ──
    { code: '<div className="md:z-50" />' },
  ],

  invalid: [
    // ── z-[999] → z-50 ──
    {
      code: '<div className="z-[999] relative" />',
      output: '<div className="z-50 relative" />',
      errors: [zErr('<div className="z-50 relative" />', 'z-50')],
    },

    // ── z-[100] → z-50 ──
    {
      code: '<div className="z-[100]" />',
      output: '<div className="z-50" />',
      errors: [zErr('<div className="z-50" />', 'z-50')],
    },

    // ── z-[5] → z-0 (dist to 0 is 5, dist to 10 is 5, prefer smaller) ──
    {
      code: '<div className="z-[5]" />',
      output: '<div className="z-0" />',
      errors: [zErr('<div className="z-0" />', 'z-0')],
    },

    // ── z-[15] → z-10 (equidistant, prefer smaller) ──
    {
      code: '<div className="z-[15]" />',
      output: '<div className="z-10" />',
      errors: [zErr('<div className="z-10" />', 'z-10')],
    },

    // ── z-[25] → z-20 ──
    {
      code: '<div className="z-[25]" />',
      output: '<div className="z-20" />',
      errors: [zErr('<div className="z-20" />', 'z-20')],
    },

    // ── z-[-1] → z-0 ──
    {
      code: '<div className="z-[-1]" />',
      output: '<div className="z-0" />',
      errors: [zErr('<div className="z-0" />', 'z-0')],
    },

    // ── z-[0] arbitrary → z-0 ──
    {
      code: '<div className="z-[0]" />',
      output: '<div className="z-0" />',
      errors: [zErr('<div className="z-0" />', 'z-0')],
    },

    // ── Preserves responsive variants ──
    {
      code: '<div className="sm:z-[999]" />',
      output: '<div className="sm:z-50" />',
      errors: [zErr('<div className="sm:z-50" />', 'sm:z-50')],
    },

    // ── Inside cn() wrapper ──
    {
      code: '<div className={cn("z-[999] p-4")} />',
      output: '<div className={cn("z-50 p-4")} />',
      errors: [zErr('<div className={cn("z-50 p-4")} />', 'z-50')],
    },

    // ── Hover variant with arbitrary z-index ──
    {
      code: '<div className="hover:z-[200]" />',
      output: '<div className="hover:z-50" />',
      errors: [zErr('<div className="hover:z-50" />', 'hover:z-50')],
    },
  ],
});
