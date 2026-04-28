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
    // Canonical Schema.org structured-data pattern — server-rendered, no XSS path.
    {
      code: '<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }} />',
    },
    // Same with attributes in a different order.
    {
      code: '<script dangerouslySetInnerHTML={{ __html: JSON.stringify(j) }} type="application/ld+json" />',
    },
    // <style> with dangerouslySetInnerHTML — CSS injection has a different
    // threat model than HTML/XSS. Common in chart libraries, dynamic theming.
    {
      code: '<style dangerouslySetInnerHTML={{ __html: cssVars }} />',
    },
    // Next.js Script component (capital S) — conventionally used to ship
    // inline scripts via the framework's loading strategy.
    {
      code: '<Script id="tag" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: js }} />',
    },
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
    // <script> with a non-JSON-LD type still flags — this catches genuine
    // inline-script injection where a sanitizer is needed.
    {
      code: '<script type="text/javascript" dangerouslySetInnerHTML={{ __html: code }} />',
      errors: [{ messageId: 'dangerousHtml' }],
    },
    // <script> with no type attribute also flags — only the explicit JSON-LD
    // type is whitelisted.
    {
      code: '<script dangerouslySetInnerHTML={{ __html: code }} />',
      errors: [{ messageId: 'dangerousHtml' }],
    },
  ],
});
