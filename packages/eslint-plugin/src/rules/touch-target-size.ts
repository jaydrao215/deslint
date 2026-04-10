import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import { debugLog } from '../utils/debug.js';
import {
  createElementVisitor,
  getStaticAttributeValue,
} from '../utils/element-visitor.js';
import { createClassVisitor } from '../utils/class-visitor.js';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://deslint.com/docs/rules/${name}`
);

export type Options = [
  {
    /** Minimum target size in Tailwind units (default: 6 = 24px). */
    minSize?: number;
  },
];

export type MessageIds = 'tooSmall' | 'fixedTooSmall';

/** Interactive HTML elements that should meet touch target requirements. */
const INTERACTIVE_TAGS = new Set([
  'button',
  'a',
  'input',
  'select',
  'textarea',
  'summary',
]);

/**
 * Map Tailwind size classes to their numeric unit value.
 * Tailwind uses a 4px base: w-6 = 24px, w-8 = 32px, etc.
 */
function parseTailwindSize(cls: string): number | null {
  // Match patterns like w-6, h-6, min-w-6, min-h-6, p-2, px-3, py-3, size-6
  const match = cls.match(
    /^(?:w|h|min-w|min-h|size)-(\d+(?:\.\d+)?|\[.+\])$/,
  );
  if (!match) return null;

  const val = match[1];
  // Arbitrary value like w-[24px]
  if (val.startsWith('[')) {
    const px = val.match(/^\[(\d+)px\]$/);
    if (px) return parseFloat(px[1]) / 4; // Convert px to Tailwind units
    return null;
  }

  return parseFloat(val);
}

/**
 * Check if a set of classes provides adequate padding that would make the
 * touch target large enough. p-2 = 8px padding on each side = 16px total
 * per axis, which combined with content makes most elements > 24px.
 */
function hasSufficientPadding(classes: string[]): boolean {
  for (const cls of classes) {
    // p-3 = 12px on each side = 24px minimum per axis
    const pMatch = cls.match(/^p[xy]?-(\d+(?:\.\d+)?)$/);
    if (pMatch && parseFloat(pMatch[1]) >= 3) return true;

    // p-3 (all sides)
    const pAllMatch = cls.match(/^p-(\d+(?:\.\d+)?)$/);
    if (pAllMatch && parseFloat(pAllMatch[1]) >= 3) return true;
  }
  return false;
}

export default createRule<Options, MessageIds>({
  name: 'touch-target-size',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Flag interactive elements with explicit dimensions smaller than 24x24px (WCAG 2.5.8 Target Size Minimum). AI-generated code often creates small icon buttons without adequate touch targets.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          minSize: {
            type: 'number',
            description:
              'Minimum size in Tailwind units (default: 6 = 24px, WCAG 2.5.8 minimum)',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      tooSmall:
        '`<{{element}}>` has a touch target smaller than {{minPx}}px. Add `min-w-{{minTw}} min-h-{{minTw}}` for WCAG 2.5.8 compliance.',
      fixedTooSmall:
        '`<{{element}}>` has fixed dimensions ({{width}}x{{height}}) below {{minPx}}px minimum. Increase to at least {{minTw}} ({{minPx}}px).',
    },
  },
  defaultOptions: [
    {
      minSize: 6, // 24px = WCAG 2.5.8 Target Size (Minimum)
    },
  ],
  create(context, [options]) {
    const minSize = options.minSize ?? 6;
    const minPx = minSize * 4;
    const minTw = String(minSize);

    // Track elements and their class strings for cross-referencing
    const elementClasses = new Map<unknown, string[]>();

    // Use the class visitor to collect classes per node
    const classVisitor = createClassVisitor((classString, node) => {
      try {
        const classes = classString.split(/\s+/).filter(Boolean);
        const existing = elementClasses.get(node) ?? [];
        elementClasses.set(node, [...existing, ...classes]);
      } catch (err) {
        debugLog('touch-target-size-class', err);
      }
    });

    // Use the element visitor to check interactive elements
    const elementVisitor = createElementVisitor({
      tagNames: [...INTERACTIVE_TAGS],
      check(element) {
        try {
          // Spread attributes → benefit of the doubt
          if (element.hasSpread) return;

          // Collect all Tailwind classes from class/className
          const classAttr =
            getStaticAttributeValue(element, 'class') ??
            getStaticAttributeValue(element, 'className');

          if (!classAttr) return; // No explicit sizing = browser default (usually OK)

          const classes = classAttr.split(/\s+/).filter(Boolean);

          // Skip if sufficient padding is present
          if (hasSufficientPadding(classes)) return;

          // Check for explicit width/height classes that are too small
          let width: number | null = null;
          let height: number | null = null;

          for (const cls of classes) {
            // size-N sets both width and height
            if (cls.startsWith('size-')) {
              const sz = parseTailwindSize(cls);
              if (sz !== null) {
                width = sz;
                height = sz;
              }
              continue;
            }
            if (cls.startsWith('w-') || cls.startsWith('min-w-')) {
              const w = parseTailwindSize(cls);
              if (w !== null) width = w;
            }
            if (cls.startsWith('h-') || cls.startsWith('min-h-')) {
              const h = parseTailwindSize(cls);
              if (h !== null) height = h;
            }
          }

          // Only report if explicit small dimensions are set
          // (no dimension = browser default, which is usually adequate)
          if (width === null && height === null) return;

          const widthTooSmall = width !== null && width < minSize;
          const heightTooSmall = height !== null && height < minSize;

          if (!widthTooSmall && !heightTooSmall) return;

          const widthStr = width !== null ? `${width * 4}px` : 'auto';
          const heightStr = height !== null ? `${height * 4}px` : 'auto';

          context.report({
            node: element.node as TSESTree.Node,
            messageId: 'fixedTooSmall',
            data: {
              element: element.tagName,
              width: widthStr,
              height: heightStr,
              minPx: String(minPx),
              minTw: minTw,
            },
          });
        } catch (err) {
          debugLog('touch-target-size', err);
        }
      },
    });

    // Merge both visitors
    return { ...classVisitor, ...elementVisitor };
  },
});
