import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import { extractClassesFromString, parseClass } from '../utils/class-extractor.js';
import { createClassVisitor } from '../utils/class-visitor.js';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://vizlint.dev/docs/rules/${name}`
);

export type Options = [
  {
    ignoredPrefixes?: string[];
    ignoredColors?: string[];
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

/**
 * Matches a bg-{color}-{shade} pattern.
 * E.g., bg-blue-500, bg-slate-100, bg-red-700
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
        'Flag components with background color classes that lack corresponding dark: variants. Auto-fixes by adding inverted shade.',
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
  defaultOptions: [{ ignoredPrefixes: [], ignoredColors: [] }],
  create(context, [options]) {
    const ignoredPrefixes = new Set(options.ignoredPrefixes ?? []);
    const ignoredColors = new Set(options.ignoredColors ?? []);

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

          context.report({
            node,
            messageId: 'missingDarkVariant',
            data: { className: cls, suggested },
            ...(darkInversion
              ? {
                  fix(fixer) {
                    const src = context.sourceCode.getText(node);
                    // Insert the dark variant right after the bg class
                    const replacement = src.replace(cls, `${cls} ${suggested}`);
                    return fixer.replaceText(node, replacement);
                  },
                  suggest: [
                    {
                      messageId: 'suggestDarkVariant',
                      data: { suggested },
                      fix(fixer) {
                        const src = context.sourceCode.getText(node);
                        const replacement = src.replace(cls, `${cls} ${suggested}`);
                        return fixer.replaceText(node, replacement);
                      },
                    },
                  ],
                }
              : {}),
          });
        }
      } catch {
        return;
      }
    }

    return createClassVisitor(checkClassString);
  },
});
