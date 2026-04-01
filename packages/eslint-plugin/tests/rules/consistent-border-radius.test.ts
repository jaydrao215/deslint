import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import rule from '../../src/rules/consistent-border-radius.js';

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

ruleTester.run('consistent-border-radius', rule, {
  valid: [
    // ── Two Card components both with rounded-lg — consistent ──
    {
      code: `
        function App() {
          return (
            <div>
              <Card className="rounded-lg bg-white" />
              <Card className="rounded-lg bg-gray-100" />
            </div>
          );
        }
      `,
    },

    // ── Three Button components all with rounded-md — consistent ──
    {
      code: `
        function App() {
          return (
            <div>
              <Button className="rounded-md px-4" />
              <Button className="rounded-md px-6" />
              <Button className="rounded-md px-2" />
            </div>
          );
        }
      `,
    },

    // ── Only one Card instance — below default threshold of 2 ──
    {
      code: `
        function App() {
          return <Card className="rounded-lg" />;
        }
      `,
    },

    // ── Mixed HTML elements with different rounded values — skip, not components ──
    {
      code: `
        function App() {
          return (
            <div>
              <div className="rounded-lg" />
              <div className="rounded-md" />
              <div className="rounded-xl" />
            </div>
          );
        }
      `,
    },

    // ── Components without any rounded classes ──
    {
      code: `
        function App() {
          return (
            <div>
              <Card className="bg-white p-4" />
              <Card className="bg-gray-100 p-6" />
            </div>
          );
        }
      `,
    },

    // ── Different component types — not compared to each other ──
    {
      code: `
        function App() {
          return (
            <div>
              <Card className="rounded-lg" />
              <Button className="rounded-full" />
            </div>
          );
        }
      `,
    },

    // ── Size variants treated as different components (ignoreSizeVariants: false) ──
    {
      code: `
        function App() {
          return (
            <div>
              <CardSm className="rounded-md" />
              <CardLg className="rounded-xl" />
            </div>
          );
        }
      `,
      options: [{ ignoreSizeVariants: false }],
    },

    // ── Threshold set higher than number of instances ──
    {
      code: `
        function App() {
          return (
            <div>
              <Card className="rounded-lg" />
              <Card className="rounded-md" />
            </div>
          );
        }
      `,
      options: [{ threshold: 3 }],
    },

    // ── Responsive variants are ignored — base border-radius is the same ──
    {
      code: `
        function App() {
          return (
            <div>
              <Card className="rounded-lg md:rounded-xl" />
              <Card className="rounded-lg lg:rounded-2xl" />
            </div>
          );
        }
      `,
    },

    // ── All Cards with rounded-full — consistent ──
    {
      code: `
        function App() {
          return (
            <div>
              <Avatar className="rounded-full w-10 h-10" />
              <Avatar className="rounded-full w-12 h-12" />
              <Avatar className="rounded-full w-8 h-8" />
            </div>
          );
        }
      `,
    },

    // ── All Cards with rounded-none — consistent ──
    {
      code: `
        function App() {
          return (
            <div>
              <Card className="rounded-none border" />
              <Card className="rounded-none shadow" />
            </div>
          );
        }
      `,
    },
  ],

  invalid: [
    // ── Two Card components: one rounded-lg, one rounded-md — report the minority ──
    {
      code: `
        function App() {
          return (
            <div>
              <Card className="rounded-lg bg-white" />
              <Card className="rounded-lg bg-gray-100" />
              <Card className="rounded-md bg-blue-50" />
            </div>
          );
        }
      `,
      errors: [{ messageId: 'inconsistentBorderRadius' as const }],
    },

    // ── Three Card components: two rounded-lg, one rounded-xl — report the xl one ──
    {
      code: `
        function App() {
          return (
            <div>
              <Card className="rounded-lg" />
              <Card className="rounded-lg" />
              <Card className="rounded-xl" />
            </div>
          );
        }
      `,
      errors: [{ messageId: 'inconsistentBorderRadius' as const }],
    },

    // ── Two Button components: rounded-full vs rounded-lg ──
    {
      code: `
        function App() {
          return (
            <div>
              <Button className="rounded-full px-4" />
              <Button className="rounded-full px-4" />
              <Button className="rounded-lg px-4" />
            </div>
          );
        }
      `,
      errors: [{ messageId: 'inconsistentBorderRadius' as const }],
    },

    // ── Components with direction variants: rounded-t-lg vs rounded-t-xl ──
    {
      code: `
        function App() {
          return (
            <div>
              <Card className="rounded-t-lg" />
              <Card className="rounded-t-lg" />
              <Card className="rounded-t-xl" />
            </div>
          );
        }
      `,
      errors: [{ messageId: 'inconsistentBorderRadius' as const }],
    },

    // ── Arbitrary values: rounded-[8px] vs rounded-lg ──
    {
      code: `
        function App() {
          return (
            <div>
              <Card className="rounded-lg" />
              <Card className="rounded-lg" />
              <Card className="rounded-[8px]" />
            </div>
          );
        }
      `,
      errors: [{ messageId: 'inconsistentBorderRadius' as const }],
    },

    // ── Size variants collapsed by default — CardSm and CardLg compared as "Card" ──
    {
      code: `
        function App() {
          return (
            <div>
              <CardSm className="rounded-md" />
              <CardLg className="rounded-md" />
              <Card className="rounded-xl" />
            </div>
          );
        }
      `,
      errors: [{ messageId: 'inconsistentBorderRadius' as const }],
    },

    // ── MemberExpression components: UI.Card ──
    {
      code: `
        function App() {
          return (
            <div>
              <UI.Card className="rounded-lg" />
              <UI.Card className="rounded-lg" />
              <UI.Card className="rounded-md" />
            </div>
          );
        }
      `,
      errors: [{ messageId: 'inconsistentBorderRadius' as const }],
    },

    // ── Multiple rounded classes — treats the set as a fingerprint ──
    {
      code: `
        function App() {
          return (
            <div>
              <Card className="rounded-t-lg rounded-b-none" />
              <Card className="rounded-t-lg rounded-b-none" />
              <Card className="rounded-t-xl rounded-b-none" />
            </div>
          );
        }
      `,
      errors: [{ messageId: 'inconsistentBorderRadius' as const }],
    },

    // ── 3 with rounded-lg, 2 with rounded-sm — the 2 divergent ones flagged ──
    {
      code: `
        function App() {
          return (
            <div>
              <Card className="rounded-lg" />
              <Card className="rounded-lg" />
              <Card className="rounded-lg" />
              <Card className="rounded-sm" />
              <Card className="rounded-sm" />
            </div>
          );
        }
      `,
      errors: [
        { messageId: 'inconsistentBorderRadius' as const },
        { messageId: 'inconsistentBorderRadius' as const },
      ],
    },

    // ── rounded-none vs rounded-lg ──
    {
      code: `
        function App() {
          return (
            <div>
              <Panel className="rounded-lg" />
              <Panel className="rounded-lg" />
              <Panel className="rounded-none" />
            </div>
          );
        }
      `,
      errors: [{ messageId: 'inconsistentBorderRadius' as const }],
    },

    // ── threshold: 2 with exactly 2 instances — flags the minority ──
    {
      code: `
        function App() {
          return (
            <div>
              <Alert className="rounded-md" />
              <Alert className="rounded-md" />
              <Alert className="rounded-xl" />
            </div>
          );
        }
      `,
      options: [{ threshold: 2 }],
      errors: [{ messageId: 'inconsistentBorderRadius' as const }],
    },

    // ── Tailwind v4 class rounded-xs vs rounded-lg ──
    {
      code: `
        function App() {
          return (
            <div>
              <Card className="rounded-lg" />
              <Card className="rounded-lg" />
              <Card className="rounded-xs" />
            </div>
          );
        }
      `,
      errors: [{ messageId: 'inconsistentBorderRadius' as const }],
    },

    // ── Corner-specific variants: rounded-tl-lg vs rounded-tl-md ──
    {
      code: `
        function App() {
          return (
            <div>
              <Card className="rounded-tl-lg rounded-tr-lg" />
              <Card className="rounded-tl-lg rounded-tr-lg" />
              <Card className="rounded-tl-md rounded-tr-md" />
            </div>
          );
        }
      `,
      errors: [{ messageId: 'inconsistentBorderRadius' as const }],
    },

    // ── Two different arbitrary values ──
    {
      code: `
        function App() {
          return (
            <div>
              <Card className="rounded-[8px]" />
              <Card className="rounded-[8px]" />
              <Card className="rounded-[12px]" />
            </div>
          );
        }
      `,
      errors: [{ messageId: 'inconsistentBorderRadius' as const }],
    },

    // ── Mixed: rounded-2xl vs rounded-3xl ──
    {
      code: `
        function App() {
          return (
            <div>
              <Card className="rounded-2xl" />
              <Card className="rounded-2xl" />
              <Card className="rounded-3xl" />
            </div>
          );
        }
      `,
      errors: [{ messageId: 'inconsistentBorderRadius' as const }],
    },
  ],
});
