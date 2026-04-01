import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import rule from '../../src/rules/max-component-lines.js';

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

/** Generate a component with exact line count by padding with JSX divs. */
function componentWithLines(name: string, totalLines: number): string {
  // Structure: function line + return( + <div> + ... inner lines ... + </div> + ); + }
  // That's 7 boilerplate lines, so inner = totalLines - 6
  const innerCount = Math.max(0, totalLines - 6);
  const innerLines: string[] = [];
  for (let i = 0; i < innerCount; i++) {
    innerLines.push(`      <p>{${i}}</p>`);
  }
  const inner = innerLines.join('\n');
  return `function ${name}() {\n  return (\n    <div>\n${inner}\n    </div>\n  );\n}`;
}

function arrowComponentWithLines(name: string, totalLines: number): string {
  const innerCount = Math.max(0, totalLines - 6);
  const innerLines: string[] = [];
  for (let i = 0; i < innerCount; i++) {
    innerLines.push(`      <p>{${i}}</p>`);
  }
  const inner = innerLines.join('\n');
  return `const ${name} = () => {\n  return (\n    <div>\n${inner}\n    </div>\n  );\n};`;
}

ruleTester.run('max-component-lines', rule, {
  valid: [
    // ── Short component: well under default threshold ──
    {
      code: 'function MyComponent() {\n  return <div className="p-4">Hello</div>;\n}',
    },

    // ── Arrow function component: well under threshold ──
    {
      code: 'const MyComponent = () => {\n  return <div>Short</div>;\n};',
    },

    // ── 250-line component: under default 300 ──
    {
      code: componentWithLines('SmallComponent', 250),
    },

    // ── Exactly at threshold: 300 lines is OK ──
    {
      code: componentWithLines('ExactComponent', 300),
    },

    // ── Function without JSX: not a component, not checked ──
    {
      code: `function BigHelper() {\n  const x = 1;\n${Array(350).fill('  const y = x + 1;').join('\n')}\n  return x;\n}`,
    },

    // ── Custom threshold: 500 lines allowed ──
    {
      code: componentWithLines('LargeComponent', 400),
      options: [{ maxLines: 500 }],
    },
  ],

  invalid: [
    // ── 400-line component: exceeds default 300 ──
    {
      code: componentWithLines('HugeComponent', 400),
      errors: [{ messageId: 'tooManyLines' as const }],
    },

    // ── Arrow function component over threshold ──
    {
      code: arrowComponentWithLines('BigArrow', 350),
      errors: [{ messageId: 'tooManyLines' as const }],
    },

    // ── Custom lower threshold: 50 lines ──
    {
      code: componentWithLines('MediumComponent', 60),
      options: [{ maxLines: 50 }],
      errors: [{ messageId: 'tooManyLines' as const }],
    },

    // ── Class component over threshold ──
    {
      code: `class BigComponent {\n${Array(350).fill('  x = 1;').join('\n')}\n}`,
      errors: [{ messageId: 'tooManyLines' as const }],
    },
  ],
});
