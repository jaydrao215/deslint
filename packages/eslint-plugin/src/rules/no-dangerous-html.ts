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

export type Options = [];
export type MessageIds = 'dangerousHtml';

export default createRule<Options, MessageIds>({
  name: 'no-dangerous-html',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Flag `dangerouslySetInnerHTML` usage. AI-generated code frequently reaches for this when it could render text or use a sanitizer, opening an XSS path on user-supplied data. Excludes `<script type="application/ld+json">`, the canonical Schema.org structured-data pattern with no XSS path.',
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

          // Whitelist the canonical Schema.org / JSON-LD pattern:
          //   <script type="application/ld+json" dangerouslySetInnerHTML={...} />
          // This is server-rendered structured data (the input is a dev-controlled
          // object passed through JSON.stringify), not a client-side innerHTML
          // assignment, so there's no XSS path. It's the recommended way to ship
          // Schema.org markup in React/Next.js — flagging it floods every SEO-aware
          // codebase with false positives.
          if (element.tagName.toLowerCase() === 'script') {
            const type = getStaticAttributeValue(element, 'type');
            if (type === 'application/ld+json') return;
          }

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
