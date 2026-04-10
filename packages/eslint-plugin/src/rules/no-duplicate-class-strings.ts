import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import { createClassVisitor } from '../utils/class-visitor.js';
import { debugLog } from '../utils/debug.js';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://deslint.com/docs/rules/${name}`
);

export type Options = [
  {
    threshold?: number;
    minClassCount?: number;
  },
];

export type MessageIds = 'duplicateClassString';

/**
 * Normalize a class string for comparison: sort classes alphabetically,
 * collapse whitespace, and trim. Two class strings that contain the same
 * classes in a different order are considered equivalent.
 */
function normalizeClassString(value: string): string {
  return value
    .split(/\s+/)
    .map((c) => c.trim())
    .filter((c) => c.length > 0)
    .sort()
    .join(' ');
}

export default createRule<Options, MessageIds>({
  name: 'no-duplicate-class-strings',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Flag identical or equivalent class strings appearing 3+ times in a file. Extract to a shared variable or component.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          threshold: {
            type: 'number',
            description:
              'Number of occurrences before flagging (default: 3). Set to 2 to be stricter.',
          },
          minClassCount: {
            type: 'number',
            description:
              'Minimum number of classes in a string before it qualifies for dedup checking (default: 3). Single utility classes like "p-4" are not flagged.',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      duplicateClassString:
        'Class string `{{classString}}` appears {{count}} times. Extract to a shared variable or component.',
    },
  },
  defaultOptions: [{ threshold: 3, minClassCount: 3 }],
  create(context, [options]) {
    const threshold = options.threshold ?? 3;
    const minClassCount = options.minClassCount ?? 3;

    // Accumulate: normalized class string → list of nodes
    const classMap = new Map<string, TSESTree.Node[]>();

    function checkClassString(value: string, node: TSESTree.Node) {
      try {
        const normalized = normalizeClassString(value);
        if (!normalized) return;

        // Skip short class strings
        const count = normalized.split(' ').length;
        if (count < minClassCount) return;

        if (!classMap.has(normalized)) {
          classMap.set(normalized, []);
        }
        classMap.get(normalized)!.push(node);
      } catch (err) {
        debugLog('no-duplicate-class-strings', err);
        return;
      }
    }

    const visitor = createClassVisitor(checkClassString);

    return {
      ...visitor,
      'Program:exit'() {
        try {
          for (const [normalized, nodes] of classMap) {
            if (nodes.length < threshold) continue;

            // Report on every occurrence so the user can see all locations
            for (const node of nodes) {
              // Show a truncated version in the message
              const display =
                normalized.length > 60
                  ? normalized.slice(0, 57) + '...'
                  : normalized;

              context.report({
                node,
                messageId: 'duplicateClassString',
                data: {
                  classString: display,
                  count: String(nodes.length),
                },
              });
            }
          }
        } catch (err) {
          debugLog('no-duplicate-class-strings', err);
          return;
        }
      },
    };
  },
});
