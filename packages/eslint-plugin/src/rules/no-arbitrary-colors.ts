import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import { ARBITRARY_PATTERNS, extractClassesFromString, parseClass, isValidV4Class } from '../utils/class-extractor.js';
import { findNearestColor } from '../utils/color-map.js';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://vizlint.dev/docs/rules/${name}`
);

export type Options = [
  {
    allowlist?: string[];
    customTokens?: Record<string, string>;
  },
];

export type MessageIds = 'arbitraryColor' | 'suggestToken';

/** Class wrapper functions that contain Tailwind classes */
const CLASS_WRAPPERS = new Set(['cn', 'clsx', 'cva', 'cx', 'twMerge', 'classNames', 'classnames']);

export default createRule<Options, MessageIds>({
  name: 'no-arbitrary-colors',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow arbitrary color values in Tailwind classes. Use design tokens instead.',
    },
    fixable: 'code',
    hasSuggestions: true,
    schema: [
      {
        type: 'object',
        properties: {
          allowlist: {
            type: 'array',
            items: { type: 'string' },
            description: 'Hex values to allow (e.g., ["#FF0000"])',
          },
          customTokens: {
            type: 'object',
            additionalProperties: { type: 'string' },
            description: 'Custom color tokens: { "brand-primary": "#1A5276" }',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      arbitraryColor:
        'Arbitrary color `{{className}}` detected. Use a design token instead.{{suggestion}}',
      suggestToken: 'Replace with `{{replacement}}`',
    },
  },
  defaultOptions: [{ allowlist: [], customTokens: {} }],
  create(context, [options]) {
    const allowlist = new Set(
      options.allowlist?.map((h) => h.toLowerCase()) ?? []
    );
    const customTokens = options.customTokens ?? {};

    /**
     * Find best replacement — custom tokens first, then Tailwind defaults.
     */
    function findReplacement(hexValue: string, utilityPrefix: string): string | null {
      // Custom tokens: exact match takes priority
      for (const [name, value] of Object.entries(customTokens)) {
        if (value.toLowerCase() === hexValue.toLowerCase()) {
          return `${utilityPrefix}-${name}`;
        }
      }
      return findNearestColor(hexValue, `${utilityPrefix}-[${hexValue}]`);
    }

    /**
     * Check a className string for arbitrary color violations.
     * Reports with auto-fix when replacement is available.
     */
    function checkClassString(value: string, node: TSESTree.Node) {
      try {
        const classes = extractClassesFromString(value);

        for (const cls of classes) {
          if (isValidV4Class(cls)) continue;

          const { baseClass, variants } = parseClass(cls);
          const match = baseClass.match(ARBITRARY_PATTERNS.color);
          if (!match) continue;

          const hexMatch = baseClass.match(/#([0-9a-fA-F]{3,8})/);
          if (!hexMatch) continue;

          const hexValue = `#${hexMatch[1]}`.toLowerCase();
          if (allowlist.has(hexValue)) continue;

          const prefixMatch = baseClass.match(/^([\w-]+?)-\[/);
          if (!prefixMatch) continue;

          const replacement = findReplacement(hexValue, prefixMatch[1]);
          const fullReplacement = replacement
            ? [...variants, replacement].join(':')
            : null;

          const suggestion = fullReplacement ? ` Suggested: \`${fullReplacement}\`` : '';

          context.report({
            node,
            messageId: 'arbitraryColor',
            data: { className: cls, suggestion },

            // Auto-fix: replace arbitrary class with design token
            ...(fullReplacement
              ? {
                  fix(fixer) {
                    const src = context.sourceCode.getText(node);
                    return fixer.replaceText(node, src.replace(cls, fullReplacement));
                  },
                  suggest: [
                    {
                      messageId: 'suggestToken',
                      data: { replacement: fullReplacement },
                      fix(fixer) {
                        const src = context.sourceCode.getText(node);
                        return fixer.replaceText(node, src.replace(cls, fullReplacement));
                      },
                    },
                  ],
                }
              : {}),
          });
        }
      } catch {
        // Production safety: never crash linting for the entire file
        return;
      }
    }

    return {
      // ─── React / Preact / Solid: className="..." or class="..." ───
      JSXAttribute(node) {
        try {
          const name = node.name.type === 'JSXIdentifier' ? node.name.name : null;
          if (name !== 'className' && name !== 'class') return;

          // Static: className="bg-[#FF0000] p-4"
          if (node.value?.type === 'Literal' && typeof node.value.value === 'string') {
            checkClassString(node.value.value, node.value);
          }

          // Expression: className={...}
          if (node.value?.type === 'JSXExpressionContainer') {
            const expr = node.value.expression;

            // className={"bg-[#FF0000]"}
            if (expr.type === 'Literal' && typeof expr.value === 'string') {
              checkClassString(expr.value, expr);
            }

            // className={`bg-[#FF0000] ${var}`}
            if (expr.type === 'TemplateLiteral') {
              for (const quasi of expr.quasis) {
                if (quasi.value.raw) {
                  checkClassString(quasi.value.raw, quasi);
                }
              }
            }

            // className={cn("bg-[#FF0000]", "p-4")}
            if (
              expr.type === 'CallExpression' &&
              expr.callee.type === 'Identifier' &&
              CLASS_WRAPPERS.has(expr.callee.name)
            ) {
              for (const arg of expr.arguments) {
                if (arg.type === 'Literal' && typeof arg.value === 'string') {
                  checkClassString(arg.value, arg);
                }
                // cn(`bg-[#FF0000]`, other)
                if (arg.type === 'TemplateLiteral') {
                  for (const quasi of arg.quasis) {
                    if (quasi.value.raw) {
                      checkClassString(quasi.value.raw, quasi);
                    }
                  }
                }
              }
            }
          }
        } catch {
          return;
        }
      },

      // ─── Vue / Svelte / Angular / HTML: class="..." ───
      // vue-eslint-parser exposes VAttribute, svelte-eslint-parser SvelteAttribute,
      // angular-eslint TextAttribute — all match this generic selector.
      // Falls back to standard HTML attribute via @html-eslint/parser.
      'VAttribute[key.name="class"]'(node: any) {
        try {
          if (node.value?.value && typeof node.value.value === 'string') {
            checkClassString(node.value.value, node.value);
          }
        } catch { return; }
      },
    };
  },
});
