import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import rule from '../../src/rules/prefers-reduced-motion.js';

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

ruleTester.run('prefers-reduced-motion', rule, {
  valid: [
    { code: '<div className="bg-blue-500 text-white p-4">Static</div>' },
    { code: '<div className="motion-safe:animate-spin">Loading</div>' },
    { code: '<div className="animate-spin motion-reduce:animate-none">Loading</div>' },
    { code: '<div className="animate-none">Static</div>' },
    { code: '<div className="transition-none">Static</div>' },
    { code: '<div className="duration-0">Instant</div>' },
    { code: '<div className="motion-safe:animate-bounce">Bounce</div>' },
    { code: '<div>No classes</div>' },

    // ── Default-exempt classes: motion IS the information ──
    // Wrapping these in motion-safe: turns off the only cue that tells the
    // user something is still happening (loading spinner, notification
    // pulse). Silently rewriting these regresses UX.
    { code: '<div className="animate-spin">Loading</div>' },
    { code: '<div className="animate-ping">New</div>' },
    { code: '<span className="animate-spin mr-2" aria-hidden="true" />' },
    { code: '<div className="sm:animate-spin">Loading</div>' },

    // ── Non-motion transitions: color/shadow/opacity/background don't ──
    // trigger vestibular symptoms, and WCAG 2.3.3 scopes to motion. These
    // are valid by default; opt into stricter matching via `strictTransitions`.
    { code: '<button className="transition-colors hover:bg-blue-600">Hover tint</button>' },
    { code: '<div className="transition-shadow hover:shadow-lg">Card</div>' },
    { code: '<div className="transition-opacity opacity-50">Fade</div>' },
    { code: '<div className="transition-background">Bg</div>' },

    // ── Orphan timing / easing utilities ──
    // `duration-*`, `ease-*`, `delay-*` are no-ops without a paired
    // `transition-*` / `animate-*` on the same element. Tailwind silently
    // ignores them; flagging them was noise the author can't act on.
    { code: '<div className="duration-200">Orphan</div>' },
    { code: '<div className="ease-in-out">Orphan</div>' },
    { code: '<div className="delay-150">Orphan</div>' },
    { code: '<div className="transition-colors ease-in-out duration-200">Tint</div>' },
    { code: '<div className="transition-shadow duration-300">Shadow</div>' },
  ],

  invalid: [
    // ── Single motion class (bounce, not spin) → one-pass fix ──
    // `animate-bounce` is a decorative bounce, safe to wrap.
    {
      code: '<div className="animate-bounce">Hi</div>',
      output: '<div className="motion-safe:animate-bounce">Hi</div>',
      errors: [{ messageId: 'missingMotionSafe' }],
    },

    // ── Opt-in strict mode: empty exemption list flags animate-spin ──
    {
      code: '<div className="animate-spin">Loading</div>',
      options: [{ exemptClasses: [] }],
      output: '<div className="motion-safe:animate-spin">Loading</div>',
      errors: [{ messageId: 'missingMotionSafe' }],
    },

    // ── User-customised exemption: swap in their own list ──
    // `animate-pulse` is exempted here, `animate-bounce` is not.
    {
      code: '<div className="animate-pulse animate-bounce">Mixed</div>',
      options: [{ exemptClasses: ['animate-pulse'] }],
      output: '<div className="animate-pulse motion-safe:animate-bounce">Mixed</div>',
      errors: [{ messageId: 'missingMotionSafe' }],
    },

    // ── Motion transition + modifier → single violation, one-pass fix ──
    // `transition-all` is real motion; `duration-300` piggy-backs on it.
    // One violation per element (bug #1) with an autofix that wraps both
    // the motion class and any modifiers that depend on it.
    {
      code: '<button className="transition-all duration-300 hover:bg-blue-600">Click</button>',
      output:
        '<button className="motion-safe:transition-all motion-safe:duration-300 hover:bg-blue-600">Click</button>',
      errors: [{ messageId: 'missingMotionSafe' }],
    },

    // ── Single motion class with non-motion classes ──
    {
      code: '<div className="animate-bounce text-red-500">Alert</div>',
      output: '<div className="motion-safe:animate-bounce text-red-500">Alert</div>',
      errors: [{ messageId: 'missingMotionSafe' }],
    },

    // ── animate-* with delay modifier → one violation, wrap both ──
    {
      code: '<div className="animate-pulse delay-150">Pulse</div>',
      output: '<div className="motion-safe:animate-pulse motion-safe:delay-150">Pulse</div>',
      errors: [{ messageId: 'missingMotionSafe' }],
    },

    // ── Three-way motion + easing + duration → one violation, one fix ──
    {
      code: '<div className="transition-transform duration-200 ease-linear">Shift</div>',
      output:
        '<div className="motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-linear">Shift</div>',
      errors: [{ messageId: 'missingMotionSafe' }],
    },

    // ── strictTransitions: flag non-motion transitions opt-in ──
    {
      code: '<div className="transition-colors ease-in-out duration-200">Tint</div>',
      options: [{ strictTransitions: true }],
      output:
        '<div className="motion-safe:transition-colors motion-safe:ease-in-out motion-safe:duration-200">Tint</div>',
      errors: [{ messageId: 'missingMotionSafe' }],
    },
  ],
});
