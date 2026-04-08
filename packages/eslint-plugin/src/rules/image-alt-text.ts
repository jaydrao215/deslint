import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import { debugLog } from '../utils/debug.js';
import {
  createElementVisitor,
  getAttribute,
  getStaticAttributeValue,
  type NormalizedElement,
} from '../utils/element-visitor.js';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://deslint.com/docs/rules/${name}`
);

export type Options = [
  {
    checkNextImage?: boolean;
    meaninglessPatterns?: string[];
  },
];

export type MessageIds = 'missingAlt' | 'emptyAlt' | 'meaninglessAlt';

/** Default meaningless alt text patterns (exact match, case-insensitive) */
const DEFAULT_MEANINGLESS_PATTERNS = [
  'image',
  'photo',
  'picture',
  'icon',
  'logo',
  'placeholder',
  'untitled',
  'screenshot',
  'img',
];

/**
 * Check if the element is decorative (role="presentation"/"none" or
 * aria-hidden). Works across all frameworks via NormalizedElement.
 */
function isDecorativeImage(element: NormalizedElement): boolean {
  const role = getStaticAttributeValue(element, 'role');
  if (role === 'presentation' || role === 'none') return true;

  const ariaHidden = getAttribute(element, 'aria-hidden');
  if (ariaHidden) {
    // "true", or value-less boolean attribute (normalized to empty string)
    if (ariaHidden.value === 'true' || ariaHidden.value === '') return true;
  }

  return false;
}

/**
 * Check if alt text is meaningless (exact match, case-insensitive).
 */
function isMeaninglessAlt(altText: string, patterns: string[]): boolean {
  const trimmed = altText.trim().toLowerCase();
  return patterns.some((pattern) => trimmed === pattern.toLowerCase());
}

export default createRule<Options, MessageIds>({
  name: 'image-alt-text',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Require meaningful alt text on <img> elements. AI-generated code frequently omits alt text, harming accessibility.',
    },
    hasSuggestions: true,
    schema: [
      {
        type: 'object',
        properties: {
          checkNextImage: {
            type: 'boolean',
            description:
              'Also check Next.js <Image> components (default: true)',
          },
          meaninglessPatterns: {
            type: 'array',
            items: { type: 'string' },
            description:
              'Alt text values considered meaningless (exact match, case-insensitive)',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      missingAlt:
        '`<{{element}}>` is missing an `alt` attribute. Add descriptive alt text for accessibility.',
      emptyAlt:
        '`<{{element}}>` has an empty `alt` attribute. Add descriptive text, or add `role="presentation"` if decorative.',
      meaninglessAlt:
        '`<{{element}}>` has meaningless alt text "{{alt}}". Use text that describes the image content.',
    },
  },
  defaultOptions: [
    {
      checkNextImage: true,
      meaninglessPatterns: undefined,
    },
  ],
  create(context, [options]) {
    const checkNextImage = options.checkNextImage ?? true;
    const meaninglessPatterns =
      options.meaninglessPatterns ?? DEFAULT_MEANINGLESS_PATTERNS;

    // Tag filter: always check <img>, optionally Next.js <Image>.
    // Note: element-visitor compares case-insensitively, but Next.js
    // <Image> is a JSX component, so it arrives as 'Image' on the element.
    const tagNames = checkNextImage ? ['img', 'Image'] : ['img'];

    return createElementVisitor({
      tagNames,
      check(element) {
        try {
          // Spread attributes — give benefit of the doubt (could contain alt)
          if (element.hasSpread) return;

          // Next.js <Image> filter: the case-insensitive tag filter would
          // accept a lowercase 'image' in HTML/Vue/Angular templates too,
          // but those don't have a Next.js Image component. Guard with a
          // framework check so we only treat `Image` as Next.js in JSX.
          if (
            element.tagName === 'Image' &&
            element.framework !== 'jsx'
          ) {
            return;
          }

          const altAttr = getAttribute(element, 'alt');

          // Missing alt attribute entirely → report
          if (!altAttr) {
            context.report({
              node: element.node as TSESTree.Node,
              messageId: 'missingAlt',
              data: { element: element.tagName },
              suggest: buildAddAltSuggestion(element),
            });
            return;
          }

          // Dynamic expression — can't evaluate statically, skip
          if (altAttr.value === null) return;

          const altValue = altAttr.value;

          // Empty or whitespace-only alt
          if (altValue.trim() === '') {
            if (isDecorativeImage(element)) return;

            context.report({
              node: element.node as TSESTree.Node,
              messageId: 'emptyAlt',
              data: { element: element.tagName },
              suggest: buildAddRoleSuggestion(element),
            });
            return;
          }

          // Meaningless alt text
          if (isMeaninglessAlt(altValue, meaninglessPatterns)) {
            context.report({
              node: element.node as TSESTree.Node,
              messageId: 'meaninglessAlt',
              data: { element: element.tagName, alt: altValue },
            });
          }
        } catch (err) {
          debugLog('image-alt-text', err);
          return;
        }
      },
    });
  },
});

/**
 * Build the "add alt=''" suggestion. Only JSX has a range-based autofix
 * today — Vue/Svelte/Angular/HTML autofixes are deferred to v0.3.0
 * (safeGetRange for template parsers is a known gap, see ROADMAP.md).
 */
function buildAddAltSuggestion(element: NormalizedElement) {
  if (element.framework !== 'jsx') return [];
  const jsxNode = element.node as TSESTree.JSXOpeningElement;

  return [
    {
      messageId: 'emptyAlt' as const,
      data: { element: element.tagName },
      fix(fixer: any) {
        const tagEnd = jsxNode.name.range[1];
        return fixer.insertTextAfterRange([tagEnd, tagEnd], ' alt=""');
      },
    },
  ];
}

/**
 * Build the "add role='presentation'" suggestion for empty-alt elements.
 * JSX-only for the same reason as above.
 */
function buildAddRoleSuggestion(element: NormalizedElement) {
  if (element.framework !== 'jsx') return [];
  const jsxNode = element.node as TSESTree.JSXOpeningElement;

  return [
    {
      messageId: 'emptyAlt' as const,
      data: { element: element.tagName },
      fix(fixer: any) {
        const tagEnd = jsxNode.name.range[1];
        return fixer.insertTextAfterRange(
          [tagEnd, tagEnd],
          ' role="presentation"',
        );
      },
    },
  ];
}
