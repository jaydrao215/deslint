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
    /** Additional input name patterns to check (regex strings). */
    additionalPatterns?: string[];
  },
];

export type MessageIds = 'missingAutocomplete' | 'suggestAutocomplete';

/**
 * Map of input type/name patterns to their expected autocomplete values.
 * Based on WCAG 2.1 SC 1.3.5 and the HTML autocomplete spec.
 *
 * Key: regex matching type or name attributes.
 * Value: suggested autocomplete value.
 */
const AUTOCOMPLETE_MAP: Array<{
  pattern: RegExp;
  field: 'type' | 'name' | 'id';
  autocomplete: string;
  label: string;
}> = [
  // Name fields
  { pattern: /^(full[_-]?name|your[_-]?name)$/i, field: 'name', autocomplete: 'name', label: 'full name' },
  { pattern: /^(first[_-]?name|fname|given[_-]?name)$/i, field: 'name', autocomplete: 'given-name', label: 'first name' },
  { pattern: /^(last[_-]?name|lname|family[_-]?name|surname)$/i, field: 'name', autocomplete: 'family-name', label: 'last name' },

  // Email
  { pattern: /^email$/i, field: 'type', autocomplete: 'email', label: 'email' },
  { pattern: /^e[_-]?mail$/i, field: 'name', autocomplete: 'email', label: 'email' },

  // Phone
  { pattern: /^tel$/i, field: 'type', autocomplete: 'tel', label: 'telephone' },
  { pattern: /^(phone|telephone|tel|mobile)$/i, field: 'name', autocomplete: 'tel', label: 'telephone' },

  // Address fields
  { pattern: /^(address|street[_-]?address|address[_-]?line[_-]?1)$/i, field: 'name', autocomplete: 'address-line1', label: 'street address' },
  { pattern: /^(address[_-]?line[_-]?2|apt|suite|unit)$/i, field: 'name', autocomplete: 'address-line2', label: 'address line 2' },
  { pattern: /^(city|locality)$/i, field: 'name', autocomplete: 'address-level2', label: 'city' },
  { pattern: /^(state|region|province)$/i, field: 'name', autocomplete: 'address-level1', label: 'state/region' },
  { pattern: /^(zip|zip[_-]?code|postal[_-]?code|postcode)$/i, field: 'name', autocomplete: 'postal-code', label: 'postal code' },
  { pattern: /^(country)$/i, field: 'name', autocomplete: 'country-name', label: 'country' },

  // Organization
  { pattern: /^(company|organization|org)$/i, field: 'name', autocomplete: 'organization', label: 'organization' },

  // Username & Password
  { pattern: /^(username|user[_-]?name|login)$/i, field: 'name', autocomplete: 'username', label: 'username' },
  { pattern: /^password$/i, field: 'type', autocomplete: 'current-password', label: 'password' },
  { pattern: /^(password|passwd|pass)$/i, field: 'name', autocomplete: 'current-password', label: 'password' },
  { pattern: /^(new[_-]?password|confirm[_-]?password)$/i, field: 'name', autocomplete: 'new-password', label: 'new password' },

  // Credit card
  { pattern: /^(cc[_-]?number|card[_-]?number|credit[_-]?card)$/i, field: 'name', autocomplete: 'cc-number', label: 'credit card number' },
  { pattern: /^(cc[_-]?name|card[_-]?holder|cardholder)$/i, field: 'name', autocomplete: 'cc-name', label: 'cardholder name' },
  { pattern: /^(cc[_-]?exp|expir|card[_-]?exp)$/i, field: 'name', autocomplete: 'cc-exp', label: 'card expiration' },
  { pattern: /^(cc[_-]?csc|cvv|cvc|security[_-]?code)$/i, field: 'name', autocomplete: 'cc-csc', label: 'card security code' },

  // Date of birth
  { pattern: /^(bday|birth[_-]?date|date[_-]?of[_-]?birth|dob)$/i, field: 'name', autocomplete: 'bday', label: 'date of birth' },

  // URL
  { pattern: /^url$/i, field: 'type', autocomplete: 'url', label: 'URL' },
  { pattern: /^(url|website|homepage)$/i, field: 'name', autocomplete: 'url', label: 'URL' },
];

