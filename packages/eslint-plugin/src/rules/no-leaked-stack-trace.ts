import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import { debugLog } from '../utils/debug.js';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://deslint.com/docs/rules/${name}`
);

export type Options = [];
export type MessageIds = 'leakedStack' | 'leakedErrorObject';

/**
 * Catch the "build the error response inline" antipattern AI tools
 * default to:
 *
 *   res.status(500).send(err.stack)
 *   res.json({ error: err })
 *   res.json({ stack: err.stack })
 *   reply.code(500).send({ message: err.message, stack: err.stack })
 *   return new Response(err.stack, { status: 500 })          // Web/Edge
 *   return NextResponse.json({ error: err })                 // Next.js
 *
 * Each shape leaks file paths, library versions, sometimes secrets
 * embedded in error messages, and ALWAYS the internal call structure
 * an attacker can use to map the codebase.
 *
 * The rule is structural — we don't try to know which variables are
 * caught exceptions. We fire when:
 *
 *   1. A response method (`res.send`, `res.json`, `reply.send`,
 *      `response.json`, …, `new Response`, `NextResponse.json`) is
 *      called with an argument that references a `.stack` property
 *      anywhere in the expression, OR
 *   2. The argument is a plain identifier whose name is in the
 *      caught-exception convention list (`err`, `e`, `error`,
 *      `exception`, `cause`).
 *
 * Arm (2) is the louder signal — passing the WHOLE error object to
 * the client also leaks `name`, `message`, and the unredacted
 * `stack`.
 */

const RESPONSE_METHOD_NAMES: ReadonlySet<string> = new Set([
  'send', 'json', 'jsonp', 'end',
  'serialize', // some frameworks (Hapi)
]);

const RESPONSE_RECEIVERS: ReadonlySet<string> = new Set([
  'res', 'response', 'reply', 'ctx', 'context',
]);

const CAUGHT_IDENTIFIER_NAMES: ReadonlySet<string> = new Set([
  'err', 'e', 'error', 'exception', 'cause', 'caught',
]);

function getCalleeInfo(node: TSESTree.CallExpression): { fn: string | null; receiver: string | null } {
  if (node.callee.type !== 'MemberExpression' || node.callee.property.type !== 'Identifier') {
    return { fn: null, receiver: null };
  }
  const fn = node.callee.property.name;
  const obj = node.callee.object;
  let receiver: string | null = null;
  if (obj.type === 'Identifier') receiver = obj.name;
  else if (obj.type === 'MemberExpression' && obj.property.type === 'Identifier') {
    // res.status(500).json(...) — receiver of `.json` is the `status` call's
    // return value. Walk back to the actual identifier.
    let cur: TSESTree.Node = obj;
    while (cur.type === 'MemberExpression') cur = cur.object;
    if (cur.type === 'Identifier') receiver = cur.name;
    else if (cur.type === 'CallExpression') {
      // res.status(500).json(...): the deepest CallExpression's callee is the actual chain root.
      const inner = cur.callee;
      if (inner.type === 'MemberExpression' && inner.object.type === 'Identifier') {
        receiver = inner.object.name;
      }
    }
  } else if (obj.type === 'CallExpression') {
    // res.status(500).json — `.status(500)` is the CallExpression preceding .json.
    if (obj.callee.type === 'MemberExpression' && obj.callee.object.type === 'Identifier') {
      receiver = obj.callee.object.name;
    }
  }
  return { fn, receiver };
}

/** True if the expression tree contains a `.stack` property access. */
function containsStackRef(node: TSESTree.Node, depth = 0): boolean {
  if (depth > 6) return false;
  if (node.type === 'MemberExpression') {
    if (node.property.type === 'Identifier' && node.property.name === 'stack') return true;
    if (node.property.type === 'Literal' && node.property.value === 'stack') return true;
    return containsStackRef(node.object as TSESTree.Node, depth + 1);
  }
  if (node.type === 'ObjectExpression') {
    for (const prop of node.properties) {
      if (prop.type !== 'Property') continue;
      // `stack: err.stack` or `stack: someValue`
      if (
        (prop.key.type === 'Identifier' && prop.key.name === 'stack') ||
        (prop.key.type === 'Literal' && prop.key.value === 'stack')
      ) {
        return true;
      }
      if (containsStackRef(prop.value as TSESTree.Node, depth + 1)) return true;
    }
    return false;
  }
  if (node.type === 'TemplateLiteral') {
    return node.expressions.some((e) => containsStackRef(e as TSESTree.Node, depth + 1));
  }
  if (node.type === 'BinaryExpression' && node.operator === '+') {
    return (
      containsStackRef(node.left as TSESTree.Node, depth + 1) ||
      containsStackRef(node.right as TSESTree.Node, depth + 1)
    );
  }
  return false;
}

