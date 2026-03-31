import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import rule from '../../src/rules/no-arbitrary-spacing.js';

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
    errors: [{
      messageId: 'arbitrarySpacing' as const,
      suggestions: [{
        messageId: 'suggestScale' as const,
        output,
      }],
    }],
  };
}

ruleTester.run('no-arbitrary-spacing', rule, {
  valid: [
    // ── Standard Tailwind spacing classes — NOT flagged ──
    { code: '<div className="p-4 m-2" />' },
    { code: '<div className="px-6 py-3" />' },
    { code: '<div className="gap-4 space-x-2" />' },
    { code: '<div className="w-full h-screen" />' },
    { code: '<div className="mt-auto mb-0" />' },
    { code: '<div className="inset-0" />' },

    // ── Arbitrary non-spacing values — NOT flagged ──
    { code: '<div className="bg-[#FF0000]" />' },
    { code: '<div className="text-[18px]" />' },
    { code: '<div className="z-[999]" />' },
    { code: '<div className="rounded-[12px]" />' },

    // ── Arbitrary values with non-convertible units — NOT flagged ──
    { code: '<div className="w-[50%]" />' },
    { code: '<div className="h-[100vh]" />' },
    { code: '<div className="w-[calc(100%-20px)]" />' },

    // ── Allowlisted values ──
    {
      code: '<div className="p-[18px]" />',
      options: [{ allowlist: ['p-[18px]'] }],
    },

    // ── Empty / no className ──
    { code: '<div id="test" />' },
    { code: '<div className="" />' },
  ],
  invalid: [
    // ── Core: eslint --fix transforms p-[13px] → p-3 ────────────────

    fixable(
      '<div className="p-[13px]" />',
      '<div className="p-3" />',
    ),

    // ── eslint --fix transforms p-[14px] → p-3.5 ───────────────────

    fixable(
      '<div className="p-[14px]" />',
      '<div className="p-3.5" />',
    ),

    // ── Exact scale match ───────────────────────────────────────────

    fixable(
      '<div className="p-[16px]" />',
      '<div className="p-4" />',
    ),

    fixable(
      '<div className="m-[8px]" />',
      '<div className="m-2" />',
    ),

    fixable(
      '<div className="p-[1px]" />',
      '<div className="p-px" />',
    ),

    fixable(
      '<div className="m-[0px]" />',
      '<div className="m-0" />',
    ),

    // ── Rem values ──────────────────────────────────────────────────

    fixable(
      '<div className="p-[0.75rem]" />',
      '<div className="p-3" />',
    ),

    fixable(
      '<div className="m-[1rem]" />',
      '<div className="m-4" />',
    ),

    // ── Em values ───────────────────────────────────────────────────

    fixable(
      '<div className="p-[1em]" />',
      '<div className="p-4" />',
    ),

    // ── All directional variants ────────────────────────────────────

    fixable('<div className="pt-[12px]" />', '<div className="pt-3" />'),
    fixable('<div className="pr-[12px]" />', '<div className="pr-3" />'),
    fixable('<div className="pb-[12px]" />', '<div className="pb-3" />'),
    fixable('<div className="pl-[12px]" />', '<div className="pl-3" />'),
    fixable('<div className="px-[12px]" />', '<div className="px-3" />'),
    fixable('<div className="py-[12px]" />', '<div className="py-3" />'),
    fixable('<div className="mt-[12px]" />', '<div className="mt-3" />'),
    fixable('<div className="mr-[12px]" />', '<div className="mr-3" />'),
    fixable('<div className="mb-[12px]" />', '<div className="mb-3" />'),
    fixable('<div className="ml-[12px]" />', '<div className="ml-3" />'),
    fixable('<div className="mx-[12px]" />', '<div className="mx-3" />'),
    fixable('<div className="my-[12px]" />', '<div className="my-3" />'),

    // ── Gap / space ─────────────────────────────────────────────────

    fixable('<div className="gap-[20px]" />', '<div className="gap-5" />'),
    fixable('<div className="gap-x-[24px]" />', '<div className="gap-x-6" />'),
    fixable('<div className="gap-y-[16px]" />', '<div className="gap-y-4" />'),
    fixable('<div className="space-x-[8px]" />', '<div className="space-x-2" />'),
    fixable('<div className="space-y-[4px]" />', '<div className="space-y-1" />'),

    // ── Sizing: w, h, min/max ───────────────────────────────────────

    fixable('<div className="w-[32px]" />', '<div className="w-8" />'),
    fixable('<div className="h-[48px]" />', '<div className="h-12" />'),
    fixable('<div className="min-w-[64px]" />', '<div className="min-w-16" />'),
    fixable('<div className="min-h-[96px]" />', '<div className="min-h-24" />'),
    fixable('<div className="max-w-[128px]" />', '<div className="max-w-32" />'),
    fixable('<div className="max-h-[160px]" />', '<div className="max-h-40" />'),
    fixable('<div className="size-[40px]" />', '<div className="size-10" />'),

    // ── Inset / position ────────────────────────────────────────────

    fixable('<div className="inset-[16px]" />', '<div className="inset-4" />'),
    fixable('<div className="top-[8px]" />', '<div className="top-2" />'),
    fixable('<div className="right-[12px]" />', '<div className="right-3" />'),
    fixable('<div className="bottom-[4px]" />', '<div className="bottom-1" />'),
    fixable('<div className="left-[24px]" />', '<div className="left-6" />'),

    // ── Responsive variant preserved ────────────────────────────────

    fixable(
      '<div className="sm:p-[13px]" />',
      '<div className="sm:p-3" />',
    ),
    fixable(
      '<div className="md:hover:mt-[16px]" />',
      '<div className="md:hover:mt-4" />',
    ),

    // ── Preserves non-spacing classes ───────────────────────────────

    fixable(
      '<div className="bg-red-500 p-[16px] text-white" />',
      '<div className="bg-red-500 p-4 text-white" />',
    ),

    // ── cn()/clsx() wrapper detection ───────────────────────────────

    fixable(
      '<div className={cn("p-[16px]", "bg-white")} />',
      '<div className={cn("p-4", "bg-white")} />',
    ),
    fixable(
      '<div className={clsx("mt-[8px]")} />',
      '<div className={clsx("mt-2")} />',
    ),

    // ── Template literal ────────────────────────────────────────────

    fixable(
      '<div className={`p-[12px] bg-white`} />',
      '<div className={`p-3 bg-white`} />',
    ),

    // ── Expression container ────────────────────────────────────────

    fixable(
      '<div className={"gap-[24px]"} />',
      '<div className={"gap-6"} />',
    ),

    // ── No suggestion when very far from scale ────────────────────

    {
      code: '<div className="p-[500px]" />',
      errors: [{ messageId: 'arbitrarySpacing' }],
    },

    // ── Multiple violations (array output for overlapping fixes) ──

    {
      code: '<div className="p-[12px] m-[8px]" />',
      output: [
        '<div className="p-3 m-[8px]" />',
        '<div className="p-3 m-2" />',
      ],
      errors: [
        {
          messageId: 'arbitrarySpacing',
          suggestions: [{ messageId: 'suggestScale', output: '<div className="p-3 m-[8px]" />' }],
        },
        {
          messageId: 'arbitrarySpacing',
          suggestions: [{ messageId: 'suggestScale', output: '<div className="p-[12px] m-2" />' }],
        },
      ],
    },
  ],
});

// ── Edge cases ──────────────────────────────────────────────────────

describe('no-arbitrary-spacing edge cases', () => {
  const edgeTester = new RuleTester({
    languageOptions: {
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  });

  edgeTester.run('no-arbitrary-spacing (malformed)', rule, {
    valid: [
      // Does NOT crash on malformed className
      { code: '<div className={undefined} />' },
      { code: '<div className={42} />' },
      // Not a className attribute
      { code: '<div style="p-[13px]" />' },
    ],
    invalid: [
      // class attribute works too
      fixable(
        '<div class="p-[16px]" />',
        '<div class="p-4" />',
      ),
    ],
  });
});

// ── Equidistant preference test ─────────────────────────────────────

describe('no-arbitrary-spacing equidistant preference', () => {
  const eqTester = new RuleTester({
    languageOptions: {
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  });

  // p-[10px] is equidistant between scale 2.5 (10px) and 3 (12px)
  // Should pick 2.5 (exact match at 10px)
  eqTester.run('equidistant-prefers-smaller', rule, {
    valid: [],
    invalid: [
      fixable(
        '<div className="p-[10px]" />',
        '<div className="p-2.5" />',
      ),
    ],
  });
});
