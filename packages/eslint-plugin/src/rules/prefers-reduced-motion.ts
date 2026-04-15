import { ESLintUtils } from '@typescript-eslint/utils';
import { createClassVisitor } from '../utils/class-visitor.js';
import { safeGetText, safeGetRange } from '../utils/safe-source.js';
import { debugLog } from '../utils/debug.js';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://deslint.com/docs/rules/${name}`
);

export type Options = [
  {
    /** Additional class prefixes to check beyond animate/transition. */
    additionalPrefixes?: string[];
    /**
     * Classes that carry meaning through motion and should be exempt from
     * the rule — wrapping them with `motion-safe:` turns the animation off
     * for users with reduced-motion, which also turns off the signal.
     * `animate-spin` is the canonical loading indicator in React apps; if a
     * spinner stops spinning the user has no idea whether the page is still
     * loading. `animate-ping` is the same story for notification pulses.
     * Users who want to override can pass `exemptClasses: []`.
     */
    exemptClasses?: string[];
  },
];

export type MessageIds = 'missingMotionSafe';

/**
 * Motion classes where the animation IS the information. Wrapping these in
 * `motion-safe:` silently degrades UX (silent spinner, static "new" badge).
 * Kept as a default opt-out; users can override via the `exemptClasses`
 * option or configure strict enforcement project-wide.
 */
const DEFAULT_EXEMPT_CLASSES = ['animate-spin', 'animate-ping'];

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
    fixable: 'code',
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
          exemptClasses: {
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
    const exemptClasses = new Set(options.exemptClasses ?? DEFAULT_EXEMPT_CLASSES);

    return createClassVisitor((classes, node) => {
      try {
        const classList = classes.split(/\s+/).filter(Boolean);

        // Build set of motion-variant-protected prefixes in this string.
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
          const parts = cls.split(':');
          const baseUtility = parts[parts.length - 1];

          // Skip classes where the motion carries meaning (loading spinners,
          // notification pings). Silencing them for reduced-motion users
          // would silence the signal, not just the decoration.
          if (exemptClasses.has(baseUtility)) continue;

          // Check if this is a motion class
          const matchedPrefix = prefixes.find((p) => baseUtility.startsWith(p));
          if (!matchedPrefix) continue;

          // Skip if a motion-safe/motion-reduce variant covers this prefix
          if (protectedPrefixes.has(matchedPrefix)) continue;

          // Skip safe base utilities
          if (SAFE_CLASSES.has(baseUtility)) continue;

          const replacement = `motion-safe:${cls}`;

          context.report({
            node: node as any,
            messageId: 'missingMotionSafe',
            data: { cls },
            fix(fixer) {
              const src = safeGetText(context.sourceCode, node);
              const range = safeGetRange(context.sourceCode, node);
              if (!src || !range) return null;
              return fixer.replaceTextRange(range, src.replace(cls, replacement));
            },
          });
        }
      } catch (err) {
        debugLog('prefers-reduced-motion', err);
      }
    });
  },
});
