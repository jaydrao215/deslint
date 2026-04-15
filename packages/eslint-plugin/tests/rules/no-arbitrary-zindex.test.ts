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

/**
 * Small off-scale value → autofix AND suggestion.
 * Values like z-[5], z-[15], z-[25] are typos / off-by-one scale choices
 * where clamping to the nearest Tailwind step is safe. Preserved from the
 * original rule behaviour.
 */
function zAutofixed(code: string, output: string, suggested: string) {
  return {
    code,
    output,
    errors: [
      {
        messageId: 'arbitraryZIndex' as const,
        suggestions: [
          {
            messageId: 'suggestScale' as const,
            data: { suggested },
            output,
          },
        ],
      },
    ],
  };
}

/**
 * Large portal/overlay value → REPORT-ONLY (no top-level fix), but the
 * suggestion path still offers the replacement for users who explicitly want
 * it. This guards against the original bug where `z-[9999]` on a modal
 * backdrop was silently rewritten to `z-50`, putting the backdrop behind
 * sticky headers and toasts.
 */
function zReportOnly(code: string, suggestedOutput: string, suggested: string) {
  return {
    code,
    output: null,
    errors: [
      {
        messageId: 'arbitraryZIndexNoFix' as const,
        suggestions: [
          {
            messageId: 'suggestScale' as const,
            data: { suggested },
            output: suggestedOutput,
          },
        ],
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
    { code: '<div className="z-10 relative p-4" />' },
    { code: '<div className="p-4 m-2 flex" />' },
    { code: '<div className="md:z-50" />' },

    // ── Default portal allowlist: 999, 1000, 9999 are never flagged ──
    // These are the canonical "on top of everything" values used by
    // react-hot-toast, Radix portal, Headless UI Dialog, etc. Flagging them
    // by default produced the original `z-[9999] → z-50` regression.
    { code: '<div className="z-[9999]" />' },
    { code: '<div className="z-[1000]" />' },
    { code: '<div className="z-[999]" />' },

    // ── User-supplied allowlist still works ──
    {
      code: '<div className="z-[8000]" />',
      options: [{ allowlist: [8000] }],
    },
  ],

  invalid: [
    // ── Small off-scale values: safe to clamp ──
    zAutofixed(
      '<div className="z-[5]" />',
      '<div className="z-0" />',
      'z-0',
    ),
    zAutofixed(
      '<div className="z-[15]" />',
      '<div className="z-10" />',
      'z-10',
    ),
    zAutofixed(
      '<div className="z-[25]" />',
      '<div className="z-20" />',
      'z-20',
    ),
    zAutofixed(
      '<div className="z-[-1]" />',
      '<div className="z-0" />',
      'z-0',
    ),
    zAutofixed(
      '<div className="z-[0]" />',
      '<div className="z-0" />',
      'z-0',
    ),
    zAutofixed(
      '<div className="z-[55]" />',
      '<div className="z-50" />',
      'z-50',
    ),

    // ── Large values: report but DO NOT clamp (regression guards) ──
    zReportOnly(
      '<div className="z-[100]" />',
      '<div className="z-50" />',
      'z-50',
    ),
    zReportOnly(
      '<div className="z-[200] relative" />',
      '<div className="z-50 relative" />',
      'z-50',
    ),
    zReportOnly(
      // Not in the default portal allowlist (we keep that to the canonical
      // handful), but still clearly a portal value — must not be autofixed.
      '<div className="z-[5000]" />',
      '<div className="z-50" />',
      'z-50',
    ),
    zReportOnly(
      '<div className={cn("z-[200] p-4")} />',
      '<div className={cn("z-50 p-4")} />',
      'z-50',
    ),
    zReportOnly(
      '<div className="hover:z-[200]" />',
      '<div className="hover:z-50" />',
      'hover:z-50',
    ),
    zReportOnly(
      '<div className="sm:z-[5000]" />',
      '<div className="sm:z-50" />',
      'sm:z-50',
    ),
  ],
});
