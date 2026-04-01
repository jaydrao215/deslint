import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import { extractClassesFromString, parseClass } from '../utils/class-extractor.js';
import {
  toPxTypo,
  toMilliEm,
  findNearestFontSize,
  findNearestFontWeight,
  findNearestLeading,
  findNearestTracking,
} from '../utils/typography-map.js';
import { createClassVisitor } from '../utils/class-visitor.js';
import { debugLog } from '../utils/debug.js';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://vizlint.dev/docs/rules/${name}`
);

export type Options = [
  {
    allowlist?: string[];
    customScale?: {
      fontSize?: Record<string, number>;
      fontWeight?: Record<string, number>;
      leading?: Record<string, number>;
      tracking?: Record<string, number>;
    };
  },
];

export type MessageIds = 'arbitraryTypography' | 'suggestScale';

/**
 * text-[17px], text-[1.5rem]
 * font-[450] (weight only — no unit)
 * leading-[22px], leading-[1.4rem]
 * tracking-[0.05em], tracking-[-0.02em]
 */
const FONT_SIZE_PATTERN = /^(text)-\[(\d+(?:\.\d+)?(?:px|rem))\]$/;
const FONT_WEIGHT_PATTERN = /^(font)-\[(\d{3,4})\]$/;
const LEADING_PATTERN = /^(leading)-\[(\d+(?:\.\d+)?(?:px|rem))\]$/;
const TRACKING_PATTERN = /^(tracking)-\[(-?\d+(?:\.\d+)?em)\]$/;

export default createRule<Options, MessageIds>({
  name: 'no-arbitrary-typography',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow arbitrary typography values in Tailwind classes. Use the type scale instead.',
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
            description: 'Arbitrary typography classes to allow',
          },
          customScale: {
            type: 'object',
            properties: {
              fontSize: { type: 'object', additionalProperties: { type: 'number' } },
              fontWeight: { type: 'object', additionalProperties: { type: 'number' } },
              leading: { type: 'object', additionalProperties: { type: 'number' } },
              tracking: { type: 'object', additionalProperties: { type: 'number' } },
            },
            additionalProperties: false,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      arbitraryTypography:
        'Arbitrary typography `{{className}}` detected. Use the type scale instead.{{suggestion}}',
      suggestScale: 'Replace with `{{replacement}}`',
    },
  },
  defaultOptions: [{ allowlist: [], customScale: undefined }],
  create(context, [options]) {
    const allowlist = new Set(options.allowlist ?? []);
    const customScale = options.customScale ?? null;

    function findNearest(baseClass: string): string | null {
      let match: RegExpMatchArray | null;

      match = baseClass.match(FONT_SIZE_PATTERN);
      if (match) {
        const px = toPxTypo(match[2]);
        if (px === null) return null;
        if (customScale?.fontSize) {
          return findNearestInCustom(px, customScale.fontSize, 'text-');
        }
        return findNearestFontSize(px);
      }

      match = baseClass.match(FONT_WEIGHT_PATTERN);
      if (match) {
        const weight = parseInt(match[2], 10);
        if (customScale?.fontWeight) {
          return findNearestInCustom(weight, customScale.fontWeight, 'font-');
        }
        return findNearestFontWeight(weight);
      }

      match = baseClass.match(LEADING_PATTERN);
      if (match) {
        const px = toPxTypo(match[2]);
        if (px === null) return null;
        if (customScale?.leading) {
          return findNearestInCustom(px, customScale.leading, 'leading-');
        }
        return findNearestLeading(px);
      }

      match = baseClass.match(TRACKING_PATTERN);
      if (match) {
        const milliEm = toMilliEm(match[2]);
        if (milliEm === null) return null;
        if (customScale?.tracking) {
          return findNearestInCustomTrack(milliEm, customScale.tracking);
        }
        return findNearestTracking(milliEm);
      }

      return null;
    }

    function isArbitrary(baseClass: string): boolean {
      return (
        FONT_SIZE_PATTERN.test(baseClass) ||
        FONT_WEIGHT_PATTERN.test(baseClass) ||
        LEADING_PATTERN.test(baseClass) ||
        TRACKING_PATTERN.test(baseClass)
      );
    }

    function checkClassString(value: string, node: TSESTree.Node) {
      try {
        const classes = extractClassesFromString(value);

        for (const cls of classes) {
          if (allowlist.has(cls)) continue;

          const { baseClass, variants } = parseClass(cls);
          if (!isArbitrary(baseClass)) continue;

          const nearest = findNearest(baseClass);
          const fullReplacement = nearest ? [...variants, nearest].join(':') : null;
          const suggestion = fullReplacement ? ` Suggested: \`${fullReplacement}\`` : '';

          context.report({
            node,
            messageId: 'arbitraryTypography',
            data: { className: cls, suggestion },
            ...(fullReplacement
              ? {
                  fix(fixer) {
                    const src = context.sourceCode.getText(node);
                    return fixer.replaceText(node, src.replace(cls, fullReplacement));
                  },
                  suggest: [
                    {
                      messageId: 'suggestScale',
                      data: { replacement: fullReplacement },
                      fix(fixer) {
                        const src = context.sourceCode.getText(node);
                        return fixer.replaceText(node, src.replace(cls, fullReplacement));
                      },
                    },
                  ],
                }
              : {}),
          });
        }
      } catch (err) {
        debugLog('no-arbitrary-typography', err);
        return;
      }
    }

    return createClassVisitor(checkClassString);
  },
});

function findNearestInCustom(
  value: number,
  scale: Record<string, number>,
  prefix: string,
): string | null {
  let best: string | null = null;
  let bestDist = Infinity;
  for (const [name, val] of Object.entries(scale)) {
    const dist = Math.abs(val - value);
    if (dist < bestDist) {
      best = name;
      bestDist = dist;
    }
  }
  return best ? `${prefix}${best}` : null;
}

function findNearestInCustomTrack(
  milliEm: number,
  scale: Record<string, number>,
): string | null {
  let best: string | null = null;
  let bestDist = Infinity;
  for (const [name, val] of Object.entries(scale)) {
    const dist = Math.abs(val - milliEm);
    if (dist < bestDist) {
      best = name;
      bestDist = dist;
    }
  }
  return best ? `tracking-${best}` : null;
}
