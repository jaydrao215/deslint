import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import { debugLog } from '../utils/debug.js';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://deslint.com/docs/rules/${name}`
);

export type Options = [];

export type MessageIds =
  | 'wildcardWithCredentials'
  | 'reflectiveOrigin'
  | 'wildcardHeader';

/**
 * Detect the two most common AI-generated CORS misconfigurations:
 *
 * 1. `cors({ origin: '*', credentials: true })` and equivalents.
 *    Browsers refuse to send cookies with `Access-Control-Allow-Origin:
 *    *`, but they DO send them with `Access-Control-Allow-Origin:
 *    <reflected-origin>` when `credentials: true`. AI tools paste this
 *    pattern thinking it's "the permissive default"; in practice it's
 *    a CSRF turbo button.
 *
 * 2. `origin: (origin, cb) => cb(null, true)` — reflect-any-origin with
 *    credentials. Same outcome as above; the reviewer thinks they're
 *    "validating" because the option has a callback.
 *
 * 3. Manual header setting: `res.setHeader('Access-Control-Allow-Origin',
 *    '*')` paired with `'Access-Control-Allow-Credentials', 'true'`.
 */

function getPropertyName(node: TSESTree.Node | null | undefined): string | null {
  if (!node) return null;
  if (node.type === 'Identifier') return node.name;
  if (node.type === 'Literal' && typeof node.value === 'string') return node.value;
  return null;
}

function findProperty(
  obj: TSESTree.ObjectExpression,
  name: string,
): TSESTree.Property | null {
  for (const prop of obj.properties) {
    if (prop.type !== 'Property' || prop.computed) continue;
    if (getPropertyName(prop.key) === name) return prop;
  }
  return null;
}

function isLiteralTrue(node: TSESTree.Node): boolean {
  return node.type === 'Literal' && node.value === true;
}

function isLiteralString(node: TSESTree.Node, target: string): boolean {
  return node.type === 'Literal' && typeof node.value === 'string' && node.value === target;
}

/**
 * Returns true if the value is the literal string `"*"` or an array
 * that includes `"*"`. (`["*", "https://example.com"]` is just as
 * dangerous as a bare `"*"`.)
 */
function isWildcardOrigin(node: TSESTree.Node): boolean {
  if (isLiteralString(node, '*')) return true;
  if (node.type === 'ArrayExpression') {
    return node.elements.some(
      (el) => el !== null && el.type !== 'SpreadElement' && isLiteralString(el as TSESTree.Node, '*'),
    );
  }
  return false;
}

/**
 * True for arrow / function expressions whose body unconditionally
 * calls back with `(null, true)` or returns `true`. This is the
 * "reflect any origin" antipattern.
 */
function isReflectAnyOriginFunction(node: TSESTree.Node): boolean {
  if (node.type !== 'ArrowFunctionExpression' && node.type !== 'FunctionExpression') return false;
  const body = node.body;
  // Arrow expression body: `(origin, cb) => cb(null, true)`
  if (body.type === 'CallExpression') {
    const args = body.arguments;
    if (
      args.length >= 2 &&
      args[0].type === 'Literal' && args[0].value === null &&
      args[1].type === 'Literal' && args[1].value === true
    ) {
      return true;
    }
  }
  // Block body: look for the same call as the only meaningful statement,
  // or a `return true;`
  if (body.type === 'BlockStatement') {
    const stmts = body.body;
    for (const s of stmts) {
      if (s.type === 'ReturnStatement' && s.argument && isLiteralTrue(s.argument)) return true;
      if (
        s.type === 'ExpressionStatement' &&
        s.expression.type === 'CallExpression'
      ) {
        const call = s.expression;
        const args = call.arguments;
        if (
          args.length >= 2 &&
          args[0].type === 'Literal' && args[0].value === null &&
          args[1].type === 'Literal' && args[1].value === true
        ) {
          return true;
        }
      }
    }
  }
  return false;
}

