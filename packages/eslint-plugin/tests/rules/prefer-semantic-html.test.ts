import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import rule from '../../src/rules/prefer-semantic-html.js';

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

ruleTester.run('prefer-semantic-html', rule, {
  valid: [
    // ── Semantic elements — not flagged ──
    { code: '<button onClick={handleClick}>Click me</button>' },
    { code: '<a href="/home" onClick={track}>Home</a>' },
    { code: '<nav><a href="/">Home</a></nav>' },

    // ── div without click handler — fine ──
    { code: '<div className="p-4">Content</div>' },
    { code: '<span className="text-sm">Text</span>' },

    // ── div with role="presentation" and onClick — skip ──
    { code: '<div role="presentation" onClick={handler}>Content</div>' },
    { code: '<div role="none" onClick={handler}>Content</div>' },

    // ── Custom element with onClick — only div/span flagged ──
    { code: '<Card onClick={handleClick}>Content</Card>' },

    // ── role on the correct semantic element — not flagged ──
    { code: '<button role="button">Click</button>' },
    { code: '<nav role="navigation">Nav</nav>' },

    // ── checkClickHandlers: false ──
    {
      code: '<div onClick={handleClick}>Click</div>',
      options: [{ checkClickHandlers: false }],
    },

    // ── checkRoles: false ──
    {
      code: '<div role="button">Click</div>',
      options: [{ checkRoles: false }],
    },

    // ── No attributes ──
    { code: '<div>Content</div>' },

    // ── Spread props ──
    { code: '<div {...props}>Content</div>' },
  ],
  invalid: [
    // ── div with onClick ──
    {
      code: '<div onClick={handleClick}>Click me</div>',
      errors: [{ messageId: 'divWithOnClick' }],
    },

    // ── span with onClick ──
    {
      code: '<span onClick={handleClick}>Click me</span>',
      errors: [{ messageId: 'spanWithOnClick' }],
    },

    // ── div with onClick and other props — still flagged ──
    {
      code: '<div className="cursor-pointer" onClick={handleClick}>Click</div>',
      errors: [{ messageId: 'divWithOnClick' }],
    },

    // ── role="button" on div ──
    {
      code: '<div role="button">Click</div>',
      errors: [{ messageId: 'roleReplaceable', data: { role: 'button', tag: 'div', element: '<button>' } }],
    },

    // ── role="link" on span ──
    {
      code: '<span role="link">Click here</span>',
      errors: [{ messageId: 'roleReplaceable', data: { role: 'link', tag: 'span', element: '<a>' } }],
    },

    // ── role="navigation" on div ──
    {
      code: '<div role="navigation"><a href="/">Home</a></div>',
      errors: [{ messageId: 'roleReplaceable', data: { role: 'navigation', tag: 'div', element: '<nav>' } }],
    },

    // ── role="banner" on div ──
    {
      code: '<div role="banner">Header content</div>',
      errors: [{ messageId: 'roleReplaceable', data: { role: 'banner', tag: 'div', element: '<header>' } }],
    },

    // ── role="contentinfo" on div ──
    {
      code: '<div role="contentinfo">Footer content</div>',
      errors: [{ messageId: 'roleReplaceable', data: { role: 'contentinfo', tag: 'div', element: '<footer>' } }],
    },

    // ── role="main" on div ──
    {
      code: '<div role="main">Main content</div>',
      errors: [{ messageId: 'roleReplaceable', data: { role: 'main', tag: 'div', element: '<main>' } }],
    },

    // ── role="complementary" on div ──
    {
      code: '<div role="complementary">Sidebar</div>',
      errors: [{ messageId: 'roleReplaceable', data: { role: 'complementary', tag: 'div', element: '<aside>' } }],
    },

    // ── role="dialog" on div ──
    {
      code: '<div role="dialog">Modal</div>',
      errors: [{ messageId: 'roleReplaceable', data: { role: 'dialog', tag: 'div', element: '<dialog>' } }],
    },

    // ── role="article" on div ──
    {
      code: '<div role="article">Post</div>',
      errors: [{ messageId: 'roleReplaceable', data: { role: 'article', tag: 'div', element: '<article>' } }],
    },

    // ── role="region" on div ──
    {
      code: '<div role="region">Section</div>',
      errors: [{ messageId: 'roleReplaceable', data: { role: 'region', tag: 'div', element: '<section>' } }],
    },
  ],
});
