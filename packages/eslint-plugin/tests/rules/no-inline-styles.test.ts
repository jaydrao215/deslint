import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import rule from '../../src/rules/no-inline-styles.js';

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

/** Helper to build invalid test case with suggestions + output */
function invalid(
  code: string,
  output: string,
  extra?: { options?: any; errors?: any[] },
) {
  const errorCount = extra?.errors?.length ?? 1;
  const errors = extra?.errors ??
    Array.from({ length: errorCount }, () => ({
      messageId: 'noInlineStyle' as const,
      suggestions: [{ messageId: 'suggestTailwind' as const, output }],
    }));
  return {
    code,
    ...(extra?.options ? { options: extra.options } : {}),
    errors,
  };
}

/** Helper for multi-error invalid cases */
function invalidMulti(
  code: string,
  errorsWithOutputs: Array<{ output: string }>,
  extra?: { options?: any },
) {
  return {
    code,
    ...(extra?.options ? { options: extra.options } : {}),
    errors: errorsWithOutputs.map(({ output }) => ({
      messageId: 'noInlineStyle' as const,
      suggestions: [{ messageId: 'suggestTailwind' as const, output }],
    })),
  };
}

ruleTester.run('no-inline-styles', rule, {
  valid: [
    // ── No style attribute — NOT flagged ──────────────────────────
    { code: '<div className="bg-red-500" />' },
    { code: '<div className="p-4 m-2 text-center" />' },
    { code: '<div id="test" />' },
    { code: '<span className="font-bold text-lg" />' },

    // ── Empty element — no attributes at all ─────────────────────
    { code: '<div />' },
    { code: '<br />' },

    // ── Allowlisted properties — all properties in allowlist ─────
    {
      code: '<div style={{height: "100vh"}} />',
      options: [{ allowlist: ['height'] }],
    },
    {
      code: '<div style={{height: "100vh", width: "100%"}} />',
      options: [{ allowlist: ['height', 'width'] }],
    },

    // ── allowDynamic: true (default) — dynamic expressions NOT flagged ─────
    // These are valid by default since allowDynamic defaults to true
    { code: '<div style={dynamicStyles} />' },
    { code: '<div style={getStyles()} />' },
    { code: '<div style={condition ? styleA : styleB} />' },
    // Explicit allowDynamic: true also works
    {
      code: '<div style={dynamicStyles} />',
      options: [{ allowDynamic: true }],
    },
    {
      code: '<div style={getStyles()} />',
      options: [{ allowDynamic: true }],
    },
    {
      code: '<div style={condition ? styleA : styleB} />',
      options: [{ allowDynamic: true }],
    },
    // ObjectExpression with dynamic property values — also skipped by default
    // (e.g., progress bar translateX, satori OG image routes)
    { code: '<div style={{ transform: `translateX(-${val}%)` }} />' },
    { code: '<div style={{ width: `${progress}%` }} />' },
    { code: '<ProgressIndicator style={{ transform: `translateX(-${100 - (value || 0)}%)` }} />' },

    // ── Other attributes named similarly — NOT flagged ───────────
    { code: '<div data-style="bold" />' },
    { code: '<div styleOverride={{color: "red"}} />' },
  ],

  invalid: [
    // ── Static object expression: style={{ ... }} ────────────────
    invalid(
      '<div style={{color: "red"}} />',
      '<div  />',
    ),
    invalid(
      '<div style={{color: "red", fontSize: "16px"}} />',
      '<div  />',
    ),
    invalid(
      '<div style={{backgroundColor: "#fff", padding: "10px", margin: "5px"}} />',
      '<div  />',
    ),

    // ── Empty object expression: style={{}} ──────────────────────
    invalid(
      '<div style={{}} />',
      '<div  />',
    ),

    // ── String literal: style="..." ──────────────────────────────
    invalid(
      '<div style="color: red" />',
      '<div  />',
    ),
    invalid(
      '<div style="color: red; font-size: 16px" />',
      '<div  />',
    ),
    invalid(
      '<div style="" />',
      '<div  />',
    ),

    // ── Dynamic expression: style={variable} (allowDynamic: false explicitly) ──
    invalid(
      '<div style={styles} />',
      '<div  />',
      { options: [{ allowDynamic: false }] },
    ),
    invalid(
      '<div style={getStyles()} />',
      '<div  />',
      { options: [{ allowDynamic: false }] },
    ),
    invalid(
      '<div style={condition ? styleA : styleB} />',
      '<div  />',
      { options: [{ allowDynamic: false }] },
    ),

    // ── Mixed with Tailwind classes ──────────────────────────────
    invalid(
      '<div style={{color: "red"}} className="p-4" />',
      '<div  className="p-4" />',
    ),
    invalid(
      '<div className="bg-blue-500 rounded-lg" style={{fontSize: "14px"}} />',
      '<div className="bg-blue-500 rounded-lg"  />',
    ),

    // ── Partially allowlisted — still flagged if any prop is not allowed ──
    invalid(
      '<div style={{height: "100vh", color: "red"}} />',
      '<div  />',
      { options: [{ allowlist: ['height'] }] },
    ),

    // ── Nested elements — each flagged independently ─────────────
    invalidMulti(
      `
        <div style={{padding: "10px"}}>
          <span style={{color: "blue"}} />
        </div>
      `,
      [
        { output: `
        <div >
          <span style={{color: "blue"}} />
        </div>
      ` },
        { output: `
        <div style={{padding: "10px"}}>
          <span  />
        </div>
      ` },
      ],
    ),

    // ── Various HTML elements ────────────────────────────────────
    invalid(
      '<span style={{fontWeight: "bold"}} />',
      '<span  />',
    ),
    invalid(
      '<img style={{width: "100%"}} src="test.png" />',
      '<img  src="test.png" />',
    ),
    invalid(
      '<button style={{cursor: "pointer"}} />',
      '<button  />',
    ),
    invalid(
      '<a style={{textDecoration: "none"}} href="#" />',
      '<a  href="#" />',
    ),

    // ── Component elements (PascalCase) ─────────────────────────
    invalid(
      '<MyComponent style={{color: "red"}} />',
      '<MyComponent  />',
    ),
    invalid(
      '<Card style="background: white" />',
      '<Card  />',
    ),

    // ── Template literal in style value ─────────────────────────
    invalid(
      '<div style={`color: red`} />',
      '<div  />',
    ),
  ],
});

