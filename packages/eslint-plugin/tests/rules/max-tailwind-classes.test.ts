import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import rule from '../../src/rules/max-tailwind-classes.js';

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

ruleTester.run('max-tailwind-classes', rule, {
  valid: [
    // ── Under default limit (15) ──
    { code: '<div className="flex items-center gap-4" />' },
    { code: '<div className="p-4 m-2 w-full h-auto flex rounded-lg border bg-white text-gray-900 shadow-sm hover:shadow-md transition-all" />' },

    // ── Exactly 15 classes — not over ──
    {
      code: '<div className="flex items-center justify-between gap-4 p-4 m-2 rounded-lg border bg-white text-gray-900 shadow-sm hover:shadow-md transition-all w-full h-auto" />',
    },

    // ── Empty className ──
    { code: '<div className="" />' },
    { code: '<div className="   " />' },

    // ── Custom higher limit ──
    {
      code: '<div className="flex items-center justify-between gap-4 p-4 m-2 rounded-lg border bg-white text-gray-900 shadow-sm hover:shadow-md transition-all w-full h-auto min-h-screen overflow-hidden" />',
      options: [{ max: 20 }],
    },

    // ── No className ──
    { code: '<div id="test" />' },
  ],
  invalid: [
    // ── Over default limit (16 classes) ──
    {
      code: '<div className="flex items-center justify-between gap-4 p-4 m-2 rounded-lg border bg-white text-gray-900 shadow-sm hover:shadow-md transition-all w-full h-auto min-h-screen" />',
      errors: [{ messageId: 'tooManyClasses', data: { count: '16', max: '15' } }],
    },

    // ── Way over limit ──
    {
      code: '<div className="flex items-center justify-between gap-4 p-4 m-2 rounded-lg border bg-white text-gray-900 shadow-sm hover:shadow-md transition-all w-full h-auto min-h-screen overflow-hidden absolute top-0 left-0 right-0 z-50" />',
      errors: [{ messageId: 'tooManyClasses', data: { count: '22', max: '15' } }],
    },

    // ── Custom lower limit ──
    {
      code: '<div className="flex items-center gap-4 p-4 m-2 rounded-lg" />',
      options: [{ max: 5 }],
      errors: [{ messageId: 'tooManyClasses', data: { count: '6', max: '5' } }],
    },

    // ── cn() wrapper ──
    {
      code: '<div className={cn("flex items-center justify-between gap-4 p-4 m-2 rounded-lg border bg-white text-gray-900 shadow-sm hover:shadow-md transition-all w-full h-auto min-h-screen overflow-hidden")} />',
      errors: [{ messageId: 'tooManyClasses' }],
    },

    // ── Template literal ──
    {
      code: '<div className={`flex items-center justify-between gap-4 p-4 m-2 rounded-lg border bg-white text-gray-900 shadow-sm hover:shadow-md transition-all w-full h-auto min-h-screen overflow-hidden`} />',
      errors: [{ messageId: 'tooManyClasses' }],
    },

    // ── Expression container ──
    {
      code: '<div className={"flex items-center justify-between gap-4 p-4 m-2 rounded-lg border bg-white text-gray-900 shadow-sm hover:shadow-md transition-all w-full h-auto min-h-screen overflow-hidden"} />',
      errors: [{ messageId: 'tooManyClasses' }],
    },
  ],
});
