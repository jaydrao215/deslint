import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import rule from '../../src/rules/no-arbitrary-border-radius.js';

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

/** Helper for fixable test cases with auto-fix + suggestions */
function fixable(code: string, output: string, extra?: { options?: any }) {
  return {
    code,
    output,
    ...(extra?.options ? { options: extra.options } : {}),
    errors: [
      {
        messageId: 'arbitraryRadius' as const,
        suggestions: [
          {
            messageId: 'suggestScale' as const,
            output,
          },
        ],
      },
    ],
  };
}

ruleTester.run('no-arbitrary-border-radius', rule, {
  valid: [
    // ── Standard Tailwind radius classes — NOT flagged ──
    { code: '<div className="rounded" />' },
    { code: '<div className="rounded-sm rounded-lg" />' },
    { code: '<div className="rounded-full" />' },
    { code: '<div className="rounded-tl-lg rounded-br-xl" />' },
    { code: '<div className="rounded-none" />' },

    // ── Non-radius arbitraries — NOT flagged by this rule ──
    { code: '<div className="bg-[#FF0000]" />' },
    { code: '<div className="p-[13px]" />' },

    // ── Non-px/rem/em units — NOT flagged (rule only acts on lengths) ──
    { code: '<div className="rounded-[50%]" />' },

    // ── Allowlist ──
    {
      code: '<div className="rounded-[3px]" />',
      options: [{ allowlist: ['rounded-[3px]'] }],
    },

    // ── Values beyond default tolerance produce no suggestion, so the
    //    rule still reports — but since default fallback has a 2px window,
    //    we prove that in the invalid section below.
  ],

  invalid: [
    // ── Default scale suggestion (2px tolerance) ──
    fixable(
      '<div className="rounded-[4px]" />',
      '<div className="rounded-sm" />',
    ),
    fixable(
      '<div className="rounded-[12px]" />',
      '<div className="rounded-xl" />',
    ),
    fixable(
      '<div className="rounded-[16px]" />',
      '<div className="rounded-2xl" />',
    ),

    // ── Directional prefix preserved ──
    fixable(
      '<div className="rounded-tl-[8px]" />',
      '<div className="rounded-tl-lg" />',
    ),
    fixable(
      '<div className="rounded-b-[4px]" />',
      '<div className="rounded-b-sm" />',
    ),

    // ── Responsive variant preserved ──
    fixable(
      '<div className="md:rounded-[8px]" />',
      '<div className="md:rounded-lg" />',
    ),

    // ── Custom scale wins over default ──
    fixable(
      '<div className="rounded-[12px]" />',
      '<div className="rounded-card" />',
      { options: [{ customScale: { card: 12, pill: 9999 } }] },
    ),

    // ── Custom scale with directional prefix ──
    fixable(
      '<div className="rounded-tl-[12px]" />',
      '<div className="rounded-tl-card" />',
      { options: [{ customScale: { card: 12 } }] },
    ),

    // ── rem input resolves to px and maps to nearest custom token ──
    fixable(
      '<div className="rounded-[0.75rem]" />',
      '<div className="rounded-card" />',
      { options: [{ customScale: { card: 12 } }] },
    ),

    // ── Value too far from any default scale (still reports, but with no
    //    replacement / no suggestion) ──
    {
      code: '<div className="rounded-[100px]" />',
      errors: [{ messageId: 'arbitraryRadius' }],
    },
  ],
});
