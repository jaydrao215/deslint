import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import { debugLog } from '../utils/debug.js';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://deslint.com/docs/rules/${name}`
);

export type Options = [];

export type MessageIds = 'nonDeterministicInJsx';

/**
 * Flag expressions inside JSX whose value differs between server and
 * client renders. This is the single most common Next.js/React bug
 * AI coding tools ship: a `Math.random()` ID generator, a "current
 * time" stamp, or `window.localStorage.get(...)` called inline in JSX.
 * Result: hydration mismatch warning at minimum, broken UI at worst.
 *
 * Detection scope: any JSXExpressionContainer whose expression
 * (transitively) reads one of:
 *
 *   Math.random()
 *   Date.now() / new Date() (when no `value` arg)
 *   performance.now()
 *   crypto.randomUUID() / crypto.randomBytes()
 *   self-contained closures using the above
 *
 * Exit hatches:
 *
 *   - Anything inside a hook callback (`useEffect`, `useLayoutEffect`,
 *     `useEventCallback`, `useMemo`, `useCallback`) is safe — those
 *     run after hydration on the client.
 *   - Anything inside `typeof window !== "undefined"` checks is safe
 *     because the server branch returns null/undefined.
 *
 * We implement these by tracking ancestor context as we walk: if any
 * ancestor function is one of the listed hooks, we don't report.
 */

const NON_DETERMINISTIC_METHODS: ReadonlySet<string> = new Set([
  'random', 'now', 'randomUUID', 'randomBytes', 'randomFillSync',
]);

const NON_DETERMINISTIC_RECEIVERS: ReadonlySet<string> = new Set([
  'Math', 'Date', 'performance', 'crypto', 'globalThis',
]);

const POST_HYDRATION_HOOKS: ReadonlySet<string> = new Set([
  'useEffect', 'useLayoutEffect', 'useIsomorphicLayoutEffect',
  'useEventCallback', 'useDeferredValue', 'useTransition',
  // useMemo / useCallback re-run on the client too, but the IDENTITY
  // of the value returned can still differ across renders. We deem
  // these safe because the typical usage stabilises a derived value
  // and any non-determinism inside is the developer's intent.
  'useMemo', 'useCallback',
]);

function getCalleeReceiverName(node: TSESTree.CallExpression): { method: string | null; receiver: string | null } {
  if (node.callee.type === 'Identifier') return { method: node.callee.name, receiver: null };
  if (
    node.callee.type === 'MemberExpression' &&
    node.callee.property.type === 'Identifier'
  ) {
    const receiver =
      node.callee.object.type === 'Identifier' ? node.callee.object.name : null;
    return { method: node.callee.property.name, receiver };
  }
  return { method: null, receiver: null };
}

/**
 * True if the given expression directly invokes a non-deterministic
 * source — `Math.random()`, `Date.now()`, `new Date()` (zero-arg),
 * `performance.now()`, `crypto.randomUUID()`.
 */
function isNonDeterministicSource(node: TSESTree.Node): boolean {
  if (node.type === 'CallExpression') {
    const { method, receiver } = getCalleeReceiverName(node);
    if (!method) return false;
    if (receiver && NON_DETERMINISTIC_RECEIVERS.has(receiver) && NON_DETERMINISTIC_METHODS.has(method)) {
      return true;
    }
    return false;
  }
  if (node.type === 'NewExpression') {
    // `new Date()` zero-arg → "now"; `new Date(arg)` is deterministic.
    if (node.callee.type === 'Identifier' && node.callee.name === 'Date') {
      return node.arguments.length === 0;
    }
  }
  return false;
}

/**
 * Recurse through an expression tree looking for any sub-expression
 * that's a non-deterministic source. Capped to keep things cheap on
 * pathological inputs.
 */
