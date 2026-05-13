import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import { debugLog } from '../utils/debug.js';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://deslint.com/docs/rules/${name}`
);

export type Options = [];

export type MessageIds =
  | 'missingHttpOnly'
  | 'missingSecure'
  | 'missingSameSite'
  | 'insecureSession';

/**
 * Receiver names we treat as a response/cookie-jar object.
 *
 *   res.cookie(name, value, opts)        — Express
 *   reply.setCookie(name, value, opts)   — Fastify, Hapi
 *   cookies().set('name', value, opts)   — Next.js
 *   response.cookies.set(...)            — Next.js Response
 *   ctx.cookies.set(...)                 — Koa
 *
 * We dispatch on the method name. The receiver mostly disambiguates
 * which form we're in — for the message we only need to know which arg
 * holds the options object.
 */
const COOKIE_METHODS: ReadonlySet<string> = new Set([
  'cookie',          // Express: res.cookie(name, value, opts)
  'setCookie',       // Fastify: reply.setCookie(name, value, opts)
  'set',             // Next.js / Koa: cookies.set(name, value, opts)
  'append',          // Hapi-style append
]);

interface CookieFlags {
  httpOnly: boolean;
  secure: boolean;
  sameSite: boolean;
}

function getPropertyName(node: TSESTree.Node | null | undefined): string | null {
  if (!node) return null;
  if (node.type === 'Identifier') return node.name;
  if (node.type === 'Literal' && typeof node.value === 'string') return node.value;
  return null;
}

function findOptionsObject(
  args: ReadonlyArray<TSESTree.CallExpressionArgument>,
  startIndex: number,
): TSESTree.ObjectExpression | null {
  for (let i = startIndex; i < args.length; i++) {
    const a = args[i];
    if (a && a.type === 'ObjectExpression') return a;
  }
  return null;
}

function readCookieFlags(obj: TSESTree.ObjectExpression): CookieFlags {
  const out: CookieFlags = { httpOnly: false, secure: false, sameSite: false };
  for (const prop of obj.properties) {
    if (prop.type !== 'Property' || prop.computed) continue;
    const name = getPropertyName(prop.key);
    if (!name) continue;
    const lower = name.toLowerCase();
    if (lower === 'httponly') {
      if (prop.value.type === 'Literal' && prop.value.value === true) out.httpOnly = true;
      // any other shape: dynamic — give the benefit of the doubt
      else if (prop.value.type !== 'Literal') out.httpOnly = true;
    } else if (lower === 'secure') {
      if (prop.value.type === 'Literal' && prop.value.value === true) out.secure = true;
      else if (prop.value.type !== 'Literal') out.secure = true;
    } else if (lower === 'samesite') {
      // Any non-falsy value means it's set explicitly.
      if (prop.value.type === 'Literal') {
        const v = prop.value.value;
        if (v !== false && v !== null && v !== undefined && v !== '') out.sameSite = true;
      } else {
        out.sameSite = true;
      }
    }
  }
  return out;
}

/**
 * Pull the cookie name out of the call's first arg if it's a literal.
 * Used to identify session cookies (`session`, `sid`, `connect.sid`,
 * `next-auth.session-token`, …) which get the louder `insecureSession`
 * message because losing those flags is direct session hijack.
 */
function getCookieName(
  args: ReadonlyArray<TSESTree.CallExpressionArgument>,
  optionsObj: TSESTree.ObjectExpression | null,
): string | null {
  const first = args[0];
  if (first && first.type === 'Literal' && typeof first.value === 'string') return first.value;
  // Object form: `cookies().set({ name: "session", value: …, … })`.
  if (optionsObj) {
    for (const prop of optionsObj.properties) {
      if (prop.type !== 'Property' || prop.computed) continue;
      const k = getPropertyName(prop.key);
      if (k !== 'name') continue;
      if (prop.value.type === 'Literal' && typeof prop.value.value === 'string') {
        return prop.value.value;
      }
    }
  }
  return null;
}

const SESSION_COOKIE_NAMES: ReadonlySet<string> = new Set([
  'session', 'sid', 'sess', 'sessionid', 'session_id',
  'connect.sid', 'koa:sess', 'koa.sess',
  'jwt', 'token', 'auth', 'auth_token', 'authtoken',
  'access_token', 'accesstoken', 'refresh_token', 'refreshtoken',
  'next-auth.session-token', '__session', '__host-session',
]);

