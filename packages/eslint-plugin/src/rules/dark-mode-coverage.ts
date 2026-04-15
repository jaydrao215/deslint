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
    ignoredPrefixes?: string[];
    ignoredColors?: string[];
    /**
     * When `true`, restores the legacy behaviour of automatically adding
     * `dark:bg-…` classes via `eslint --fix` / `deslint fix --all`.
     *
     * Default `false` (suggest-only). The autofix flips shades blindly — it has
     * no way to know whether the component is meant to be light-on-dark, uses
     * a semantic token system, or lives on a marketing page that never
     * participates in dark mode. Running it site-wide has produced real
     * visual regressions (white-on-white blocks, inverted brand colours,
     * unreadable text). Default suggest-only so IDE/interactive flows still
     * surface the fix per-occurrence with user review, but `--all` and
     * `--fix` leave the file untouched.
     */
    autofix?: boolean;
  },
];

export type MessageIds = 'missingDarkVariant' | 'suggestDarkVariant';

/**
 * Shade inversion map for auto-fix: light ↔ dark equivalents.
 * Per v1.1 spec: 50↔950, 100↔900, 200↔800, 300↔700, 400↔600, 500↔500
 */
const SHADE_INVERSION: Record<string, string> = {
  '50': '950',
  '100': '900',
  '200': '800',
  '300': '700',
  '400': '600',
  '500': '500',
  '600': '400',
  '700': '300',
  '800': '200',
  '900': '100',
  '950': '50',
};

/** Standard Tailwind color families (v3+v4). Custom tokens (surface, brand, etc.) are excluded. */
const TAILWIND_COLOR_FAMILIES = new Set([
  'slate', 'gray', 'zinc', 'neutral', 'stone',
  'red', 'orange', 'amber', 'yellow', 'lime',
  'green', 'emerald', 'teal', 'cyan', 'sky',
  'blue', 'indigo', 'violet', 'purple', 'fuchsia',
  'pink', 'rose',
]);

/**
 * Matches a bg-{color}-{shade} pattern where the color is a STANDARD Tailwind family.
 * E.g., bg-blue-500, bg-slate-100, bg-red-700
 * Skips custom tokens like bg-surface-50, bg-brand-500, bg-accent-500.
 */
const BG_COLOR_PATTERN = /^bg-([a-z]+)-(\d{2,3})$/;

/**
 * Named bg colors without shades: bg-white, bg-black, bg-transparent, bg-inherit, bg-current
 */
const BG_NAMED_INVERSIONS: Record<string, string> = {
  'bg-white': 'bg-gray-900',
  'bg-black': 'bg-gray-50',
};

/** Prefixes that indicate a background color class worth checking */
const BG_PREFIX = 'bg-';

/** Colors that should be skipped (non-visual or utility) */
const SKIP_SUFFIXES = new Set([
  'transparent', 'inherit', 'current', 'auto', 'none',
  'gradient-to-t', 'gradient-to-tr', 'gradient-to-r', 'gradient-to-br',
  'gradient-to-b', 'gradient-to-bl', 'gradient-to-l', 'gradient-to-tl',
  'linear-to-t', 'linear-to-tr', 'linear-to-r', 'linear-to-br',
  'linear-to-b', 'linear-to-bl', 'linear-to-l', 'linear-to-tl',
  'clip', 'fixed', 'local', 'scroll',
  'bottom', 'center', 'left', 'right', 'top',
  'repeat', 'no-repeat', 'cover', 'contain',
]);

/**
 * Get the dark mode inversion of a bg class.
 */
function getDarkInversion(bgClass: string): string | null {
  // Named inversions
  if (BG_NAMED_INVERSIONS[bgClass]) {
    return BG_NAMED_INVERSIONS[bgClass];
  }

  // Pattern: bg-{color}-{shade}
  const match = bgClass.match(BG_COLOR_PATTERN);
  if (!match) return null;

  const [, color, shade] = match;
  const invertedShade = SHADE_INVERSION[shade];
  if (!invertedShade) return null;

  return `bg-${color}-${invertedShade}`;
}

