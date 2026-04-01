import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import rule from '../../src/rules/missing-states.js';

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

ruleTester.run('missing-states', rule, {
  valid: [
    // ── Input with both disabled and aria-invalid ──
    {
      code: '<input disabled aria-invalid="false" />',
    },

    // ── Input with expression-based disabled ──
    {
      code: '<input disabled={isDisabled} aria-invalid={hasError} />',
    },

    // ── Select with all required attributes ──
    {
      code: '<select disabled aria-invalid="false"><option>A</option></select>',
    },

    // ── Textarea with all required attributes ──
    {
      code: '<textarea disabled aria-invalid="false" />',
    },

    // ── Button with disabled (no aria-invalid needed for buttons) ──
    {
      code: '<button disabled>Submit</button>',
    },

    // ── Non-form elements: no checks needed ──
    { code: '<div className="p-4">Hello</div>' },
    { code: '<span>Text</span>' },
    { code: '<p>Paragraph</p>' },

    // ── Spread attributes: benefit of the doubt ──
    {
      code: '<input {...props} />',
    },

    // ── aria-disabled as alternative to disabled ──
    {
      code: '<input aria-disabled="true" aria-invalid="false" />',
    },

    // ── Custom form elements list: div is not in default list ──
    {
      code: '<div />',
    },

    // ── Disabled + aria-invalid both off: no checks ──
    {
      code: '<input />',
      options: [{ requireDisabled: false, requireAriaInvalid: false }],
    },

    // ── Only requireDisabled, and it's present ──
    {
      code: '<input disabled />',
      options: [{ requireAriaInvalid: false }],
    },

    // ── Only requireAriaInvalid, and it's present ──
    {
      code: '<input aria-invalid="false" />',
      options: [{ requireDisabled: false }],
    },
  ],

  invalid: [
    // ── Input without disabled ──
    {
      code: '<input aria-invalid="false" />',
      errors: [{ messageId: 'missingDisabled' as const }],
    },

    // ── Input without aria-invalid ──
    {
      code: '<input disabled />',
      errors: [{ messageId: 'missingAriaInvalid' as const }],
    },

    // ── Input without any state attributes: 2 errors ──
    {
      code: '<input />',
      errors: [
        { messageId: 'missingDisabled' as const },
        { messageId: 'missingAriaInvalid' as const },
      ],
    },

    // ── Select without disabled ──
    {
      code: '<select aria-invalid="false"><option>A</option></select>',
      errors: [{ messageId: 'missingDisabled' as const }],
    },

    // ── Textarea without aria-invalid ──
    {
      code: '<textarea disabled />',
      errors: [{ messageId: 'missingAriaInvalid' as const }],
    },

    // ── Button without disabled (no aria-invalid error for buttons) ──
    {
      code: '<button>Click me</button>',
      errors: [{ messageId: 'missingDisabled' as const }],
    },

    // ── requireAriaRequired enabled ──
    {
      code: '<input disabled aria-invalid="false" />',
      options: [{ requireAriaRequired: true }],
      errors: [{ messageId: 'missingAriaRequired' as const }],
    },

    // ── Custom form elements list ──
    {
      code: '<custom-input />',
      options: [{ formElements: ['custom-input'], requireAriaInvalid: false }],
      errors: [{ messageId: 'missingDisabled' as const }],
    },

    // ── Multiple form elements in same file ──
    {
      code: '<><input /><select><option>A</option></select></>',
      errors: [
        { messageId: 'missingDisabled' as const },
        { messageId: 'missingAriaInvalid' as const },
        { messageId: 'missingDisabled' as const },
        { messageId: 'missingAriaInvalid' as const },
      ],
    },
  ],
});
