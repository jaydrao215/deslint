import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import { debugLog } from '../utils/debug.js';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://vizlint.dev/docs/rules/${name}`
);

export type Options = [
  {
    requireDisabled?: boolean;
    requireAriaInvalid?: boolean;
    requireAriaRequired?: boolean;
    formElements?: string[];
  },
];

export type MessageIds = 'missingDisabled' | 'missingAriaInvalid' | 'missingAriaRequired';

/** Default HTML form elements that should have state handling */
const DEFAULT_FORM_ELEMENTS = new Set([
  'input', 'select', 'textarea', 'button',
]);

/**
 * Attribute names relevant for state handling.
 */
const DISABLED_ATTRS = new Set(['disabled', 'aria-disabled']);
const ARIA_INVALID_ATTRS = new Set(['aria-invalid']);
const ARIA_REQUIRED_ATTRS = new Set(['aria-required', 'required']);

/**
 * Check if a JSX element name is a form element.
 */
function isFormElement(
  node: TSESTree.JSXOpeningElement,
  formElements: Set<string>,
): boolean {
  if (node.name.type === 'JSXIdentifier') {
    return formElements.has(node.name.name);
  }
  return false;
}

/**
 * Get the tag name of a JSX element.
 */
function getTagName(node: TSESTree.JSXOpeningElement): string | null {
  if (node.name.type === 'JSXIdentifier') {
    return node.name.name;
  }
  return null;
}

/**
 * Check if any attribute (static or expression) matches a given set.
 */
function hasAttribute(
  node: TSESTree.JSXOpeningElement,
  attrNames: Set<string>,
): boolean {
  for (const attr of node.attributes) {
    if (attr.type === 'JSXSpreadAttribute') continue;
    if (attr.type !== 'JSXAttribute') continue;

    const name = attr.name.type === 'JSXIdentifier'
      ? attr.name.name
      : attr.name.type === 'JSXNamespacedName'
        ? `${attr.name.namespace.name}:${attr.name.name.name}`
        : null;

    // Normalize: JSX uses camelCase for some aria attrs (ariaInvalid → aria-invalid)
    // But @typescript-eslint parser keeps them as-is in JSX
    if (name && attrNames.has(name)) return true;

    // Also check kebab-case equivalents
    if (name) {
      const kebab = name.replace(/([A-Z])/g, '-$1').toLowerCase();
      if (attrNames.has(kebab)) return true;
    }
  }

  // Check for spread attributes — if there's a spread, we can't know what's inside
  // so we give the benefit of the doubt
  for (const attr of node.attributes) {
    if (attr.type === 'JSXSpreadAttribute') return true;
  }

  return false;
}

export default createRule<Options, MessageIds>({
  name: 'missing-states',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Detect form elements missing error, disabled, or required state handling. Ensures interactive elements handle edge cases.',
    },
    // NOT auto-fixable — adding proper state handling requires design judgment
    hasSuggestions: true,
    schema: [
      {
        type: 'object',
        properties: {
          requireDisabled: {
            type: 'boolean',
            description: 'Require disabled/aria-disabled attribute on form elements (default: true)',
          },
          requireAriaInvalid: {
            type: 'boolean',
            description: 'Require aria-invalid attribute on input elements (default: true)',
          },
          requireAriaRequired: {
            type: 'boolean',
            description: 'Require required/aria-required attribute on inputs (default: false)',
          },
          formElements: {
            type: 'array',
            items: { type: 'string' },
            description: 'HTML element names to check (default: ["input", "select", "textarea", "button"])',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      missingDisabled:
        '`<{{element}}>` is missing disabled state handling. Add `disabled` or `aria-disabled` attribute for proper UX.',
      missingAriaInvalid:
        '`<{{element}}>` is missing error state handling. Add `aria-invalid` attribute to communicate validation errors.',
      missingAriaRequired:
        '`<{{element}}>` is missing required indicator. Add `required` or `aria-required` attribute.',
    },
  },
  defaultOptions: [
    {
      requireDisabled: true,
      requireAriaInvalid: true,
      requireAriaRequired: false,
      formElements: undefined,
    },
  ],
  create(context, [options]) {
    const requireDisabled = options.requireDisabled ?? true;
    const requireAriaInvalid = options.requireAriaInvalid ?? true;
    const requireAriaRequired = options.requireAriaRequired ?? false;
    const formElements = options.formElements
      ? new Set(options.formElements)
      : DEFAULT_FORM_ELEMENTS;

    return {
      JSXOpeningElement(node: TSESTree.JSXOpeningElement) {
        try {
          if (!isFormElement(node, formElements)) return;

          const tagName = getTagName(node);
          if (!tagName) return;

          // Check disabled state
          if (requireDisabled && !hasAttribute(node, DISABLED_ATTRS)) {
            context.report({
              node,
              messageId: 'missingDisabled',
              data: { element: tagName },
            });
          }

          // Check aria-invalid — only on input-like elements, not buttons
          if (
            requireAriaInvalid &&
            tagName !== 'button' &&
            !hasAttribute(node, ARIA_INVALID_ATTRS)
          ) {
            context.report({
              node,
              messageId: 'missingAriaInvalid',
              data: { element: tagName },
            });
          }

          // Check required — only on input-like elements, not buttons
          if (
            requireAriaRequired &&
            tagName !== 'button' &&
            !hasAttribute(node, ARIA_REQUIRED_ATTRS)
          ) {
            context.report({
              node,
              messageId: 'missingAriaRequired',
              data: { element: tagName },
            });
          }
        } catch (err) {
          debugLog('missing-states', err);
          return;
        }
      },
    };
  },
});
