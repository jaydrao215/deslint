import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import { debugLog } from '../utils/debug.js';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://deslint.com/docs/rules/${name}`
);

export type Options = [];

export type MessageIds = 'missingExpiry' | 'noneAlgorithm' | 'expiryAlreadyInPayload';

/**
 * Patterns covered:
 *
 *   jwt.sign(payload, secret)                       — no opts → no expiry
 *   jwt.sign(payload, secret, { algorithm: "..." }) — opts but no expiresIn
 *   jwt.sign(payload, secret, { algorithm: "none" }) — accept any token
 *
 * We don't try to detect `payload.exp` (a JWT claim) because that
 * encoding requires the developer to compute Unix time themselves —
 * an AI mistake of "computed wrong" is harder to detect than "missing
 * altogether," but if `exp` is present in the payload object we
 * emit `expiryAlreadyInPayload` to avoid double-warning users who
 * picked the (less recommended) manual route.
 *
 * Library coverage:
 *   - jsonwebtoken (`jwt.sign`)
 *   - jose (`new SignJWT(...).setExpirationTime(...).sign(...)`) — we
 *     don't try to track this fluently across calls; it's a different
 *     idiom and almost always sets the expiry as part of construction.
 *     If we don't find any flagging value here, jose users won't get
 *     spurious warnings.
 *   - fastify-jwt / @nestjs/jwt — both wrap jsonwebtoken; method name is
 *     still `sign` on the namespace.
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

function getCalleeInfo(node: TSESTree.CallExpression): { fn: string | null; receiver: string | null } {
  if (node.callee.type === 'Identifier') return { fn: node.callee.name, receiver: null };
  if (node.callee.type === 'MemberExpression' && node.callee.property.type === 'Identifier') {
    const receiver =
      node.callee.object.type === 'Identifier' ? node.callee.object.name : null;
    return { fn: node.callee.property.name, receiver };
  }
  return { fn: null, receiver: null };
}

/**
 * Recognise the `jwt`/`jsonwebtoken` namespace by convention. AI tools
 * import the package under any of these names (mostly `jwt`).
 */
const JWT_RECEIVERS: ReadonlySet<string> = new Set([
  'jwt', 'jsonwebtoken', 'JWT',
  'jwtService', // @nestjs/jwt
]);

export default createRule<Options, MessageIds>({
  name: 'require-jwt-expiry',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require `expiresIn` on `jwt.sign(...)` calls and forbid `algorithm: "none"`. Tokens minted without an expiry stay valid until the secret rotates — which never happens — turning every leaked token into permanent access. AI-generated auth code routinely ships this.',
    },
    schema: [],
    messages: {
      missingExpiry:
        '`jwt.sign(...)` is missing `expiresIn` — tokens minted here never expire. Add `{ expiresIn: "15m" }` (or a value appropriate to the audience).',
      noneAlgorithm:
        '`algorithm: "none"` accepts unsigned tokens — that means any base64-encoded JSON header.payload becomes a valid auth credential. Use `HS256`/`RS256`/`ES256` instead.',
      expiryAlreadyInPayload:
        'The JWT payload sets `exp` directly but the `jwt.sign` options skip `expiresIn`. Prefer the options form so the library validates the value; setting `exp` manually is easy to get wrong (unit confusion between ms and seconds).',
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      CallExpression(node) {
        try {
          const { fn, receiver } = getCalleeInfo(node);
          if (fn !== 'sign') return;
          if (receiver === null || !JWT_RECEIVERS.has(receiver)) return;

          const payload = node.arguments[0];
          const opts = node.arguments[2];

          // No options object at all → no expiresIn for sure.
          if (!opts || opts.type !== 'ObjectExpression') {
            // Distinguish: did the developer set `exp` on the payload
            // instead? Emit a softer message if so.
            if (
              payload &&
              payload.type === 'ObjectExpression' &&
              findProperty(payload, 'exp')
            ) {
              context.report({ node, messageId: 'expiryAlreadyInPayload' });
              return;
            }
            context.report({ node, messageId: 'missingExpiry' });
            return;
          }

          // algorithm: "none" — fire even if expiresIn is set, because
          // unsigned tokens are wildly worse than expiring ones.
          const algoProp = findProperty(opts, 'algorithm');
          if (
            algoProp &&
            algoProp.value.type === 'Literal' &&
            typeof algoProp.value.value === 'string' &&
            algoProp.value.value.toLowerCase() === 'none'
          ) {
            context.report({ node: algoProp as TSESTree.Node, messageId: 'noneAlgorithm' });
            return;
          }

          const expProp = findProperty(opts, 'expiresIn');
          if (!expProp) {
            // Also check `notBefore` + payload.exp, but at this point
            // the simplest heuristic is: no expiresIn = report.
            if (
              payload &&
              payload.type === 'ObjectExpression' &&
              findProperty(payload, 'exp')
            ) {
              context.report({ node, messageId: 'expiryAlreadyInPayload' });
              return;
            }
            context.report({ node: opts, messageId: 'missingExpiry' });
          }
        } catch (err) {
          debugLog('require-jwt-expiry', err);
        }
      },
    };
  },
});
