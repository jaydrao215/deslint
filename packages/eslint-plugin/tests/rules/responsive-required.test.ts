import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import rule from '../../src/rules/responsive-required.js';

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

ruleTester.run('responsive-required', rule, {
  valid: [
    // ── Fixed width WITH both sm: AND md: variants — NOT flagged ──
    { code: '<div className="w-[800px] sm:w-full md:w-auto" />' },
    { code: '<div className="w-[1200px] sm:w-full md:w-1/2" />' },
    { code: '<div className="w-[600px] sm:w-full md:max-w-full" />' },

    // ── One breakpoint required and covered ──
    {
      code: '<div className="w-[800px] sm:w-full" />',
      options: [{ requiredBreakpoints: ['sm'] }],
    },

    // ── Icon/avatar sizing below threshold (< 64px) — NOT flagged ──
    { code: '<div className="w-[32px]" />' },
    { code: '<div className="w-[48px]" />' },
    { code: '<div className="w-[63px]" />' },

    // ── Standard Tailwind classes (no arbitrary) — NOT flagged ──
    { code: '<div className="w-full h-screen" />' },
    { code: '<div className="w-1/2 max-w-xl" />' },
    { code: '<div className="w-8 h-8" />' },

    // ── Percentage/viewport units — NOT flagged ──
    { code: '<div className="w-[50%]" />' },
    { code: '<div className="w-[100vw]" />' },

    // ── Configured custom threshold — value below is icon-sized ──
    {
      code: '<div className="w-[70px]" />',
      options: [{ iconSizeThreshold: 80 }],
    },

    // ── Ignored prefixes option ──
    {
      code: '<div className="w-[800px]" />',
      options: [{ ignoredPrefixes: ['w-'] }],
    },

    // ── max-w WITH responsive coverage — NOT flagged ──
    { code: '<div className="max-w-[800px] sm:w-full md:w-auto" />' },
    { code: '<div className="max-w-[1240px] sm:max-w-full md:max-w-screen-lg" />' },
    { code: '<div className="max-w-[800px] sm:max-w-[600px]" />', options: [{ requiredBreakpoints: ['sm'] }] },

    // ── min-w WITH responsive coverage — NOT flagged ──
    { code: '<div className="min-w-[200px] sm:min-w-0 md:min-w-full" />' },

    // ── Custom required breakpoints — satisfied ──
    {
      code: '<div className="w-[800px] lg:w-full" />',
      options: [{ requiredBreakpoints: ['lg'] }],
    },
  ],

  invalid: [
    // ── w-[Npx] with no responsive variants ──
    {
      code: '<div className="w-[800px]" />',
      errors: [{ messageId: 'missingResponsive' as const }],
    },
    {
      code: '<div className="w-[1200px]" />',
      errors: [{ messageId: 'missingResponsive' as const }],
    },
    {
      code: '<div className="w-[600px]" />',
      errors: [{ messageId: 'missingResponsive' as const }],
    },

    // ── rem-based fixed width ──
    {
      code: '<div className="w-[50rem]" />',
      errors: [{ messageId: 'missingResponsive' as const }],
    },

    // ── Only sm: covered — md: still missing (default requires sm+md) ──
    {
      code: '<div className="w-[800px] sm:w-full" />',
      errors: [{ messageId: 'missingResponsive' as const }],
    },

    // ── Only md: covered — sm: still missing ──
    {
      code: '<div className="w-[800px] md:w-full" />',
      errors: [{ messageId: 'missingResponsive' as const }],
    },

    // ── Exactly at threshold — flagged (threshold is exclusive lower bound) ──
    {
      code: '<div className="w-[64px]" />',
      errors: [{ messageId: 'missingResponsive' as const }],
    },

    // ── Large fixed width without responsive, other classes present ──
    {
      code: '<div className="bg-white p-4 w-[900px] text-sm" />',
      errors: [{ messageId: 'missingResponsive' as const }],
    },

    // ── Custom required breakpoints — sm+lg required, only sm provided ──
    {
      code: '<div className="w-[800px] sm:w-full" />',
      options: [{ requiredBreakpoints: ['sm', 'lg'] }],
      errors: [{ messageId: 'missingResponsive' as const }],
    },

    // ── sm+md+lg required, only sm+md provided ──
    {
      code: '<div className="w-[800px] sm:w-full md:w-1/2" />',
      options: [{ requiredBreakpoints: ['sm', 'md', 'lg'] }],
      errors: [{ messageId: 'missingResponsive' as const }],
    },

    // ── max-w without responsive variants — flagged ──
    {
      code: '<div className="max-w-[800px]" />',
      errors: [{ messageId: 'missingResponsive' as const }],
    },
    {
      code: '<div className="max-w-[1240px]" />',
      errors: [{ messageId: 'missingResponsive' as const }],
    },
    // max-w with only one breakpoint when two are required
    {
      code: '<div className="max-w-[800px] sm:max-w-full" />',
      errors: [{ messageId: 'missingResponsive' as const }],
    },

    // ── min-w without responsive variants — flagged ──
    {
      code: '<div className="min-w-[200px]" />',
      errors: [{ messageId: 'missingResponsive' as const }],
    },
  ],
});
