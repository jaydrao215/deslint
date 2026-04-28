import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import rule from '../../src/rules/safe-external-links.js';

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

ruleTester.run('safe-external-links', rule, {
  valid: [
    // Same-tab link — no rel needed
    { code: '<a href="/about">About</a>' },
    // Properly guarded external link
    { code: '<a href="https://example.com" target="_blank" rel="noopener noreferrer">Ex</a>' },
    // Reordered tokens
    { code: '<a href="https://example.com" target="_blank" rel="noreferrer noopener">Ex</a>' },
    // Extra tokens, both required present
    { code: '<a href="https://example.com" target="_blank" rel="noopener noreferrer external">Ex</a>' },
    // Dynamic rel — give benefit of the doubt
    { code: '<a href="x" target="_blank" rel={relValue}>Ex</a>' },
    // Dynamic target — give benefit of the doubt
    { code: '<a href="x" target={t}>Ex</a>' },
  ],
  invalid: [
    // No rel at all → autofix inserts rel="noopener noreferrer"
    {
      code: '<a href="https://x.com" target="_blank">Ex</a>',
      errors: [{ messageId: 'missingRel' }],
      output: '<a rel="noopener noreferrer" href="https://x.com" target="_blank">Ex</a>',
    },
    // Only noopener
    {
      code: '<a href="x" target="_blank" rel="noopener">Ex</a>',
      errors: [{ messageId: 'incompleteRel' }],
    },
    // Only noreferrer
    {
      code: '<a href="x" target="_blank" rel="noreferrer">Ex</a>',
      errors: [{ messageId: 'incompleteRel' }],
    },
    // rel="external" — neither token present
    {
      code: '<a href="x" target="_blank" rel="external">Ex</a>',
      errors: [{ messageId: 'incompleteRel' }],
    },
  ],
});
