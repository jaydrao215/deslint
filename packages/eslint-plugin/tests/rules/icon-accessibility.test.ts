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
    // ── Default: report-only + suggestion, NO top-level autofix ──
    // A derived aria-label based on component name is a guess. It's often
    // wrong (`<Search />` may actually be a "Clear filter" button).
    // Keep the suggestion so IDE / interactive mode can still surface it.
    {
      code: '<button><SearchIcon /></button>',
      output: null,
      errors: [
        {
          messageId: 'iconOnlyInteractive',
          suggestions: [
            {
              messageId: 'suggestIconLabel',
              data: { label: 'Search' },
              output: '<button aria-label="Search"><SearchIcon /></button>',
            },
          ],
        },
      ],
    },
    {
      code: '<a href="/close"><CloseIcon /></a>',
      output: null,
      errors: [
        {
          messageId: 'iconOnlyInteractive',
          suggestions: [
            {
              messageId: 'suggestIconLabel',
              data: { label: 'Close' },
              output: '<a aria-label="Close" href="/close"><CloseIcon /></a>',
            },
          ],
        },
      ],
    },

    // ── Opt-in globally via `autofix: true` ──
    {
      code: '<button><SearchIcon /></button>',
      options: [{ autofix: true }],
      output: '<button aria-label="Search"><SearchIcon /></button>',
      errors: [
        {
          messageId: 'iconOnlyInteractive',
          suggestions: [
            {
              messageId: 'suggestIconLabel',
              data: { label: 'Search' },
              output: '<button aria-label="Search"><SearchIcon /></button>',
            },
          ],
        },
      ],
    },

    // ── Per-component mapping via `iconLabels` — author supplies the
    // correct label, so autofix applies even without the global toggle ──
    {
      code: '<button><SearchIcon /></button>',
      options: [{ iconLabels: { SearchIcon: 'Search products' } }],
      output: '<button aria-label="Search products"><SearchIcon /></button>',
      errors: [
        {
          messageId: 'iconOnlyInteractive',
          suggestions: [
            {
              messageId: 'suggestIconLabel',
              data: { label: 'Search products' },
              output:
                '<button aria-label="Search products"><SearchIcon /></button>',
            },
          ],
        },
      ],
    },
  ],
});
