import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import { debugLog } from '../utils/debug.js';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://deslint.com/docs/rules/${name}`
);

export type Options = [];

export type MessageIds = 'openRedirect';

/**
 * Patterns that almost always indicate the redirect target was sourced
 * from a request. Matching any of these expressions => `openRedirect`.
 *
 * Examples we want to catch:
 *   res.redirect(req.query.next)
 *   res.redirect(req.body.url)
 *   res.redirect(`/path/${req.params.id}`)
 *   ctx.redirect(req.url)
 *   reply.redirect(request.query.return_to)
 *   Response.redirect(request.headers.get("Referer"))
 *   NextResponse.redirect(request.nextUrl.searchParams.get("redirect_to"))
 */
const REQUEST_ROOTS: ReadonlySet<string> = new Set([
  'req', 'request', 'ctx', 'context', 'event',
]);

/**
 * First-level properties on the request object that are populated from
 * untrusted client input. Anything else (`req.user`, `req.pet`, `req.db`
 * etc.) is typically a server-loaded resource attached by upstream
 * middleware and is NOT an open-redirect vector — flagging those would
 * fire on the canonical "redirect to the user's own profile" shape
 * (`res.redirect('/user/' + req.user.id)`) which is the dominant
 * pattern in every Express / Fastify / Koa app on Earth.
 */
const UNTRUSTED_REQUEST_PROPS: ReadonlySet<string> = new Set([
  'query', 'body', 'params', 'headers', 'header', 'cookies',
  'url', 'originalUrl', 'path', 'rawHeaders',
  // Next.js — `request.nextUrl.searchParams.get(...)` etc.
  'nextUrl',
]);

/**
 * Common method names on a request that return user-controlled data:
 * `req.get('Referer')`, `req.header('Host')`, `request.headers.get('…')`.
 */
const UNTRUSTED_REQUEST_METHODS: ReadonlySet<string> = new Set([
  'get', 'header',
]);

function getPropertyName(prop: TSESTree.Node | null | undefined): string | null {
  if (!prop) return null;
  if (prop.type === 'Identifier') return prop.name;
  if (prop.type === 'Literal' && typeof prop.value === 'string') return prop.value;
  return null;
}

/**
 * Walk a member-expression chain back to its root identifier, collecting
 * the first property accessed off the root. Returns `{ root, firstProp }`
 * or null if the chain doesn't bottom out in an identifier.
 *
 * Example:
 *   req.query.next       → { root: 'req', firstProp: 'query' }
 *   request.body.url     → { root: 'request', firstProp: 'body' }
 *   req.user.id          → { root: 'req', firstProp: 'user' }
 *   foo.bar              → null (foo isn't a request root)
 */
function rootAndFirstProp(node: TSESTree.Node): { root: string; firstProp: string | null } | null {
  if (node.type !== 'MemberExpression') return null;
  let firstProp: string | null = null;
  let current: TSESTree.Node = node;
  while (current.type === 'MemberExpression') {
    firstProp = getPropertyName(current.property) ?? firstProp;
    current = current.object;
  }
  if (current.type !== 'Identifier') return null;
  if (!REQUEST_ROOTS.has(current.name)) return null;
  // Walk forward from the root: the FIRST property after the root is the
  // one we care about. The loop above walked outside-in so `firstProp` is
  // actually the OUTERMOST property — we need the innermost. Redo with a
  // forward walk.
  const chain: string[] = [];
  let n: TSESTree.Node = node;
  while (n.type === 'MemberExpression') {
    const p = getPropertyName(n.property);
    if (p !== null) chain.unshift(p);
    n = n.object;
  }
  return { root: current.name, firstProp: chain[0] ?? null };
}

