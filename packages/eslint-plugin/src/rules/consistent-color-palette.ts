import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import { extractClassesFromString, parseClass } from '../utils/class-extractor.js';
import { createClassVisitor } from '../utils/class-visitor.js';
import { debugLog } from '../utils/debug.js';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://deslint.com/docs/rules/${name}`
);

export type Options = [
  {
    maxUniqueColors?: number;
    ignoreGrayscale?: boolean;
  },
];

export type MessageIds = 'tooManyColors';

/**
 * Regex that extracts a Tailwind color token from a utility class.
 * Matches patterns like: bg-red-500, text-blue-200, border-emerald-600, ring-primary.
 * Does NOT match non-color utilities like p-4, flex, grid, etc.
 */
const COLOR_UTILITY_PATTERN =
  /^(bg|text|border|ring|outline|shadow|accent|fill|stroke|decoration|caret|divide|placeholder|from|via|to)-(.+)$/;

/**
 * Known non-color suffixes — these are size/style/behavior modifiers, not colors.
 * e.g., border-2, text-lg, shadow-md, ring-4
 */
const NON_COLOR_SUFFIXES = new Set([
  // Sizes
  '0', '1', '2', '3', '4', '5', '6', '7', '8',
  'px', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl',
  // Text sizes
  'base',
  // Shadow sizes
  'none', 'inner',
  // Border styles
  'solid', 'dashed', 'dotted', 'double',
  // Layout
  'collapse',
  // Special
  'transparent', 'current', 'inherit',
  // Opacity modifiers
  'opacity',
]);

/**
 * Grayscale color families (Tailwind defaults).
 */
const GRAYSCALE_FAMILIES = new Set([
  'slate', 'gray', 'zinc', 'neutral', 'stone',
  'black', 'white',
]);

/**
 * Extract a color token name from a Tailwind utility base class.
 * Returns the color family (e.g., "red", "blue", "primary") or null
 * if the class isn't a color utility.
 */
function extractColorFamily(baseClass: string): string | null {
  const match = baseClass.match(COLOR_UTILITY_PATTERN);
  if (!match) return null;

  const colorPart = match[2];
  if (!colorPart) return null;

  // Filter out non-color suffixes
  if (NON_COLOR_SUFFIXES.has(colorPart)) return null;

  // Arbitrary values are handled by no-arbitrary-colors, skip here
  if (colorPart.startsWith('[')) return null;

  // Extract family from shade notation: "red-500" → "red", "blue-200" → "blue"
  const shadeMatch = colorPart.match(/^([a-z][\w-]*?)(?:-\d{2,3}(?:\/\d+)?)?$/);
  if (shadeMatch) return shadeMatch[1];

  // Single-word tokens: "primary", "pass", "fail", "warn"
  return colorPart;
}

export default createRule<Options, MessageIds>({
  name: 'consistent-color-palette',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Flag files using too many unique color tokens. Signals palette drift and encourages a constrained design system.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          maxUniqueColors: {
            type: 'number',
            description:
              'Maximum number of unique color families per file before flagging (default: 8).',
          },
          ignoreGrayscale: {
            type: 'boolean',
            description:
              'Exclude grayscale colors (gray, slate, zinc, etc.) from the count (default: true).',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      tooManyColors:
        'File uses {{count}} unique color families (max: {{max}}): {{colors}}. Consider reducing to a smaller palette.',
    },
  },
  defaultOptions: [{ maxUniqueColors: 8, ignoreGrayscale: true }],
  create(context, [options]) {
    const maxUniqueColors = options.maxUniqueColors ?? 8;
    const ignoreGrayscale = options.ignoreGrayscale ?? true;

    const colorFamilies = new Set<string>();
    let firstNode: TSESTree.Node | null = null;

    function checkClassString(value: string, node: TSESTree.Node) {
      try {
        if (!firstNode) firstNode = node;

        const classes = extractClassesFromString(value);
        for (const cls of classes) {
          const { baseClass } = parseClass(cls);
          const family = extractColorFamily(baseClass);
          if (!family) continue;
          if (ignoreGrayscale && GRAYSCALE_FAMILIES.has(family)) continue;
          colorFamilies.add(family);
        }
      } catch (err) {
        debugLog('consistent-color-palette', err);
        return;
      }
    }

    const visitor = createClassVisitor(checkClassString);

    return {
      ...visitor,
      'Program:exit'() {
        try {
          if (colorFamilies.size > maxUniqueColors && firstNode) {
            const sorted = [...colorFamilies].sort();
            const display =
              sorted.length > 10
                ? sorted.slice(0, 10).join(', ') + `, +${sorted.length - 10} more`
                : sorted.join(', ');

            context.report({
              node: firstNode,
              messageId: 'tooManyColors',
              data: {
                count: String(colorFamilies.size),
                max: String(maxUniqueColors),
                colors: display,
              },
            });
          }
        } catch (err) {
          debugLog('consistent-color-palette', err);
          return;
        }
      },
    };
  },
});