export default createRule<Options, MessageIds>({
  name: 'dark-mode-coverage',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Flag bg-* classes that lack a dark: variant. Suggests an inverted shade; autofix is opt-in via `autofix: true`.',
    },
    fixable: 'code',
    hasSuggestions: true,
    schema: [
      {
        type: 'object',
        properties: {
          ignoredPrefixes: {
            type: 'array',
            items: { type: 'string' },
            description: 'Class prefixes to ignore (e.g., ["bg-gradient"])',
          },
          ignoredColors: {
            type: 'array',
            items: { type: 'string' },
            description: 'Specific bg classes to ignore (e.g., ["bg-transparent"])',
          },
          autofix: {
            type: 'boolean',
            description:
              'Enable automatic insertion of dark: variants via --fix. Default false (suggest-only).',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      missingDarkVariant:
        '`{{className}}` has no `dark:` variant. Add `{{suggested}}` for dark mode support.',
      suggestDarkVariant: 'Add `{{suggested}}`',
    },
  },
  defaultOptions: [{ ignoredPrefixes: [], ignoredColors: [], autofix: false }],
  create(context, [options]) {
    const ignoredPrefixes = new Set(options.ignoredPrefixes ?? []);
    const ignoredColors = new Set(options.ignoredColors ?? []);
    const autofixEnabled = options.autofix === true;

    function checkClassString(value: string, node: TSESTree.Node) {
      try {
        const classes = extractClassesFromString(value);

        for (const cls of classes) {
          const { baseClass, variants } = parseClass(cls);

          // Skip if this is already a dark: variant
          if (variants.includes('dark')) continue;

          // Skip if it has responsive or state variants (only check base)
          if (variants.length > 0) continue;

          // Skip non-bg classes
          if (!baseClass.startsWith(BG_PREFIX)) continue;

          // Skip utility bg values (transparent, gradients, etc.)
          const suffix = baseClass.slice(BG_PREFIX.length);
          if (SKIP_SUFFIXES.has(suffix)) continue;

          // Skip arbitrary values: bg-[...] (gradients, CSS vars, complex expressions)
          if (suffix.startsWith('[')) continue;

          // Skip opacity modifiers: bg-accent-500/10, bg-white/78
          if (baseClass.includes('/')) continue;

          // Only flag standard Tailwind color patterns (bg-{color}-{shade}) with
          // a recognized Tailwind color family, and named inversions (bg-white, bg-black).
          // Skip custom tokens (bg-surface-50, bg-brand-500, bg-accent-500, etc.)
          // because these are CSS-variable-based and handle dark mode via theme switching.
          const colorMatch = baseClass.match(BG_COLOR_PATTERN);
          if (colorMatch) {
            if (!TAILWIND_COLOR_FAMILIES.has(colorMatch[1])) continue;
          } else if (!BG_NAMED_INVERSIONS[baseClass]) {
            continue;
          }

          // Skip ignored prefixes
          if ([...ignoredPrefixes].some((p) => baseClass.startsWith(p))) continue;

          // Skip ignored colors
          if (ignoredColors.has(baseClass)) continue;

          // Check if a dark: variant exists for any bg class
          const hasDarkVariant = classes.some((c) => {
            const parsed = parseClass(c);
            return parsed.variants.includes('dark') && parsed.baseClass.startsWith(BG_PREFIX);
          });

          if (hasDarkVariant) continue;

          // Get suggested dark inversion
          const darkInversion = getDarkInversion(baseClass);
          const suggested = darkInversion ? `dark:${darkInversion}` : `dark:${baseClass}`;

          // Shared fix body: replace the matched class with `${cls} ${suggested}`
          // inside the original attribute text. Used by both the top-level
          // autofix (only when `autofix: true`) and the suggestion path.
          const applyFix = (fixer: Parameters<NonNullable<Parameters<typeof context.report>[0]['fix']>>[0]) => {
            const src = safeGetText(context.sourceCode, node);
            const range = safeGetRange(context.sourceCode, node);
            if (!src || !range) return null;
            const replacement = src.replace(cls, `${cls} ${suggested}`);
            return fixer.replaceTextRange(range, replacement);
          };

          context.report({
            node,
            messageId: 'missingDarkVariant',
            data: { className: cls, suggested },
            ...(darkInversion
              ? {
                  // Top-level autofix is opt-in: adding dark: variants blindly
                  // across a codebase has caused real visual regressions
                  // (unreadable text, inverted brand colours, marketing pages
                  // flipped). Users who want site-wide inversion set
                  // `autofix: true`; everyone else still sees the IDE
                  // suggestion.
                  ...(autofixEnabled ? { fix: applyFix } : {}),
                  suggest: [
                    {
                      messageId: 'suggestDarkVariant',
                      data: { suggested },
                      fix: applyFix,
                    },
                  ],
                }
              : {}),
          });
        }
      } catch (err) {
        debugLog('dark-mode-coverage', err);
        return;
      }
    }

    return createClassVisitor(checkClassString);
  },
});
