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
    { code: '<div className="bg-blue-500 text-white p-4">Static</div>' },
    { code: '<div className="motion-safe:animate-spin">Loading</div>' },
    { code: '<div className="animate-spin motion-reduce:animate-none">Loading</div>' },
    { code: '<div className="animate-none">Static</div>' },
    { code: '<div className="transition-none">Static</div>' },
    { code: '<div className="duration-0">Instant</div>' },
    { code: '<div className="motion-safe:animate-bounce">Bounce</div>' },
    { code: '<div>No classes</div>' },
  ],

  invalid: [
    // ── Single motion class → one-pass fix ──
    {
      code: '<div className="animate-spin">Loading</div>',
      output: '<div className="motion-safe:animate-spin">Loading</div>',
      errors: [{ messageId: 'missingMotionSafe' }],
    },

    // ── Two motion classes → multi-pass fix ──
    {
      code: '<button className="transition-all duration-300 hover:bg-blue-600">Click</button>',
      output: [
        '<button className="motion-safe:transition-all duration-300 hover:bg-blue-600">Click</button>',
        '<button className="motion-safe:transition-all motion-safe:duration-300 hover:bg-blue-600">Click</button>',
      ],
      errors: [
        { messageId: 'missingMotionSafe' },
        { messageId: 'missingMotionSafe' },
      ],
    },

    // ── Single motion class with non-motion classes ──
    {
      code: '<div className="animate-bounce text-red-500">Alert</div>',
      output: '<div className="motion-safe:animate-bounce text-red-500">Alert</div>',
      errors: [{ messageId: 'missingMotionSafe' }],
    },

    // ── Three motion classes → multi-pass fix ──
    {
      code: '<div className="transition-colors ease-in-out duration-200">Fade</div>',
      output: [
        '<div className="motion-safe:transition-colors ease-in-out duration-200">Fade</div>',
        '<div className="motion-safe:transition-colors motion-safe:ease-in-out duration-200">Fade</div>',
        '<div className="motion-safe:transition-colors motion-safe:ease-in-out motion-safe:duration-200">Fade</div>',
      ],
      errors: [
        { messageId: 'missingMotionSafe' },
        { messageId: 'missingMotionSafe' },
        { messageId: 'missingMotionSafe' },
      ],
    },

    // ── Two motion classes → multi-pass fix ──
    {
      code: '<div className="animate-pulse delay-150">Pulse</div>',
      output: [
        '<div className="motion-safe:animate-pulse delay-150">Pulse</div>',
        '<div className="motion-safe:animate-pulse motion-safe:delay-150">Pulse</div>',
      ],
      errors: [
        { messageId: 'missingMotionSafe' },
        { messageId: 'missingMotionSafe' },
      ],
    },
  ],
});
