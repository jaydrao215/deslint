import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import rule from '../../src/rules/no-arbitrary-typography.js';

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

function fixable(code: string, output: string, extra?: { options?: any }) {
  return {
    code,
    output,
    ...(extra?.options ? { options: extra.options } : {}),
    errors: [
      {
        messageId: 'arbitraryTypography' as const,
        suggestions: [{ messageId: 'suggestScale' as const, output }],
      },
    ],
  };
}

ruleTester.run('no-arbitrary-typography', rule, {
  valid: [
    // ── Standard Tailwind type scale — NOT flagged ──
    { code: '<div className="text-sm font-bold leading-tight" />' },
    { code: '<div className="text-base text-lg text-xl text-2xl" />' },
    { code: '<div className="text-xs text-9xl font-normal font-semibold" />' },
    { code: '<div className="leading-none leading-loose" />' },
    { code: '<div className="tracking-tight tracking-wide tracking-widest" />' },
    { code: '<h1 className="text-4xl font-bold" />' },

    // ── Arbitrary values that are NOT typography — NOT flagged ──
    { code: '<div className="p-[13px]" />' },
    { code: '<div className="bg-[#FF0000]" />' },
    { code: '<div className="w-[200px]" />' },
    { code: '<div className="z-[999]" />' },

    // ── Arbitrary with non-convertible units — NOT flagged ──
    { code: '<div className="text-[50%]" />' },
    { code: '<div className="leading-[2]" />' },  // no unit — not matched

    // ── Allowlisted values — NOT flagged ──
    {
      code: '<div className="text-[17px]" />',
      options: [{ allowlist: ['text-[17px]'] }],
    },

    // ── Responsive + state variants on valid classes — NOT flagged ──
    { code: '<div className="sm:text-lg md:text-xl hover:font-bold" />' },
  ],

  invalid: [
    // ── font-size ──
    // text-[17px] = 17px; equidistant from text-base(16) and text-lg(18) → smaller wins → text-base
    fixable(
      '<div className="text-[17px]" />',
      '<div className="text-base" />',
    ),
    fixable(
      '<div className="text-[16px]" />',
      '<div className="text-base" />',
    ),
    fixable(
      '<div className="text-[1rem]" />',
      '<div className="text-base" />',
    ),
    fixable(
      '<div className="text-[1.5rem]" />',
      '<div className="text-2xl" />',
    ),
    // text-[13px] equidistant from text-xs(12) and text-sm(14) → smaller wins → text-xs
    fixable(
      '<div className="text-[13px]" />',
      '<div className="text-xs" />',
    ),
    fixable(
      '<div className="text-[48px]" />',
      '<div className="text-5xl" />',
    ),
    fixable(
      '<div className="text-[18px]" />',
      '<div className="text-lg" />',
    ),

    // ── font-weight ──
    // font-[450] equidistant from font-normal(400) and font-medium(500) → smaller wins → font-normal
    fixable(
      '<div className="font-[450]" />',
      '<div className="font-normal" />',
    ),
    fixable(
      '<div className="font-[700]" />',
      '<div className="font-bold" />',
    ),
    fixable(
      '<div className="font-[300]" />',
      '<div className="font-light" />',
    ),
    fixable(
      '<div className="font-[500]" />',
      '<div className="font-medium" />',
    ),

    // ── line-height (px) ──
    fixable(
      '<div className="leading-[24px]" />',
      '<div className="leading-6" />',
    ),
    fixable(
      '<div className="leading-[20px]" />',
      '<div className="leading-5" />',
    ),
    fixable(
      '<div className="leading-[1.25rem]" />',
      '<div className="leading-5" />',
    ),

    // ── letter-spacing ──
    fixable(
      '<div className="tracking-[0.05em]" />',
      '<div className="tracking-wider" />',
    ),
    fixable(
      '<div className="tracking-[-0.025em]" />',
      '<div className="tracking-tight" />',
    ),
    fixable(
      '<div className="tracking-[0.1em]" />',
      '<div className="tracking-widest" />',
    ),

    // ── Responsive variant preserved ──
    fixable(
      '<div className="sm:text-[18px]" />',
      '<div className="sm:text-lg" />',
    ),
    fixable(
      '<div className="hover:font-[700]" />',
      '<div className="hover:font-bold" />',
    ),

    // ── Multiple violations — separate errors, overlapping fixes need array form ──
    {
      code: '<div className="text-[17px] font-[450]" />',
      output: ['<div className="text-base font-[450]" />', '<div className="text-base font-normal" />'],
      errors: [
        {
          messageId: 'arbitraryTypography' as const,
          suggestions: [{ messageId: 'suggestScale' as const, output: '<div className="text-base font-[450]" />' }],
        },
        {
          messageId: 'arbitraryTypography' as const,
          suggestions: [{ messageId: 'suggestScale' as const, output: '<div className="text-[17px] font-normal" />' }],
        },
      ],
    },

    // ── cn() wrapper inside JSX className ──
    fixable(
      '<div className={cn("text-[24px]", "p-4")} />',
      '<div className={cn("text-2xl", "p-4")} />',
    ),

    // ── Custom fontSize scale ──
    {
      code: '<div className="text-[15px]" />',
      options: [{ customScale: { fontSize: { display: 15 } } }],
      output: '<div className="text-display" />',
      errors: [
        {
          messageId: 'arbitraryTypography' as const,
          suggestions: [{ messageId: 'suggestScale' as const, output: '<div className="text-display" />' }],
        },
      ],
    },
  ],
});
