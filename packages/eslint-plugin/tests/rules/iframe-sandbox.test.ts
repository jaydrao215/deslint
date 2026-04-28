import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import rule from '../../src/rules/iframe-sandbox.js';

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

ruleTester.run('iframe-sandbox', rule, {
  valid: [
    // Sandbox with explicit policy
    { code: '<iframe src="x" sandbox="allow-scripts allow-same-origin" />' },
    // Strictest sandbox: empty value
    { code: '<iframe src="x" sandbox="" />' },
    // Boolean attribute (no value) — sandbox is set
    { code: '<iframe src="x" sandbox />' },
    // Spread — give benefit of the doubt
    { code: '<iframe src="x" {...rest} />' },
    // Other elements ignored
    { code: '<div src="x" />' },
  ],
  invalid: [
    {
      code: '<iframe src="https://example.com" />',
      errors: [{ messageId: 'missingSandbox' }],
    },
    {
      code: '<iframe src="x" title="t" />',
      errors: [{ messageId: 'missingSandbox' }],
    },
  ],
});
