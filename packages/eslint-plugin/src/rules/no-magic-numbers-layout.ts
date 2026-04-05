import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import { extractClassesFromString, parseClass, isValidV4Class } from '../utils/class-extractor.js';
import { createClassVisitor } from '../utils/class-visitor.js';
import { debugLog } from '../utils/debug.js';
import { safeGetText, safeGetRange } from '../utils/safe-source.js';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://vizlint.dev/docs/rules/${name}`
);

export type Options = [
  {
    allowlist?: string[];
    allowCssVariables?: boolean;
  },
];

export type MessageIds = 'magicNumber' | 'suggestScale';

/**
 * Spacing scale: px → Tailwind token.
 * Used for gap-[Npx] and basis-[Npx] conversions.
 */
const PX_TO_TAILWIND: Record<number, string> = {
  0: '0',
  1: 'px',
  2: '0.5',
  4: '1',
  5: '1.25',
  6: '1.5',
  7: '1.75',
  8: '2',
  10: '2.5',
  12: '3',
  14: '3.5',
  16: '4',
  20: '5',
  24: '6',
  28: '7',
  32: '8',
  36: '9',
  40: '10',
  44: '11',
  48: '12',
  56: '14',
  64: '16',
  80: '20',
  96: '24',
};

/**
 * Regex matching arbitrary layout classes.
 * Captures: (1) the layout prefix, (2) the bracket contents.
 *
 * Prefixes:
 *   grid-cols, grid-rows, col-span, row-span,
 *   basis, gap, gap-x, gap-y,
 *   order, grow, shrink
 */
const LAYOUT_ARBITRARY_PATTERN =
  /^(grid-cols|grid-rows|col-span|row-span|basis|gap-x|gap-y|gap|order|grow|shrink)-\[(.+)\]$/;