function isSessionCookieName(name: string): boolean {
  const lower = name.toLowerCase();
  if (SESSION_COOKIE_NAMES.has(lower)) return true;
  return /sess|token|auth/.test(lower);
}

/**
 * Returns the function name and an "immediate receiver" label. The
 * label is whatever appears directly before the dot in `<X>.<fn>(...)`:
 *
 *   res.cookie(...)                    → { fn: 'cookie',     receiver: 'res' }
 *   ctx.cookies.set(...)               → { fn: 'set',        receiver: 'cookies' }
 *   cookies().set(...)                 → { fn: 'set',        receiver: 'cookies' }
 *   (await cookies()).set(...)         → { fn: 'set',        receiver: 'cookies' }
 *   response.cookies.set(...)          → { fn: 'set',        receiver: 'cookies' }
 *
 * This is what callers want for "is the object on the left a cookie jar
 * by convention?" — they don't care whether it's a deeper chain.
 */
function getCalleeInfo(node: TSESTree.CallExpression): { fn: string | null; receiver: string | null } {
  if (node.callee.type === 'Identifier') return { fn: node.callee.name, receiver: null };
  if (node.callee.type !== 'MemberExpression' || node.callee.property.type !== 'Identifier') {
    return { fn: null, receiver: null };
  }
  const fn = node.callee.property.name;
  const obj = node.callee.object;
  let receiver: string | null = null;
  if (obj.type === 'Identifier') {
    receiver = obj.name;
  } else if (obj.type === 'MemberExpression' && obj.property.type === 'Identifier') {
    receiver = obj.property.name;
  } else if (obj.type === 'CallExpression') {
    // `cookies().set(...)` — the receiver is whatever `cookies()`
    // resolves to. Use the callable's name.
    if (obj.callee.type === 'Identifier') receiver = obj.callee.name;
    else if (obj.callee.type === 'MemberExpression' && obj.callee.property.type === 'Identifier') {
      receiver = obj.callee.property.name;
    }
  } else if (obj.type === 'AwaitExpression') {
    // (await cookies()).set(...) — treat the awaited expression the
    // same as the un-awaited form.
    const inner = obj.argument;
    if (inner.type === 'CallExpression' && inner.callee.type === 'Identifier') {
      receiver = inner.callee.name;
    }
  }
  return { fn, receiver };
}

/**
 * Receivers we recognise as cookie jars. Bare `set(...)` is too generic
 * to flag, so we require a receiver. We accept any of these names as
 * the receiver of a cookie-setting method.
 *
 * `cookie` is included so `req.cookies.set(...)` and `cookies().set(...)`
 * both work.
 */
const COOKIE_RECEIVERS: ReadonlySet<string> = new Set([
  'res', 'response', 'reply', 'ctx', 'context',
  'cookies', 'cookie', 'cookieJar',
]);

