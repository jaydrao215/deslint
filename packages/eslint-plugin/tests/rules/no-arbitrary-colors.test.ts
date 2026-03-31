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

ruleTester.run('no-arbitrary-colors', rule, {
  valid: [
    // Standard Tailwind color classes — should NOT be flagged
    { code: '<div className="bg-red-500 text-white" />' },
    { code: '<div className="border-blue-600" />' },
    { code: '<div className="bg-slate-900 text-slate-100" />' },
    // Valid Tailwind v4 classes
    { code: '<div className="bg-linear-to-r" />' },
    // Allowlisted hex values
    {
      code: '<div className="bg-[#FF0000]" />',
      options: [{ allowlist: ['#FF0000'] }],
    },
    // Non-color arbitrary values (handled by other rules)
    { code: '<div className="p-[13px]" />' },
    { code: '<div className="w-[200px]" />' },
  ],
  invalid: [
    // Basic arbitrary hex color detection
    {
      code: '<div className="bg-[#FF0000]" />',
      errors: [{ messageId: 'arbitraryColor' }],
    },
    {
      code: '<div className="text-[#333]" />',
      errors: [{ messageId: 'arbitraryColor' }],
    },
    {
      code: '<div className="border-[#abc123]" />',
      errors: [{ messageId: 'arbitraryColor' }],
    },
    // Exact match should suggest correct token
    {
      code: '<div className="bg-[#3b82f6]" />',
      errors: [
        {
          messageId: 'arbitraryColor',
          data: {
            className: 'bg-[#3b82f6]',
            suggestion: expect.stringContaining('bg-blue-500'),
          },
        },
      ],
    },
    // Multiple arbitrary colors in one className
    {
      code: '<div className="bg-[#FF0000] text-[#00FF00]" />',
      errors: [
        { messageId: 'arbitraryColor' },
        { messageId: 'arbitraryColor' },
      ],
    },
    // With responsive variant — still flagged
    {
      code: '<div className="sm:bg-[#FF0000]" />',
      errors: [{ messageId: 'arbitraryColor' }],
    },
  ],
});
