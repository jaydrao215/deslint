import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import rule from '../../src/rules/focus-visible-style.js';

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

ruleTester.run('focus-visible-style', rule, {
  valid: [
    // ── No outline removal — no issue ──
    {
      code: '<button className="bg-blue-500 text-white">Click</button>',
    },

    // ── outline-none WITH focus-visible:ring replacement ──
    {
      code: '<button className="outline-none focus-visible:ring-2 focus-visible:ring-blue-500">Click</button>',
    },

    // ── outline-none WITH focus:ring replacement ──
    {
      code: '<button className="outline-none focus:ring-2 focus:ring-offset-2">Click</button>',
    },

    // ── outline-none WITH focus-visible:outline replacement ──
    {
      code: '<input className="outline-none focus-visible:outline-2" />',
    },

    // ── outline-none WITH focus:border replacement ──
    {
      code: '<input className="outline-none focus:border-blue-500" />',
    },

    // ── outline-none WITH focus-visible:shadow replacement ──
    {
      code: '<button className="outline-none focus-visible:shadow-lg">Click</button>',
    },

    // ── outline-none WITH ring- utility (often in component layer) ──
    {
      code: '<button className="outline-none ring-2 ring-offset-2">Click</button>',
    },

    // ── outline-0 WITH focus-within:ring (focus delegation) ──
    {
      code: '<div className="outline-0 focus-within:ring-2">Wrapper</div>',
    },

    // ── No class attribute — skip ──
    {
      code: '<div>No classes</div>',
    },

    // ── Non-outline classes only ──
    {
      code: '<button className="bg-red-500 p-4 rounded">Click</button>',
    },
  ],

  invalid: [
    // ── outline-none with NO replacement ──
    {
      code: '<button className="outline-none bg-blue-500">Click</button>',
      errors: [{ messageId: 'outlineRemovedNoFocus' }],
    },

    // ── outline-0 with NO replacement ──
    {
      code: '<input className="outline-0 border-gray-300" />',
      errors: [{ messageId: 'outlineRemovedNoFocus' }],
    },

    // ── outline-hidden with NO replacement ──
    {
      code: '<a className="outline-hidden text-blue-600" href="/about">About</a>',
      errors: [{ messageId: 'outlineRemovedNoFocus' }],
    },

    // ── outline-none with hover variant (not focus) ──
    {
      code: '<button className="outline-none hover:bg-blue-600">Click</button>',
      errors: [{ messageId: 'outlineRemovedNoFocus' }],
    },

    // ── Multiple outline-removal classes ──
    {
      code: '<button className="outline-none outline-0">Click</button>',
      errors: [
        { messageId: 'outlineRemovedNoFocus' },
        { messageId: 'outlineRemovedNoFocus' },
      ],
    },
  ],
});
