import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import rule from '../../src/rules/focus-trap-patterns.js';

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

ruleTester.run('focus-trap-patterns', rule, {
  valid: [
    // ── Native <dialog> — browser handles focus management ──
    {
      code: '<dialog>Content</dialog>',
    },

    // ── role="dialog" with aria-modal and label ──
    {
      code: '<div role="dialog" aria-modal="true" aria-label="Settings">Content</div>',
    },

    // ── role="alertdialog" with aria-modal and aria-labelledby ──
    {
      code: '<div role="alertdialog" aria-modal="true" aria-labelledby="alert-title">Content</div>',
    },

    // ── role="dialog" with aria-modal and title ──
    {
      code: '<div role="dialog" aria-modal="true" title="Confirm deletion">Content</div>',
    },

    // ── Regular div without dialog role ──
    {
      code: '<div className="p-4">Normal content</div>',
    },

    // ── Component with spread (benefit of doubt) ──
    {
      code: '<div {...props} role="dialog">Content</div>',
    },
  ],

  invalid: [
    // ── role="dialog" without aria-modal → auto-fixed ──
    {
      code: '<div role="dialog" aria-label="Settings">Content</div>',
      output: '<div aria-modal="true" role="dialog" aria-label="Settings">Content</div>',
      errors: [{ messageId: 'dialogMissingAriaModal' }],
    },

    // ── role="dialog" without label → auto-fixed with placeholder ──
    {
      code: '<div role="dialog" aria-modal="true">Content</div>',
      output: '<div aria-label="Dialog" role="dialog" aria-modal="true">Content</div>',
      errors: [{ messageId: 'dialogMissingLabel' }],
    },

    // ── role="dialog" without aria-modal AND without label → multi-pass fix ──
    {
      code: '<div role="dialog">Content</div>',
      output: [
        '<div aria-modal="true" role="dialog">Content</div>',
        '<div aria-label="Dialog" aria-modal="true" role="dialog">Content</div>',
      ],
      errors: [
        { messageId: 'dialogMissingAriaModal' },
        { messageId: 'dialogMissingLabel' },
      ],
    },

    // ── role="alertdialog" without aria-modal → auto-fixed ──
    {
      code: '<div role="alertdialog" aria-label="Warning">Content</div>',
      output: '<div aria-modal="true" role="alertdialog" aria-label="Warning">Content</div>',
      errors: [{ messageId: 'dialogMissingAriaModal' }],
    },

    // ── Dialog component without role → multi-pass fix (role+modal, then label) ──
    {
      code: '<Modal>Content</Modal>',
      output: [
        '<Modal role="dialog" aria-modal="true">Content</Modal>',
        '<Modal aria-label="Dialog" role="dialog" aria-modal="true">Content</Modal>',
      ],
      errors: [{ messageId: 'dialogMissingRole' }],
    },

    // ── Drawer component without role → multi-pass fix ──
    {
      code: '<Drawer>Content</Drawer>',
      output: [
        '<Drawer role="dialog" aria-modal="true">Content</Drawer>',
        '<Drawer aria-label="Dialog" role="dialog" aria-modal="true">Content</Drawer>',
      ],
      errors: [{ messageId: 'dialogMissingRole' }],
    },

    // ── Sheet component without role → multi-pass fix ──
    {
      code: '<Sheet>Content</Sheet>',
      output: [
        '<Sheet role="dialog" aria-modal="true">Content</Sheet>',
        '<Sheet aria-label="Dialog" role="dialog" aria-modal="true">Content</Sheet>',
      ],
      errors: [{ messageId: 'dialogMissingRole' }],
    },
  ],
});