// ── Edge case and option interaction tests ───────────────────────────

describe('no-inline-styles edge cases', () => {
  const edgeTester = new RuleTester({
    languageOptions: {
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  });

  edgeTester.run('no-inline-styles (allowDynamic + allowlist interaction)', rule, {
    valid: [
      // allowDynamic skips identifiers but static objects still checked against allowlist
      {
        code: '<div style={myStyles} />',
        options: [{ allowDynamic: true }],
      },
      // allowlist permits all properties present
      {
        code: '<div style={{height: computedHeight, width: computedWidth}} />',
        options: [{ allowlist: ['height', 'width'] }],
      },
    ],
    invalid: [
      // allowDynamic does NOT skip static object expressions
      {
        code: '<div style={{color: "red"}} />',
        options: [{ allowDynamic: true }],
        errors: [{
          messageId: 'noInlineStyle' as const,
          suggestions: [{ messageId: 'suggestTailwind' as const, output: '<div  />' }],
        }],
      },
      // allowDynamic does NOT skip string literals
      {
        code: '<div style="color: red" />',
        options: [{ allowDynamic: true }],
        errors: [{
          messageId: 'noInlineStyle' as const,
          suggestions: [{ messageId: 'suggestTailwind' as const, output: '<div  />' }],
        }],
      },
      // Empty allowlist doesn't skip anything
      {
        code: '<div style={{color: "red"}} />',
        options: [{ allowlist: [] }],
        errors: [{
          messageId: 'noInlineStyle' as const,
          suggestions: [{ messageId: 'suggestTailwind' as const, output: '<div  />' }],
        }],
      },
    ],
  });

  edgeTester.run('no-inline-styles (suggestion present)', rule, {
    valid: [],
    invalid: [
      // Verify suggestions are present on the error
      {
        code: '<div style={{color: "red"}} />',
        errors: [{
          messageId: 'noInlineStyle' as const,
          suggestions: [{
            messageId: 'suggestTailwind' as const,
            output: '<div  />',
          }],
        }],
      },
    ],
  });
});
