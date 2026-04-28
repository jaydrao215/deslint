import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import { debugLog } from '../utils/debug.js';
import {
  createElementVisitor,
  getAttribute,
} from '../utils/element-visitor.js';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://deslint.com/docs/rules/${name}`
);

export type Options = [];
export type MessageIds = 'missingSandbox';

export default createRule<Options, MessageIds>({
  name: 'iframe-sandbox',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require a `sandbox` attribute on `<iframe>` elements. AI-generated embeds rarely include one, so a misbehaving frame can navigate the parent, run scripts, or submit forms with full origin privileges.',
    },
    schema: [],
    messages: {
      missingSandbox:
        '`<iframe>` is missing a `sandbox` attribute. Add `sandbox=""` for the strictest policy, or list only the capabilities the frame needs (e.g. `sandbox="allow-scripts allow-same-origin"`).',
    },
  },
  defaultOptions: [],
  create(context) {
    return createElementVisitor({
      tagNames: ['iframe'],
      check(element) {
        try {
          if (element.hasSpread) return;
          const attr = getAttribute(element, 'sandbox');
          if (attr) return;
          context.report({
            node: element.node as TSESTree.Node,
            messageId: 'missingSandbox',
          });
        } catch (err) {
          debugLog('iframe-sandbox', err);
          return;
        }
      },
    });
  },
});
