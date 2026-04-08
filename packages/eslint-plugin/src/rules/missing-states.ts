import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import { debugLog } from '../utils/debug.js';
import {
  createElementVisitor,
  getAttribute,
} from '../utils/element-visitor.js';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://deslint.com/docs/rules/${name}`
);

export type Options = [
  {
    requireDisabled?: boolean;
    requireAriaInvalid?: boolean;
    requireAriaRequired?: boolean;
    formElements?: string[];
  },
];

export type MessageIds =
  | 'missingDisabled'
  | 'missingAriaInvalid'
  | 'missingAriaRequired';

/** Default HTML form elements that should have state handling */
const DEFAULT_FORM_ELEMENTS = ['input', 'select', 'textarea', 'button'];

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
            description:
              'Require disabled/aria-disabled attribute on form elements (default: true)',
          },
          requireAriaInvalid: {
            type: 'boolean',
            description:
              'Require aria-invalid attribute on input elements (default: true)',
          },
          requireAriaRequired: {
            type: 'boolean',
            description:
              'Require required/aria-required attribute on inputs (default: false)',
          },
          formElements: {
            type: 'array',
            items: { type: 'string' },
            description:
              'HTML element names to check (default: ["input", "select", "textarea", "button"])',
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
    const formElements = options.formElements ?? DEFAULT_FORM_ELEMENTS;

    return createElementVisitor({
      tagNames: formElements,
      check(element) {
        try {
          // Spread attributes → benefit of the doubt (could contain states)
          if (element.hasSpread) return;

          const tagName = element.tagName;
          const isButton = tagName.toLowerCase() === 'button';

          // Disabled state (disabled OR aria-disabled)
          if (requireDisabled) {
            const hasDisabled =
              getAttribute(element, 'disabled') !== null ||
              getAttribute(element, 'aria-disabled') !== null;

            if (!hasDisabled) {
              context.report({
                node: element.node as TSESTree.Node,
                messageId: 'missingDisabled',
                data: { element: tagName },
              });
            }
          }

          // aria-invalid — only on input-like elements, not buttons
          if (requireAriaInvalid && !isButton) {
            if (getAttribute(element, 'aria-invalid') === null) {
              context.report({
                node: element.node as TSESTree.Node,
                messageId: 'missingAriaInvalid',
                data: { element: tagName },
              });
            }
          }

          // required / aria-required — only on input-like elements, not buttons
          if (requireAriaRequired && !isButton) {
            const hasRequired =
              getAttribute(element, 'required') !== null ||
              getAttribute(element, 'aria-required') !== null;

            if (!hasRequired) {
              context.report({
                node: element.node as TSESTree.Node,
                messageId: 'missingAriaRequired',
                data: { element: tagName },
              });
            }
          }
        } catch (err) {
          debugLog('missing-states', err);
          return;
        }
      },
    });
  },
});
