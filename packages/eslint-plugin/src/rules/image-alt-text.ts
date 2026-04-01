import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import { debugLog } from '../utils/debug.js';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://vizlint.dev/docs/rules/${name}`
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

/** Tag names that represent image elements */
const IMG_TAGS = new Set(['img']);
const NEXT_IMAGE_TAGS = new Set(['Image']);

/**
 * Get the tag name from a JSX opening element.
 */
function getTagName(node: TSESTree.JSXOpeningElement): string | null {
  if (node.name.type === 'JSXIdentifier') {
    return node.name.name;
  }
  return null;
}

/**
 * Check if the element is an image tag we should inspect.
 */
function isImageElement(
  tagName: string,
  checkNextImage: boolean,
): boolean {
  if (IMG_TAGS.has(tagName)) return true;
  if (checkNextImage && NEXT_IMAGE_TAGS.has(tagName)) return true;
  return false;
}

/**
 * Check if the element has a JSX spread attribute ({...props}).
 */
function hasSpreadAttribute(node: TSESTree.JSXOpeningElement): boolean {
  for (const attr of node.attributes) {
    if (attr.type === 'JSXSpreadAttribute') return true;
  }
  return false;
}

/**
 * Find a JSX attribute by name on a JSX opening element.
 */
function findAttribute(
  node: TSESTree.JSXOpeningElement,
  attrName: string,
): TSESTree.JSXAttribute | null {
  for (const attr of node.attributes) {
    if (attr.type !== 'JSXAttribute') continue;
    const name =
      attr.name.type === 'JSXIdentifier'
        ? attr.name.name
        : attr.name.type === 'JSXNamespacedName'
          ? `${attr.name.namespace.name}:${attr.name.name.name}`
          : null;
    if (name === attrName) return attr;
  }
  return null;
}

/**
 * Get the static string value of a JSX attribute, or null if it's dynamic.
 */
function getStaticAttributeValue(attr: TSESTree.JSXAttribute): string | null {
  // <img alt="text" /> — string literal
  if (attr.value === null) {
    // <img alt /> — attribute with no value, treat as empty string
    return '';
  }
  if (attr.value.type === 'Literal' && typeof attr.value.value === 'string') {
    return attr.value.value;
  }
  // JSXExpressionContainer with a string literal: alt={"text"}
  if (
    attr.value.type === 'JSXExpressionContainer' &&
    attr.value.expression.type === 'Literal' &&
    typeof attr.value.expression.value === 'string'
  ) {
    return attr.value.expression.value;
  }
  // Dynamic expression — can't evaluate statically
  return null;
}

/**
 * Check if the element has role="presentation" or aria-hidden="true".
 */
function isDecorativeImage(node: TSESTree.JSXOpeningElement): boolean {
  const roleAttr = findAttribute(node, 'role');
  if (roleAttr) {
    const roleValue = getStaticAttributeValue(roleAttr);
    if (roleValue === 'presentation' || roleValue === 'none') return true;
  }

  const ariaHiddenAttr = findAttribute(node, 'aria-hidden');
  if (ariaHiddenAttr) {
    const ariaHiddenValue = getStaticAttributeValue(ariaHiddenAttr);
    if (ariaHiddenValue === 'true') return true;
    // <img aria-hidden /> — boolean attribute, treat as true
    if (ariaHiddenAttr.value === null) return true;
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

    return {
      JSXOpeningElement(node: TSESTree.JSXOpeningElement) {
        try {
          const tagName = getTagName(node);
          if (!tagName) return;
          if (!isImageElement(tagName, checkNextImage)) return;

          // Spread attributes — give benefit of the doubt
          if (hasSpreadAttribute(node)) return;

          const altAttr = findAttribute(node, 'alt');

          // Missing alt attribute entirely
          if (!altAttr) {
            context.report({
              node,
              messageId: 'missingAlt',
              data: { element: tagName },
              suggest: [
                {
                  messageId: 'emptyAlt',
                  data: { element: tagName },
                  fix(fixer) {
                    // Insert alt="" right after the tag name
                    const tagEnd = node.name.range[1];
                    return fixer.insertTextAfterRange(
                      [tagEnd, tagEnd],
                      ' alt=""',
                    );
                  },
                },
              ],
            });
            return;
          }

          // Get the static value of alt
          const altValue = getStaticAttributeValue(altAttr);

          // Dynamic expression — can't evaluate, skip
          if (altValue === null) return;

          // Empty or whitespace-only alt
          if (altValue.trim() === '') {
            if (isDecorativeImage(node)) return;

            context.report({
              node,
              messageId: 'emptyAlt',
              data: { element: tagName },
              suggest: [
                {
                  messageId: 'emptyAlt',
                  data: { element: tagName },
                  fix(fixer) {
                    // Suggest adding role="presentation"
                    const tagEnd = node.name.range[1];
                    return fixer.insertTextAfterRange(
                      [tagEnd, tagEnd],
                      ' role="presentation"',
                    );
                  },
                },
              ],
            });
            return;
          }

          // Meaningless alt text
          if (isMeaninglessAlt(altValue, meaninglessPatterns)) {
            context.report({
              node,
              messageId: 'meaninglessAlt',
              data: { element: tagName, alt: altValue },
            });
          }
        } catch (err) {
          debugLog('image-alt-text', err);
          return;
        }
      },
    };
  },
});
