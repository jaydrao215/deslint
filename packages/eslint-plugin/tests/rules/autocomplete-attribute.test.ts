import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import rule from '../../src/rules/autocomplete-attribute.js';

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

ruleTester.run('autocomplete-attribute', rule, {
  valid: [
    // ── Email input WITH autocomplete ──
    {
      code: '<input type="email" autoComplete="email" />',
    },

    // ── Password input WITH autocomplete ──
    {
      code: '<input type="password" autoComplete="current-password" />',
    },

    // ── Name field WITH autocomplete ──
    {
      code: '<input name="first_name" autoComplete="given-name" />',
    },

    // ── Non-identity field — no autocomplete needed ──
    {
      code: '<input name="search_query" type="text" />',
    },

    // ── Non-identity field with unrelated name ──
    {
      code: '<input name="quantity" type="number" />',
    },

    // ── Hidden input — skip ──
    {
      code: '<input type="hidden" name="email" />',
    },

    // ── Submit button — skip ──
    {
      code: '<input type="submit" name="submit" />',
    },

    // ── Checkbox — skip ──
    {
      code: '<input type="checkbox" name="remember" />',
    },

    // ── Radio — skip ──
    {
      code: '<input type="radio" name="option" />',
    },

    // ── File input — skip ──
    {
      code: '<input type="file" name="upload" />',
    },

    // ── Spread attributes — benefit of the doubt ──
    {
      code: '<input {...props} type="email" />',
    },

    // ── Non-input element — skip ──
    {
      code: '<div name="email">Not a form field</div>',
    },

    // ── Textarea with autocomplete already set ──
    {
      code: '<textarea name="address" autoComplete="street-address" />',
    },

    // ── Autocomplete value of "off" still counts as present ──
    {
      code: '<input type="email" autoComplete="off" />',
    },
  ],

  invalid: [
    // ── Email input missing autocomplete ──
    {
      code: '<input type="email" />',
      errors: [{ messageId: 'missingAutocomplete', suggestions: [{ messageId: 'suggestAutocomplete', output: '<input autoComplete="email" type="email" />' }] }],
    },

    // ── Password input missing autocomplete ──
    {
      code: '<input type="password" />',
      errors: [{ messageId: 'missingAutocomplete', suggestions: [{ messageId: 'suggestAutocomplete', output: '<input autoComplete="current-password" type="password" />' }] }],
    },

    // ── Tel input missing autocomplete ──
    {
      code: '<input type="tel" />',
      errors: [{ messageId: 'missingAutocomplete', suggestions: [{ messageId: 'suggestAutocomplete', output: '<input autoComplete="tel" type="tel" />' }] }],
    },

    // ── Name field by name attribute ──
    {
      code: '<input name="first_name" />',
      errors: [{ messageId: 'missingAutocomplete', suggestions: [{ messageId: 'suggestAutocomplete', output: '<input autoComplete="given-name" name="first_name" />' }] }],
    },

    // ── Last name field by name attribute ──
    {
      code: '<input name="last_name" />',
      errors: [{ messageId: 'missingAutocomplete', suggestions: [{ messageId: 'suggestAutocomplete', output: '<input autoComplete="family-name" name="last_name" />' }] }],
    },

    // ── Email by name attribute ──
    {
      code: '<input name="email" type="text" />',
      errors: [{ messageId: 'missingAutocomplete', suggestions: [{ messageId: 'suggestAutocomplete', output: '<input autoComplete="email" name="email" type="text" />' }] }],
    },

    // ── Phone by name attribute ──
    {
      code: '<input name="phone" type="text" />',
      errors: [{ messageId: 'missingAutocomplete', suggestions: [{ messageId: 'suggestAutocomplete', output: '<input autoComplete="tel" name="phone" type="text" />' }] }],
    },

    // ── Address by name attribute ──
    {
      code: '<input name="address" />',
      errors: [{ messageId: 'missingAutocomplete', suggestions: [{ messageId: 'suggestAutocomplete', output: '<input autoComplete="address-line1" name="address" />' }] }],
    },

    // ── ZIP code by name attribute ──
    {
      code: '<input name="zip_code" />',
      errors: [{ messageId: 'missingAutocomplete', suggestions: [{ messageId: 'suggestAutocomplete', output: '<input autoComplete="postal-code" name="zip_code" />' }] }],
    },

    // ── Credit card number by name attribute ──
    {
      code: '<input name="cc_number" />',
      errors: [{ messageId: 'missingAutocomplete', suggestions: [{ messageId: 'suggestAutocomplete', output: '<input autoComplete="cc-number" name="cc_number" />' }] }],
    },

    // ── Username by name attribute ──
    {
      code: '<input name="username" />',
      errors: [{ messageId: 'missingAutocomplete', suggestions: [{ messageId: 'suggestAutocomplete', output: '<input autoComplete="username" name="username" />' }] }],
    },

    // ── Password by name attribute (text type) ──
    {
      code: '<input name="password" type="text" />',
      errors: [{ messageId: 'missingAutocomplete', suggestions: [{ messageId: 'suggestAutocomplete', output: '<input autoComplete="current-password" name="password" type="text" />' }] }],
    },

    // ── URL by type attribute ──
    {
      code: '<input type="url" />',
      errors: [{ messageId: 'missingAutocomplete', suggestions: [{ messageId: 'suggestAutocomplete', output: '<input autoComplete="url" type="url" />' }] }],
    },

    // ── City by name attribute ──
    {
      code: '<input name="city" />',
      errors: [{ messageId: 'missingAutocomplete', suggestions: [{ messageId: 'suggestAutocomplete', output: '<input autoComplete="address-level2" name="city" />' }] }],
    },

    // ── ID attribute match — email by id ──
    {
      code: '<input id="email" type="text" />',
      errors: [{ messageId: 'missingAutocomplete', suggestions: [{ messageId: 'suggestAutocomplete', output: '<input autoComplete="email" id="email" type="text" />' }] }],
    },
  ],
});
