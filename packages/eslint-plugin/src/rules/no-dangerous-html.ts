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
        'Flag `dangerouslySetInnerHTML` usage. AI-generated code frequently reaches for this when it could render text or use a sanitizer, opening an XSS path on user-supplied data. Excludes `<script type="application/ld+json">` (Schema.org structured data), `<style>` (CSS injection has a different threat model), and `<Script>` (the Next.js component used for inline scripts).',
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

          const tag = element.tagName;
          const tagLower = tag.toLowerCase();

          // <script type="application/ld+json"> — Schema.org structured
          // data. The input is a dev-controlled object passed through
          // JSON.stringify; no XSS path. Flagging it floods every
          // SEO-aware codebase with false positives.
          if (tagLower === 'script') {
            const type = getStaticAttributeValue(element, 'type');
            if (type === 'application/ld+json') return;
          }

          // <style dangerouslySetInnerHTML={{__html: cssString}}> is the
          // canonical inline-CSS pattern (chart libraries, dynamic
          // theming, CSS variables). Browsers parse the content as CSS,
          // not HTML — the threat model is CSS injection, not HTML/XSS.
          // If CSS injection matters for the codebase, that deserves a
          // separate rule; flagging it here would flood every chart-
          // and theme-heavy frontend with false positives.
          if (tagLower === 'style') return;

          // <Script> (capital S) is conventionally the Next.js Script
          // component, which uses dangerouslySetInnerHTML to ship inline
          // scripts via the framework's loading strategy. The content is
          // dev-controlled JS code. Lowercase `<script>` without a
          // recognized type still flags — that's the genuine inline-JS
          // injection surface.
          if (tag === 'Script') return;

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
