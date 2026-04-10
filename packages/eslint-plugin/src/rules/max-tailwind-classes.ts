import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import { extractClassesFromString } from '../utils/class-extractor.js';
import { createClassVisitor } from '../utils/class-visitor.js';
import { debugLog } from '../utils/debug.js';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://deslint.com/docs/rules/${name}`
);

export type Options = [
  {
    max?: number;
  },
];

export type MessageIds = 'tooManyClasses';

export default createRule<Options, MessageIds>({
  name: 'max-tailwind-classes',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Flag elements with too many Tailwind utility classes. Long class strings are a signal to extract a component or apply a design token.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          max: {
            type: 'number',
            description:
              'Maximum number of utility classes per element (default: 15).',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      tooManyClasses:
        'Element has {{count}} utility classes (max: {{max}}). Consider extracting to a component or using @apply.',
    },
  },
  defaultOptions: [{ max: 15 }],
  create(context, [options]) {
    const max = options.max ?? 15;

    function checkClassString(value: string, node: TSESTree.Node) {
      try {
        const classes = extractClassesFromString(value);
        if (classes.length > max) {
          context.report({
            node,
            messageId: 'tooManyClasses',
            data: {
              count: String(classes.length),
              max: String(max),
            },
          });
        }
      } catch (err) {
        debugLog('max-tailwind-classes', err);
        return;
      }
    }

    return createClassVisitor(checkClassString);
  },
});
