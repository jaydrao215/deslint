/**
 * End-to-end integration tests for plain HTML support via `@html-eslint/parser`.
 *
 * Sprint item S2. These tests are distinct from the synthetic-AST unit tests
 * in `tests/utils/element-visitor.test.ts` and the per-rule cross-framework
 * tests in `tests/rules/*.test.ts` in one important way: they drive real
 * rule code through a real `@html-eslint/parser` instance, proving the whole
 * pipeline (parser → element-visitor → rule → report) works for someone
 * installing the plugin today and pointing it at a plain HTML file.
 *
 * What this guards against:
 * 1. Our `normalizeHtml` stub assumptions drifting from the actual parser
 *    output (boolean-attr shape, attribute key/value nesting, Tag vs Element
 *    node type naming).
 * 2. ESLint's traverser failing to walk nested `Tag.children` — if the parser
 *    ever stops declaring `visitorKeys`, we'd silently only see the outermost
 *    tag. This test asserts nested matching.
 * 3. The `createClassVisitor` `Attribute[key.value="class"]` selector not
 *    matching in real parser output (esquery selector syntax edge cases).
 * 4. Rule files not being framework-guarded correctly — if an a11y rule
 *    accidentally does `if (framework === 'jsx')` without a fallback, the
 *    test will fail on HTML input.
 *
 * Pattern: we use `@typescript-eslint/rule-tester` with `@html-eslint/parser`
 * set as the `languageOptions.parser`. All test cases use `filename: 'x.html'`
 * to be explicit about intent even though RuleTester doesn't key on it.
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import htmlParser from '@html-eslint/parser';

import imageAltText from '../../src/rules/image-alt-text.js';
import missingStates from '../../src/rules/missing-states.js';
import responsiveRequired from '../../src/rules/responsive-required.js';
import langAttribute from '../../src/rules/lang-attribute.js';
import viewportMeta from '../../src/rules/viewport-meta.js';
import headingHierarchy from '../../src/rules/heading-hierarchy.js';
import linkText from '../../src/rules/link-text.js';
import formLabels from '../../src/rules/form-labels.js';
import ariaValidation from '../../src/rules/aria-validation.js';
import noArbitraryColors from '../../src/rules/no-arbitrary-colors.js';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const htmlRuleTester = new RuleTester({
  languageOptions: {
    parser: htmlParser as any,
  },
});

// ─── image-alt-text ───────────────────────────────────────────────────────
htmlRuleTester.run('image-alt-text [html]', imageAltText, {
  valid: [
    { code: '<img src="x.png" alt="A golden retriever playing fetch">' },
    { code: '<img src="bg.png" alt="" role="presentation">' },
    { code: '<img src="x.png" alt="" aria-hidden="true">' },
    // boolean aria-hidden attribute form (`<img alt="" aria-hidden>`)
    { code: '<img src="x.png" alt="" aria-hidden>' },
  ],
  invalid: [
    {
      code: '<img src="x.png">',
      errors: [{ messageId: 'missingAlt' }],
    },
    {
      code: '<img src="x.png" alt="">',
      errors: [{ messageId: 'emptyAlt' }],
    },
    {
      code: '<img src="x.png" alt="image">',
      errors: [{ messageId: 'meaninglessAlt' }],
    },
  ],
});

// ─── missing-states ───────────────────────────────────────────────────────
// missing-states is about form-control state attributes (disabled, aria-invalid,
// aria-required) — NOT about Tailwind hover/focus classes. The default form
// element set is ['input','select','textarea','button']; `<a>` and `<div>`
// are not checked.
htmlRuleTester.run('missing-states [html]', missingStates, {
  valid: [
    // Button with explicit disabled — passes (buttons skip aria-invalid check)
    { code: '<button disabled>Save</button>' },
    { code: '<button aria-disabled="true">Save</button>' },
    // Input with all required state attributes
    { code: '<input type="text" disabled aria-invalid="false">' },
    // Non-interactive tag is ignored entirely
    { code: '<div class="bg-red-500">card</div>' },
  ],
  invalid: [
    {
      // Button without disabled → missingDisabled
      // Buttons skip aria-invalid check, so only 1 error.
      code: '<button>Save</button>',
      errors: [{ messageId: 'missingDisabled' }],
    },
    {
      // Input without disabled AND without aria-invalid → both fire
      code: '<input type="text">',
      errors: [{ messageId: 'missingDisabled' }, { messageId: 'missingAriaInvalid' }],
    },
  ],
});

// ─── responsive-required ──────────────────────────────────────────────────
// The rule flags arbitrary-bracket fixed widths (`w-[Npx]`) without responsive
// overrides, not Tailwind's scale classes (`w-96`). See FIXED_WIDTH_ARBITRARY
// regex in the rule.
htmlRuleTester.run('responsive-required [html]', responsiveRequired, {
  valid: [
    { code: '<div class="w-[800px] sm:w-full md:w-auto">card</div>' },
    { code: '<div class="w-[48px]">icon below threshold</div>' },
    { code: '<div class="max-w-[800px] sm:max-w-full md:max-w-screen-lg">container</div>' },
  ],
  invalid: [
    {
      code: '<div class="w-[800px]">card</div>',
      errors: [{ messageId: 'missingResponsive' }],
    },
    {
      code: '<div class="max-w-[1200px]">container</div>',
      errors: [{ messageId: 'missingResponsive' }],
    },
  ],
});

// ─── lang-attribute ───────────────────────────────────────────────────────
htmlRuleTester.run('lang-attribute [html]', langAttribute, {
  valid: [
    { code: '<!DOCTYPE html><html lang="en"><body></body></html>' },
    { code: '<html lang="fr"><body></body></html>' },
  ],
  invalid: [
    {
      code: '<html><body></body></html>',
      errors: [{ messageId: 'missingLang' }],
    },
    {
      code: '<html lang=""><body></body></html>',
      errors: [{ messageId: 'emptyLang' }],
    },
  ],
});

// ─── viewport-meta ────────────────────────────────────────────────────────
htmlRuleTester.run('viewport-meta [html]', viewportMeta, {
  valid: [
    {
      code: '<html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body></body></html>',
    },
  ],
  invalid: [
    {
      code: '<html><head><meta name="viewport" content="width=device-width, user-scalable=no"></head><body></body></html>',
      errors: [{ messageId: 'userScalableNo' }],
    },
    {
      code: '<html><head><meta name="viewport" content="width=device-width, maximum-scale=1"></head><body></body></html>',
      errors: [{ messageId: 'maximumScaleTooLow' }],
    },
  ],
});

// ─── heading-hierarchy ────────────────────────────────────────────────────
htmlRuleTester.run('heading-hierarchy [html]', headingHierarchy, {
  valid: [
    { code: '<h1>Title</h1><h2>Sub</h2><h3>Detail</h3>' },
    { code: '<h1>Only</h1>' },
  ],
  invalid: [
    {
      code: '<h1>Title</h1><h3>Skips h2</h3>',
      errors: [{ messageId: 'skippedLevel' }],
    },
  ],
});

// ─── link-text ────────────────────────────────────────────────────────────
htmlRuleTester.run('link-text [html]', linkText, {
  valid: [
    { code: '<a href="/pricing">See our pricing page</a>' },
    { code: '<a href="/about" aria-label="About our company">About</a>' },
  ],
  invalid: [
    {
      code: '<a href="/x">click here</a>',
      errors: [{ messageId: 'genericLinkText' }],
    },
    {
      code: '<a href="/x"></a>',
      errors: [{ messageId: 'emptyLink' }],
    },
  ],
});

// ─── form-labels ──────────────────────────────────────────────────────────
htmlRuleTester.run('form-labels [html]', formLabels, {
  valid: [
    { code: '<label for="name">Name</label><input id="name" type="text">' },
    { code: '<label>Email<input type="email"></label>' },
    // aria-label satisfies labeling requirement
    { code: '<input type="text" aria-label="Search">' },
  ],
  invalid: [
    {
      code: '<input type="text">',
      errors: [{ messageId: 'missingLabel' }],
    },
    {
      code: '<input id="stranded" type="text">',
      errors: [{ messageId: 'missingLabel' }],
    },
  ],
});

// ─── aria-validation ──────────────────────────────────────────────────────
htmlRuleTester.run('aria-validation [html]', ariaValidation, {
  valid: [
    { code: '<button aria-label="Close">X</button>' },
    { code: '<div role="button" aria-pressed="true">Toggle</div>' },
  ],
  invalid: [
    {
      code: '<div role="buton">oops</div>',
      errors: [{ messageId: 'invalidRole' }],
    },
    {
      code: '<button aria-labelby="x">click</button>',
      errors: [{ messageId: 'misspelledAria' }],
    },
  ],
});

// ─── no-arbitrary-colors (class-visitor path) ─────────────────────────────
// This rule uses `createClassVisitor` rather than `createElementVisitor`, so
// running it here proves the `Attribute[key.value="class"]` selector we added
// in `class-visitor.ts` fires on real parser output.
htmlRuleTester.run('no-arbitrary-colors [html]', noArbitraryColors, {
  valid: [
    { code: '<div class="bg-red-500 text-white">ok</div>' },
    { code: '<span class="border border-gray-200">bordered</span>' },
  ],
  invalid: [
    {
      code: '<div class="bg-[#FF0000]">bad</div>',
      errors: [{ messageId: 'arbitraryColor' }],
    },
  ],
});
