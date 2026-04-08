import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import { debugLog } from '../utils/debug.js';
import {
  createElementVisitor,
  getAttribute,
} from '../utils/element-visitor.js';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://deslint.com/docs/rules/${name}`
);

export type Options = [Record<string, never>?];

export type MessageIds =
  | 'userScalableNo'
  | 'maximumScaleTooLow'
  | 'minimumScaleTooHigh';

/**
 * Detects WCAG 1.4.4 (Resize Text, AA) failure technique F77:
 * disabling user scaling on the viewport meta tag.
 *
 * Flags `<meta name="viewport" content="...">` whose content disables
 * pinch-zoom — `user-scalable=no`, `user-scalable=0`, `maximum-scale=1`,
 * or `minimum-scale=1`. Each of these prevents users with low vision
 * from zooming the page, which is a hard fail of WCAG 1.4.4.
 *
 * Spec:
 * https://www.w3.org/TR/WCAG22/#resize-text
 * https://www.w3.org/WAI/WCAG22/Techniques/failures/F77
 */
function parseViewportContent(content: string): Map<string, string> {
  const result = new Map<string, string>();
  for (const part of content.split(',')) {
    const [rawKey, ...rawValueParts] = part.split('=');
    if (!rawKey) continue;
    const key = rawKey.trim().toLowerCase();
    const value = rawValueParts.join('=').trim().toLowerCase();
    if (key) result.set(key, value);
  }
  return result;
}

export default createRule<Options, MessageIds>({
  name: 'viewport-meta',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Forbid disabling user scaling on the viewport meta tag. Required by WCAG 2.2 Success Criterion 1.4.4 (Resize Text, Level AA) — failure technique F77.',
    },
    schema: [{ type: 'object', properties: {}, additionalProperties: false }],
    messages: {
      userScalableNo:
        '`<meta name="viewport">` sets `user-scalable=no`, which prevents users from zooming the page. WCAG 1.4.4 (Resize Text, AA) failure F77. Remove `user-scalable=no` from the content string.',
      maximumScaleTooLow:
        '`<meta name="viewport">` sets `maximum-scale={{value}}`, which blocks pinch-zoom. WCAG 1.4.4 (Resize Text, AA) failure F77. Remove `maximum-scale` or set it to 5 or higher.',
      minimumScaleTooHigh:
        '`<meta name="viewport">` sets `minimum-scale={{value}}`, which prevents zooming out. WCAG 1.4.4 (Resize Text, AA) failure F77. Remove `minimum-scale`.',
    },
  },
  defaultOptions: [{}],
  create(context) {
    return createElementVisitor({
      tagNames: ['meta'],
      check(element) {
        try {
          if (element.hasSpread) return;

          const nameAttr = getAttribute(element, 'name');
          if (!nameAttr || nameAttr.value === null) return;
          if (nameAttr.value.trim().toLowerCase() !== 'viewport') return;

          const contentAttr = getAttribute(element, 'content');
          // No content → can't evaluate, skip (some frameworks split content
          // into other attributes; not our problem to chase).
          if (!contentAttr || contentAttr.value === null) return;

          const parsed = parseViewportContent(contentAttr.value);

          const userScalable = parsed.get('user-scalable');
          if (userScalable === 'no' || userScalable === '0') {
            context.report({
              node: element.node as TSESTree.Node,
              messageId: 'userScalableNo',
            });
          }

          const maximumScale = parsed.get('maximum-scale');
          if (maximumScale !== undefined) {
            const num = Number(maximumScale);
            if (Number.isFinite(num) && num < 2) {
              context.report({
                node: element.node as TSESTree.Node,
                messageId: 'maximumScaleTooLow',
                data: { value: maximumScale },
              });
            }
          }

          const minimumScale = parsed.get('minimum-scale');
          if (minimumScale !== undefined) {
            const num = Number(minimumScale);
            if (Number.isFinite(num) && num > 1) {
              context.report({
                node: element.node as TSESTree.Node,
                messageId: 'minimumScaleTooHigh',
                data: { value: minimumScale },
              });
            }
          }
        } catch (err) {
          debugLog('viewport-meta', err);
          return;
        }
      },
    });
  },
});