/**
 * Determine the suggested autocomplete value for an input element based
 * on its type, name, and id attributes.
 */
function suggestAutocomplete(element: NormalizedElement): { autocomplete: string; label: string } | null {
  const type = getStaticAttributeValue(element, 'type') ?? 'text';
  const name = getStaticAttributeValue(element, 'name');
  const id = getStaticAttributeValue(element, 'id');

  for (const entry of AUTOCOMPLETE_MAP) {
    if (entry.field === 'type' && entry.pattern.test(type)) {
      return { autocomplete: entry.autocomplete, label: entry.label };
    }
    if (entry.field === 'name' && name && entry.pattern.test(name)) {
      return { autocomplete: entry.autocomplete, label: entry.label };
    }
    if (entry.field === 'id' && id && entry.pattern.test(id)) {
      return { autocomplete: entry.autocomplete, label: entry.label };
    }
    // Also try matching name patterns against id when field is 'name'
    if (entry.field === 'name' && id && entry.pattern.test(id)) {
      return { autocomplete: entry.autocomplete, label: entry.label };
    }
  }

  return null;
}

export default createRule<Options, MessageIds>({
  name: 'autocomplete-attribute',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Require autocomplete attribute on identity and payment form fields. AI-generated forms frequently omit autocomplete, violating WCAG 1.3.5 (Identify Input Purpose) and degrading autofill UX.',
    },
    hasSuggestions: true,
    schema: [
      {
        type: 'object',
        properties: {
          additionalPatterns: {
            type: 'array',
            items: { type: 'string' },
            description:
              'Additional input name regex patterns to check',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      missingAutocomplete:
        '`<{{element}}>` appears to be a {{label}} field but is missing `autocomplete="{{autocomplete}}"`. Add it for WCAG 1.3.5 compliance and better autofill.',
      suggestAutocomplete:
        'Add `autocomplete="{{autocomplete}}"` for {{label}} fields',
    },
  },
  defaultOptions: [
    {
      additionalPatterns: undefined,
    },
  ],
  create(context) {
    return createElementVisitor({
      tagNames: ['input', 'select', 'textarea'],
      check(element) {
        try {
          // Spread attributes → benefit of the doubt
          if (element.hasSpread) return;

          // Skip hidden inputs — they don't need autocomplete
          const type = getStaticAttributeValue(element, 'type');
          if (type === 'hidden' || type === 'submit' || type === 'button' || type === 'reset' || type === 'image' || type === 'file' || type === 'checkbox' || type === 'radio') {
            return;
          }

          // Already has autocomplete → skip
          if (getAttribute(element, 'autocomplete') !== null) return;

          // Check if this field matches a known identity/payment pattern
          const suggestion = suggestAutocomplete(element);
          if (!suggestion) return;

          context.report({
            node: element.node as TSESTree.Node,
            messageId: 'missingAutocomplete',
            data: {
              element: element.tagName,
              label: suggestion.label,
              autocomplete: suggestion.autocomplete,
            },
            suggest: element.framework === 'jsx'
              ? [
                  {
                    messageId: 'suggestAutocomplete' as const,
                    data: {
                      autocomplete: suggestion.autocomplete,
                      label: suggestion.label,
                    },
                    fix(fixer: any) {
                      const jsxNode = element.node as TSESTree.JSXOpeningElement;
                      const tagEnd = jsxNode.name.range[1];
                      return fixer.insertTextAfterRange(
                        [tagEnd, tagEnd],
                        ` autoComplete="${suggestion.autocomplete}"`,
                      );
                    },
                  },
                ]
              : [],
          });
        } catch (err) {
          debugLog('autocomplete-attribute', err);
        }
      },
    });
  },
});
