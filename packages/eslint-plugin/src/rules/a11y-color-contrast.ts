import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import { extractClassesFromString, parseClass } from '../utils/class-extractor.js';
import { TAILWIND_COLOR_MAP, hexToRgb } from '../utils/color-map.js';
import { contrastRatio, meetsWcagAA } from '../utils/contrast.js';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://vizlint.dev/docs/rules/${name}`
);

export type Options = [
  {
    customColors?: Record<string, string>;
  },
];

export type MessageIds = 'insufficientContrast';

/**
 * Text color prefixes in Tailwind
 */
const TEXT_PREFIXES = ['text'];

/**
 * Background color prefixes in Tailwind
 */
const BG_PREFIXES = ['bg'];

/**
 * Large text size classes in Tailwind (text-lg = 18px, text-xl+ = larger)
 * WCAG defines large text as >= 18pt (24px) or >= 14pt bold (18.67px ≈ 19px)
 */
const LARGE_TEXT_CLASSES = new Set([
  'text-lg', 'text-xl', 'text-2xl', 'text-3xl', 'text-4xl',
  'text-5xl', 'text-6xl', 'text-7xl', 'text-8xl', 'text-9xl',
]);

/**
 * Bold font weight classes — with bold, text-lg becomes "large text" for WCAG
 */
const BOLD_CLASSES = new Set([
  'font-bold', 'font-extrabold', 'font-black', 'font-semibold',
]);

/**
 * Resolve a Tailwind color class to its hex value.
 * Handles: text-red-500 → #ef4444, bg-white → #ffffff
 */
function resolveColorHex(
  colorName: string,
  customColors?: Record<string, string>,
): string | null {
  // Check custom colors first
  if (customColors?.[colorName]) {
    return customColors[colorName];
  }

  // Check Tailwind default palette
  if (TAILWIND_COLOR_MAP[colorName]) {
    return TAILWIND_COLOR_MAP[colorName];
  }

  return null;
}

/**
 * Extract the color name from a Tailwind class.
 * text-red-500 → red-500, bg-white → white
 */
function extractColorName(cls: string, prefixes: string[]): string | null {
  for (const prefix of prefixes) {
    if (cls.startsWith(`${prefix}-`)) {
      return cls.slice(prefix.length + 1);
    }
  }
  return null;
}

/**
 * Find a suggested text color that meets WCAG AA on the given background.
 */
function findAccessibleAlternative(
  bgHex: string,
  isLargeText: boolean,
): { className: string; ratio: number } | null {
  const bgRgb = hexToRgb(bgHex);
  const minRatio = isLargeText ? 3.0 : 4.5;

  // Try common accessible text colors first (most likely suggestions)
  const candidates = [
    'gray-900', 'gray-800', 'gray-700', 'black',
    'white', 'gray-50', 'gray-100',
    'slate-900', 'slate-800', 'zinc-900', 'neutral-900',
  ];

  let best: { className: string; ratio: number } | null = null;

  for (const name of candidates) {
    const hex = TAILWIND_COLOR_MAP[name];
    if (!hex) continue;
    const ratio = contrastRatio(hexToRgb(hex), bgRgb);
    if (ratio >= minRatio) {
      if (!best || ratio > best.ratio) {
        best = { className: `text-${name}`, ratio: Math.round(ratio * 10) / 10 };
      }
    }
  }

  return best;
}

export default createRule<Options, MessageIds>({
  name: 'a11y-color-contrast',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Flag text/background color combinations with insufficient WCAG AA contrast ratio.',
    },
    // NOT auto-fixable — choosing accessible colors requires design judgment
    hasSuggestions: true,
    schema: [
      {
        type: 'object',
        properties: {
          customColors: {
            type: 'object',
            additionalProperties: { type: 'string' },
            description: 'Custom color tokens: { "brand-navy": "#1E3A5F" }',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      insufficientContrast:
        'Contrast ratio {{ratio}}:1 between `{{textClass}}` and `{{bgClass}}` fails WCAG AA (needs {{required}}:1).{{suggestion}}',
    },
  },
  defaultOptions: [{ customColors: {} }],
  create(context, [options]) {
    const customColors = options.customColors ?? {};

    return {
      JSXOpeningElement(node: TSESTree.JSXOpeningElement) {
        try {
          // Extract all classes from className/class attribute
          let classValue: string | null = null;
          let attrNode: TSESTree.Node = node;

          for (const attr of node.attributes) {
            if (attr.type !== 'JSXAttribute') continue;
            const name = attr.name.type === 'JSXIdentifier' ? attr.name.name : null;
            if (name !== 'className' && name !== 'class') continue;

            attrNode = attr;
            const val = attr.value;
            if (!val) continue;

            if (val.type === 'Literal' && typeof val.value === 'string') {
              classValue = val.value;
            } else if (val.type === 'JSXExpressionContainer') {
              const expr = val.expression;
              if (expr.type === 'Literal' && typeof expr.value === 'string') {
                classValue = expr.value;
              } else if (expr.type !== 'JSXEmptyExpression') {
                classValue = context.sourceCode.getText(expr).replace(/^['"`]|['"`]$/g, '');
              }
            }
          }

          if (!classValue) return;

          const classes = extractClassesFromString(classValue);

          // Find text color and bg color (base classes only, no variants)
          let textColorName: string | null = null;
          let textClass: string | null = null;
          let bgColorName: string | null = null;
          let bgClass: string | null = null;
          let isLargeText = false;
          let isBold = false;

          for (const cls of classes) {
            const { baseClass, variants } = parseClass(cls);

            // Skip responsive/state variants — check base colors only
            if (variants.length > 0) continue;

            // Check text color
            const textName = extractColorName(baseClass, TEXT_PREFIXES);
            if (textName) {
              const hex = resolveColorHex(textName, customColors);
              if (hex) {
                textColorName = textName;
                textClass = cls;
              }
            }

            // Check bg color
            const bgName = extractColorName(baseClass, BG_PREFIXES);
            if (bgName) {
              const hex = resolveColorHex(bgName, customColors);
              if (hex) {
                bgColorName = bgName;
                bgClass = cls;
              }
            }

            // Check for large text
            if (LARGE_TEXT_CLASSES.has(baseClass)) {
              isLargeText = true;
            }

            // Check for bold
            if (BOLD_CLASSES.has(baseClass)) {
              isBold = true;
            }
          }

          // If bold + text-lg (18px), it qualifies as large text for WCAG
          if (isBold && classes.some((c) => c === 'text-lg')) {
            isLargeText = true;
          }

          // Need both text and bg on the same element to check contrast
          if (!textColorName || !bgColorName || !textClass || !bgClass) return;

          const textHex = resolveColorHex(textColorName, customColors)!;
          const bgHex = resolveColorHex(bgColorName, customColors)!;

          const ratio = contrastRatio(hexToRgb(textHex), hexToRgb(bgHex));
          const roundedRatio = Math.round(ratio * 10) / 10;

          if (meetsWcagAA(ratio, isLargeText)) return;

          const required = isLargeText ? 3.0 : 4.5;

          // Find an accessible alternative
          const alt = findAccessibleAlternative(bgHex, isLargeText);
          const suggestion = alt
            ? ` Try \`${alt.className}\` on \`${bgClass}\` (ratio ${alt.ratio}:1)`
            : '';

          context.report({
            node: attrNode,
            messageId: 'insufficientContrast',
            data: {
              ratio: String(roundedRatio),
              textClass,
              bgClass,
              required: String(required),
              suggestion,
            },
          });
        } catch {
          return;
        }
      },
    };
  },
});
