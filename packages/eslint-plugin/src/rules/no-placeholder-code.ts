import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import { debugLog } from '../utils/debug.js';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://deslint.com/docs/rules/${name}`
);

export type Options = [];

export type MessageIds = 'notImplemented' | 'todoThrow';

/**
 * Strings that, when used as the message of a thrown Error, indicate
 * the code is a placeholder the AI tool left for the developer to fill
 * in. Matched case-insensitively against the trimmed message.
 *
 * We intentionally don't include single-word "TODO" — that's too
 * broad and other linters / search tools already surface it. The
 * point of this rule is the structural form `throw new Error(...)`
 * with a placeholder phrase, which is what AI tools produce when they
 * can't finish the function.
 */
const PLACEHOLDER_PHRASES: ReadonlyArray<RegExp> = [
  /^not\s+(?:yet\s+)?implemented$/i,
  /^not\s+implemented\b/i,
  /^todo\b/i,
  /^fixme\b/i,
  /^xxx\b/i,
  /^stub\b/i,
  /^placeholder\b/i,
  /^unimplemented\b/i,
  /^implementation\s+pending/i,
  /^this\s+is\s+a\s+placeholder/i,
  /^method\s+not\s+implemented\b/i,
  /^to\s+be\s+implemented\b/i,
  /^coming\s+soon\b/i,
];

function getStaticString(node: TSESTree.Node): string | null {
  if (node.type === 'Literal' && typeof node.value === 'string') return node.value;
  if (node.type === 'TemplateLiteral' && node.expressions.length === 0) {
    return node.quasis.map((q) => q.value.cooked ?? '').join('');
  }
  return null;
}

function isPlaceholderMessage(msg: string): boolean {
  const trimmed = msg.trim();
  if (!trimmed) return false;
  return PLACEHOLDER_PHRASES.some((re) => re.test(trimmed));
}

export default createRule<Options, MessageIds>({
  name: 'no-placeholder-code',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Flag placeholder `throw new Error("not implemented")` shapes that AI coding tools leave behind when they couldn\'t finish a function. Catching these at the merge gate stops "the AI wrote the boilerplate, nobody filled it in, it shipped" — a story every team using AI coding tools has lived through at least once.',
    },
    schema: [],
    messages: {
      notImplemented:
        '`throw new Error("{{ message }}")` is a placeholder — implement this function or remove the unreachable branch before shipping.',
      todoThrow:
        '`throw new Error("{{ message }}")` is a TODO marker, not real error-handling. Replace it with a real implementation or a typed exception.',
    },
  },
  defaultOptions: [],
  create(context) {
    function checkThrow(node: TSESTree.ThrowStatement | TSESTree.Expression): void {
      const argument =
        node.type === 'ThrowStatement' ? node.argument : node;
      if (!argument) return;
      if (argument.type !== 'NewExpression' && argument.type !== 'CallExpression') return;
      const callee = argument.callee;
      if (callee.type !== 'Identifier') return;
      // Catch `Error`, `TypeError`, `RangeError`, etc.
      if (!/Error$/.test(callee.name)) return;

      const first = argument.arguments[0];
      if (!first) return;
      const msg = getStaticString(first as TSESTree.Node);
      if (!msg) return;
      if (!isPlaceholderMessage(msg)) return;

      const id: MessageIds = /^todo\b|^fixme\b|^xxx\b/i.test(msg.trim())
        ? 'todoThrow'
        : 'notImplemented';
      context.report({
        node: argument,
        messageId: id,
        data: { message: msg },
      });
    }

    return {
      ThrowStatement(node) {
        try {
          checkThrow(node);
        } catch (err) {
          debugLog('no-placeholder-code', err);
        }
      },
    };
  },
});