export default createRule<Options, MessageIds>({
  name: 'secure-cookies',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require `httpOnly`, `secure`, and `sameSite` on `res.cookie` / `reply.setCookie` / `cookies().set`. AI-generated session-management code routinely sets cookies without any of these flags, leaving the session token readable from JavaScript (XSS-stealable) and replayable over HTTP. Maps to OWASP A05:2021.',
    },
    schema: [],
    messages: {
      missingHttpOnly:
        'Cookie `{{name}}` is set without `httpOnly: true` — JavaScript can read it, so any XSS becomes session theft. Add `httpOnly: true` to the cookie options.',
      missingSecure:
        'Cookie `{{name}}` is set without `secure: true` — the cookie will be sent over plain HTTP and can be intercepted on the wire. Add `secure: true` (and use HTTPS).',
      missingSameSite:
        'Cookie `{{name}}` is set without `sameSite` — vulnerable to CSRF when the cookie is sent on cross-site requests. Use `sameSite: "lax"` (or `"strict"` for session cookies).',
      insecureSession:
        'Session-shaped cookie `{{name}}` is missing required security flags ({{missing}}). Session cookies MUST set `httpOnly`, `secure`, AND `sameSite`.',
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      CallExpression(node) {
        try {
          const { fn, receiver } = getCalleeInfo(node);
          if (!fn || !COOKIE_METHODS.has(fn)) return;

          // For `cookie` specifically, allow the receiver to be a chained
          // call (e.g. `cookies().set(...)` — `cookies()` returns the jar
          // and is itself a CallExpression). Otherwise require a known
          // receiver name to avoid `someState.set(...)` collisions.
          if (receiver === null) {
            // Identifier callee — only `cookie` is a global by convention
            // in some Express-extensions; we don't fire on it without an
            // explicit receiver to stay quiet.
            return;
          }
          if (!COOKIE_RECEIVERS.has(receiver)) return;

          // `set` is shared across cookie jars AND generic Express
          // header setters (`res.set('Allow', body)`). Restrict the
          // bare `set` to actual cookie-jar receivers — `cookies`,
          // `cookie`, `cookieJar` — so generic response/reply receivers
          // only match `cookie`/`setCookie`/`append`.
          if (fn === 'set') {
            const cookieJarReceivers = new Set<string>(['cookies', 'cookie', 'cookieJar']);
            if (!cookieJarReceivers.has(receiver)) return;
          }

          // Options object: arg index depends on the method shape.
          //   res.cookie(name, value, opts)     → arg 2
          //   reply.setCookie(name, value, opts) → arg 2
          //   cookies().set(name, value, opts)   → arg 2
          //   cookies().set({ name, value, ...opts }) → arg 0 (object form)
          let options: TSESTree.ObjectExpression | null = null;
          if (fn === 'set' || fn === 'cookie' || fn === 'setCookie' || fn === 'append') {
            // Try arg 2 first (most common), fall back to arg 0 if it's an object
            // (the Next.js `cookies.set({ name, value, httpOnly })` shape).
            options = findOptionsObject(node.arguments, 2);
            if (!options) {
              const first = node.arguments[0];
              if (first && first.type === 'ObjectExpression') {
                options = first;
              }
            }
          }

          const cookieName = getCookieName(node.arguments, options) ?? '<dynamic>';

          // UI-flag cookies that carry a primitive literal (`1`, `0`,
          // `true`, `'on'`, `'off'`, etc.) are not auth credentials.
          // We stay quiet on these for `missingHttpOnly`/`missingSecure`
          // because flagging them dominates demo code; for session-shape
          // names we still fire because session tokens routinely look
          // like a string opaquely (`'sess_…'`) but are still credentials.
          const valueArg = node.arguments[1];
          const valueIsTrivial =
            valueArg !== undefined &&
            valueArg.type === 'Literal' &&
            (typeof valueArg.value === 'number' ||
              typeof valueArg.value === 'boolean' ||
              (typeof valueArg.value === 'string' && valueArg.value.length <= 8));
          const isSession = cookieName !== '<dynamic>' && isSessionCookieName(cookieName);
          if (valueIsTrivial && !isSession) return;
          const flags = options ? readCookieFlags(options) : { httpOnly: false, secure: false, sameSite: false };

          const missing: string[] = [];
          if (!flags.httpOnly) missing.push('httpOnly');
          if (!flags.secure) missing.push('secure');
          if (!flags.sameSite) missing.push('sameSite');

          if (missing.length === 0) return;

          // Session-shaped cookie: emit the louder consolidated message.
          if (cookieName !== '<dynamic>' && isSessionCookieName(cookieName)) {
            context.report({
              node,
              messageId: 'insecureSession',
              data: { name: cookieName, missing: missing.join(', ') },
            });
            return;
          }

          // Otherwise emit one message per missing flag, prioritising in
          // severity order: httpOnly first (XSS), secure next, sameSite last.
          const reportNode = (options as TSESTree.Node | null) ?? (node as TSESTree.Node);
          if (!flags.httpOnly) {
            context.report({ node: reportNode, messageId: 'missingHttpOnly', data: { name: cookieName } });
            return;
          }
          if (!flags.secure) {
            context.report({ node: reportNode, messageId: 'missingSecure', data: { name: cookieName } });
            return;
          }
          if (!flags.sameSite) {
            context.report({ node: reportNode, messageId: 'missingSameSite', data: { name: cookieName } });
            return;
          }
        } catch (err) {
          debugLog('secure-cookies', err);
        }
      },
    };
  },
});
