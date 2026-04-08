import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import { debugLog } from '../utils/debug.js';
import {
  createElementVisitor,
  type NormalizedElement,
} from '../utils/element-visitor.js';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://deslint.com/docs/rules/${name}`
);

export type Options = [
  {
    /** Allow more than one h1 per file. Default: false. */
    allowMultipleH1?: boolean;
  },
];

export type MessageIds = 'skippedLevel' | 'multipleH1';

const HEADING_TAGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const;

interface CollectedHeading {
  level: number;
  node: unknown;
}

/**
 * heading-hierarchy
 *
 * Within a single file, enforce two WCAG-relevant invariants on heading
 * elements (h1-h6):
 *
 * 1. **No skipped levels** — going from h1 directly to h3 (skipping h2)
 *    breaks the implied document outline. WCAG 1.3.1 (Info and
 *    Relationships, Level A).
 *
 * 2. **At most one h1 per file** — multiple h1s on a single page break the
 *    "main heading" assumption screen readers and outline tools rely on.
 *    WCAG 2.4.6 (Headings and Labels, Level AA).
 *
 * What this rule deliberately does NOT check:
 *
 * - **Missing h1.** A React/Vue/Svelte component file is often a fragment
 *   that gets composed into a parent page. Reporting "no h1" on every
 *   leaf component would be a false-positive machine. Cross-file heading
 *   composition is a Phase 2 (cross-file graph) concern.
 *
 * - **Heading text quality.** "Read more" / "Click here" heading text is
 *   covered by `link-text` (S4 4/6) for links and is out of scope for
 *   structural hierarchy.
 *
 * Spec links:
 * - https://www.w3.org/TR/WCAG22/#info-and-relationships
 * - https://www.w3.org/TR/WCAG22/#headings-and-labels
 */
export default createRule<Options, MessageIds>({
  name: 'heading-hierarchy',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Enforce sequential heading levels and at most one h1 per file. Maps to WCAG 2.2 Success Criteria 1.3.1 (Info and Relationships, A) and 2.4.6 (Headings and Labels, AA).',
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowMultipleH1: {
            type: 'boolean',
            description:
              'Allow more than one h1 per file. Useful for legacy or HTML5-outline-style codebases. Default: false.',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      skippedLevel:
        'Heading hierarchy skips a level (h{{from}} → h{{to}}). Screen readers rely on sequential levels for the document outline. Use h{{expected}} instead, or restructure the section.',
      multipleH1:
        'Multiple `<h1>` elements in this file. WCAG 2.4.6 expects a single page-level main heading. Demote secondary h1s to h2 or restructure.',
    },
  },
  defaultOptions: [{}],
  create(context, [options]) {
    const allowMultipleH1 = options?.allowMultipleH1 ?? false;
    const headings: CollectedHeading[] = [];

    function evaluate(): void {
      try {
        if (headings.length === 0) return;

        // Multiple h1 detection — report each h1 after the first.
        if (!allowMultipleH1) {
          const h1s = headings.filter((h) => h.level === 1);
          if (h1s.length > 1) {
            for (let i = 1; i < h1s.length; i++) {
              context.report({
                node: h1s[i].node as TSESTree.Node,
                messageId: 'multipleH1',
              });
            }
          }
        }

        // Skipped-level detection — walk in source order. The "previous
        // level" baseline is the lowest (numerically smallest) heading we've
        // seen so far in this file, so jumping from h1 to h3 is flagged but
        // moving from h3 back to h2 (closing a deeper section) is fine.
        let previousLevel: number | null = null;
        for (const h of headings) {
          if (previousLevel === null) {
            previousLevel = h.level;
            continue;
          }
          // Going DEEPER by more than 1 level is the violation.
          // Coming back UP any number of levels is allowed.
          if (h.level > previousLevel + 1) {
            context.report({
              node: h.node as TSESTree.Node,
              messageId: 'skippedLevel',
              data: {
                from: String(previousLevel),
                to: String(h.level),
                expected: String(previousLevel + 1),
              },
            });
          }
          previousLevel = h.level;
        }
      } catch (err) {
        debugLog('heading-hierarchy', err);
      }
    }

    return createElementVisitor({
      tagNames: HEADING_TAGS,
      check(element: NormalizedElement) {
        try {
          const level = Number(element.tagName.toLowerCase().slice(1));
          if (!Number.isInteger(level) || level < 1 || level > 6) return;
          headings.push({ level, node: element.node });
        } catch (err) {
          debugLog('heading-hierarchy', err);
        }
      },
      onComplete: evaluate,
    });
  },
});