/** Check if a value is a CSS variable reference */
function isCssVariable(value: string): boolean {
  return /^var\(--/.test(value);
}

/** Parse a px value from a string like "16px", "0px", or "0.625rem" (converted to px). Returns null if not parseable. */
function parsePxValue(value: string): number | null {
  const pxMatch = value.match(/^(-?\d+(?:\.\d+)?)px$/);
  if (pxMatch) return parseFloat(pxMatch[1]);

  // Convert rem to px (1rem = 16px)
  const remMatch = value.match(/^(-?\d+(?:\.\d+)?)rem$/);
  if (remMatch) return parseFloat(remMatch[1]) * 16;

  return null;
}

/** Parse a plain integer from a string like "3" or "12". Returns null if not a plain integer. */
function parseIntValue(value: string): number | null {
  const match = value.match(/^(-?\d+)$/);
  if (!match) return null;
  return parseInt(match[1], 10);
}

/**
 * Try to find a scale replacement for a layout arbitrary value.
 * Returns { suggested: string (human-readable), replacement: string | null (fixable class) }.
 */
function resolveLayoutFix(
  prefix: string,
  rawValue: string,
): { suggested: string; replacement: string | null } {
  switch (prefix) {
    case 'grid-cols': {
      // Skip complex CSS Grid templates that have no Tailwind scale equivalent:
      // minmax(), repeat(), min(), max(), fractional (fr), auto, fit-content
      // Note: Tailwind uses _ as space separator, so 1fr_300px contains fr followed by _
      if (/(?:minmax|repeat|min|max|fit-content)\s*\(|fr(?:[^a-z]|$)|auto/.test(rawValue)) {
        return { suggested: '', replacement: null };
      }
      const n = parseIntValue(rawValue);
      if (n !== null && n >= 1 && n <= 12) {
        return {
          suggested: `grid-cols-{1-12}`,
          replacement: `grid-cols-${n}`,
        };
      }
      return { suggested: 'grid-cols-{1-12}', replacement: null };
    }

    case 'grid-rows': {
      // Skip complex CSS Grid templates (same as grid-cols)
      if (/(?:minmax|repeat|min|max|fit-content)\s*\(|fr(?:[^a-z]|$)|auto/.test(rawValue)) {
        return { suggested: '', replacement: null };
      }
      const n = parseIntValue(rawValue);
      if (n !== null && n >= 1 && n <= 12) {
        return {
          suggested: `grid-rows-{1-12}`,
          replacement: `grid-rows-${n}`,
        };
      }
      return { suggested: 'grid-rows-{1-12}', replacement: null };
    }

    case 'col-span': {
      const n = parseIntValue(rawValue);
      if (n !== null && n >= 1 && n <= 12) {
        return {
          suggested: `col-span-{1-12}`,
          replacement: `col-span-${n}`,
        };
      }
      return { suggested: 'col-span-{1-12}', replacement: null };
    }

    case 'row-span': {
      const n = parseIntValue(rawValue);
      if (n !== null && n >= 1 && n <= 6) {
        return {
          suggested: `row-span-{1-6}`,
          replacement: `row-span-${n}`,
        };
      }
      return { suggested: 'row-span-{1-6}', replacement: null };
    }

    case 'order': {
      const n = parseIntValue(rawValue);
      if (n !== null && n >= 1 && n <= 12) {
        return {
          suggested: `order-{1-12}, order-first, order-last, order-none`,
          replacement: `order-${n}`,
        };
      }
      return { suggested: 'order-{1-12}, order-first, order-last, order-none', replacement: null };
    }

    case 'grow': {
      const n = parseIntValue(rawValue);
      if (n === 0) {
        return { suggested: 'grow, grow-0', replacement: 'grow-0' };
      }
      if (n === 1) {
        return { suggested: 'grow, grow-0', replacement: 'grow' };
      }
      return { suggested: 'grow, grow-0', replacement: null };
    }

    case 'shrink': {
      const n = parseIntValue(rawValue);
      if (n === 0) {
        return { suggested: 'shrink, shrink-0', replacement: 'shrink-0' };
      }
      if (n === 1) {
        return { suggested: 'shrink, shrink-0', replacement: 'shrink' };
      }
      return { suggested: 'shrink, shrink-0', replacement: null };
    }

    case 'gap':
    case 'gap-x':
    case 'gap-y': {
      const px = parsePxValue(rawValue);
      if (px !== null && px in PX_TO_TAILWIND) {
        const token = PX_TO_TAILWIND[px];
        return {
          suggested: `${prefix}-{scale}`,
          replacement: `${prefix}-${token}`,
        };
      }
      return { suggested: `${prefix}-{scale}`, replacement: null };
    }

    case 'basis': {
      const px = parsePxValue(rawValue);
      if (px !== null && px in PX_TO_TAILWIND) {
        const token = PX_TO_TAILWIND[px];
        return {
          suggested: 'basis-{scale} (e.g., basis-1/2, basis-full, basis-auto)',
          replacement: `basis-${token}`,
        };
      }
      return { suggested: 'basis-{scale} (e.g., basis-1/2, basis-full, basis-auto)', replacement: null };
    }

    default:
      return { suggested: 'Tailwind scale value', replacement: null };
  }
}

export default createRule<Options, MessageIds>({
  name: 'no-magic-numbers-layout',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow arbitrary (bracket) values in grid/flex layout Tailwind classes. Use scale values instead.',
    },
    fixable: 'code',
    hasSuggestions: true,
    schema: [
      {
        type: 'object',
        properties: {
          allowlist: {
            type: 'array',
            items: { type: 'string' },
            description:
              'Arbitrary layout patterns to allow (e.g., ["grid-cols-[14]"] for non-standard grids)',
          },
          allowCssVariables: {
            type: 'boolean',
            description:
              'When true (default), do not flag bracket values containing CSS variables like [var(--spacing)]',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      magicNumber:
        'Arbitrary layout value `{{className}}` detected. Use Tailwind scale value `{{suggested}}` instead.',
      suggestScale: 'Replace with `{{replacement}}`',
    },
  },
  defaultOptions: [{ allowlist: [], allowCssVariables: true }],
  create(context, [options]) {
    const allowlist = new Set(options.allowlist ?? []);
    const allowCssVariables = options.allowCssVariables ?? true;

    function reportViolation(
      node: TSESTree.Node,
      cls: string,
      suggested: string,
      fullReplacement: string | null,
    ) {
      context.report({
        node,
        messageId: 'magicNumber',
        data: { className: cls, suggested },
        ...(fullReplacement
          ? {
              fix(fixer) {
                const src = safeGetText(context.sourceCode, node);
                const range = safeGetRange(context.sourceCode, node);
                if (!src || !range) return null;
                return fixer.replaceTextRange(range, src.replace(cls, fullReplacement));
              },
              suggest: [
                {
                  messageId: 'suggestScale',
                  data: { replacement: fullReplacement },
                  fix(fixer) {
                    const src = safeGetText(context.sourceCode, node);
                    const range = safeGetRange(context.sourceCode, node);
                    if (!src || !range) return null;
                    return fixer.replaceTextRange(range, src.replace(cls, fullReplacement));
                  },
                },
              ],
            }
          : {}),
      });
    }

    function checkClassString(value: string, node: TSESTree.Node) {
      try {
        const classes = extractClassesFromString(value);

        for (const cls of classes) {
          if (isValidV4Class(cls)) continue;
          if (allowlist.has(cls)) continue;

          const { baseClass, variants } = parseClass(cls);

          // Also check allowlist against baseClass (without variants)
          if (allowlist.has(baseClass)) continue;

          const match = baseClass.match(LAYOUT_ARBITRARY_PATTERN);
          if (!match) continue;

          const prefix = match[1];
          const rawValue = match[2];

          // Skip CSS variable values if allowed
          if (allowCssVariables && isCssVariable(rawValue)) continue;

          const { suggested, replacement } = resolveLayoutFix(prefix, rawValue);

          // Skip complex patterns that have no scale equivalent (empty suggested)
          if (!suggested) continue;

          const fullReplacement = replacement
            ? [...variants, replacement].join(':')
            : null;

          reportViolation(node, cls, suggested, fullReplacement);
        }
      } catch (err) {
        debugLog('no-magic-numbers-layout', err);
        return;
      }
    }

    return createClassVisitor(checkClassString);
  },
});
