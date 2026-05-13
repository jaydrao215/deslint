import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import { debugLog } from '../utils/debug.js';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://deslint.com/docs/rules/${name}`
);

export type Options = [];

export type MessageIds =
  | 'evalDynamic'
  | 'newFunctionDynamic'
  | 'vmDynamic'
  | 'evalAny';

/**
 * Detect arbitrary-code-execution sinks. ESLint's stock `no-eval` only
 * catches the bare `eval(...)` call. We want the AI-mistake superset:
 *
 *   - `eval(...)` (always bad)
 *   - `new Function(body)` with non-literal body
 *   - `vm.runInNewContext(code)`, `vm.runInThisContext(code)` etc.
 *   - `setTimeout(string, ms)` / `setInterval(string, ms)` — the
 *     string-arg form is `eval` in disguise.
 *
 * The hardest tradeoff: `eval('"' + JSON.stringify(x) + '"')` with a
 * static-shaped string is still bad practice, but `eval` is broadly
 * frowned upon for any input. We split into two messages: `evalAny`
 * (fires on every `eval` use) and `evalDynamic` (louder — fires when
 * the arg is non-literal).
 */

function getCalleeInfo(node: TSESTree.CallExpression): { fn: string | null; receiver: string | null } {
  if (node.callee.type === 'Identifier') return { fn: node.callee.name, receiver: null };
  if (node.callee.type === 'MemberExpression' && node.callee.property.type === 'Identifier') {
    const receiver =
      node.callee.object.type === 'Identifier' ? node.callee.object.name : null;
    return { fn: node.callee.property.name, receiver };
  }
  return { fn: null, receiver: null };
}

function isStaticString(node: TSESTree.Node): boolean {
  if (node.type === 'Literal' && typeof node.value === 'string') return true;
  if (node.type === 'TemplateLiteral' && node.expressions.length === 0) return true;
  return false;
}

const VM_RECEIVERS: ReadonlySet<string> = new Set(['vm', 'node_vm', '_vm']);
const VM_METHODS: ReadonlySet<string> = new Set([
  'runInNewContext', 'runInThisContext', 'runInContext',
  'compileFunction', 'createScript',
]);

const TIMER_FUNCTIONS: ReadonlySet<string> = new Set([
  'setTimeout', 'setInterval', 'setImmediate',
]);

export default createRule<Options, MessageIds>({
  name: 'no-eval',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Flag arbitrary-code-execution sinks: `eval()`, `new Function(...)`, `vm.runInNewContext()`, and string-arg `setTimeout/setInterval`. All of these become RCE when fed any request-derived input — and AI tools regularly compose one of them with `req.body.expr` to "evaluate a user-supplied formula."',
    },
    schema: [],
    messages: {
      evalDynamic:
        '`eval()` called with a non-literal value — this is direct code injection (RCE). Build whatever you need without eval; if you must parse user input as data, use `JSON.parse` or a real parser.',
      evalAny:
        '`eval()` is an arbitrary-code-execution sink and almost always avoidable. Even with a constant argument, eval defeats minification, scope analysis, and most security tools.',
      newFunctionDynamic:
        '`new Function(...)` with a dynamic body is equivalent to `eval` and a code-injection vector. Use a real DSL parser or a sandboxed evaluator.',
      vmDynamic:
        '`vm.{{method}}` evaluates its argument as JavaScript — with a dynamic input, this is direct code execution. The `vm` module is NOT a security boundary; do not rely on it to "sandbox" untrusted input.',
    },
  },
  defaultOptions: [],
  create(context) {
    function flagFirstArgDynamic(
      node: TSESTree.CallExpression,
      messageId: MessageIds,
      method?: string,
    ): boolean {
      const first = node.arguments[0];
      if (!first || first.type === 'SpreadElement') return false;
      if (isStaticString(first as TSESTree.Node)) return false;
      context.report({
        node: first as TSESTree.Node,
        messageId,
        ...(method ? { data: { method } } : {}),
      });
      return true;
    }

    return {
      CallExpression(node) {
        try {
          const { fn, receiver } = getCalleeInfo(node);
          if (!fn) return;

          // Bare `eval(...)`.
          if (fn === 'eval' && receiver === null) {
            const first = node.arguments[0];
            if (first && first.type !== 'SpreadElement' && !isStaticString(first as TSESTree.Node)) {
              context.report({ node: first as TSESTree.Node, messageId: 'evalDynamic' });
            } else {
              context.report({ node, messageId: 'evalAny' });
            }
            return;
          }

          // setTimeout / setInterval with a STRING first arg → eval.
          if (TIMER_FUNCTIONS.has(fn) && receiver === null) {
            const first = node.arguments[0];
            if (first && first.type === 'Literal' && typeof first.value === 'string') {
              context.report({ node: first as TSESTree.Node, messageId: 'evalAny' });
            } else if (first && first.type === 'TemplateLiteral') {
              // template literal as a timer arg is also string-coerced
              context.report({ node: first as TSESTree.Node, messageId: 'evalDynamic' });
            }
            return;
          }

          // vm.runInNewContext / vm.runInThisContext / vm.runInContext etc.
          if (
            receiver !== null &&
            VM_RECEIVERS.has(receiver) &&
            VM_METHODS.has(fn)
          ) {
            flagFirstArgDynamic(node, 'vmDynamic', fn);
            return;
          }
        } catch (err) {
          debugLog('no-eval', err);
        }
      },
      NewExpression(node) {
        try {
          // new Function(body) — flag whenever body isn't a static literal.
          if (node.callee.type === 'Identifier' && node.callee.name === 'Function') {
            // Function takes (...args, body) — body is the LAST argument.
            const body = node.arguments[node.arguments.length - 1];
            if (!body || body.type === 'SpreadElement') return;
            if (isStaticString(body as TSESTree.Node)) {
              // Even with a static body, `new Function` is rarely
              // appropriate. We flag with the same dynamic message
              // because the AI mistake we care about is when the body
              // is later parameterised; staying silent on the static
              // form would let a copy-paste from a placeholder slip
              // through.
              context.report({ node, messageId: 'newFunctionDynamic' });
              return;
            }
            context.report({ node: body as TSESTree.Node, messageId: 'newFunctionDynamic' });
          }
        } catch (err) {
          debugLog('no-eval', err);
        }
      },
    };
  },
});
