import { ESLintUtils } from '@typescript-eslint/utils';
import { debugLog } from '../utils/debug.js';
import { createClassVisitor } from '../utils/class-visitor.js';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://deslint.com/docs/rules/${name}`
);

export type Options = [
  {
    /** Additional class patterns that count as focus replacement (regex strings). */
    allowedFocusPatterns?: string[];
  },
];

export type MessageIds = 'outlineRemovedNoFocus';

/**
 * Tailwind classes that remove the default focus outline.
 * These are dangerous when used without a replacement focus style.
 */
const OUTLINE_REMOVAL_CLASSES = new Set([
  'outline-none',
  'outline-0',
  'outline-hidden',
]);

/**
 * Tailwind classes/patterns that provide a replacement focus indicator.
 * If ANY of these appear alongside an outline-removal class, the element
 * is considered to have a visible focus style.
 */
const FOCUS_INDICATOR_PATTERNS = [
  // focus: and focus-visible: variants with ring or outline
  /^focus(-visible)?:ring/,
  /^focus(-visible)?:outline/,
  /^focus(-visible)?:border/,
  /^focus(-visible)?:shadow/,
  /^focus(-visible)?:bg-/,
  /^focus(-visible)?:text-/,
  // focus-within variants
  /^focus-within:ring/,
  /^focus-within:outline/,
  /^focus-within:border/,
  // Direct ring classes (often paired in component utility layers)
  /^ring-/,
];

export default createRule<Options, MessageIds>({
  name: 'focus-visible-style',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Detect elements with outline-none/outline-0 that lack a replacement focus indicator. Removing focus outlines without providing an alternative violates WCAG 2.4.7 Focus Visible.',
    },
    hasSuggestions: true,
    schema: [
      {
        type: 'object',
        properties: {
          allowedFocusPatterns: {
            type: 'array',
            items: { type: 'string' },
            description:
              'Additional regex patterns for classes that count as focus replacements',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      outlineRemovedNoFocus:
        'Focus outline removed (`{{removalClass}}`) without a visible replacement. Add a focus indicator like `focus-visible:ring-2` to maintain keyboard accessibility (WCAG 2.4.7).',
    },
  },
  defaultOptions: [
    {
      allowedFocusPatterns: undefined,
    },
  ],
  create(context, [options]) {
    const extraPatterns = (options.allowedFocusPatterns ?? []).map(
      (p) => new RegExp(p),
    );
    const allFocusPatterns = [...FOCUS_INDICATOR_PATTERNS, ...extraPatterns];

    return createClassVisitor((classString, node) => {
      try {
        const classes = classString.split(/\s+/).filter(Boolean);

        // Find outline-removal classes
        const removalClasses = classes.filter((c) =>
          OUTLINE_REMOVAL_CLASSES.has(c),
        );
        if (removalClasses.length === 0) return;

        // Check if any focus indicator is present
        const hasFocusIndicator = classes.some((c) =>
          allFocusPatterns.some((pattern) => pattern.test(c)),
        );
        if (hasFocusIndicator) return;

        for (const removalClass of removalClasses) {
          context.report({
            node: node as any,
            messageId: 'outlineRemovedNoFocus',
            data: { removalClass },
          });
        }
      } catch (err) {
        debugLog('focus-visible-style', err);
      }
    });
  },
});
