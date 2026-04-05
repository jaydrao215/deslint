import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import rule from '../../src/rules/dark-mode-coverage.js';

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

function inv(code: string, output: string, suggested: string) {
  return {
    code,
    output,
    errors: [{
      messageId: 'missingDarkVariant' as const,
      suggestions: [{
        messageId: 'suggestDarkVariant' as const,
        data: { suggested },
        output,
      }],
    }],
  };
}

ruleTester.run('dark-mode-coverage', rule, {
  valid: [
    { code: '<div className="bg-blue-500 dark:bg-blue-900" />' },
    { code: '<div className="bg-white dark:bg-gray-900" />' },
    { code: '<div className="bg-slate-100 dark:bg-slate-800 p-4" />' },
    { code: '<div className="p-4 m-2 flex" />' },
    { code: '<div className="text-white font-bold" />' },
    { code: '<div className="bg-transparent" />' },
    { code: '<div className="bg-inherit" />' },
    { code: '<div className="bg-current" />' },
    { code: '<div className="bg-gradient-to-r from-blue-500 to-purple-500" />' },
    { code: '<div className="md:bg-blue-500" />' },
    {
      code: '<div className="bg-blue-500" />',
      options: [{ ignoredColors: ['bg-blue-500'] }],
    },
    {
      code: '<div className="bg-blue-500" />',
      options: [{ ignoredPrefixes: ['bg-blue'] }],
    },

    // ── Semantic/custom tokens (CSS-variable-based theming) — NOT flagged ──
    { code: '<div className="bg-background" />' },
    { code: '<div className="bg-surface" />' },
    { code: '<div className="bg-surface-muted" />' },
    { code: '<div className="bg-danger-soft" />' },
    { code: '<div className="bg-success-soft" />' },
    { code: '<div className="bg-danger" />' },

    // ── Arbitrary values (gradients, CSS vars) — NOT flagged ──
    { code: '<div className="bg-[linear-gradient(135deg,rgba(15,23,41,0.03),rgba(0,200,150,0.08))]" />' },
    { code: '<div className="bg-[var(--glass-9)]" />' },
    { code: '<div className="bg-[radial-gradient(circle,_rgba(90,113,191,0.26),_transparent_32%)]" />' },

    // ── Opacity modifiers — NOT flagged ──
    { code: '<div className="bg-accent-500/10" />' },
    { code: '<div className="bg-white/78" />' },
    { code: '<div className="bg-black/60" />' },
    { code: '<div className="bg-emerald-500/15" />' },
  ],

  invalid: [
    inv(
      '<div className="bg-blue-500 p-4" />',
      '<div className="bg-blue-500 dark:bg-blue-500 p-4" />',
      'dark:bg-blue-500',
    ),
    inv(
      '<div className="bg-white text-black" />',
      '<div className="bg-white dark:bg-gray-900 text-black" />',
      'dark:bg-gray-900',
    ),
    inv(
      '<div className="bg-black text-white" />',
      '<div className="bg-black dark:bg-gray-50 text-white" />',
      'dark:bg-gray-50',
    ),
    inv(
      '<div className="bg-slate-100" />',
      '<div className="bg-slate-100 dark:bg-slate-900" />',
      'dark:bg-slate-900',
    ),
    inv(
      '<div className="bg-red-200" />',
      '<div className="bg-red-200 dark:bg-red-800" />',
      'dark:bg-red-800',
    ),
    inv(
      '<div className="bg-green-700" />',
      '<div className="bg-green-700 dark:bg-green-300" />',
      'dark:bg-green-300',
    ),
    inv(
      '<div className="bg-gray-50 rounded" />',
      '<div className="bg-gray-50 dark:bg-gray-950 rounded" />',
      'dark:bg-gray-950',
    ),
    inv(
      '<div className="bg-indigo-950" />',
      '<div className="bg-indigo-950 dark:bg-indigo-50" />',
      'dark:bg-indigo-50',
    ),
    inv(
      '<div className={cn("bg-purple-400 p-4")} />',
      '<div className={cn("bg-purple-400 dark:bg-purple-600 p-4")} />',
      'dark:bg-purple-600',
    ),
  ],
});
