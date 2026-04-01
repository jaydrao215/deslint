import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import rule from '../../src/rules/no-magic-numbers-layout.js';

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
      messageId: 'magicNumber' as const,
      suggestions: [{
        messageId: 'suggestScale' as const,
        output,
      }],
    }],
  };
}

/** Helper for unfixable test cases (no clean scale match) */
function unfixable(code: string, extra?: { options?: any }) {
  return {
    code,
    ...(extra?.options ? { options: extra.options } : {}),
    errors: [{ messageId: 'magicNumber' as const }],
  };
}

ruleTester.run('no-magic-numbers-layout', rule, {
  valid: [
    // ── Standard Tailwind scale values — NOT flagged ──
    { code: '<div className="grid grid-cols-3 gap-4" />' },
    { code: '<div className="grid grid-cols-12" />' },
    { code: '<div className="grid grid-rows-6" />' },
    { code: '<div className="flex basis-1/2" />' },
    { code: '<div className="basis-full basis-auto" />' },
    { code: '<div className="order-2" />' },
    { code: '<div className="order-first order-last order-none" />' },
    { code: '<div className="col-span-6 row-span-3" />' },
    { code: '<div className="gap-4 gap-x-2 gap-y-6" />' },
    { code: '<div className="grow grow-0 shrink shrink-0" />' },

    // ── CSS variable values — allowed by default ──
    { code: '<div className="gap-[var(--grid-gap)]" />' },
    { code: '<div className="gap-x-[var(--spacing)]" />' },
    { code: '<div className="basis-[var(--basis)]" />' },
    { code: '<div className="grid-cols-[var(--cols)]" />' },

    // ── Not layout classes (different rule scope) — NOT flagged ──
    { code: '<div className="w-[200px]" />' },
    { code: '<div className="h-[100vh]" />' },
    { code: '<div className="p-[13px]" />' },
    { code: '<div className="m-[8px]" />' },
    { code: '<div className="text-[18px]" />' },
    { code: '<div className="bg-[#FF0000]" />' },
    { code: '<div className="z-[999]" />' },

    // ── Allowlisted values ──
    {
      code: '<div className="grid-cols-[14]" />',
      options: [{ allowlist: ['grid-cols-[14]'] }],
    },
    {
      code: '<div className="gap-[17px]" />',
      options: [{ allowlist: ['gap-[17px]'] }],
    },

    // ── Empty / no className ──
    { code: '<div id="test" />' },
    { code: '<div className="" />' },
  ],

  invalid: [
    // ── grid-cols arbitrary → scale ──
    fixable(
      '<div className="grid grid-cols-[3]" />',
      '<div className="grid grid-cols-3" />',
    ),
    fixable(
      '<div className="grid-cols-[1]" />',
      '<div className="grid-cols-1" />',
    ),
    fixable(
      '<div className="grid-cols-[12]" />',
      '<div className="grid-cols-12" />',
    ),

    // ── grid-rows arbitrary → scale ──
    fixable(
      '<div className="grid-rows-[5]" />',
      '<div className="grid-rows-5" />',
    ),
    fixable(
      '<div className="grid-rows-[1]" />',
      '<div className="grid-rows-1" />',
    ),

    // ── col-span arbitrary → scale ──
    fixable(
      '<div className="col-span-[2]" />',
      '<div className="col-span-2" />',
    ),
    fixable(
      '<div className="col-span-[12]" />',
      '<div className="col-span-12" />',
    ),

    // ── row-span arbitrary → scale ──
    fixable(
      '<div className="row-span-[3]" />',
      '<div className="row-span-3" />',
    ),
    fixable(
      '<div className="row-span-[6]" />',
      '<div className="row-span-6" />',
    ),

    // ── gap arbitrary px → scale ──
    fixable(
      '<div className="gap-[16px]" />',
      '<div className="gap-4" />',
    ),
    fixable(
      '<div className="gap-[32px]" />',
      '<div className="gap-8" />',
    ),
    fixable(
      '<div className="gap-[0px]" />',
      '<div className="gap-0" />',
    ),
    fixable(
      '<div className="gap-x-[8px]" />',
      '<div className="gap-x-2" />',
    ),
    fixable(
      '<div className="gap-y-[24px]" />',
      '<div className="gap-y-6" />',
    ),

    // ── order arbitrary → scale ──
    fixable(
      '<div className="order-[1]" />',
      '<div className="order-1" />',
    ),
    fixable(
      '<div className="order-[12]" />',
      '<div className="order-12" />',
    ),

    // ── basis arbitrary px with scale match ──
    fixable(
      '<div className="basis-[16px]" />',
      '<div className="basis-4" />',
    ),
    fixable(
      '<div className="basis-[0px]" />',
      '<div className="basis-0" />',
    ),

    // ── grow/shrink arbitrary ──
    unfixable('<div className="grow-[2]" />'),
    fixable(
      '<div className="grow-[0]" />',
      '<div className="grow-0" />',
    ),
    fixable(
      '<div className="grow-[1]" />',
      '<div className="grow" />',
    ),
    fixable(
      '<div className="shrink-[0]" />',
      '<div className="shrink-0" />',
    ),
    fixable(
      '<div className="shrink-[1]" />',
      '<div className="shrink" />',
    ),
    unfixable('<div className="shrink-[3]" />'),

    // ── No clean scale match — reported without fix ──
    unfixable('<div className="basis-[200px]" />'),
    unfixable('<div className="gap-[17px]" />'),
    unfixable('<div className="grid-cols-[14]" />'),
    unfixable('<div className="order-[99]" />'),
    unfixable('<div className="row-span-[7]" />'),

    // ── Responsive variants preserved ──
    fixable(
      '<div className="md:gap-[16px]" />',
      '<div className="md:gap-4" />',
    ),
    fixable(
      '<div className="lg:grid-cols-[4]" />',
      '<div className="lg:grid-cols-4" />',
    ),
    fixable(
      '<div className="sm:hover:order-[2]" />',
      '<div className="sm:hover:order-2" />',
    ),

    // ── Preserves non-layout classes ──
    fixable(
      '<div className="bg-red-500 grid-cols-[3] text-white" />',
      '<div className="bg-red-500 grid-cols-3 text-white" />',
    ),

    // ── cn()/clsx() wrapper detection ──
    fixable(
      '<div className={cn("grid-cols-[6]", "gap-4")} />',
      '<div className={cn("grid-cols-6", "gap-4")} />',
    ),
    fixable(
      '<div className={clsx("gap-[8px]")} />',
      '<div className={clsx("gap-2")} />',
    ),

    // ── Template literal ──
    fixable(
      '<div className={`grid-cols-[3] gap-4`} />',
      '<div className={`grid-cols-3 gap-4`} />',
    ),

    // ── Expression container ──
    fixable(
      '<div className={"order-[5]"} />',
      '<div className={"order-5"} />',
    ),
  ],
});

