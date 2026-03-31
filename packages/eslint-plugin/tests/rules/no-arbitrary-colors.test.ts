import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import rule from '../../src/rules/no-arbitrary-colors.js';

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
 * Helper — build an invalid test case that has auto-fix + suggestions.
 * Reduces boilerplate since every fixable error also carries suggestions.
 */
function fixable(code: string, output: string, extra?: { options?: any; data?: Record<string, string> }) {
  return {
    code,
    output,
    ...(extra?.options ? { options: extra.options } : {}),
    errors: [{
      messageId: 'arbitraryColor' as const,
      ...(extra?.data ? { data: extra.data } : {}),
      suggestions: [{
        messageId: 'suggestToken' as const,
        ...(extra?.data ? { data: { replacement: output.match(/className="([^"]+)"/)?.[1]?.split(' ').find(c => !code.includes(c)) ?? '' } } : {}),
        output,
      }],
    }],
  };
}

ruleTester.run('no-arbitrary-colors', rule, {
  valid: [
    // ── Standard Tailwind color classes — NOT flagged ──
    { code: '<div className="bg-red-500 text-white" />' },
    { code: '<div className="border-blue-600" />' },
    { code: '<div className="bg-slate-900 text-slate-100" />' },

    // ── Valid Tailwind v4 classes — NOT flagged ──
    { code: '<div className="bg-linear-to-r" />' },
    { code: '<div className="shrink-0" />' },
    { code: '<div className="grow" />' },

    // ── Allowlisted hex values ──
    {
      code: '<div className="bg-[#FF0000]" />',
      options: [{ allowlist: ['#FF0000'] }],
    },
    {
      code: '<div className="bg-[#ff0000]" />',
      options: [{ allowlist: ['#FF0000'] }],
    },

    // ── Non-color arbitrary values (handled by other rules) ──
    { code: '<div className="p-[13px]" />' },
    { code: '<div className="w-[200px]" />' },
    { code: '<div className="h-[50vh]" />' },
    { code: '<div className="gap-[1.5rem]" />' },
    { code: '<div className="z-[999]" />' },
    { code: '<div className="rounded-[12px]" />' },

    // ── No className at all ──
    { code: '<div id="test" />' },

    // ── Empty className ──
    { code: '<div className="" />' },
    { code: '<div className="   " />' },
  ],
  invalid: [
    // ── Hex color detection ──────────────────────────────────────────

    // Basic 6-digit hex (no close Tailwind match → no fix)
    {
      code: '<div className="bg-[#FF0000]" />',
      errors: [{ messageId: 'arbitraryColor' }],
    },

    // 3-digit shorthand hex
    fixable(
      '<div className="text-[#333]" />',
      '<div className="text-zinc-800" />',
    ),

    // 8-digit hex (with alpha)
    fixable(
      '<div className="bg-[#3b82f6ff]" />',
      '<div className="bg-blue-500" />',
    ),

    // Exact match → correct token suggestion
    {
      code: '<div className="bg-[#3b82f6]" />',
      output: '<div className="bg-blue-500" />',
      errors: [{
        messageId: 'arbitraryColor',
        data: {
          className: 'bg-[#3b82f6]',
          suggestion: ' Suggested: `bg-blue-500`',
        },
        suggestions: [{
          messageId: 'suggestToken',
          data: { replacement: 'bg-blue-500' },
          output: '<div className="bg-blue-500" />',
        }],
      }],
    },

    // ── Auto-fix preserves non-color classes ─────────────────────────

    fixable(
      '<div className="p-4 bg-[#3b82f6] m-2 rounded-lg" />',
      '<div className="p-4 bg-blue-500 m-2 rounded-lg" />',
    ),

    // ── Multiple arbitrary colors in one className ───────────────────

    {
      code: '<div className="bg-[#FF0000] text-[#00FF00]" />',
      errors: [
        { messageId: 'arbitraryColor' },
        { messageId: 'arbitraryColor' },
      ],
    },

    // ── Responsive variants — still flagged ─────────────────────────

    {
      code: '<div className="sm:bg-[#FF0000]" />',
      errors: [{ messageId: 'arbitraryColor' }],
    },
    fixable(
      '<div className="md:hover:bg-[#3b82f6]" />',
      '<div className="md:hover:bg-blue-500" />',
    ),

    // ── All color utility prefixes ──────────────────────────────────

    fixable('<div className="ring-[#ef4444]" />', '<div className="ring-red-500" />'),
    fixable('<div className="outline-[#ef4444]" />', '<div className="outline-red-500" />'),
    fixable('<div className="border-[#3b82f6]" />', '<div className="border-blue-500" />'),
    fixable('<div className="fill-[#22c55e]" />', '<div className="fill-green-500" />'),
    fixable('<div className="stroke-[#ef4444]" />', '<div className="stroke-red-500" />'),
    fixable('<div className="caret-[#3b82f6]" />', '<div className="caret-blue-500" />'),
    fixable('<div className="accent-[#8b5cf6]" />', '<div className="accent-violet-500" />'),
    fixable('<div className="shadow-[#000000]" />', '<div className="shadow-black" />'),
    fixable('<div className="decoration-[#ef4444]" />', '<div className="decoration-red-500" />'),
    fixable('<div className="placeholder-[#9ca3af]" />', '<div className="placeholder-gray-400" />'),
    fixable('<div className="divide-[#e5e7eb]" />', '<div className="divide-gray-200" />'),

    // ── RGB/RGBA arbitrary colors ───────────────────────────────────

    fixable(
      '<div className="bg-[rgb(239,68,68)]" />',
      '<div className="bg-red-500" />',
    ),
    fixable(
      '<div className="text-[rgba(59,130,246,0.5)]" />',
      '<div className="text-blue-500" />',
    ),

    // ── HSL arbitrary colors ────────────────────────────────────────

    fixable(
      '<div className="bg-[hsl(0,84%,60%)]" />',
      '<div className="bg-red-500" />',
    ),

    // ── cn()/clsx() wrapper detection ───────────────────────────────

    fixable(
      '<div className={cn("bg-[#3b82f6]", "p-4")} />',
      '<div className={cn("bg-blue-500", "p-4")} />',
    ),
    fixable(
      '<div className={clsx("text-[#ef4444]")} />',
      '<div className={clsx("text-red-500")} />',
    ),
    fixable(
      '<div className={cva("border-[#3b82f6]")} />',
      '<div className={cva("border-blue-500")} />',
    ),
    fixable(
      '<div className={twMerge("bg-[#22c55e]")} />',
      '<div className={twMerge("bg-green-500")} />',
    ),

    // ── Template literal detection ──────────────────────────────────

    fixable(
      '<div className={`bg-[#3b82f6] p-4`} />',
      '<div className={`bg-blue-500 p-4`} />',
    ),

    // ── Expression container with string literal ────────────────────

    fixable(
      '<div className={"bg-[#3b82f6]"} />',
      '<div className={"bg-blue-500"} />',
    ),

    // ── Custom tokens from designSystem ─────────────────────────────

    fixable(
      '<div className="bg-[#1A5276]" />',
      '<div className="bg-brand-primary" />',
      { options: [{ customTokens: { 'brand-primary': '#1A5276' } }] },
    ),
  ],
});

// ── Edge case tests ─────────────────────────────────────────────────

describe('no-arbitrary-colors edge cases', () => {
  const edgeTester = new RuleTester({
    languageOptions: {
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  });

  edgeTester.run('no-arbitrary-colors (malformed)', rule, {
    valid: [
      // Does NOT crash on malformed className
      { code: '<div className={undefined} />' },
      { code: '<div className={42} />' },
      { code: '<div className={true} />' },
      { code: '<div className={null} />' },
      // Not a className attribute
      { code: '<div style="bg-[#FF0000]" />' },
      // class attribute also works for valid classes
      { code: '<div class="bg-red-500" />' },
    ],
    invalid: [
      // class attribute also detects violations
      fixable(
        '<div class="bg-[#3b82f6]" />',
        '<div class="bg-blue-500" />',
      ),
    ],
  });
});
