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
 * Nearest-colour heuristic match. The rule must REPORT but not autofix —
 * silently rewriting a brand hex like `#1A5276` to `bg-slate-700` destroys
 * the design. The suggestion path still offers the nearest colour so
 * IDE / interactive users can opt in per occurrence.
 */
function nearestSuggestion(
  code: string,
  suggestedOutput: string,
  replacement: string,
  extra?: { options?: any },
) {
  return {
    code,
    output: null,
    ...(extra?.options ? { options: extra.options } : {}),
    errors: [
      {
        messageId: 'arbitraryColor' as const,
        suggestions: [
          {
            messageId: 'suggestToken' as const,
            data: { replacement },
            output: suggestedOutput,
          },
        ],
      },
    ],
  };
}

/**
 * Exact match via `customTokens` — a user-authored mapping. This IS safe to
 * autofix because the author has explicitly said "this specific hex is
 * this specific token".
 */
function exactTokenFix(
  code: string,
  output: string,
  replacement: string,
  options: any,
) {
  return {
    code,
    output,
    options,
    errors: [
      {
        messageId: 'arbitraryColor' as const,
        suggestions: [
          {
            messageId: 'suggestToken' as const,
            data: { replacement },
            output,
          },
        ],
      },
    ],
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

    // ── CSS custom property references (default: allowed, they ARE design tokens) ──
    { code: '<div className="shadow-[var(--shadow-glass)]" />' },
    { code: '<div className="shadow-[var(--shadow-elevated)]" />' },
    { code: '<div className="text-[var(--text-on-dark)]" />' },
    { code: '<div className="bg-[var(--glass-9)]" />' },
    { code: '<div className="hover:shadow-[var(--shadow-float)]" />' },
    { code: '<div className="shadow-[var(--shadow-card)] bg-surface" />' },
  ],
  invalid: [
    // ── Hex colors: REPORT, never rewrite ─────────────────────────────
    // Every one of these used to be silently rewritten to the "nearest"
    // Tailwind colour. For a brand hex like `#1A5276` that meant
    // `bg-slate-700` — a different colour, different visual identity.
    // We keep the suggestion so authors can accept per-occurrence.

    // No close Tailwind match → report, no suggestion (distance > 50 in RGB
    // space). We'd rather keep quiet than suggest a visibly different colour.
    {
      code: '<div className="bg-[#FF0000]" />',
      output: null,
      errors: [{ messageId: 'arbitraryColor' as const }],
    },

    // 3-digit shorthand hex
    nearestSuggestion(
      '<div className="text-[#333]" />',
      '<div className="text-zinc-800" />',
      'text-zinc-800',
    ),

    // 8-digit hex (with alpha)
    nearestSuggestion(
      '<div className="bg-[#3b82f6ff]" />',
      '<div className="bg-blue-500" />',
      'bg-blue-500',
    ),

    // Exact-looking #3b82f6 → still only a suggestion (Tailwind's palette
    // changes over time; the author may have meant THIS exact hex)
    nearestSuggestion(
      '<div className="bg-[#3b82f6]" />',
      '<div className="bg-blue-500" />',
      'bg-blue-500',
    ),

    // Preserves surrounding classes in the suggestion
    nearestSuggestion(
      '<div className="p-4 bg-[#3b82f6] m-2 rounded-lg" />',
      '<div className="p-4 bg-blue-500 m-2 rounded-lg" />',
      'bg-blue-500',
    ),

    // ── Multiple arbitrary colors in one className ───────────────────
    {
      code: '<div className="bg-[#FF0000] text-[#00FF00]" />',
      output: null,
      errors: [
        { messageId: 'arbitraryColor' },
        { messageId: 'arbitraryColor' },
      ],
    },

    // ── Responsive variants ──────────────────────────────────────────
    // #FF0000 still has no close Tailwind match even with a variant prefix.
    {
      code: '<div className="sm:bg-[#FF0000]" />',
      output: null,
      errors: [{ messageId: 'arbitraryColor' as const }],
    },
    nearestSuggestion(
      '<div className="md:hover:bg-[#3b82f6]" />',
      '<div className="md:hover:bg-blue-500" />',
      'md:hover:bg-blue-500',
    ),

    // ── All color utility prefixes: report, no autofix ───────────────
    nearestSuggestion('<div className="ring-[#ef4444]" />',      '<div className="ring-red-500" />',      'ring-red-500'),
    nearestSuggestion('<div className="outline-[#ef4444]" />',   '<div className="outline-red-500" />',   'outline-red-500'),
    nearestSuggestion('<div className="border-[#3b82f6]" />',    '<div className="border-blue-500" />',   'border-blue-500'),
    nearestSuggestion('<div className="fill-[#22c55e]" />',      '<div className="fill-green-500" />',    'fill-green-500'),
    nearestSuggestion('<div className="stroke-[#ef4444]" />',    '<div className="stroke-red-500" />',    'stroke-red-500'),
    nearestSuggestion('<div className="caret-[#3b82f6]" />',     '<div className="caret-blue-500" />',    'caret-blue-500'),
    nearestSuggestion('<div className="accent-[#8b5cf6]" />',    '<div className="accent-violet-500" />', 'accent-violet-500'),
    nearestSuggestion('<div className="shadow-[#000000]" />',    '<div className="shadow-black" />',      'shadow-black'),
    nearestSuggestion('<div className="decoration-[#ef4444]" />','<div className="decoration-red-500" />','decoration-red-500'),
    nearestSuggestion('<div className="placeholder-[#9ca3af]" />','<div className="placeholder-gray-400" />','placeholder-gray-400'),
    nearestSuggestion('<div className="divide-[#e5e7eb]" />',    '<div className="divide-gray-200" />',   'divide-gray-200'),

    // ── RGB/RGBA arbitrary colors ───────────────────────────────────
    nearestSuggestion(
      '<div className="bg-[rgb(239,68,68)]" />',
      '<div className="bg-red-500" />',
      'bg-red-500',
    ),
    nearestSuggestion(
      '<div className="text-[rgba(59,130,246,0.5)]" />',
      '<div className="text-blue-500" />',
      'text-blue-500',
    ),

    // ── HSL arbitrary colors ────────────────────────────────────────
    nearestSuggestion(
      '<div className="bg-[hsl(0,84%,60%)]" />',
      '<div className="bg-red-500" />',
      'bg-red-500',
    ),

    // ── cn()/clsx()/cva()/twMerge() wrapper detection ───────────────
    nearestSuggestion(
      '<div className={cn("bg-[#3b82f6]", "p-4")} />',
      '<div className={cn("bg-blue-500", "p-4")} />',
      'bg-blue-500',
    ),
    nearestSuggestion(
      '<div className={clsx("text-[#ef4444]")} />',
      '<div className={clsx("text-red-500")} />',
      'text-red-500',
    ),
    nearestSuggestion(
      '<div className={cva("border-[#3b82f6]")} />',
      '<div className={cva("border-blue-500")} />',
      'border-blue-500',
    ),
    nearestSuggestion(
      '<div className={twMerge("bg-[#22c55e]")} />',
      '<div className={twMerge("bg-green-500")} />',
      'bg-green-500',
    ),

    // ── Template literal / expression container ─────────────────────
    nearestSuggestion(
      '<div className={`bg-[#3b82f6] p-4`} />',
      '<div className={`bg-blue-500 p-4`} />',
      'bg-blue-500',
    ),
    nearestSuggestion(
      '<div className={"bg-[#3b82f6]"} />',
      '<div className={"bg-blue-500"} />',
      'bg-blue-500',
    ),

    // ── customTokens → exact hex match: SAFE to autofix ─────────────
    // This is the only autofix path. The author has declared
    // `#1A5276 === brand-primary`, so the rewrite is a token-for-token
    // substitution and can never change the visible colour.
    exactTokenFix(
      '<div className="bg-[#1A5276]" />',
      '<div className="bg-brand-primary" />',
      'bg-brand-primary',
      [{ customTokens: { 'brand-primary': '#1A5276' } }],
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
      // class attribute also detects violations (nearest-suggestion, no fix)
      nearestSuggestion(
        '<div class="bg-[#3b82f6]" />',
        '<div class="bg-blue-500" />',
        'bg-blue-500',
      ),
    ],
  });
});
