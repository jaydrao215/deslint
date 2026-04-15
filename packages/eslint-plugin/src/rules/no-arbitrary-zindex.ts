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
    allowlist?: number[];
  },
];

export type MessageIds = 'arbitraryZIndex' | 'arbitraryZIndexNoFix' | 'suggestScale';

/**
 * Tailwind default z-index scale values.
 */
const Z_INDEX_SCALE: Record<string, number> = {
  '0': 0,
  '10': 10,
  '20': 20,
  '30': 30,
  '40': 40,
  '50': 50,
};

/** Also handle z-auto (valid, not arbitrary) */
const VALID_Z_CLASSES = new Set([
  'z-0', 'z-10', 'z-20', 'z-30', 'z-40', 'z-50', 'z-auto',
]);

/**
 * Matches z-[N] arbitrary z-index values.
 */
const Z_ARBITRARY_PATTERN = /^z-\[(-?\d+)\]$/;

/**
 * Values above this threshold are assumed to be intentional portal/overlay
 * escape-hatches (modals, toasts, tooltips, command palettes). We still
 * report them so the user can choose to move them into `allowlist`, but we
 * REFUSE to autofix: silently rewriting `z-[9999]` to `z-50` drops modal
 * backdrops below sticky headers, fixed nav, and react-hot-toast, producing
 * invisible click-throughs. The old rule did exactly this — we no longer do.
 */
const AUTOFIX_UPPER_BOUND = 60;

/**
 * Default allowlist of well-known "always on top" z-index values used by
 * popular libraries (react-hot-toast, Radix portal, Headless UI Dialog,
 * MUI modals, sonner, cmdk). These are intentional and we should not even
 * report them in the default config.
 */
const DEFAULT_PORTAL_ALLOWLIST = [999, 1000, 9999];

/**
 * Find the nearest z-index scale value.
 */
function findNearestZIndex(value: number): { key: string; scaleValue: number } | null {
  let nearest: string | null = null;
  let minDist = Infinity;

  for (const [key, scaleVal] of Object.entries(Z_INDEX_SCALE)) {
    const dist = Math.abs(value - scaleVal);
    if (dist < minDist || (dist === minDist && scaleVal < Z_INDEX_SCALE[nearest!])) {
      minDist = dist;
      nearest = key;
    }
  }

  if (nearest !== null) {
    return { key: nearest, scaleValue: Z_INDEX_SCALE[nearest] };
  }
  return null;
}

export default createRule<Options, MessageIds>({
  name: 'no-arbitrary-zindex',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow arbitrary z-index values like z-[999]. Use Tailwind scale values (z-10, z-20, z-30, z-40, z-50) instead.',
    },
    fixable: 'code',
    hasSuggestions: true,
    schema: [
      {
        type: 'object',
        properties: {
          allowlist: {
            type: 'array',
            items: { type: 'number' },
            description: 'Z-index values to allow (e.g., [9999] for modals)',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      arbitraryZIndex:
        'Arbitrary z-index `{{className}}` detected. Use scale value `{{suggested}}` instead.',
      arbitraryZIndexNoFix:
        'Arbitrary z-index `{{className}}` looks intentional (portal/modal value). If correct, add {{zValue}} to `allowlist`; otherwise replace with a scale value manually.',
      suggestScale: 'Replace with `{{suggested}}`',
    },
  },
  defaultOptions: [{ allowlist: [] }],
  create(context, [options]) {
    // Merge user's allowlist with the default portal values so common modal
    // z-indexes (9999 et al.) aren't reported out of the box.
    const allowlist = new Set<number>([
      ...DEFAULT_PORTAL_ALLOWLIST,
      ...(options.allowlist ?? []),
    ]);

    function checkClassString(value: string, node: TSESTree.Node) {
      try {
        const classes = extractClassesFromString(value);

        for (const cls of classes) {
          const { baseClass, variants } = parseClass(cls);

          // Skip standard z-index classes
          if (VALID_Z_CLASSES.has(baseClass)) continue;

          const match = baseClass.match(Z_ARBITRARY_PATTERN);
          if (!match) continue;

          const zValue = parseInt(match[1], 10);

          // Skip allowlisted values (including defaults for portals)
          if (allowlist.has(zValue)) continue;

          const nearest = findNearestZIndex(zValue);
          const suggestedBase = nearest ? `z-${nearest.key}` : 'z-50';
          const suggested = variants.length > 0
            ? [...variants, suggestedBase].join(':')
            : suggestedBase;

          // Shared fix body.
          const applyFix = (fixer: Parameters<NonNullable<Parameters<typeof context.report>[0]['fix']>>[0]) => {
            const src = safeGetText(context.sourceCode, node);
            const range = safeGetRange(context.sourceCode, node);
            if (!src || !range) return null;
            return fixer.replaceTextRange(range, src.replace(cls, suggested));
          };

          // If the declared value is clearly off-scale (e.g. typoed z-[55],
          // z-[5]), clamping to the nearest Tailwind value is usually safe.
          // If it's clearly an escape hatch (z-[9999], z-[200]), clamping
          // to z-50 wrecks modal/backdrop layering. Report-only in that case.
          const safeToAutofix = Math.abs(zValue) <= AUTOFIX_UPPER_BOUND;

          if (safeToAutofix) {
            context.report({
              node,
              messageId: 'arbitraryZIndex',
              data: { className: cls, suggested },
              fix: applyFix,
              suggest: [
                {
                  messageId: 'suggestScale',
                  data: { suggested },
                  fix: applyFix,
                },
              ],
            });
          } else {
            // No top-level fix: this is almost certainly a portal/overlay
            // value and silently clamping to z-50 hides modals behind sticky
            // headers. Keep the suggestion for users who want to accept.
            context.report({
              node,
              messageId: 'arbitraryZIndexNoFix',
              data: { className: cls, suggested, zValue: String(zValue) },
              suggest: [
                {
                  messageId: 'suggestScale',
                  data: { suggested },
                  fix: applyFix,
                },
              ],
            });
          }
        }
      } catch (err) {
        debugLog('no-arbitrary-zindex', err);
        return;
      }
    }

    return createClassVisitor(checkClassString);
  },
});
