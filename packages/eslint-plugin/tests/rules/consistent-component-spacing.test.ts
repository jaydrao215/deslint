import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import rule from '../../src/rules/consistent-component-spacing.js';

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

ruleTester.run('consistent-component-spacing', rule, {
  valid: [
    // ── All Cards use same padding — consistent ──
    {
      code: `
        function App() {
          return (
            <div>
              <Card className="p-4 bg-white" />
              <Card className="p-4 bg-gray-100" />
              <Card className="p-4 bg-blue-50" />
            </div>
          );
        }
      `,
    },

    // ── Only one Card instance — below default threshold of 2 ──
    {
      code: `
        function App() {
          return <Card className="p-4" />;
        }
      `,
    },

    // ── HTML elements (lowercase) are never compared ──
    {
      code: `
        function App() {
          return (
            <div>
              <div className="p-4" />
              <div className="p-6" />
              <div className="p-8" />
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
              <Card className="p-4" />
              <Button className="p-2" />
            </div>
          );
        }
      `,
    },

    // ── Components with no spacing classes — skipped ──
    {
      code: `
        function App() {
          return (
            <div>
              <Card className="bg-white text-sm" />
              <Card className="bg-gray-100 text-lg" />
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
              <CardSm className="p-2" />
              <CardLg className="p-6" />
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
              <Card className="p-4" />
              <Card className="p-6" />
            </div>
          );
        }
      `,
      options: [{ threshold: 3 }],
    },

    // ── Responsive variants are ignored — base spacing is the same ──
    {
      code: `
        function App() {
          return (
            <div>
              <Card className="p-4 md:p-6" />
              <Card className="p-4 lg:p-8" />
            </div>
          );
        }
      `,
    },

    // ── Margin differs but padding is same — no report for padding ──
    // (margin also doesn't meet threshold since neither has margin)
    {
      code: `
        function App() {
          return (
            <div>
              <Card className="p-4" />
              <Card className="p-4" />
            </div>
          );
        }
      `,
    },

    // ── Components with only gap classes — all consistent ──
    {
      code: `
        function App() {
          return (
            <div>
              <Grid className="gap-4" />
              <Grid className="gap-4" />
            </div>
          );
        }
      `,
    },
  ],

  invalid: [
    // ── Card A uses p-4, Card B uses p-6 — should flag Card B ──
    {
      code: `
        function App() {
          return (
            <div>
              <Card className="p-4 bg-white" />
              <Card className="p-4 bg-gray-100" />
              <Card className="p-6 bg-blue-50" />
            </div>
          );
        }
      `,
      errors: [{ messageId: 'inconsistentSpacing' as const }],
    },

    // ── 3 Cards with p-4, 2 with p-8 — the 2 divergent ones flagged ──
    {
      code: `
        function App() {
          return (
            <div>
              <Card className="p-4" />
              <Card className="p-4" />
              <Card className="p-4" />
              <Card className="p-8" />
              <Card className="p-8" />
            </div>
          );
        }
      `,
      errors: [
        { messageId: 'inconsistentSpacing' as const },
        { messageId: 'inconsistentSpacing' as const },
      ],
    },

    // ── Size variants collapsed by default — CardSm and CardLg compared as "Card" ──
    {
      code: `
        function App() {
          return (
            <div>
              <CardSm className="p-2" />
              <CardLg className="p-2" />
              <Card className="p-6" />
            </div>
          );
        }
      `,
      errors: [{ messageId: 'inconsistentSpacing' as const }],
    },

    // ── Margin inconsistency ──
    {
      code: `
        function App() {
          return (
            <div>
              <Section className="my-8" />
              <Section className="my-8" />
              <Section className="my-4" />
            </div>
          );
        }
      `,
      errors: [{ messageId: 'inconsistentSpacing' as const }],
    },

    // ── Gap inconsistency ──
    {
      code: `
        function App() {
          return (
            <div>
              <Grid className="gap-4" />
              <Grid className="gap-4" />
              <Grid className="gap-6" />
            </div>
          );
        }
      `,
      errors: [{ messageId: 'inconsistentSpacing' as const }],
    },

    // ── Multiple categories divergent — reports for each category separately ──
    {
      code: `
        function App() {
          return (
            <div>
              <Card className="p-4 m-2" />
              <Card className="p-4 m-2" />
              <Card className="p-8 m-4" />
            </div>
          );
        }
      `,
      errors: [
        { messageId: 'inconsistentSpacing' as const },
        { messageId: 'inconsistentSpacing' as const },
      ],
    },

    // ── JSX member expression: UI.Card ──
    {
      code: `
        function App() {
          return (
            <div>
              <UI.Card className="p-4" />
              <UI.Card className="p-4" />
              <UI.Card className="p-8" />
            </div>
          );
        }
      `,
      errors: [{ messageId: 'inconsistentSpacing' as const }],
    },

    // ── Directional padding divergence (px-4 vs px-6) ──
    {
      code: `
        function App() {
          return (
            <div>
              <Card className="px-4 py-2" />
              <Card className="px-4 py-2" />
              <Card className="px-6 py-2" />
            </div>
          );
        }
      `,
      errors: [{ messageId: 'inconsistentSpacing' as const }],
    },

    // ── threshold: 2 with exactly 2 instances — flags the minority ──
    {
      code: `
        function App() {
          return (
            <div>
              <Alert className="p-3" />
              <Alert className="p-3" />
              <Alert className="p-5" />
            </div>
          );
        }
      `,
      options: [{ threshold: 2 }],
      errors: [{ messageId: 'inconsistentSpacing' as const }],
    },

    // ── Multiple padding classes — treats the set as a fingerprint ──
    {
      code: `
        function App() {
          return (
            <div>
              <Card className="px-4 py-2" />
              <Card className="px-4 py-2" />
              <Card className="px-4 py-6" />
            </div>
          );
        }
      `,
      errors: [{ messageId: 'inconsistentSpacing' as const }],
    },
  ],
});
