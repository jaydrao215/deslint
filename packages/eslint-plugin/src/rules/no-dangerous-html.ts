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
export type MessageIds = 'dangerousHtml';

export default createRule<Options, MessageIds>({
  name: 'no-dangerous-html',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Flag `dangerouslySetInnerHTML` usage. AI-generated code frequently reaches for this when it could render text or use a sanitizer, opening an XSS path on user-supplied data.',
    },
    schema: [],
    messages: {
      dangerousHtml:
        '`dangerouslySetInnerHTML` injects raw HTML and is an XSS risk on any non-trusted input. Render as text, or sanitize with DOMPurify before assigning.',
    },
  },
  defaultOptions: [],
  create(context) {
    return createElementVisitor({
      check(element) {
        try {
          if (element.framework !== 'jsx') return;
          const attr = getAttribute(element, 'dangerouslySetInnerHTML');
          if (!attr) return;
          context.report({
            node: (attr.node as TSESTree.Node) ?? (element.node as TSESTree.Node),
            messageId: 'dangerousHtml',
          });
        } catch (err) {
          debugLog('no-dangerous-html', err);
          return;
        }
      },
    });
  },
});
