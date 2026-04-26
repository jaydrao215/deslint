import { ESLintUtils } from '@typescript-eslint/utils';
import { createClassVisitor } from '../utils/class-visitor.js';
import { safeGetText, safeGetRange } from '../utils/safe-source.js';
import { debugLog } from '../utils/debug.js';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://deslint.com/docs/rules/${name}`
);

export type Options = [
  {
    /** Additional class prefixes to treat as motion (e.g. project-specific
     *  utilities). Joined with the default motion set. */
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
    /**
     * When `true`, also flag `transition-*` utilities that animate
     * non-motion properties (color, shadow, opacity, background). Off by
     * default: WCAG 2.3.3 scopes to motion, and color/shadow/opacity
     * transitions do not trigger vestibular symptoms. Enable on projects
     * that want the stricter interpretation.
     */
    strictTransitions?: boolean;
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
 * Transitions that are genuinely motion: they animate layout/position.
 * Color/shadow/opacity transitions don't trigger vestibular symptoms and
 * are deliberately left off this list (see `strictTransitions` to opt in).
 */
const MOTION_TRANSITION_BASES = new Set<string>([
  'transition',
  'transition-all',
  'transition-transform',
]);

/**
 * Under `strictTransitions: true`, these also count as motion so the
 * rule matches the pre-0.7 behavior for projects that want it.
 */
const STRICT_TRANSITION_BASES = new Set<string>([
  'transition-colors',
  'transition-shadow',
  'transition-opacity',
  'transition-background',
]);

/**
 * Timing / easing utilities. These are no-ops unless paired with a motion
 * class on the same element — Tailwind ignores a `duration-*` that has
 * no corresponding `transition-*` or `animate-*`. We only report them
 * alongside a real motion class so we don't fire on orphan modifiers.
 */
const MODIFIER_PREFIXES = ['duration-', 'ease-', 'delay-'];

/** Static classes that are safe to use without motion wrapping. */
const SAFE_CLASSES = new Set<string>([
  'animate-none',
  'transition-none',
  'duration-0',
]);

/** Variant prefixes that indicate the class already respects motion prefs. */
const MOTION_VARIANTS = ['motion-safe:', 'motion-reduce:'];

interface Classified {
  original: string;
  base: string;
  protectedByVariant: boolean;
  kind: 'motion' | 'modifier' | 'ignored';
}

export default createRule<Options, MessageIds>({
  name: 'prefers-reduced-motion',
  meta: {
    type: 'suggestion',
    fixable: 'code',
    docs: {
      description:
        'Require animation / motion-transition classes to be wrapped with motion-safe: or motion-reduce: variants for users with vestibular disorders (WCAG 2.3.3).',
    },
    messages: {
      missingMotionSafe:
        '`{{ classes }}` animates without respecting prefers-reduced-motion. Wrap with `motion-safe:` or add a `motion-reduce:` override. ~15% of users have motion sensitivity (WCAG 2.3.3).',
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
          strictTransitions: {
            type: 'boolean',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{}],
  create(context) {
    const options = context.options[0] ?? {};
    const additionalPrefixes = options.additionalPrefixes ?? [];
    const exemptClasses = new Set(options.exemptClasses ?? DEFAULT_EXEMPT_CLASSES);
    const strictTransitions = options.strictTransitions === true;

    return createClassVisitor((classes, node) => {
      try {
        const classList = classes.split(/\s+/).filter(Boolean);
        if (classList.length === 0) return;

        const classified: Classified[] = classList.map((original) => {
          const segments = original.split(':');
          const base = segments[segments.length - 1];
          const protectedByVariant = MOTION_VARIANTS.some((v) =>
            original.startsWith(v),
          );

          if (SAFE_CLASSES.has(base)) {
            return { original, base, protectedByVariant, kind: 'ignored' };
          }
          if (exemptClasses.has(base)) {
            return { original, base, protectedByVariant, kind: 'ignored' };
          }

          const isAnimate = base.startsWith('animate-');
          const isMotionTransition =
            MOTION_TRANSITION_BASES.has(base) ||
            (strictTransitions && STRICT_TRANSITION_BASES.has(base));
          const isAdditional = additionalPrefixes.some((p) => base.startsWith(p));

          if (isAnimate || isMotionTransition || isAdditional) {
            return { original, base, protectedByVariant, kind: 'motion' };
          }

          if (MODIFIER_PREFIXES.some((p) => base.startsWith(p))) {
            return { original, base, protectedByVariant, kind: 'modifier' };
          }

          return { original, base, protectedByVariant, kind: 'ignored' };
        });

        const unprotectedMotion = classified.filter(
          (c) => c.kind === 'motion' && !c.protectedByVariant,
        );

        // Modifiers (`duration-*`, `ease-*`, `delay-*`) are no-ops on
        // their own — they only affect a motion class on the same
        // element. Only flag them when at least one unprotected motion
        // class is present; otherwise we'd be chasing orphan utilities
        // the reviewer can't meaningfully fix.
        const unprotectedModifiers =
          unprotectedMotion.length > 0
            ? classified.filter(
                (c) => c.kind === 'modifier' && !c.protectedByVariant,
              )
            : [];

        const toWrap = [...unprotectedMotion, ...unprotectedModifiers];
        if (toWrap.length === 0) return;

        context.report({
          node: node as any,
          messageId: 'missingMotionSafe',
          data: { classes: toWrap.map((c) => c.original).join(' ') },
          fix(fixer) {
            const src = safeGetText(context.sourceCode, node);
            const range = safeGetRange(context.sourceCode, node);
            if (!src || !range) return null;

            // Replace longest token first so `transition` doesn't
            // shadow `transition-all`.
            const sorted = [...toWrap].sort(
              (a, b) => b.original.length - a.original.length,
            );
            let out = src;
            for (const c of sorted) {
              out = out.replace(c.original, `motion-safe:${c.original}`);
            }
            if (out === src) return null;
            return fixer.replaceTextRange(range, out);
          },
        });
      } catch (err) {
        debugLog('prefers-reduced-motion', err);
      }
    });
  },
});
