import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import { extractClassesFromString, parseClass } from '../utils/class-extractor.js';
import { createClassVisitor } from '../utils/class-visitor.js';
import { debugLog } from '../utils/debug.js';
import { safeGetText, safeGetRange } from '../utils/safe-source.js';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://deslint.com/docs/rules/${name}`
);

export type Options = [
  {
    allowlist?: number[];
  },
];

export type MessageIds = 'arbitraryZIndex' | 'suggestScale';

/**
 * Tailwind default z-index scale values.
 */
const Z_INDEX_SCALE: Record<string, number> = {
  '0': 0,
  '10': 10,
  '20': 20,
  '30': 30,
  '40': 40,
  '50': 50,
};

/** Also handle z-auto (valid, not arbitrary) */
const VALID_Z_CLASSES = new Set([
  'z-0', 'z-10', 'z-20', 'z-30', 'z-40', 'z-50', 'z-auto',
]);

/**
 * Matches z-[N] arbitrary z-index values.
 */
const Z_ARBITRARY_PATTERN = /^z-\[(-?\d+)\]$/;

/**
 * Find the nearest z-index scale value.
 */
function findNearestZIndex(value: number): { key: string; scaleValue: number } | null {
  let nearest: string | null = null;
  let minDist = Infinity;

  for (const [key, scaleVal] of Object.entries(Z_INDEX_SCALE)) {
    const dist = Math.abs(value - scaleVal);
    if (dist < minDist || (dist === minDist && scaleVal < Z_INDEX_SCALE[nearest!])) {
      minDist = dist;
      nearest = key;
    }
  }

  if (nearest !== null) {
    return { key: nearest, scaleValue: Z_INDEX_SCALE[nearest] };
  }
  return null;
}

export default createRule<Options, MessageIds>({
  name: 'no-arbitrary-zindex',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow arbitrary z-index values like z-[999]. Use Tailwind scale values (z-10, z-20, z-30, z-40, z-50) instead.',
    },
    fixable: 'code',
    hasSuggestions: true,
    schema: [
      {
        type: 'object',
        properties: {
          allowlist: {
            type: 'array',
            items: { type: 'number' },
            description: 'Z-index values to allow (e.g., [9999] for modals)',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      arbitraryZIndex:
        'Arbitrary z-index `{{className}}` detected. Use scale value `{{suggested}}` instead.',
      suggestScale: 'Replace with `{{suggested}}`',
    },
  },
  defaultOptions: [{ allowlist: [] }],
  create(context, [options]) {
    const allowlist = new Set(options.allowlist ?? []);

    function checkClassString(value: string, node: TSESTree.Node) {
      try {
        const classes = extractClassesFromString(value);

        for (const cls of classes) {
          const { baseClass, variants } = parseClass(cls);

          // Skip standard z-index classes
          if (VALID_Z_CLASSES.has(baseClass)) continue;

          const match = baseClass.match(Z_ARBITRARY_PATTERN);
          if (!match) continue;

          const zValue = parseInt(match[1], 10);

          // Skip allowlisted values
          if (allowlist.has(zValue)) continue;

          const nearest = findNearestZIndex(zValue);
          const suggestedBase = nearest ? `z-${nearest.key}` : 'z-50';
          const suggested = variants.length > 0
            ? [...variants, suggestedBase].join(':')
            : suggestedBase;

          context.report({
            node,
            messageId: 'arbitraryZIndex',
            data: { className: cls, suggested },
            ...(suggested
              ? {
                  fix(fixer) {
                    const src = safeGetText(context.sourceCode, node);
                    const range = safeGetRange(context.sourceCode, node);
                    if (!src || !range) return null;
                    return fixer.replaceTextRange(range, src.replace(cls, suggested));
                  },
                  suggest: [
                    {
                      messageId: 'suggestScale',
                      data: { suggested },
                      fix(fixer) {
                        const src = safeGetText(context.sourceCode, node);
                        const range = safeGetRange(context.sourceCode, node);
                        if (!src || !range) return null;
                        return fixer.replaceTextRange(range, src.replace(cls, suggested));
                      },
                    },
                  ],
                }
              : {}),
          });
        }
      } catch (err) {
        debugLog('no-arbitrary-zindex', err);
        return;
      }
    }

    return createClassVisitor(checkClassString);
  },
});
