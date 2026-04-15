import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import { debugLog } from '../utils/debug.js';
import {
  createElementVisitor,
  getAttribute,
  getStaticAttributeValue,
} from '../utils/element-visitor.js';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://deslint.com/docs/rules/${name}`
);

export type Options = [
  {
    /** Skip images smaller than this width threshold (px). Default: 40. */
    minWidth?: number;
    /** Next.js Image component names to recognize. */
    nextImageComponents?: string[];
  },
];

export type MessageIds =
  | 'missingLoading'
  | 'missingAspectRatio'
  | 'missingWidthHeight'
  | 'missingSrcset';

/**
 * Detect images missing performance and layout-stability attributes.
 *
 * - `loading="lazy"` prevents offscreen images from blocking page load
 * - `width`/`height` or aspect-ratio prevents Cumulative Layout Shift (CLS)
 * - `srcset`/`sizes` enables responsive image serving
 *
 * Next.js `<Image>` and other framework image components handle these
 * automatically and are excluded.
 */

const IMAGE_TAGS = new Set(['img']);

/** Next.js and common framework image components that handle optimization. */
const DEFAULT_OPTIMIZED_COMPONENTS = new Set([
  'Image',        // Next.js, Astro
  'StaticImage',  // Gatsby
  'NuxtImg',      // Nuxt
  'NuxtPicture',  // Nuxt
]);

/** Insert a JSX attribute after the tag name. */
function makeJsxInsertFix(element: any, attrText: string) {
  if (element.framework !== 'jsx') return undefined;
  return (fixer: any) => {
    const jsxNode = element.node as TSESTree.JSXOpeningElement;
    const tagEnd = jsxNode.name.range[1];
    return fixer.insertTextAfterRange([tagEnd, tagEnd], ` ${attrText}`);
  };
}

export default createRule<Options, MessageIds>({
  name: 'responsive-image-optimization',
  meta: {
    type: 'suggestion',
    fixable: 'code',
    docs: {
      description:
        'Require loading, width/height, and srcset attributes on <img> elements for performance and layout stability. Skips framework image components that handle optimization automatically.',
    },
    messages: {
      missingLoading:
        '`<img>` is missing `loading` attribute. Add `loading="lazy"` for offscreen images or `loading="eager"` for above-the-fold hero images to improve page load performance.',
      missingAspectRatio:
        '`<img>` is missing `width` and `height` attributes. Without explicit dimensions, the browser cannot reserve space before the image loads, causing Cumulative Layout Shift (CLS).',
      missingWidthHeight:
        '`<img>` is missing both `width`/`height` and an aspect-ratio class. Add explicit dimensions to prevent layout shift.',
      missingSrcset:
        '`<img>` is missing `srcset` attribute. Add `srcset` with multiple resolutions so browsers can serve the optimal size for each viewport.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          minWidth: { type: 'number' },
          nextImageComponents: {
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
    const optimizedComponents = new Set([
      ...DEFAULT_OPTIMIZED_COMPONENTS,
      ...(options.nextImageComponents ?? []),
    ]);

    return createElementVisitor({
      check(element) {
        try {
          const tag = element.tagName;
          const tagLower = tag.toLowerCase();

          // Skip framework image components that handle optimization
          if (optimizedComponents.has(tag)) return;

          // Only check <img> elements
          if (!IMAGE_TAGS.has(tagLower)) return;

          // Skip if element has spread (could contain all needed attrs)
          if (element.hasSpread) return;

          // Skip decorative images (they're empty on purpose)
          const role = getStaticAttributeValue(element, 'role');
          if (role === 'presentation' || role === 'none') return;
          const ariaHidden = getStaticAttributeValue(element, 'aria-hidden');
          if (ariaHidden === 'true') return;

          // Skip SVG data URIs and tiny inline images
          const src = getStaticAttributeValue(element, 'src');
          if (src?.startsWith('data:')) return;

          // ── Is this an above-the-fold / LCP-critical image? ──
          // If so, we must NOT auto-insert `loading="lazy"` — doing so
          // delays LCP and regresses Core Web Vitals (the exact opposite
          // of what this rule is for). We still report missing
          // width/height/srcset because those prevent CLS regardless of
          // priority.
          //
          //   fetchpriority="high"  — native HTML attribute (Chromium 101+)
          //   priority / priority={true} — Next.js <Image> boolean, also
          //                                common pass-through on wrappers
          //   loading="eager"       — author has already opted out of lazy
          //   data-priority         — custom marker seen in the wild
          const fetchPriority = getStaticAttributeValue(element, 'fetchpriority');
          const loadingValue = getStaticAttributeValue(element, 'loading');
          const isHighPriority =
            fetchPriority === 'high' ||
            loadingValue === 'eager' ||
            getAttribute(element, 'priority') !== null ||
            getAttribute(element, 'data-priority') !== null;

          // 1. Check for loading attribute — auto-fixable (loading="lazy")
          //
          // Skip entirely when the image is high-priority; also skip if the
          // `loading` attribute exists but has a non-static value
          // (`loading={isAboveFold ? 'eager' : 'lazy'}`) — inserting a
          // second `loading="lazy"` would produce duplicate attributes.
          const loadingAttr = getAttribute(element, 'loading');
          if (!loadingAttr && !isHighPriority) {
            context.report({
              node: element.node as any,
              messageId: 'missingLoading',
              fix: makeJsxInsertFix(element, 'loading="lazy"'),
            });
          }

          // 2. Check for width/height (CLS prevention) — not auto-fixable
          const width = getAttribute(element, 'width');
          const height = getAttribute(element, 'height');
          if (!width && !height) {
            context.report({
              node: element.node as any,
              messageId: 'missingWidthHeight',
            });
          }

          // 3. Check for srcset (responsive serving) — not auto-fixable
          const srcset = getAttribute(element, 'srcset');
          if (!srcset && src && !src.endsWith('.svg')) {
            context.report({
              node: element.node as any,
              messageId: 'missingSrcset',
            });
          }
        } catch (err) {
          debugLog('responsive-image-optimization', err);
        }
      },
    });
  },
});
