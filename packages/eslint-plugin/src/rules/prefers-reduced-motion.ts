import { ESLintUtils } from '@typescript-eslint/utils';
import { createClassVisitor } from '../utils/class-visitor.js';
import { debugLog } from '../utils/debug.js';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://deslint.com/docs/rules/${name}`
);

export type Options = [
  {
    /** Additional class prefixes to check beyond animate/transition. */
    additionalPrefixes?: string[];
  },
];

export type MessageIds = 'missingMotionSafe';

/**
 * Animation and transition class prefixes that require motion-safe/motion-reduce
 * wrapping per WCAG 2.3.3 Animation from Interactions.
 *
 * ~15% of users experience vestibular disorders, epilepsy, or ADHD that are
 * aggravated by unexpected motion. prefers-reduced-motion lets them opt out,
 * but only if the code respects it.
 */
const MOTION_PREFIXES = [
  'animate-',
  'transition-',
  'duration-',
  'ease-',
  'delay-',
];

/** Static classes that are safe to use without motion wrapping. */
const SAFE_CLASSES = new Set([
  'animate-none',
  'transition-none',
  'duration-0',
]);

/** Variant prefixes that indicate the class already respects motion prefs. */
const MOTION_VARIANTS = ['motion-safe:', 'motion-reduce:'];

export default createRule<Options, MessageIds>({
  name: 'prefers-reduced-motion',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Require animation/transition classes to be wrapped with motion-safe: or motion-reduce: variants for users with vestibular disorders (WCAG 2.3.3).',
    },
    messages: {
      missingMotionSafe:
        '`{{ cls }}` animates without respecting prefers-reduced-motion. Wrap with `motion-safe:{{ cls }}` or add a `motion-reduce:` override. ~15% of users have motion sensitivity (WCAG 2.3.3).',
    },
    schema: [
      {
        type: 'object',
        properties: {
          additionalPrefixes: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{}],
  create(context) {
    const options = context.options[0] ?? {};
    const prefixes = [...MOTION_PREFIXES, ...(options.additionalPrefixes ?? [])];

    return createClassVisitor((classes, node) => {
      try {
        const classList = classes.split(/\s+/).filter(Boolean);

        // Build set of motion-variant-protected prefixes in this string.
        // e.g. "motion-reduce:animate-none" protects the "animate-" prefix,
        // meaning "animate-spin" in the same class list is intentional.
        const protectedPrefixes = new Set<string>();
        for (const cls of classList) {
          for (const variant of MOTION_VARIANTS) {
            if (cls.startsWith(variant)) {
              const base = cls.slice(variant.length);
              for (const p of prefixes) {
                if (base.startsWith(p)) {
                  protectedPrefixes.add(p);
                  break;
                }
              }
            }
          }
        }

        for (const cls of classList) {
          // Skip if already has a motion variant prefix
          if (MOTION_VARIANTS.some((v) => cls.startsWith(v))) continue;

          // Skip safe/neutral classes
          if (SAFE_CLASSES.has(cls)) continue;

          // Strip responsive/state variants to get the base utility
          // e.g. "sm:hover:animate-spin" → check "animate-spin"
          const parts = cls.split(':');
          const baseUtility = parts[parts.length - 1];

          // Check if this is a motion class
          const matchedPrefix = prefixes.find((p) => baseUtility.startsWith(p));
          if (!matchedPrefix) continue;

          // Skip if a motion-safe/motion-reduce variant covers this prefix
          if (protectedPrefixes.has(matchedPrefix)) continue;

          // Skip safe base utilities
          if (SAFE_CLASSES.has(baseUtility)) continue;

          context.report({
            node: node as any,
            messageId: 'missingMotionSafe',
            data: { cls },
          });
        }
      } catch (err) {
        debugLog('prefers-reduced-motion', err);
      }
    });
  },
});
