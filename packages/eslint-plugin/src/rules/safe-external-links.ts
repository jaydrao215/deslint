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

export type Options = [];
export type MessageIds = 'missingRel' | 'incompleteRel';

function relTokens(value: string): Set<string> {
  return new Set(
    value
      .split(/\s+/)
      .map((tok) => tok.trim().toLowerCase())
      .filter(Boolean),
  );
}

function buildJsxAddRelFix(element: NormalizedElement) {
  if (element.framework !== 'jsx') return undefined;
  const jsxNode = element.node as TSESTree.JSXOpeningElement;
  return (fixer: any) => {
    const tagEnd = jsxNode.name.range[1];
    return fixer.insertTextAfterRange(
      [tagEnd, tagEnd],
      ' rel="noopener noreferrer"',
    );
  };
}

export default createRule<Options, MessageIds>({
  name: 'safe-external-links',
  meta: {
    type: 'problem',
    fixable: 'code',
    docs: {
      description:
        'Require `rel="noopener noreferrer"` on `<a target="_blank">`. AI-generated code routinely opens links in new tabs without the rel guard, which leaks the opener and enables reverse tabnabbing.',
    },
    schema: [],
    messages: {
      missingRel:
        '`<a target="_blank">` without a `rel` attribute leaks the opener and enables reverse tabnabbing. Add `rel="noopener noreferrer"`.',
      incompleteRel:
        '`<a target="_blank" rel="{{rel}}">` is missing `noopener` and/or `noreferrer`. Both should be present on external links.',
    },
  },
  defaultOptions: [],
  create(context) {
    return createElementVisitor({
      tagNames: ['a'],
      check(element) {
        try {
          if (element.hasSpread) return;

          const target = getStaticAttributeValue(element, 'target');
          if (target !== '_blank') return;

          const relAttr = getAttribute(element, 'rel');

          if (!relAttr) {
            const fix = buildJsxAddRelFix(element);
            context.report({
              node: element.node as TSESTree.Node,
              messageId: 'missingRel',
              ...(fix ? { fix } : {}),
            });
            return;
          }

          // Dynamic rel value — can't evaluate, give benefit of the doubt
          if (relAttr.value === null) return;

          const tokens = relTokens(relAttr.value);
          if (!tokens.has('noopener') || !tokens.has('noreferrer')) {
            context.report({
              node: (relAttr.node as TSESTree.Node) ?? (element.node as TSESTree.Node),
              messageId: 'incompleteRel',
              data: { rel: relAttr.value },
            });
          }
        } catch (err) {
          debugLog('safe-external-links', err);
          return;
        }
      },
    });
  },
});
