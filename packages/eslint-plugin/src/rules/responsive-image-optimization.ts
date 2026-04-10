import { ESLintUtils } from '@typescript-eslint/utils';
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

export default createRule<Options, MessageIds>({
  name: 'responsive-image-optimization',
  meta: {
    type: 'suggestion',
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

          // 1. Check for loading attribute
          const loading = getAttribute(element, 'loading');
          if (!loading) {
            context.report({
              node: element.node as any,
              messageId: 'missingLoading',
            });
          }

          // 2. Check for width/height (CLS prevention)
          const width = getAttribute(element, 'width');
          const height = getAttribute(element, 'height');
          if (!width && !height) {
            context.report({
              node: element.node as any,
              messageId: 'missingWidthHeight',
            });
          }

          // 3. Check for srcset (responsive serving)
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
