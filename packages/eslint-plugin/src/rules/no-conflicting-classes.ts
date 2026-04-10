import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import { extractClassesFromString, parseClass } from '../utils/class-extractor.js';
import { createClassVisitor } from '../utils/class-visitor.js';
import { debugLog } from '../utils/debug.js';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://deslint.com/docs/rules/${name}`
);

export type Options = [
  {
    customConflicts?: Array<[string, string]>;
  },
];

export type MessageIds = 'conflictingClasses';

/**
 * Built-in conflict groups. Each entry is a set of mutually exclusive base
 * classes — if two or more from the same set appear with the same variant
 * stack, they conflict.
 *
 * The key is a human-readable group name for the error message.
 */
const CONFLICT_GROUPS: Record<string, RegExp[]> = {
  display: [
    /^block$/,
    /^inline$/,
    /^inline-block$/,
    /^flex$/,
    /^inline-flex$/,
    /^grid$/,
    /^inline-grid$/,
    /^table$/,
    /^contents$/,
    /^hidden$/,
  ],
  visibility: [
    /^visible$/,
    /^invisible$/,
    /^collapse$/,
  ],
  position: [
    /^static$/,
    /^fixed$/,
    /^absolute$/,
    /^relative$/,
    /^sticky$/,
  ],
  overflow: [
    /^overflow-auto$/,
    /^overflow-hidden$/,
    /^overflow-clip$/,
    /^overflow-visible$/,
    /^overflow-scroll$/,
  ],
  overflowX: [
    /^overflow-x-auto$/,
    /^overflow-x-hidden$/,
    /^overflow-x-clip$/,
    /^overflow-x-visible$/,
    /^overflow-x-scroll$/,
  ],
  overflowY: [
    /^overflow-y-auto$/,
    /^overflow-y-hidden$/,
    /^overflow-y-clip$/,
    /^overflow-y-visible$/,
    /^overflow-y-scroll$/,
  ],
  flexDirection: [
    /^flex-row$/,
    /^flex-row-reverse$/,
    /^flex-col$/,
    /^flex-col-reverse$/,
  ],
  flexWrap: [
    /^flex-wrap$/,
    /^flex-wrap-reverse$/,
    /^flex-nowrap$/,
  ],
  justifyContent: [
    /^justify-normal$/,
    /^justify-start$/,
    /^justify-end$/,
    /^justify-center$/,
    /^justify-between$/,
    /^justify-around$/,
    /^justify-evenly$/,
    /^justify-stretch$/,
  ],
  alignItems: [
    /^items-start$/,
    /^items-end$/,
    /^items-center$/,
    /^items-baseline$/,
    /^items-stretch$/,
  ],
  textAlign: [
    /^text-left$/,
    /^text-center$/,
    /^text-right$/,
    /^text-justify$/,
    /^text-start$/,
    /^text-end$/,
  ],
  fontWeight: [
    /^font-thin$/,
    /^font-extralight$/,
    /^font-light$/,
    /^font-normal$/,
    /^font-medium$/,
    /^font-semibold$/,
    /^font-bold$/,
    /^font-extrabold$/,
    /^font-black$/,
  ],
  textSize: [
    /^text-xs$/,
    /^text-sm$/,
    /^text-base$/,
    /^text-lg$/,
    /^text-xl$/,
    /^text-2xl$/,
    /^text-3xl$/,
    /^text-4xl$/,
    /^text-5xl$/,
    /^text-6xl$/,
    /^text-7xl$/,
    /^text-8xl$/,
    /^text-9xl$/,
  ],
  width: [
    /^w-full$/,
    /^w-auto$/,
    /^w-screen$/,
    /^w-fit$/,
    /^w-min$/,
    /^w-max$/,
  ],
};

/**
 * Find which conflict group a base class belongs to.
 * Returns group name and the matched class, or null.
 */
function findConflictGroup(
  baseClass: string,
): string | null {
  for (const [group, patterns] of Object.entries(CONFLICT_GROUPS)) {
    for (const pattern of patterns) {
      if (pattern.test(baseClass)) {
        return group;
      }
    }
  }
  return null;
}

export default createRule<Options, MessageIds>({
  name: 'no-conflicting-classes',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Detect contradictory Tailwind utility classes on the same element (e.g., flex + hidden, text-left + text-center).',
    },
    schema: [
      {
        type: 'object',
        properties: {
          customConflicts: {
            type: 'array',
            items: {
              type: 'array',
              items: { type: 'string' },
              minItems: 2,
              maxItems: 2,
            },
            description:
              'Additional pairs of conflicting classes: [["classA", "classB"]]',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      conflictingClasses:
        'Conflicting classes `{{classA}}` and `{{classB}}` ({{group}}). Only one should be used.',
    },
  },
  defaultOptions: [{ customConflicts: [] }],
  create(context, [options]) {
    const customConflicts = options.customConflicts ?? [];

    function checkClassString(value: string, node: TSESTree.Node) {
      try {
        const classes = extractClassesFromString(value);
        if (classes.length < 2) return;

        // Group classes by their variant stack (e.g. "sm:hover:" prefix)
        // so we only detect conflicts within the same variant context.
        const byVariant = new Map<string, Array<{ baseClass: string; raw: string }>>();

        for (const cls of classes) {
          const { variants, baseClass } = parseClass(cls);
          const variantKey = variants.join(':');
          if (!byVariant.has(variantKey)) {
            byVariant.set(variantKey, []);
          }
          byVariant.get(variantKey)!.push({ baseClass, raw: cls });
        }

        for (const entries of byVariant.values()) {
          if (entries.length < 2) continue;

          // Check built-in conflict groups
          const groupMap = new Map<string, Array<{ baseClass: string; raw: string }>>();
          for (const entry of entries) {
            const group = findConflictGroup(entry.baseClass);
            if (group) {
              if (!groupMap.has(group)) {
                groupMap.set(group, []);
              }
              groupMap.get(group)!.push(entry);
            }
          }

          for (const [group, members] of groupMap) {
            if (members.length < 2) continue;
            // Report each pair
            context.report({
              node,
              messageId: 'conflictingClasses',
              data: {
                classA: members[0].raw,
                classB: members[1].raw,
                group,
              },
            });
          }

          // Check custom conflict pairs
          for (const [a, b] of customConflicts) {
            const hasA = entries.some((e) => e.baseClass === a);
            const hasB = entries.some((e) => e.baseClass === b);
            if (hasA && hasB) {
              context.report({
                node,
                messageId: 'conflictingClasses',
                data: {
                  classA: a,
                  classB: b,
                  group: 'custom',
                },
              });
            }
          }
        }
      } catch (err) {
        debugLog('no-conflicting-classes', err);
        return;
      }
    }

    return createClassVisitor(checkClassString);
  },
});