// ── Multiple violations in one element ──────────────────────────────

describe('no-magic-numbers-layout multiple violations', () => {
  const multiTester = new RuleTester({
    languageOptions: {
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  });

  multiTester.run('multiple-arbitrary-layout-classes', rule, {
    valid: [],
    invalid: [
      {
        code: '<div className="grid-cols-[3] gap-[16px]" />',
        output: [
          '<div className="grid-cols-3 gap-[16px]" />',
          '<div className="grid-cols-3 gap-4" />',
        ],
        errors: [
          {
            messageId: 'magicNumber',
            suggestions: [{ messageId: 'suggestScale', output: '<div className="grid-cols-3 gap-[16px]" />' }],
          },
          {
            messageId: 'magicNumber',
            suggestions: [{ messageId: 'suggestScale', output: '<div className="grid-cols-[3] gap-4" />' }],
          },
        ],
      },
    ],
  });
});

// ── CSS variable option disabled ────────────────────────────────────

describe('no-magic-numbers-layout allowCssVariables=false', () => {
  const cssVarTester = new RuleTester({
    languageOptions: {
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  });

  cssVarTester.run('css-variables-flagged', rule, {
    valid: [],
    invalid: [
      {
        code: '<div className="gap-[var(--grid-gap)]" />',
        options: [{ allowCssVariables: false }],
        errors: [{ messageId: 'magicNumber' }],
      },
    ],
  });
});

// ── Negative values ─────────────────────────────────────────────────

describe('no-magic-numbers-layout negative values', () => {
  const negTester = new RuleTester({
    languageOptions: {
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  });

  negTester.run('negative-values', rule, {
    valid: [],
    invalid: [
      // Negative order — outside 1-12 range, reported without fix
      unfixable('<div className="order-[-1]" />'),
    ],
  });
});

// ── Edge cases ──────────────────────────────────────────────────────

describe('no-magic-numbers-layout edge cases', () => {
  const edgeTester = new RuleTester({
    languageOptions: {
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  });

  edgeTester.run('edge-cases', rule, {
    valid: [
      // Does NOT crash on malformed className
      { code: '<div className={undefined} />' },
      { code: '<div className={42} />' },
      // Not a className attribute
      { code: '<div style="grid-cols-[3]" />' },
    ],
    invalid: [
      // class attribute works too
      fixable(
        '<div class="grid-cols-[4]" />',
        '<div class="grid-cols-4" />',
      ),
      // gap-[1px] → gap-px
      fixable(
        '<div className="gap-[1px]" />',
        '<div className="gap-px" />',
      ),
    ],
  });
});