function isRequestSourcedExpression(node: TSESTree.Node): boolean {
  if (node.type === 'MemberExpression') {
    const r = rootAndFirstProp(node);
    if (!r) return false;
    if (!r.firstProp) return false;
    return UNTRUSTED_REQUEST_PROPS.has(r.firstProp);
  }
  // request.headers.get("Authorization") / req.get('Referer')
  if (node.type === 'CallExpression') {
    // Reach into the callee. Two shapes:
    //   req.get('Referer')              → callee MemberExpr, method='get'
    //   request.headers.get('Referer')  → callee chained MemberExpr
    if (node.callee.type === 'MemberExpression') {
      const methodName = getPropertyName(node.callee.property);
      if (methodName && UNTRUSTED_REQUEST_METHODS.has(methodName)) {
        // Receiver must be request-rooted AND its first prop in the
        // untrusted set (e.g. `headers.get(...)` is untrusted; some
        // random `someService.get(...)` is not).
        const r = rootAndFirstProp(node.callee.object);
        if (r && r.firstProp && UNTRUSTED_REQUEST_PROPS.has(r.firstProp)) return true;
        // `req.get('Referer')` / `request.get('Referer')` — direct
        // method on the request root.
        const obj = node.callee.object;
        if (obj.type === 'Identifier' && REQUEST_ROOTS.has(obj.name)) return true;
      }
    }
    return isRequestSourcedExpression(node.callee);
  }
  if (node.type === 'ChainExpression') {
    return isRequestSourcedExpression(node.expression);
  }
  return false;
}

/**
 * Walk a template literal / `+` concat tree. Returns true if any operand
 * is a request-sourced expression.
 */
function expressionContainsRequestData(node: TSESTree.Node): boolean {
  if (isRequestSourcedExpression(node)) return true;
  if (node.type === 'TemplateLiteral') {
    return node.expressions.some((e) => expressionContainsRequestData(e as TSESTree.Node));
  }
  if (node.type === 'BinaryExpression' && node.operator === '+') {
    return (
      expressionContainsRequestData(node.left as TSESTree.Node) ||
      expressionContainsRequestData(node.right as TSESTree.Node)
    );
  }
  return false;
}

function getCalleeName(node: TSESTree.CallExpression): { fn: string | null; receiver: string | null } {
  if (node.callee.type === 'Identifier') return { fn: node.callee.name, receiver: null };
  if (
    node.callee.type === 'MemberExpression' &&
    node.callee.property.type === 'Identifier'
  ) {
    const receiver =
      node.callee.object.type === 'Identifier' ? node.callee.object.name : null;
    return { fn: node.callee.property.name, receiver };
  }
  return { fn: null, receiver: null };
}

export default createRule<Options, MessageIds>({
  name: 'safe-redirect',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Flag HTTP redirects whose target is derived from request input (query, body, params, headers). This is the open-redirect anti-pattern — an attacker can craft `?next=https://evil.example/login` and your site sends the user there post-auth. AI-generated route handlers leak this almost every time they introduce a `?next=` parameter without an allowlist check.',
    },
    schema: [],
    messages: {
      openRedirect:
        'Redirect target is built from `{{source}}` without validation — this is an open-redirect / phishing vector. Validate against an allowlist of internal paths/hosts or pass it through a server-side mapping.',
    },
  },
  defaultOptions: [],
  create(context) {
    function checkRedirect(callNode: TSESTree.CallExpression, fnName: string): void {
      // Most redirect APIs put the URL first; Express also supports
      // `res.redirect(status, url)` — handle both shapes.
      let urlArg: TSESTree.CallExpressionArgument | undefined;
      const first = callNode.arguments[0];
      const second = callNode.arguments[1];
      if (
        first &&
        first.type === 'Literal' &&
        typeof first.value === 'number' &&
        second
      ) {
        urlArg = second;
      } else {
        urlArg = first;
      }
      if (!urlArg || urlArg.type === 'SpreadElement') return;

      if (!expressionContainsRequestData(urlArg as TSESTree.Node)) return;

      // Try to derive a friendly source label.
      let source = 'request data';
      if (urlArg.type === 'MemberExpression') {
        const parts: string[] = [];
        let cur: TSESTree.Node = urlArg;
        while (cur.type === 'MemberExpression') {
          if (cur.property.type === 'Identifier') parts.unshift(cur.property.name);
          else if (cur.property.type === 'Literal' && typeof cur.property.value === 'string') {
            parts.unshift(cur.property.value);
          }
          cur = cur.object;
        }
        if (cur.type === 'Identifier') parts.unshift(cur.name);
        source = parts.join('.');
      }

      context.report({
        node: urlArg as TSESTree.Node,
        messageId: 'openRedirect',
        data: { source },
      });
      void fnName;
    }

    return {
      CallExpression(node) {
        try {
          const { fn } = getCalleeName(node);
          if (fn !== 'redirect') return;
          checkRedirect(node, fn);
        } catch (err) {
          debugLog('safe-redirect', err);
        }
      },
    };
  },
});
