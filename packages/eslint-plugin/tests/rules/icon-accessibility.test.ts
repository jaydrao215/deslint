import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import rule from '../../src/rules/icon-accessibility.js';

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

ruleTester.run('icon-accessibility', rule, {
  valid: [
    // ── Button with text content — accessible ──
    {
      code: '<button>Submit</button>',
    },

    // ── Button with icon AND aria-label ──
    {
      code: '<button aria-label="Close"><CloseIcon /></button>',
    },

    // ── Button with icon AND sr-only text ──
    {
      code: '<button><SearchIcon /><span className="sr-only">Search</span></button>',
    },

    // ── Link with visible text ──
    {
      code: '<a href="/home">Home</a>',
    },

    // ── Button with title attribute ──
    {
      code: '<button title="Settings"><SettingsIcon /></button>',
    },

    // ── Button with aria-labelledby ──
    {
      code: '<button aria-labelledby="btn-label"><MenuIcon /></button>',
    },

    // ── Non-interactive element with icon — not checked ──
    {
      code: '<div><StarIcon /></div>',
    },

    // ── Button with spread props (benefit of doubt) ──
    {
      code: '<button {...props}><EditIcon /></button>',
    },

    // ── No children — skip ──
    {
      code: '<button />',
    },
  ],

  invalid: [
    // ── Icon-only button → auto-fixed with aria-label ──
    {
      code: '<button><SearchIcon /></button>',
      output: '<button aria-label="Search"><SearchIcon /></button>',
      errors: [{ messageId: 'iconOnlyInteractive' }],
    },

    // ── Icon-only link → auto-fixed with aria-label ──
    {
      code: '<a href="/close"><CloseIcon /></a>',
      output: '<a aria-label="Close" href="/close"><CloseIcon /></a>',
      errors: [{ messageId: 'iconOnlyInteractive' }],
    },
  ],
});
