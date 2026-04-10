import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import rule from '../../src/rules/touch-target-size.js';

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

ruleTester.run('touch-target-size', rule, {
  valid: [
    // ── No explicit dimensions — browser default, usually OK ──
    {
      code: '<button className="bg-blue-500 text-white">Click me</button>',
    },

    // ── Adequate size (w-8 = 32px > 24px minimum) ──
    {
      code: '<button className="w-8 h-8 bg-blue-500">X</button>',
    },

    // ── size-8 (both dimensions = 32px) ──
    {
      code: '<button className="size-8 rounded-full">X</button>',
    },

    // ── Large button ──
    {
      code: '<button className="w-12 h-12 bg-red-500">Delete</button>',
    },

    // ── Adequate padding (p-3 = 12px per side = 24px+ total) ──
    {
      code: '<button className="w-4 h-4 p-3 bg-blue-500">X</button>',
    },

    // ── Adequate px padding ──
    {
      code: '<button className="w-4 h-4 px-3 bg-blue-500">X</button>',
    },

    // ── Non-interactive element — skip ──
    {
      code: '<div className="w-2 h-2 bg-red-500" />',
    },

    // ── Spread attributes — benefit of the doubt ──
    {
      code: '<button {...props} className="w-4 h-4" />',
    },

    // ── min-w/min-h at adequate size ──
    {
      code: '<button className="min-w-6 min-h-6">OK</button>',
    },

    // ── Only width set, height not — skip (only report when both dimensions detectable) ──
    {
      code: '<a className="w-10 text-blue-500" href="/home">Home</a>',
    },

    // ── Exactly at minimum (w-6 = 24px, h-6 = 24px) ──
    {
      code: '<button className="w-6 h-6 rounded">+</button>',
    },
  ],

  invalid: [
    // ── Too small: w-4 h-4 = 16x16px (below 24px minimum) ──
    {
      code: '<button className="w-4 h-4 bg-blue-500">X</button>',
      errors: [{ messageId: 'fixedTooSmall' }],
    },

    // ── Too small: size-4 = 16x16px ──
    {
      code: '<button className="size-4 rounded-full bg-gray-200">·</button>',
      errors: [{ messageId: 'fixedTooSmall' }],
    },

    // ── Too small: w-5 h-5 = 20x20px ──
    {
      code: '<a className="w-5 h-5 inline-block" href="/close">X</a>',
      errors: [{ messageId: 'fixedTooSmall' }],
    },

    // ── Width OK but height too small ──
    {
      code: '<button className="w-8 h-4 bg-blue-500">—</button>',
      errors: [{ messageId: 'fixedTooSmall' }],
    },

    // ── Too small on input ──
    {
      code: '<input className="w-4 h-4" type="checkbox" />',
      errors: [{ messageId: 'fixedTooSmall' }],
    },
  ],
});
