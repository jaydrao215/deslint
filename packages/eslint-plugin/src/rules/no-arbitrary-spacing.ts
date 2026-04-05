import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import { extractClassesFromString, parseClass, isValidV4Class } from '../utils/class-extractor.js';
import { toPx, findNearestSpacing, findNearestInCustomScale } from '../utils/spacing-map.js';
import { createClassVisitor } from '../utils/class-visitor.js';
import { debugLog } from '../utils/debug.js';
import { safeGetText, safeGetRange } from '../utils/safe-source.js';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://vizlint.dev/docs/rules/${name}`
);

export type Options = [
  {
    allowlist?: string[];
    customScale?: Record<string, number>;
    /** Skip min-w, max-w, min-h, max-h (usually intentional constraints). Default: true */
    skipConstraints?: boolean;
    /** Skip values at or below this px threshold (fine-tuning, not design system violations). Default: 2 */
    minPxThreshold?: number;
  },
];

export type MessageIds = 'arbitrarySpacing' | 'suggestScale';

/**
 * Regex for arbitrary spacing values in Tailwind classes.
 * Matches: p-[13px], mx-[1.5rem], gap-[20px], w-[200px], h-[50vh], etc.
 * Captures: (1) full prefix with direction, (2) value including unit
 */
const SPACING_PATTERN = /^(p|px|py|pt|pr|pb|pl|pe|ps|m|mx|my|mt|mr|mb|ml|me|ms|gap|gap-x|gap-y|space-x|space-y|inset|inset-x|inset-y|top|right|bottom|left|w|h|min-w|min-h|max-w|max-h|size)-\[(\d+(?:\.\d+)?(?:px|rem|em))\]$/;

export default createRule<Options, MessageIds>({
  name: 'no-arbitrary-spacing',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow arbitrary spacing values in Tailwind classes. Use the spacing scale instead.',
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
            description: 'Arbitrary spacing values to allow (e.g., ["p-[18px]"])',
          },
          customScale: {
            type: 'object',
            additionalProperties: { type: 'number' },
            description: 'Custom spacing scale overriding Tailwind defaults: { "18": 72 }',
          },
          skipConstraints: {
            type: 'boolean',
            description: 'Skip min-w, max-w, min-h, max-h (usually intentional). Default: true',
          },
          minPxThreshold: {
            type: 'number',
            description: 'Skip values at or below this px size. Default: 2',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      arbitrarySpacing:
        'Arbitrary spacing `{{className}}` detected. Use the spacing scale instead.{{suggestion}}',
      suggestScale: 'Replace with `{{replacement}}`',
    },
  },
  defaultOptions: [{ allowlist: [], customScale: undefined, skipConstraints: true, minPxThreshold: 2 }],
  create(context, [options]) {
    const allowlist = new Set(options.allowlist ?? []);
    const customScale = options.customScale ?? null;
    const skipConstraints = options.skipConstraints ?? true;
    const minPxThreshold = options.minPxThreshold ?? 2;

    /** Prefixes that are usually intentional layout constraints, not design system violations */
    const CONSTRAINT_PREFIXES = new Set(['min-w', 'max-w', 'min-h', 'max-h']);

    function reportViolation(
      node: TSESTree.Node,
      cls: string,
      fullReplacement: string | null,
    ) {
      const suggestion = fullReplacement ? ` Suggested: \`${fullReplacement}\`` : '';

      context.report({
        node,
        messageId: 'arbitrarySpacing',
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
                  messageId: 'suggestScale',
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

    function checkClassString(value: string, node: TSESTree.Node) {
      try {
        const classes = extractClassesFromString(value);

        for (const cls of classes) {
          if (isValidV4Class(cls)) continue;
          if (allowlist.has(cls)) continue;

          const { baseClass, variants } = parseClass(cls);
          const match = baseClass.match(SPACING_PATTERN);
          if (!match) continue;

          const prefix = match[1];
          const rawValue = match[2];
          const px = toPx(rawValue);
          if (px === null) continue;

          // Skip constraint prefixes (min-w, max-w, etc.) — usually intentional
          if (skipConstraints && CONSTRAINT_PREFIXES.has(prefix)) continue;

          // Skip tiny values (1px, 2px) — fine-tuning, not design system violations
          if (minPxThreshold > 0 && px <= minPxThreshold) continue;

          const nearest = customScale
            ? findNearestInCustomScale(px, customScale)
            : findNearestSpacing(px);
          const replacement = nearest !== null ? `${prefix}-${nearest}` : null;
          const fullReplacement = replacement
            ? [...variants, replacement].join(':')
            : null;

          reportViolation(node, cls, fullReplacement);
        }
      } catch (err) {
        debugLog('no-arbitrary-spacing', err);
        return;
      }
    }

    return createClassVisitor(checkClassString);
  },
});
