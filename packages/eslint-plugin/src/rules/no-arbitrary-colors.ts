import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import { ARBITRARY_PATTERNS, extractClassesFromString, parseClass, isValidV4Class } from '../utils/class-extractor.js';
import { findNearestColor, findNearestColorByRgb, parseRgbString, parseHslString } from '../utils/color-map.js';

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

/** Regex for arbitrary rgb/rgba/hsl/hsla color values */
const RGB_PATTERN = /^(bg|text|border|ring|outline|shadow|accent|fill|stroke|decoration|caret|divide|placeholder)-\[(rgba?\([^)]+\))\]/;
const HSL_PATTERN = /^(bg|text|border|ring|outline|shadow|accent|fill|stroke|decoration|caret|divide|placeholder)-\[(hsla?\([^)]+\))\]/;

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
    function findHexReplacement(hexValue: string, utilityPrefix: string): string | null {
      for (const [name, value] of Object.entries(customTokens)) {
        if (value.toLowerCase() === hexValue.toLowerCase()) {
          return `${utilityPrefix}-${name}`;
        }
      }
      return findNearestColor(hexValue, `${utilityPrefix}-[${hexValue}]`);
    }

    function findRgbReplacement(rgb: [number, number, number], utilityPrefix: string): string | null {
      return findNearestColorByRgb(rgb, `${utilityPrefix}-[rgb]`);
    }

    function reportViolation(
      node: TSESTree.Node,
      cls: string,
      fullReplacement: string | null,
    ) {
      const suggestion = fullReplacement ? ` Suggested: \`${fullReplacement}\`` : '';

      context.report({
        node,
        messageId: 'arbitraryColor',
        data: { className: cls, suggestion },
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

    /**
     * Check a className string for arbitrary color violations.
     */
    function checkClassString(value: string, node: TSESTree.Node) {
      try {
        const classes = extractClassesFromString(value);

        for (const cls of classes) {
          if (isValidV4Class(cls)) continue;

          const { baseClass, variants } = parseClass(cls);

          // ── Hex colors: bg-[#FF0000] ──
          const hexMatch = baseClass.match(ARBITRARY_PATTERNS.color);
          if (hexMatch) {
            const rawHex = baseClass.match(/#([0-9a-fA-F]{3,8})/);
            if (rawHex) {
              const hexValue = `#${rawHex[1]}`.toLowerCase();
              if (allowlist.has(hexValue)) continue;

              const prefixMatch = baseClass.match(/^([\w-]+?)-\[/);
              if (!prefixMatch) continue;

              const replacement = findHexReplacement(hexValue, prefixMatch[1]);
              const fullReplacement = replacement
                ? [...variants, replacement].join(':')
                : null;
              reportViolation(node, cls, fullReplacement);
              continue;
            }
          }

          // ── RGB/RGBA colors: bg-[rgb(255,0,0)] ──
          const rgbMatch = baseClass.match(RGB_PATTERN);
          if (rgbMatch) {
            const rgb = parseRgbString(rgbMatch[2]);
            if (rgb) {
              const replacement = findRgbReplacement(rgb, rgbMatch[1]);
              const fullReplacement = replacement
                ? [...variants, replacement].join(':')
                : null;
              reportViolation(node, cls, fullReplacement);
              continue;
            }
          }

          // ── HSL/HSLA colors: bg-[hsl(0,100%,50%)] ──
          const hslMatch = baseClass.match(HSL_PATTERN);
          if (hslMatch) {
            const rgb = parseHslString(hslMatch[2]);
            if (rgb) {
              const replacement = findRgbReplacement(rgb, hslMatch[1]);
              const fullReplacement = replacement
                ? [...variants, replacement].join(':')
                : null;
              reportViolation(node, cls, fullReplacement);
              continue;
            }
          }
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
