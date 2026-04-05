import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import { ARBITRARY_PATTERNS, extractClassesFromString, parseClass, isValidV4Class } from '../utils/class-extractor.js';
import { findNearestColor, findNearestColorByRgb, parseRgbString, parseHslString } from '../utils/color-map.js';
import { createClassVisitor } from '../utils/class-visitor.js';
import { debugLog } from '../utils/debug.js';
import { safeGetText, safeGetRange } from '../utils/safe-source.js';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://vizlint.dev/docs/rules/${name}`
);

export type Options = [
  {
    allowlist?: string[];
    customTokens?: Record<string, string>;
    allowCssVariables?: boolean;
  },
];

export type MessageIds = 'arbitraryColor' | 'suggestToken' | 'hardcodedCssVar';

/** Regex for arbitrary rgb/rgba/hsl/hsla color values */
const RGB_PATTERN = /^(bg|text|border|ring|outline|shadow|accent|fill|stroke|decoration|caret|divide|placeholder)-\[(rgba?\([^)]+\))\]/;
const HSL_PATTERN = /^(bg|text|border|ring|outline|shadow|accent|fill|stroke|decoration|caret|divide|placeholder)-\[(hsla?\([^)]+\))\]/;

/** Regex for hardcoded CSS custom property color values — Buoy competitive parity */
const CSS_VAR_PATTERN = /^(bg|text|border|ring|outline|shadow|accent|fill|stroke|decoration|caret|divide|placeholder)-\[(var\(--[^)]+\))\]/;

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
          allowCssVariables: {
            type: 'boolean',
            description:
              'When true (default), do not flag CSS custom property references like bg-[var(--color)]. CSS variables are design tokens by definition.',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      arbitraryColor:
        'Arbitrary color `{{className}}` detected. Use a design token instead.{{suggestion}}',
      suggestToken: 'Replace with `{{replacement}}`',
      hardcodedCssVar:
        'Hardcoded CSS variable `{{className}}` detected. Use a design token from your design system instead.',
    },
  },
  defaultOptions: [{ allowlist: [], customTokens: {}, allowCssVariables: true }],
  create(context, [options]) {
    const allowlist = new Set(
      options.allowlist?.map((h) => h.toLowerCase()) ?? []
    );
    const customTokens = options.customTokens ?? {};
    const allowCssVariables = options.allowCssVariables ?? true;

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
                const src = safeGetText(context.sourceCode, node);
                const range = safeGetRange(context.sourceCode, node);
                if (!src || !range) return null;
                return fixer.replaceTextRange(range, src.replace(cls, fullReplacement));
              },
              suggest: [
                {
                  messageId: 'suggestToken',
                  data: { replacement: fullReplacement },
                  fix(fixer) {
                    const src = safeGetText(context.sourceCode, node);
                    const range = safeGetRange(context.sourceCode, node);
                    if (!src || !range) return null;
                    return fixer.replaceTextRange(range, src.replace(cls, fullReplacement));
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

          // ── CSS custom properties: bg-[var(--some-color)] ──
          // Skip by default: CSS variables ARE design tokens. Only flag if explicitly configured.
          const cssVarMatch = baseClass.match(CSS_VAR_PATTERN);
          if (cssVarMatch) {
            if (allowCssVariables) continue;
            context.report({
              node,
              messageId: 'hardcodedCssVar',
              data: { className: cls },
            });
            continue;
          }
        }
      } catch (err) {
        // Production safety: never crash linting for the entire file
        debugLog('no-arbitrary-colors', err);
        return;
      }
    }

    return createClassVisitor(checkClassString);
  },
});
