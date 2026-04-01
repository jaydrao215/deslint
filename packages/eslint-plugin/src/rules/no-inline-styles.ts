import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import { debugLog } from '../utils/debug.js';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://vizlint.dev/docs/rules/${name}`
);

export type Options = [
  {
    allowlist?: string[];
    allowDynamic?: boolean;
  },
];

export type MessageIds = 'noInlineStyle' | 'suggestTailwind';

/**
 * Extract CSS property names from an ObjectExpression node.
 * Returns null if the expression is not an ObjectExpression.
 */
function extractPropertyNames(node: TSESTree.Expression): string[] | null {
  if (node.type !== 'ObjectExpression') return null;

  const names: string[] = [];
  for (const prop of node.properties) {
    if (prop.type === 'Property') {
      if (prop.key.type === 'Identifier') {
        names.push(prop.key.name);
      } else if (prop.key.type === 'Literal' && typeof prop.key.value === 'string') {
        names.push(prop.key.value);
      }
    }
  }
  return names;
}

/**
 * Check whether all CSS property names in a style object are in the allowlist.
 */
function allPropertiesAllowed(propertyNames: string[], allowlist: Set<string>): boolean {
  if (propertyNames.length === 0) return false;
  return propertyNames.every((name) => allowlist.has(name));
}

export default createRule<Options, MessageIds>({
  name: 'no-inline-styles',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow inline style attributes. Use Tailwind utility classes instead.',
    },
    fixable: undefined,
    hasSuggestions: true,
    schema: [
      {
        type: 'object',
        properties: {
          allowlist: {
            type: 'array',
            items: { type: 'string' },
            description:
              'CSS property names to allow in inline styles (e.g., ["height", "width"] for dynamic values).',
          },
          allowDynamic: {
            type: 'boolean',
            description:
              'If true, only flag static style objects, not dynamic expressions.',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      noInlineStyle:
        'Inline style detected. Use Tailwind utility classes instead.',
      suggestTailwind:
        'Remove the inline style and use Tailwind utility classes.',
    },
  },
  defaultOptions: [{ allowlist: [], allowDynamic: false }],
  create(context, [options]) {
    const allowlist = new Set(options.allowlist ?? []);
    const allowDynamic = options.allowDynamic ?? false;

    /**
     * Report an inline style violation on the given node.
     */
    function report(node: TSESTree.Node) {
      context.report({
        node,
        messageId: 'noInlineStyle',
        suggest: [
          {
            messageId: 'suggestTailwind',
            fix(fixer) {
              // Remove the entire style attribute (including surrounding whitespace)
              const sourceCode = context.sourceCode;
              const tokenBefore = sourceCode.getTokenBefore(node);
              const start = tokenBefore ? node.range[0] : node.range[0];
              const end = node.range[1];
              return fixer.removeRange([start, end]);
            },
          },
        ],
      });
    }

    /**
     * Determine whether a JSX style attribute should be flagged.
     */
    function checkJSXStyleAttribute(node: TSESTree.JSXAttribute) {
      try {
        const { value } = node;

        // style="color: red" — string literal
        if (!value || value.type === 'Literal') {
          report(node);
          return;
        }

        // style={...} — expression container
        if (value.type === 'JSXExpressionContainer') {
          const expr = value.expression;

          // style={{}} — empty object is still flagged (it's still an inline style)
          if (expr.type === 'ObjectExpression') {
            // Check allowlist — if all properties are allowed, skip
            const propertyNames = extractPropertyNames(expr);
            if (propertyNames && allowlist.size > 0 && allPropertiesAllowed(propertyNames, allowlist)) {
              return;
            }
            report(node);
            return;
          }

          // style={dynamicVar} or style={getStyles()} — dynamic expression
          if (expr.type === 'JSXEmptyExpression') {
            // style={} — empty expression, skip
            return;
          }

          // Dynamic expression: Identifier, CallExpression, ConditionalExpression, etc.
          if (allowDynamic) {
            return;
          }
          report(node);
          return;
        }
      } catch (err) {
        debugLog('no-inline-styles', err);
      }
    }

    return {
      // ── JSX (React / Preact / Solid) ──────────────────────────────
      JSXAttribute(node: TSESTree.JSXAttribute) {
        try {
          if (
            node.name.type === 'JSXIdentifier' &&
            node.name.name === 'style'
          ) {
            checkJSXStyleAttribute(node);
          }
        } catch (err) {
          debugLog('no-inline-styles', err);
        }
      },

      // ── Vue static style: <div style="color: red"> ───────────────
      'VAttribute[key.name="style"]'(node: TSESTree.Node) {
        try {
          report(node);
        } catch (err) {
          debugLog('no-inline-styles', err);
        }
      },

      // ── Vue :style binding: <div :style="{ color: 'red' }"> ──────
      'VAttribute[directive=true][key.name.name="bind"][key.argument.name="style"]'(
        node: TSESTree.Node,
      ) {
        try {
          if (allowDynamic) return;
          report(node);
        } catch (err) {
          debugLog('no-inline-styles', err);
        }
      },

      // ── Svelte: <div style="color: red"> ─────────────────────────
      'SvelteAttribute[name="style"]'(node: TSESTree.Node) {
        try {
          report(node);
        } catch (err) {
          debugLog('no-inline-styles', err);
        }
      },

      // ── Angular bound: [style]="expr" ─────────────────────────────
      'BoundAttribute[name="style"]'(node: TSESTree.Node) {
        try {
          if (allowDynamic) return;
          report(node);
        } catch (err) {
          debugLog('no-inline-styles', err);
        }
      },

      // ── Angular static: style="color: red" ───────────────────────
      'TextAttribute[name="style"]'(node: TSESTree.Node) {
        try {
          report(node);
        } catch (err) {
          debugLog('no-inline-styles', err);
        }
      },
    };
  },
});