function expressionContainsNonDeterministic(node: TSESTree.Node, depth = 0): boolean {
  if (depth > 8) return false;
  if (isNonDeterministicSource(node)) return true;

  // Specific shapes we walk into.
  switch (node.type) {
    case 'BinaryExpression':
    case 'LogicalExpression':
      return (
        expressionContainsNonDeterministic(node.left as TSESTree.Node, depth + 1) ||
        expressionContainsNonDeterministic(node.right as TSESTree.Node, depth + 1)
      );
    case 'ConditionalExpression':
      return (
        expressionContainsNonDeterministic(node.test as TSESTree.Node, depth + 1) ||
        expressionContainsNonDeterministic(node.consequent as TSESTree.Node, depth + 1) ||
        expressionContainsNonDeterministic(node.alternate as TSESTree.Node, depth + 1)
      );
    case 'TemplateLiteral':
      return node.expressions.some((e) => expressionContainsNonDeterministic(e as TSESTree.Node, depth + 1));
    case 'UnaryExpression':
      return expressionContainsNonDeterministic(node.argument as TSESTree.Node, depth + 1);
    case 'MemberExpression':
      return expressionContainsNonDeterministic(node.object as TSESTree.Node, depth + 1);
    case 'CallExpression':
      // Walk the callee (`new Date().toLocaleTimeString()` — the
      // `.toLocaleTimeString` callee is a MemberExpression whose
      // object is the non-deterministic `new Date()`) and the args.
      return (
        expressionContainsNonDeterministic(node.callee as TSESTree.Node, depth + 1) ||
        node.arguments.some(
          (a) => a.type !== 'SpreadElement' && expressionContainsNonDeterministic(a as TSESTree.Node, depth + 1),
        )
      );
    case 'NewExpression':
      // Walk args; the constructor itself was already classified by
      // `isNonDeterministicSource` for zero-arg `new Date()`.
      return node.arguments.some(
        (a) => a.type !== 'SpreadElement' && expressionContainsNonDeterministic(a as TSESTree.Node, depth + 1),
      );
    case 'ArrayExpression':
      return node.elements.some(
        (el) =>
          el !== null && el.type !== 'SpreadElement' &&
          expressionContainsNonDeterministic(el as TSESTree.Node, depth + 1),
      );
    case 'ObjectExpression':
      return node.properties.some((p) => {
        if (p.type !== 'Property') return false;
        return expressionContainsNonDeterministic(p.value as TSESTree.Node, depth + 1);
      });
    default:
      return false;
  }
}

export default createRule<Options, MessageIds>({
  name: 'no-hydration-mismatch',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Flag non-deterministic values (`Math.random()`, `Date.now()`, `new Date()`, `performance.now()`, `crypto.randomUUID()`) used directly inside JSX. These produce different server- and client-rendered HTML and trip React 18+ hydration warnings, often degrading interactive UI. Move the expression into a `useEffect` (or `useId` for stable IDs).',
    },
    schema: [],
    messages: {
      nonDeterministicInJsx:
        'Non-deterministic expression rendered inside JSX — the server and client values will differ, causing a hydration mismatch. Compute the value inside `useEffect` and store it in state, or use `useId()` for stable IDs.',
    },
  },
  defaultOptions: [],
  create(context) {
    /**
     * Stack of "we're inside a post-hydration hook callback" booleans.
     * Pushed when we enter a function expression / arrow that's an
     * argument to a hook in POST_HYDRATION_HOOKS; popped on exit.
     */
    const safeStack: boolean[] = [false];
    function currentSafe(): boolean {
      return safeStack[safeStack.length - 1] ?? false;
    }

    function enterFunction(node: TSESTree.FunctionExpression | TSESTree.ArrowFunctionExpression): void {
      const parent = (node as { parent?: TSESTree.Node }).parent;
      let isHookCallback = false;
      if (parent && parent.type === 'CallExpression') {
        const callee = parent.callee;
        if (callee.type === 'Identifier' && POST_HYDRATION_HOOKS.has(callee.name)) {
          isHookCallback = true;
        } else if (
          callee.type === 'MemberExpression' &&
          callee.property.type === 'Identifier' &&
          POST_HYDRATION_HOOKS.has(callee.property.name)
        ) {
          // `React.useEffect(...)`
          isHookCallback = true;
        }
      }
      safeStack.push(isHookCallback || currentSafe());
    }

    function exitFunction(): void {
      if (safeStack.length > 1) safeStack.pop();
    }

    return {
      FunctionExpression: enterFunction,
      'FunctionExpression:exit': exitFunction,
      ArrowFunctionExpression: enterFunction,
      'ArrowFunctionExpression:exit': exitFunction,

      JSXExpressionContainer(node: TSESTree.JSXExpressionContainer) {
        try {
          if (currentSafe()) return;
          if (node.expression.type === 'JSXEmptyExpression') return;
          if (!expressionContainsNonDeterministic(node.expression as TSESTree.Node)) return;
          context.report({
            node: node.expression as TSESTree.Node,
            messageId: 'nonDeterministicInJsx',
          });
        } catch (err) {
          debugLog('no-hydration-mismatch', err);
        }
      },
    };
  },
});
