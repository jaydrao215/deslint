import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import rule from '../../src/rules/a11y-color-contrast.js';

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

ruleTester.run('a11y-color-contrast', rule, {
  valid: [
    // ── High contrast: dark text on light bg — PASSES AA ──
    { code: '<div className="text-gray-900 bg-white" />' },
    { code: '<div className="text-black bg-white" />' },
    { code: '<div className="text-gray-800 bg-gray-50" />' },

    // ── High contrast: light text on dark bg — PASSES AA ──
    { code: '<div className="text-white bg-gray-900" />' },
    { code: '<div className="text-gray-100 bg-black" />' },
    { code: '<div className="text-white bg-blue-700" />' },

    // ── Only text color, no bg — no comparison needed ──
    { code: '<div className="text-gray-400" />' },
    { code: '<div className="text-red-500 p-4" />' },

    // ── Only bg color, no text — no comparison needed ──
    { code: '<div className="bg-white p-4" />' },
    { code: '<div className="bg-gray-100 rounded" />' },

    // ── No color classes at all ──
    { code: '<div className="p-4 m-2 flex" />' },

    // ── Large text gets relaxed threshold (3:1) ──
    // gray-500 on white = ~4.6:1 — fails normal (4.5) but passes large (3.0)
    // Actually gray-500 (#6b7280) on white = ~4.6:1, which passes normal too
    // Let's use a specific known pair: gray-400 on white = ~2.7:1 fails both
    // gray-500 on gray-100 ≈ ~3.5:1 passes large but not normal
    {
      code: '<div className="text-gray-500 bg-gray-100 text-xl" />',
    },

    // ── Bold + text-lg = large text (relaxed threshold) ──
    {
      code: '<div className="text-gray-500 bg-gray-100 text-lg font-bold" />',
    },

    // ── Responsive variant text color — base comparison skipped ──
    { code: '<div className="md:text-gray-400 bg-white" />' },

    // ── Custom color tokens that meet contrast ──
    {
      code: '<div className="text-brand-dark bg-brand-light" />',
      options: [{ customColors: { 'brand-dark': '#1a1a1a', 'brand-light': '#f5f5f5' } }],
    },
  ],

  invalid: [
    // ── Low contrast: light text on light bg — FAILS AA ──
    {
      code: '<div className="text-gray-400 bg-gray-300" />',
      errors: [{ messageId: 'insufficientContrast' as const }],
    },

    // ── Low contrast: gray on similar gray ──
    {
      code: '<div className="text-gray-400 bg-white" />',
      errors: [{ messageId: 'insufficientContrast' as const }],
    },

    // ── Low contrast: dark text on dark bg ──
    {
      code: '<div className="text-gray-700 bg-gray-800" />',
      errors: [{ messageId: 'insufficientContrast' as const }],
    },

    // ── Low contrast: colored text on colored bg ──
    {
      code: '<div className="text-blue-400 bg-blue-300" />',
      errors: [{ messageId: 'insufficientContrast' as const }],
    },

    // ── Low contrast: red on dark red ──
    {
      code: '<div className="text-red-400 bg-red-600" />',
      errors: [{ messageId: 'insufficientContrast' as const }],
    },

    // ── Low contrast with other classes present ──
    {
      code: '<div className="p-4 text-gray-300 bg-gray-200 rounded-lg flex" />',
      errors: [{ messageId: 'insufficientContrast' as const }],
    },

    // ── Custom color tokens that fail contrast ──
    {
      code: '<div className="text-brand-mid bg-brand-light" />',
      options: [{ customColors: { 'brand-mid': '#888888', 'brand-light': '#cccccc' } }],
      errors: [{ messageId: 'insufficientContrast' as const }],
    },

    // ── Normal text size (default) — uses 4.5:1 threshold ──
    // gray-500 on gray-200: #6b7280 on #e5e7eb ≈ 3.1:1 — fails normal text
    {
      code: '<div className="text-gray-500 bg-gray-200" />',
      errors: [{ messageId: 'insufficientContrast' as const }],
    },
  ],
});
