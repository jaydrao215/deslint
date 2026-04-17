import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import { extractClassesFromString, parseClass } from '../utils/class-extractor.js';
import {
  toPxRadius,
  findNearestRadius,
  findNearestRadiusInScale,
} from '../utils/border-radius-map.js';
import { createClassVisitor } from '../utils/class-visitor.js';
import { debugLog } from '../utils/debug.js';
import { safeGetText, safeGetRange } from '../utils/safe-source.js';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://deslint.com/docs/rules/${name}`,
);

export type Options = [
  {
    allowlist?: string[];
    customScale?: Record<string, number>;
  },
];

export type MessageIds = 'arbitraryRadius' | 'suggestScale';

/**
 * rounded-[8px], rounded-t-[12px], rounded-tl-[1rem], etc.
 */
const RADIUS_PATTERN =
  /^rounded(?:-(?:[trblse]{1,2}))?-\[(\d+(?:\.\d+)?(?:px|rem|em))\]$/;

/**
 * Extract the directional prefix so a replacement preserves
 * `rounded-tl-[12px]` → `rounded-tl-lg` instead of collapsing to
 * `rounded-lg`.
 */
function extractPrefix(baseClass: string): string {
  const match = baseClass.match(/^(rounded(?:-(?:[trblse]{1,2}))?)-/);
  return match ? match[1] : 'rounded';
}

export default createRule<Options, MessageIds>({
  name: 'no-arbitrary-border-radius',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow arbitrary border-radius values in Tailwind classes. Use the radius scale instead.',
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
            description:
              'Arbitrary radius classes to allow, e.g. ["rounded-[3px]"]',
          },
          customScale: {
            type: 'object',
            additionalProperties: { type: 'number' },
            description:
              'Custom radius scale in px overriding the Tailwind defaults: { "sm": 4, "lg": 12 }',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      arbitraryRadius:
        'Arbitrary radius `{{className}}` detected. Use the radius scale instead.{{suggestion}}',
      suggestScale: 'Replace with `{{replacement}}`',
    },
  },
  defaultOptions: [{ allowlist: [], customScale: undefined }],
  create(context, [options]) {
    const allowlist = new Set(options.allowlist ?? []);
    const customScale = options.customScale ?? null;

    function checkClassString(value: string, node: TSESTree.Node) {
      try {
        const classes = extractClassesFromString(value);

        for (const cls of classes) {
          if (allowlist.has(cls)) continue;
          const { baseClass, variants } = parseClass(cls);

          const match = baseClass.match(RADIUS_PATTERN);
          if (!match) continue;

          const px = toPxRadius(match[1]);
          if (px === null) continue;

          const prefix = extractPrefix(baseClass);
          const nearest = customScale
            ? findNearestRadiusInScale(px, customScale)
            : findNearestRadius(px);

          const replacement = nearest !== null ? `${prefix}-${nearest}` : null;
          const fullReplacement = replacement
            ? [...variants, replacement].join(':')
            : null;
          const suggestion = fullReplacement
            ? ` Suggested: \`${fullReplacement}\``
            : '';

          context.report({
            node,
            messageId: 'arbitraryRadius',
            data: { className: cls, suggestion },
            ...(fullReplacement
              ? {
                  fix(fixer) {
                    const src = safeGetText(context.sourceCode, node);
                    const range = safeGetRange(context.sourceCode, node);
                    if (!src || !range) return null;
                    return fixer.replaceTextRange(
                      range,
                      src.replace(cls, fullReplacement),
                    );
                  },
                  suggest: [
                    {
                      messageId: 'suggestScale',
                      data: { replacement: fullReplacement },
                      fix(fixer) {
                        const src = safeGetText(context.sourceCode, node);
                        const range = safeGetRange(context.sourceCode, node);
                        if (!src || !range) return null;
                        return fixer.replaceTextRange(
                          range,
                          src.replace(cls, fullReplacement),
                        );
                      },
                    },
                  ],
                }
              : {}),
          });
        }
      } catch (err) {
        debugLog('no-arbitrary-border-radius', err);
        return;
      }
    }

    return createClassVisitor(checkClassString);
  },
});
