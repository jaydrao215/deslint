import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import { extractClassesFromString, parseClass } from '../utils/class-extractor.js';
import { TAILWIND_COLOR_MAP, hexToRgb } from '../utils/color-map.js';
import { contrastRatio, meetsWcagAA } from '../utils/contrast.js';
import { debugLog } from '../utils/debug.js';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://deslint.com/docs/rules/${name}`
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

    /**
     * Core contrast-checking logic. Given a class string containing all classes
     * on a single element, checks for WCAG AA contrast violations between
     * text color and background color classes.
     */
    function checkElementClasses(classValue: string, reportNode: TSESTree.Node): void {
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
        node: reportNode,
        messageId: 'insufficientContrast',
        data: {
          ratio: String(roundedRatio),
          textClass,
          bgClass,
          required: String(required),
          suggestion,
        },
      });
    }

    return {
      // ─── React / Preact / Solid: JSXOpeningElement ───
      JSXOpeningElement(node: TSESTree.JSXOpeningElement) {
        try {
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
          checkElementClasses(classValue, attrNode);
        } catch (err) {
          debugLog('a11y-color-contrast', err);
          return;
        }
      },

      // ─── Vue: VElement (vue-eslint-parser) ───
      // We visit the element node to collect ALL classes at once.
      VElement(node: any) {
        try {
          const classStrings: string[] = [];
          let reportNode: TSESTree.Node = node;

          for (const attr of node.startTag?.attributes ?? []) {
            // Static class: class="text-white bg-red-500"
            if (
              attr.directive !== true &&
              attr.key?.name === 'class' &&
              attr.value?.value &&
              typeof attr.value.value === 'string'
            ) {
              reportNode = attr;
              classStrings.push(attr.value.value);
            }

            // Dynamic :class binding with string literal
            if (
              attr.directive === true &&
              attr.key?.name?.name === 'bind' &&
              attr.key?.argument?.name === 'class'
            ) {
              reportNode = attr;
              const expr = attr.value?.expression;
              if (expr) {
                // :class="'text-white bg-red-500'" — string literal
                if (expr.type === 'Literal' && typeof expr.value === 'string') {
                  classStrings.push(expr.value);
                }
                // :class="{'text-white bg-red-500': condition}" — object keys
                if (expr.type === 'ObjectExpression') {
                  for (const prop of expr.properties ?? []) {
                    if (prop.type === 'Property' && prop.key) {
                      if (prop.key.type === 'Literal' && typeof prop.key.value === 'string') {
                        classStrings.push(prop.key.value);
                      } else if (prop.key.type === 'Identifier' && prop.key.name) {
                        classStrings.push(prop.key.name);
                      }
                    }
                  }
                }
                // :class="['text-white', 'bg-red-500']" — array elements
                if (expr.type === 'ArrayExpression') {
                  for (const el of expr.elements ?? []) {
                    if (el?.type === 'Literal' && typeof el.value === 'string') {
                      classStrings.push(el.value);
                    }
                  }
                }
              }
            }
          }

          if (classStrings.length === 0) return;

          // Join all class sources into one string so we can find text+bg pairs
          const combined = classStrings.join(' ');
          checkElementClasses(combined, reportNode);
        } catch (err) {
          debugLog('a11y-color-contrast', err);
          return;
        }
      },

      // ─── Svelte: SvelteElement (svelte-eslint-parser) ───
      // SvelteElement has a `startTag` with `attributes` array.
      SvelteElement(node: any) {
        try {
          const classStrings: string[] = [];
          let reportNode: TSESTree.Node = node;

          for (const attr of node.startTag?.attributes ?? []) {
            // Static class: class="text-white bg-red-500"
            if (attr.type === 'SvelteAttribute' && attr.name === 'class') {
              reportNode = attr;
              if (Array.isArray(attr.value)) {
                for (const chunk of attr.value) {
                  if (chunk.type === 'SvelteLiteral' && typeof chunk.value === 'string') {
                    classStrings.push(chunk.value);
                  }
                  if (chunk.type === 'SvelteMustacheTag' && chunk.expression) {
                    if (chunk.expression.type === 'Literal' && typeof chunk.expression.value === 'string') {
                      classStrings.push(chunk.expression.value);
                    }
                    if (chunk.expression.type === 'TemplateLiteral') {
                      for (const quasi of chunk.expression.quasis ?? []) {
                        if (quasi.value?.raw) {
                          classStrings.push(quasi.value.raw);
                        }
                      }
                    }
                  }
                }
              } else if (typeof attr.value === 'string') {
                classStrings.push(attr.value);
              }
            }
          }

          if (classStrings.length === 0) return;

          const combined = classStrings.join(' ');
          checkElementClasses(combined, reportNode);
        } catch (err) {
          debugLog('a11y-color-contrast', err);
          return;
        }
      },

      // ─── Angular: Element (angular-eslint template parser) ───
      // @angular-eslint template parser produces Element nodes with
      // `attributes` (TextAttribute[]) and `inputs` (BoundAttribute[]) arrays.
      Element(node: any) {
        try {
          const classStrings: string[] = [];
          let reportNode: TSESTree.Node = node;

          // Static class via TextAttribute: class="text-white bg-red-500"
          for (const attr of node.attributes ?? []) {
            if (attr.name === 'class' && typeof attr.value === 'string') {
              reportNode = attr;
              classStrings.push(attr.value);
            }
          }

          // Dynamic bindings via BoundAttribute: [class]="expr" or [ngClass]="expr"
          for (const input of node.inputs ?? []) {
            if (input.name === 'class' || input.name === 'ngClass') {
              reportNode = input;

              // [class]="'text-white bg-red-500'" — string literal
              const ast = input.value?.ast ?? input.value;
              if (ast?.type === 'LiteralPrimitive' && typeof ast.value === 'string') {
                classStrings.push(ast.value);
              }

              // [ngClass]="{'text-white bg-red-500': cond}" — extract keys
              const raw = input.value?.source ?? input.sourceSpan?.toString() ?? '';
              if (typeof raw === 'string' && input.name === 'ngClass') {
                const keyPattern = /['"]([^'"]+)['"]\s*:/g;
                let match: RegExpExecArray | null;
                while ((match = keyPattern.exec(raw)) !== null) {
                  classStrings.push(match[1]);
                }
              }
            }
          }

          if (classStrings.length === 0) return;

          const combined = classStrings.join(' ');
          checkElementClasses(combined, reportNode);
        } catch (err) {
          debugLog('a11y-color-contrast', err);
          return;
        }
      },
    };
  },
});
