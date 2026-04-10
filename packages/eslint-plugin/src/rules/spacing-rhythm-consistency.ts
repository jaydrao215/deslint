import { ESLintUtils } from '@typescript-eslint/utils';
import { createClassVisitor } from '../utils/class-visitor.js';
import { debugLog } from '../utils/debug.js';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://deslint.com/docs/rules/${name}`
);

export type Options = [
  {
    /** Minimum instances of a component before checking rhythm. Default: 3. */
    threshold?: number;
    /** Spacing axes to check. Default: ['padding', 'margin', 'gap']. */
    axes?: string[];
  },
];

export type MessageIds = 'inconsistentSpacing';

/**
 * Detect inconsistent spacing rhythm within same-type elements in a file.
 *
 * This goes beyond `consistent-component-spacing` by checking ALL elements
 * (not just PascalCase components) and flagging when the dominant spacing
 * pattern diverges. A file with 8 `<div className="p-4 ...">` and 2
 * `<div className="p-3 ...">` suggests the p-3 instances drifted.
 *
 * Useful for catching the exact problem AI code generators create: each
 * generation picks slightly different spacing from the same design system.
 */

/** Spacing utility prefixes grouped by semantic axis. */
const SPACING_AXES: Record<string, string[]> = {
  padding: ['p-', 'px-', 'py-', 'pt-', 'pr-', 'pb-', 'pl-', 'ps-', 'pe-'],
  margin: ['m-', 'mx-', 'my-', 'mt-', 'mr-', 'mb-', 'ml-', 'ms-', 'me-'],
  gap: ['gap-', 'gap-x-', 'gap-y-'],
};

/** Extract spacing classes from a class string, grouped by axis prefix. */
function extractSpacing(classes: string, axes: string[]): Map<string, string> {
  const result = new Map<string, string>();
  const tokens = classes.split(/\s+/).filter(Boolean);

  for (const token of tokens) {
    // Strip responsive/state variants: "sm:hover:p-4" → "p-4"
    const parts = token.split(':');
    const base = parts[parts.length - 1];

    // Skip arbitrary values — those are caught by no-arbitrary-spacing
    if (base.includes('[')) continue;

    for (const axis of axes) {
      const prefixes = SPACING_AXES[axis];
      if (!prefixes) continue;

      for (const prefix of prefixes) {
        if (base.startsWith(prefix)) {
          // Use the full prefix as the key (e.g., 'p-' or 'px-')
          result.set(prefix, base);
          break;
        }
      }
    }
  }

  return result;
}

export default createRule<Options, MessageIds>({
  name: 'spacing-rhythm-consistency',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Detect inconsistent spacing patterns across similar elements in a file. Flags when a minority of elements use different spacing than the dominant pattern.',
    },
    messages: {
      inconsistentSpacing:
        'Spacing `{{ actual }}` diverges from the dominant pattern `{{ dominant }}` used by {{ dominantCount }}/{{ totalCount }} similar elements. Consider aligning to maintain visual rhythm.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          threshold: { type: 'number', minimum: 2 },
          axes: {
            type: 'array',
            items: { type: 'string', enum: ['padding', 'margin', 'gap'] },
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ threshold: 3 }],
  create(context) {
    const options = context.options[0] ?? {};
    const threshold = options.threshold ?? 3;
    const axes = options.axes ?? ['padding', 'margin', 'gap'];

    // Collect spacing patterns per prefix across the file
    const spacingOccurrences: Map<
      string, // prefix like 'p-'
      Array<{ value: string; node: any }>
    > = new Map();

    return {
      ...createClassVisitor((classes, node) => {
        try {
          const spacing = extractSpacing(classes, axes);

          for (const [_prefix, value] of spacing) {
            if (!spacingOccurrences.has(_prefix)) {
              spacingOccurrences.set(_prefix, []);
            }
            spacingOccurrences.get(_prefix)!.push({ value, node });
          }
        } catch (err) {
          debugLog('spacing-rhythm-consistency', err);
        }
      }),

      'Program:exit'() {
        try {
          for (const [_prefix, occurrences] of spacingOccurrences) {
            // Skip if below threshold
            if (occurrences.length < threshold) continue;

            // Find the dominant value
            const counts = new Map<string, number>();
            for (const { value } of occurrences) {
              counts.set(value, (counts.get(value) ?? 0) + 1);
            }

            // Find the most common value
            let dominant = '';
            let dominantCount = 0;
            for (const [value, count] of counts) {
              if (count > dominantCount) {
                dominant = value;
                dominantCount = count;
              }
            }

            // Skip if there's no clear dominant (all values are different)
            if (dominantCount < Math.ceil(occurrences.length * 0.5)) continue;

            // Report outliers
            for (const { value, node } of occurrences) {
              if (value !== dominant) {
                context.report({
                  node: node as any,
                  messageId: 'inconsistentSpacing',
                  data: {
                    actual: value,
                    dominant,
                    dominantCount: String(dominantCount),
                    totalCount: String(occurrences.length),
                  },
                });
              }
            }
          }
        } catch (err) {
          debugLog('spacing-rhythm-consistency', err);
        }
      },
    };
  },
});
