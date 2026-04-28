import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import rule from '../../src/rules/no-dangerous-html.js';

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

ruleTester.run('no-dangerous-html', rule, {
  valid: [
    { code: '<div>{content}</div>' },
    { code: '<p>Hello world</p>' },
    { code: '<MyComp value={x} />' },
    { code: '<div className="ok" />' },
  ],
  invalid: [
    {
      code: '<div dangerouslySetInnerHTML={{ __html: comment }} />',
      errors: [{ messageId: 'dangerousHtml' }],
    },
    {
      code: '<span dangerouslySetInnerHTML={{ __html: "" }} />',
      errors: [{ messageId: 'dangerousHtml' }],
    },
    {
      code: '<MyComp dangerouslySetInnerHTML={{ __html: x }} />',
      errors: [{ messageId: 'dangerousHtml' }],
    },
  ],
});
