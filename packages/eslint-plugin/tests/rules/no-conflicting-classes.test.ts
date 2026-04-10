import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import rule from '../../src/rules/no-conflicting-classes.js';

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

ruleTester.run('no-conflicting-classes', rule, {
  valid: [
    // ── No conflicts ──
    { code: '<div className="flex items-center gap-4" />' },
    { code: '<div className="block p-4 m-2" />' },
    { code: '<div className="hidden md:flex" />' },

    // ── Different variants = not a conflict ──
    { code: '<div className="flex sm:hidden" />' },
    { code: '<div className="hidden md:block" />' },
    { code: '<div className="flex-row md:flex-col" />' },
    { code: '<div className="text-left md:text-center" />' },
    { code: '<div className="items-start hover:items-center" />' },

    // ── Single class ──
    { code: '<div className="flex" />' },
    { code: '<div className="" />' },

    // ── Non-conflicting utilities from same group not present ──
    { code: '<div className="flex justify-between items-center gap-2" />' },

    // ── Different display types across variant levels ──
    { code: '<div className="grid lg:flex" />' },
  ],
  invalid: [
    // ── Display conflicts ──
    {
      code: '<div className="flex hidden" />',
      errors: [{ messageId: 'conflictingClasses', data: { classA: 'flex', classB: 'hidden', group: 'display' } }],
    },
    {
      code: '<div className="block inline" />',
      errors: [{ messageId: 'conflictingClasses', data: { classA: 'block', classB: 'inline', group: 'display' } }],
    },
    {
      code: '<div className="flex grid" />',
      errors: [{ messageId: 'conflictingClasses', data: { classA: 'flex', classB: 'grid', group: 'display' } }],
    },
    {
      code: '<div className="inline-block inline-flex" />',
      errors: [{ messageId: 'conflictingClasses', data: { classA: 'inline-block', classB: 'inline-flex', group: 'display' } }],
    },

    // ── Visibility conflicts ──
    {
      code: '<div className="visible invisible" />',
      errors: [{ messageId: 'conflictingClasses', data: { classA: 'visible', classB: 'invisible', group: 'visibility' } }],
    },

    // ── Position conflicts ──
    {
      code: '<div className="absolute relative" />',
      errors: [{ messageId: 'conflictingClasses', data: { classA: 'absolute', classB: 'relative', group: 'position' } }],
    },
    {
      code: '<div className="fixed sticky" />',
      errors: [{ messageId: 'conflictingClasses', data: { classA: 'fixed', classB: 'sticky', group: 'position' } }],
    },

    // ── Flex direction conflicts ──
    {
      code: '<div className="flex-row flex-col" />',
      errors: [{ messageId: 'conflictingClasses', data: { classA: 'flex-row', classB: 'flex-col', group: 'flexDirection' } }],
    },

    // ── Text alignment conflicts ──
    {
      code: '<div className="text-left text-center" />',
      errors: [{ messageId: 'conflictingClasses', data: { classA: 'text-left', classB: 'text-center', group: 'textAlign' } }],
    },

    // ── Font weight conflicts ──
    {
      code: '<div className="font-bold font-normal" />',
      errors: [{ messageId: 'conflictingClasses', data: { classA: 'font-bold', classB: 'font-normal', group: 'fontWeight' } }],
    },

    // ── Justify content conflicts ──
    {
      code: '<div className="justify-center justify-between" />',
      errors: [{ messageId: 'conflictingClasses', data: { classA: 'justify-center', classB: 'justify-between', group: 'justifyContent' } }],
    },

    // ── Align items conflicts ──
    {
      code: '<div className="items-center items-start" />',
      errors: [{ messageId: 'conflictingClasses', data: { classA: 'items-center', classB: 'items-start', group: 'alignItems' } }],
    },

    // ── Same variant level = still a conflict ──
    {
      code: '<div className="sm:flex sm:hidden" />',
      errors: [{ messageId: 'conflictingClasses', data: { classA: 'sm:flex', classB: 'sm:hidden', group: 'display' } }],
    },
    {
      code: '<div className="md:hover:text-left md:hover:text-center" />',
      errors: [{ messageId: 'conflictingClasses', data: { classA: 'md:hover:text-left', classB: 'md:hover:text-center', group: 'textAlign' } }],
    },

    // ── Overflow conflicts ──
    {
      code: '<div className="overflow-hidden overflow-auto" />',
      errors: [{ messageId: 'conflictingClasses', data: { classA: 'overflow-hidden', classB: 'overflow-auto', group: 'overflow' } }],
    },

    // ── Width conflicts ──
    {
      code: '<div className="w-full w-auto" />',
      errors: [{ messageId: 'conflictingClasses', data: { classA: 'w-full', classB: 'w-auto', group: 'width' } }],
    },

    // ── Flex wrap conflicts ──
    {
      code: '<div className="flex-wrap flex-nowrap" />',
      errors: [{ messageId: 'conflictingClasses', data: { classA: 'flex-wrap', classB: 'flex-nowrap', group: 'flexWrap' } }],
    },

    // ── Text size conflicts ──
    {
      code: '<div className="text-sm text-lg" />',
      errors: [{ messageId: 'conflictingClasses', data: { classA: 'text-sm', classB: 'text-lg', group: 'textSize' } }],
    },

    // ── cn() wrapper detection ──
    {
      code: '<div className={cn("flex hidden", "p-4")} />',
      errors: [{ messageId: 'conflictingClasses' }],
    },

    // ── Template literal detection ──
    {
      code: '<div className={`flex hidden p-4`} />',
      errors: [{ messageId: 'conflictingClasses' }],
    },

    // ── Expression container ──
    {
      code: '<div className={"block inline p-4"} />',
      errors: [{ messageId: 'conflictingClasses' }],
    },
  ],
});

// ── Custom conflict pairs ──
describe('no-conflicting-classes custom conflicts', () => {
  const customTester = new RuleTester({
    languageOptions: {
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  });

  customTester.run('no-conflicting-classes (custom)', rule, {
    valid: [
      {
        code: '<div className="bg-primary text-white" />',
        options: [{ customConflicts: [['bg-primary', 'bg-secondary']] }],
      },
    ],
    invalid: [
      {
        code: '<div className="bg-primary bg-secondary" />',
        options: [{ customConflicts: [['bg-primary', 'bg-secondary']] }],
        errors: [{ messageId: 'conflictingClasses', data: { classA: 'bg-primary', classB: 'bg-secondary', group: 'custom' } }],
      },
    ],
  });
});