/** True if the expression is just a bare reference to a caught-exception name. */
function isBareErrorIdentifier(node: TSESTree.Node): boolean {
  return node.type === 'Identifier' && CAUGHT_IDENTIFIER_NAMES.has(node.name);
}

/** True if the expression is `{ error: err }` / `{ exception: e }` / etc. */
function isErrorWrapperObject(node: TSESTree.Node): boolean {
  if (node.type !== 'ObjectExpression') return false;
  for (const prop of node.properties) {
    if (prop.type !== 'Property') continue;
    let keyName: string | null = null;
    if (prop.key.type === 'Identifier') keyName = prop.key.name;
    else if (prop.key.type === 'Literal' && typeof prop.key.value === 'string') {
      keyName = prop.key.value;
    }
    if (!keyName) continue;
    if (keyName === 'error' || keyName === 'err' || keyName === 'exception') {
      if (isBareErrorIdentifier(prop.value as TSESTree.Node)) return true;
    }
  }
  return false;
}

export default createRule<Options, MessageIds>({
  name: 'no-leaked-stack-trace',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Flag HTTP responses that include a stack trace or the whole caught-exception object. AI-generated error handlers default to `res.status(500).send(err.stack)` or `res.json({ error: err })`, leaking file paths, library versions, embedded secrets, and the internal call graph.',
    },
    schema: [],
    messages: {
      leakedStack:
        '`{{client}}` returns a stack trace in the HTTP response — leaks file paths, library versions, and the internal call graph. Log the trace server-side; respond with a generic message (`{ "error": "internal_error" }`) or a redacted typed code.',
      leakedErrorObject:
        '`{{client}}` returns a raw caught-exception object — `name`, `message`, AND `stack` ship to the client. Send a typed error code instead.',
    },
  },
  defaultOptions: [],
  create(context) {
    function check(callNode: TSESTree.CallExpression, clientLabel: string): void {
      // Find the response arg: most APIs put it first
      // (`res.send(body)`, `res.json(body)`), but `Response`/`NextResponse`
      // shapes also fit. We scan args 0 and 1.
      for (let i = 0; i < Math.min(callNode.arguments.length, 2); i++) {
        const arg = callNode.arguments[i];
        if (!arg || arg.type === 'SpreadElement') continue;
        const argNode = arg as TSESTree.Node;
        if (isBareErrorIdentifier(argNode) || isErrorWrapperObject(argNode)) {
          context.report({
            node: argNode,
            messageId: 'leakedErrorObject',
            data: { client: clientLabel },
          });
          return;
        }
        if (containsStackRef(argNode)) {
          context.report({
            node: argNode,
            messageId: 'leakedStack',
            data: { client: clientLabel },
          });
          return;
        }
      }
    }

    return {
      CallExpression(node) {
        try {
          const { fn, receiver } = getCalleeInfo(node);
          if (fn && receiver && RESPONSE_METHOD_NAMES.has(fn) && RESPONSE_RECEIVERS.has(receiver)) {
            check(node, `${receiver}.${fn}()`);
            return;
          }
          // NextResponse.json(...) / Response.json(...) (static class form).
          if (
            node.callee.type === 'MemberExpression' &&
            node.callee.property.type === 'Identifier' &&
            (node.callee.property.name === 'json' || node.callee.property.name === 'redirect')
          ) {
            const obj = node.callee.object;
            if (
              obj.type === 'Identifier' &&
              (obj.name === 'NextResponse' || obj.name === 'Response')
            ) {
              check(node, `${obj.name}.${node.callee.property.name}()`);
              return;
            }
          }
        } catch (err) {
          debugLog('no-leaked-stack-trace', err);
        }
      },
      NewExpression(node) {
        try {
          // `new Response(err.stack, { status: 500 })` — Web standards form.
          if (
            node.callee.type === 'Identifier' &&
            (node.callee.name === 'Response' || node.callee.name === 'NextResponse')
          ) {
            const arg = node.arguments[0];
            if (!arg || arg.type === 'SpreadElement') return;
            const argNode = arg as TSESTree.Node;
            if (isBareErrorIdentifier(argNode) || isErrorWrapperObject(argNode)) {
              context.report({
                node: argNode,
                messageId: 'leakedErrorObject',
                data: { client: `new ${node.callee.name}()` },
              });
              return;
            }
            if (containsStackRef(argNode)) {
              context.report({
                node: argNode,
                messageId: 'leakedStack',
                data: { client: `new ${node.callee.name}()` },
              });
            }
          }
        } catch (err) {
          debugLog('no-leaked-stack-trace', err);
        }
      },
    };
  },
});
