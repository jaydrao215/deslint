import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import rule from '../../src/rules/prefers-reduced-motion.js';

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

ruleTester.run('prefers-reduced-motion', rule, {
  valid: [
    // ── No animation classes — no issue ──
    {
      code: '<div className="bg-blue-500 text-white p-4">Static</div>',
    },

    // ── motion-safe: variant wrapping ──
    {
      code: '<div className="motion-safe:animate-spin">Loading</div>',
    },

    // ── motion-reduce: variant for override ──
    {
      code: '<div className="animate-spin motion-reduce:animate-none">Loading</div>',
    },

    // ── Safe class: animate-none ──
    {
      code: '<div className="animate-none">Static</div>',
    },

    // ── Safe class: transition-none ──
    {
      code: '<div className="transition-none">Static</div>',
    },

    // ── Safe class: duration-0 ──
    {
      code: '<div className="duration-0">Instant</div>',
    },

    // ── motion-safe with responsive prefix ──
    {
      code: '<div className="motion-safe:animate-bounce">Bounce</div>',
    },

    // ── No class attribute ──
    {
      code: '<div>No classes</div>',
    },
  ],

  invalid: [
    // ── animate-spin without motion variant ──
    {
      code: '<div className="animate-spin">Loading</div>',
      errors: [{ messageId: 'missingMotionSafe' }],
    },

    // ── transition-all without motion variant ──
    {
      code: '<button className="transition-all duration-300 hover:bg-blue-600">Click</button>',
      errors: [
        { messageId: 'missingMotionSafe' },
        { messageId: 'missingMotionSafe' },
      ],
    },

    // ── animate-bounce without variant ──
    {
      code: '<div className="animate-bounce text-red-500">Alert</div>',
      errors: [{ messageId: 'missingMotionSafe' }],
    },

    // ── ease-in-out without motion variant ──
    {
      code: '<div className="transition-colors ease-in-out duration-200">Fade</div>',
      errors: [
        { messageId: 'missingMotionSafe' },
        { messageId: 'missingMotionSafe' },
        { messageId: 'missingMotionSafe' },
      ],
    },

    // ── delay- without motion variant ──
    {
      code: '<div className="animate-pulse delay-150">Pulse</div>',
      errors: [
        { messageId: 'missingMotionSafe' },
        { messageId: 'missingMotionSafe' },
      ],
    },
  ],
});
