import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import rule from '../../src/rules/consistent-color-palette.js';

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

ruleTester.run('consistent-color-palette', rule, {
  valid: [
    // ── Under max unique colors (default 8, grayscale ignored) ──
    {
      code: `
        const App = () => (
          <div className="bg-primary text-red-500 border-blue-200 ring-green-500">
            <span className="text-amber-600 fill-purple-500 accent-pink-400 stroke-teal-300" />
          </div>
        );
      `,
    },

    // ── Many grayscale colors — ignored by default ──
    {
      code: `
        const App = () => (
          <div className="bg-white text-gray-900 border-gray-200 bg-slate-50">
            <span className="text-zinc-500 bg-neutral-100 border-stone-300 text-black" />
            <span className="bg-primary text-red-500 border-blue-200" />
          </div>
        );
      `,
    },

    // ── Exact 8 colors — not over the limit ──
    {
      code: `
        const App = () => (
          <div>
            <div className="bg-red-500 text-blue-500 border-green-500 ring-amber-500" />
            <div className="bg-purple-500 text-pink-500 border-teal-500 ring-cyan-500" />
          </div>
        );
      `,
    },

    // ── High custom threshold ──
    {
      code: `
        const App = () => (
          <div>
            <div className="bg-red-500 text-blue-500 border-green-500 ring-amber-500" />
            <div className="bg-purple-500 text-pink-500 border-teal-500 ring-cyan-500" />
            <div className="bg-emerald-500 text-orange-500 border-indigo-500" />
          </div>
        );
      `,
      options: [{ maxUniqueColors: 20 }],
    },

    // ── Non-color utilities — not counted ──
    {
      code: `
        const App = () => (
          <div className="p-4 m-2 w-full h-auto flex grid text-lg border-2 rounded-md shadow-md" />
        );
      `,
    },

    // ── Same color family with different shades — counts as 1 ──
    {
      code: `
        const App = () => (
          <div className="bg-red-100 text-red-500 border-red-700 ring-red-900" />
        );
      `,
    },
  ],
  invalid: [
    // ── 9+ unique non-grayscale colors ──
    {
      code: `
        const App = () => (
          <div>
            <div className="bg-red-500 text-blue-500 border-green-500 ring-amber-500" />
            <div className="bg-purple-500 text-pink-500 border-teal-500 ring-cyan-500" />
            <div className="bg-emerald-500" />
          </div>
        );
      `,
      errors: [{ messageId: 'tooManyColors' }],
    },

    // ── ignoreGrayscale: false — counts grayscale too ──
    {
      code: `
        const App = () => (
          <div>
            <div className="bg-red-500 text-blue-500 border-green-500 ring-amber-500" />
            <div className="bg-gray-500 text-slate-500 border-zinc-500 ring-neutral-500" />
            <div className="bg-stone-500" />
          </div>
        );
      `,
      options: [{ ignoreGrayscale: false }],
      errors: [{ messageId: 'tooManyColors' }],
    },

    // ── Low custom threshold ──
    {
      code: `
        const App = () => (
          <div className="bg-red-500 text-blue-500 border-green-500 ring-amber-500" />
        );
      `,
      options: [{ maxUniqueColors: 3 }],
      errors: [{ messageId: 'tooManyColors' }],
    },

    // ── cn() wrapper detection ──
    {
      code: `
        const App = () => (
          <div>
            <div className={cn("bg-red-500 text-blue-500 border-green-500")} />
            <div className={cn("ring-amber-500 bg-purple-500 text-pink-500")} />
            <div className={cn("border-teal-500 ring-cyan-500 bg-emerald-500")} />
          </div>
        );
      `,
      errors: [{ messageId: 'tooManyColors' }],
    },
  ],
});