export default createRule<Options, MessageIds>({
  name: 'no-permissive-cors',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Flag dangerously permissive CORS configurations: wildcard origin with credentials, reflect-any-origin callbacks, and `Access-Control-Allow-Origin: *` paired with credentials. AI coding tools paste these constantly because they "fix the CORS error" — at the cost of opening the site up to drive-by CSRF.',
    },
    schema: [],
    messages: {
      wildcardWithCredentials:
        '`cors()` is configured with `origin: "*"` AND `credentials: true` — browsers reflect the caller\'s origin when credentials are enabled, so this is functionally "allow any site to make authenticated requests on the user\'s behalf." Use a fixed allowlist of origins.',
      reflectiveOrigin:
        '`cors()` is configured to reflect any origin (`origin: (o, cb) => cb(null, true)`) with `credentials: true`. That defeats the same-origin policy. Replace the callback with an explicit allowlist of origins.',
      wildcardHeader:
        '`Access-Control-Allow-Origin: *` paired with `Access-Control-Allow-Credentials: true` is rejected by browsers but is also a sign the code is trying to be maximally permissive. Set a fixed origin, or pick one of the credentialed/non-credentialed paths — not both.',
    },
  },
  defaultOptions: [],
  create(context) {
    /**
     * `cors({ ... })` — detect the bad option combos. `cors()` with no
     * args defaults to `origin: '*'` WITHOUT credentials, which the
     * spec allows; we don't flag that.
     */
    function checkCorsCall(node: TSESTree.CallExpression): void {
      const arg = node.arguments[0];
      if (!arg || arg.type !== 'ObjectExpression') return;

      const originProp = findProperty(arg, 'origin');
      const credentialsProp = findProperty(arg, 'credentials');

      const credentialsTrue =
        credentialsProp !== null && isLiteralTrue(credentialsProp.value as TSESTree.Node);

      if (!credentialsTrue) return; // credentials false / missing → not the dangerous shape

      if (originProp && isWildcardOrigin(originProp.value as TSESTree.Node)) {
        context.report({ node: arg, messageId: 'wildcardWithCredentials' });
        return;
      }
      if (originProp && isReflectAnyOriginFunction(originProp.value as TSESTree.Node)) {
        context.report({ node: arg, messageId: 'reflectiveOrigin' });
        return;
      }
      // `origin: true` (literal) — same effect as the reflect callback.
      if (originProp && isLiteralTrue(originProp.value as TSESTree.Node)) {
        context.report({ node: arg, messageId: 'reflectiveOrigin' });
      }
    }

    /**
     * `res.setHeader('Access-Control-Allow-Origin', '*')` — track
     * within a single function scope whether we've seen the wildcard
     * origin header AND the credentials-true header. If we see both,
     * report at the credentials line.
     *
     * This is a per-function flag rather than a whole-file flag so
     * unrelated handlers in the same file don't pollute one another.
     */
    type FrameState = { wildcardSeen: boolean; credentialsSeen: TSESTree.Node | null };
    const frameStack: FrameState[] = [{ wildcardSeen: false, credentialsSeen: null }];

    function pushFrame(): void {
      frameStack.push({ wildcardSeen: false, credentialsSeen: null });
    }
    function popFrame(): void {
      if (frameStack.length > 1) frameStack.pop();
    }
    function currentFrame(): FrameState {
      return frameStack[frameStack.length - 1];
    }

    function checkSetHeader(node: TSESTree.CallExpression): void {
      const args = node.arguments;
      if (args.length < 2) return;
      const headerArg = args[0];
      const valueArg = args[1];
      if (headerArg.type !== 'Literal' || typeof headerArg.value !== 'string') return;
      if (valueArg.type !== 'Literal') return;
      const header = headerArg.value.toLowerCase();
      const value = String(valueArg.value).toLowerCase();
      if (header === 'access-control-allow-origin' && value === '*') {
        currentFrame().wildcardSeen = true;
      } else if (header === 'access-control-allow-credentials' && value === 'true') {
        currentFrame().credentialsSeen = node;
      }
      const f = currentFrame();
      if (f.wildcardSeen && f.credentialsSeen) {
        context.report({ node: f.credentialsSeen, messageId: 'wildcardHeader' });
        // Don't report again for this frame.
        f.credentialsSeen = null;
        f.wildcardSeen = false;
      }
    }

    return {
      FunctionDeclaration: pushFrame,
      'FunctionDeclaration:exit': popFrame,
      FunctionExpression: pushFrame,
      'FunctionExpression:exit': popFrame,
      ArrowFunctionExpression: pushFrame,
      'ArrowFunctionExpression:exit': popFrame,
      CallExpression(node) {
        try {
          // `cors({...})` — Identifier callee named "cors".
          if (node.callee.type === 'Identifier' && node.callee.name === 'cors') {
            checkCorsCall(node);
            return;
          }
          // `res.setHeader(...)` / `response.setHeader(...)`.
          if (
            node.callee.type === 'MemberExpression' &&
            node.callee.property.type === 'Identifier' &&
            node.callee.property.name === 'setHeader'
          ) {
            checkSetHeader(node);
          }
        } catch (err) {
          debugLog('no-permissive-cors', err);
        }
      },
    };
  },
});
