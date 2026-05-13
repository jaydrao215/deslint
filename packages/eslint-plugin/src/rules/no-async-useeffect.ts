import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import { debugLog } from '../utils/debug.js';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://deslint.com/docs/rules/${name}`
);

export type Options = [];

export type MessageIds = 'asyncEffect';

/**
 * `useEffect(async () => { … })` is the single most common AI-generated
 * React antipattern. The contract is:
 *   useEffect(setup): setup must return undefined OR a cleanup function.
 *
 * An `async` callback returns a Promise<undefined>, which:
 *   - React doesn't treat as a cleanup, so any teardown silently doesn't
 *     run (subscription leaks, fetch races on unmount);
 *   - in React 18+ Strict Mode the effect runs twice and the in-flight
 *     promise wins the race against the second run, surfacing as
 *     "stale state" bugs that look impossible to reproduce.
 *
 * The fix is mechanical: define an inner async function and call it.
 * AI tools paste the broken form because the IIFE alternative is two
 * extra lines.
 *
 * Hooks covered:
 *   useEffect, useLayoutEffect, useInsertionEffect,
 *   useIsomorphicLayoutEffect (common community alias)
 */
const EFFECT_HOOKS: ReadonlySet<string> = new Set([
  'useEffect',
  'useLayoutEffect',
  'useInsertionEffect',
  'useIsomorphicLayoutEffect',
]);

function isAsyncFn(node: TSESTree.Node): boolean {
  if (node.type !== 'ArrowFunctionExpression' && node.type !== 'FunctionExpression') {
    return false;
  }
  return node.async === true;
}

function getCalleeName(node: TSESTree.CallExpression): string | null {
  if (node.callee.type === 'Identifier') return node.callee.name;
  if (
    node.callee.type === 'MemberExpression' &&
    node.callee.property.type === 'Identifier' &&
    !node.callee.computed
  ) {
    return node.callee.property.name;
  }
  return null;
}

export default createRule<Options, MessageIds>({
  name: 'no-async-useeffect',
  meta: {
    type: 'problem',
    docs: {
      description:
        '`useEffect(async () => …)` returns a Promise instead of a cleanup function, breaking React\'s effect contract. Define an inner async function and call it: `useEffect(() => { (async () => { … })(); }, [...])` (or pull the body into its own function and invoke it).',
    },
    schema: [],
    messages: {
      asyncEffect:
        '`{{ hook }}` was called with an `async` callback. The effect now returns a Promise, so cleanup never runs and Strict Mode\'s double-invoke produces races. Wrap the async body in an inner function and call it instead.',
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      CallExpression(node) {
        try {
          const fn = getCalleeName(node);
          if (!fn || !EFFECT_HOOKS.has(fn)) return;
          const first = node.arguments[0];
          if (!first || first.type === 'SpreadElement') return;
          if (!isAsyncFn(first as TSESTree.Node)) return;
          context.report({
            node: first as TSESTree.Node,
            messageId: 'asyncEffect',
            data: { hook: fn },
          });
        } catch (err) {
          debugLog('no-async-useeffect', err);
        }
      },
    };
  },
});
