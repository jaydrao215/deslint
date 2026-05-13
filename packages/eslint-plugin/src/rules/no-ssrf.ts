import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import { debugLog } from '../utils/debug.js';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://deslint.com/docs/rules/${name}`
);

export type Options = [];
export type MessageIds = 'ssrf';

/**
 * HTTP client function names. We match on name + (optional) receiver:
 *   fetch(url)
 *   axios(url) / axios.get/.post/.put/.delete/.head/.options/.patch(url, …)
 *   http.get/.request(url) / https.get/.request(url) / http2.request(url)
 *   got(url) / got.get/.post(url) / ky.get(url) / superagent.get(url)
 *   undici.fetch(url) / undici.request(url)
 *   request(url) — the legacy `request` package
 */
const HTTP_FUNCTIONS: ReadonlySet<string> = new Set([
  'fetch', 'request', 'get', 'post', 'put', 'patch', 'delete', 'head', 'options',
]);

/**
 * Receivers we recognise as HTTP clients. When the receiver matches one
 * of these, we treat the call as an outbound HTTP request regardless of
 * the method name. This is intentionally narrow — `db.get(...)` must not
 * fire, but `axios.get(...)` must.
 */
const HTTP_RECEIVERS: ReadonlySet<string> = new Set([
  'axios', 'http', 'https', 'http2', 'got', 'ky', 'superagent',
  'undici', 'needle',
  // common local aliases for `axios.create(...)`
  'client', 'httpClient', 'apiClient', 'api',
]);

/** Bare-identifier HTTP entry points (typically global or imported). */
const BARE_HTTP_NAMES: ReadonlySet<string> = new Set(['fetch']);

const REQUEST_ROOTS: ReadonlySet<string> = new Set([
  'req', 'request', 'ctx', 'context', 'event',
]);

const UNTRUSTED_REQUEST_PROPS: ReadonlySet<string> = new Set([
  'query', 'body', 'params', 'headers', 'header', 'cookies',
  'url', 'originalUrl', 'path', 'rawHeaders', 'nextUrl',
]);

function getPropertyName(node: TSESTree.Node | null | undefined): string | null {
  if (!node) return null;
  if (node.type === 'Identifier') return node.name;
  if (node.type === 'Literal' && typeof node.value === 'string') return node.value;
  return null;
}

function rootAndFirstProp(node: TSESTree.Node): { root: string; firstProp: string | null } | null {
  if (node.type !== 'MemberExpression') return null;
  const chain: string[] = [];
  let n: TSESTree.Node = node;
  while (n.type === 'MemberExpression') {
    const p = getPropertyName(n.property);
    if (p !== null) chain.unshift(p);
    n = n.object;
  }
  if (n.type !== 'Identifier') return null;
  if (!REQUEST_ROOTS.has(n.name)) return null;
  return { root: n.name, firstProp: chain[0] ?? null };
}

function isUntrustedRequestExpression(node: TSESTree.Node): boolean {
  if (node.type === 'MemberExpression') {
    const r = rootAndFirstProp(node);
    if (!r || !r.firstProp) return false;
    return UNTRUSTED_REQUEST_PROPS.has(r.firstProp);
  }
  if (node.type === 'CallExpression') {
    if (node.callee.type === 'MemberExpression') {
      const method = getPropertyName(node.callee.property);
      if (method === 'get' || method === 'header') {
        const obj = node.callee.object;
        if (obj.type === 'Identifier' && REQUEST_ROOTS.has(obj.name)) return true;
        const r = rootAndFirstProp(obj);
        if (r && r.firstProp && UNTRUSTED_REQUEST_PROPS.has(r.firstProp)) return true;
      }
    }
    return isUntrustedRequestExpression(node.callee);
  }
  if (node.type === 'ChainExpression') return isUntrustedRequestExpression(node.expression);
  return false;
}

function expressionContainsUntrusted(node: TSESTree.Node): boolean {
  if (isUntrustedRequestExpression(node)) return true;
  if (node.type === 'TemplateLiteral') {
    return node.expressions.some((e) => expressionContainsUntrusted(e as TSESTree.Node));
  }
  if (node.type === 'BinaryExpression' && node.operator === '+') {
    return (
      expressionContainsUntrusted(node.left as TSESTree.Node) ||
      expressionContainsUntrusted(node.right as TSESTree.Node)
    );
  }
  // `new URL(req.query.url, 'https://api.example.com')` — flag URLs
  // whose first arg is untrusted.
  if (node.type === 'NewExpression' && node.callee.type === 'Identifier' && node.callee.name === 'URL') {
    const first = node.arguments[0];
    if (first && first.type !== 'SpreadElement') {
      return expressionContainsUntrusted(first as TSESTree.Node);
    }
  }
  return false;
}

/**
 * Classify a CallExpression as either an HTTP-client call or not.
 *
 *   bare:        `fetch(url)` / `request(url)` — Identifier callee, name in BARE_HTTP_NAMES
 *   qualified:   `axios.get(url)` / `http.request(url)` — receiver in HTTP_RECEIVERS
 *   not-http:    everything else (including `someService.get(...)`,
 *                `this.exec(...)`, `db.get(...)` etc.)
 */
function classifyHttpCall(node: TSESTree.CallExpression): { kind: 'bare' | 'qualified' | 'not-http'; receiver: string | null } {
  if (node.callee.type === 'Identifier') {
    const name = node.callee.name;
    // `fetch(url)` is the canonical bare entry. `axios(url)`,
    // `got(url)`, `ky(url)`, etc. are also callable as bare functions —
    // treat the function name as the implicit receiver so the report
    // reads "axios()" instead of "fetch()".
    if (BARE_HTTP_NAMES.has(name)) return { kind: 'bare', receiver: null };
    if (HTTP_RECEIVERS.has(name)) return { kind: 'qualified', receiver: name };
    return { kind: 'not-http', receiver: null };
  }
  if (node.callee.type === 'MemberExpression' && node.callee.property.type === 'Identifier') {
    const methodName = node.callee.property.name;
    if (!HTTP_FUNCTIONS.has(methodName)) return { kind: 'not-http', receiver: null };

    if (node.callee.object.type !== 'Identifier') return { kind: 'not-http', receiver: null };
    const receiver = node.callee.object.name;
    if (HTTP_RECEIVERS.has(receiver)) return { kind: 'qualified', receiver };
    return { kind: 'not-http', receiver: null };
  }
  return { kind: 'not-http', receiver: null };
}

export default createRule<Options, MessageIds>({
  name: 'no-ssrf',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Flag outbound HTTP requests whose URL is derived from request input. Server-Side Request Forgery (SSRF — CWE-918) lets an attacker pivot the server into internal networks (cloud metadata, intranet IPs, localhost). AI-generated proxies and "fetch a URL the user supplies" features ship this almost every time.',
    },
    schema: [],
    messages: {
      ssrf:
        '`{{client}}` is called with a URL derived from `{{source}}` — that is a Server-Side Request Forgery (SSRF, CWE-918) vector unless the URL is validated against an allowlist of safe hosts. Block private/loopback/metadata IPs explicitly and resolve the host before fetching.',
    },
  },
  defaultOptions: [],
  create(context) {
    function reportSsrf(arg: TSESTree.Node, client: string): void {
      let source = 'request data';
      if (arg.type === 'MemberExpression') {
        const parts: string[] = [];
        let cur: TSESTree.Node = arg;
        while (cur.type === 'MemberExpression') {
          const p = getPropertyName(cur.property);
          if (p) parts.unshift(p);
          cur = cur.object;
        }
        if (cur.type === 'Identifier') parts.unshift(cur.name);
        source = parts.join('.');
      }
      context.report({ node: arg, messageId: 'ssrf', data: { client, source } });
    }

    return {
      CallExpression(node) {
        try {
          const cls = classifyHttpCall(node);
          if (cls.kind === 'not-http') return;

          const first = node.arguments[0];
          if (!first || first.type === 'SpreadElement') return;

          // `axios({ url: req.query.url })` — config-object form.
          if (first.type === 'ObjectExpression') {
            for (const prop of first.properties) {
              if (prop.type !== 'Property' || prop.computed) continue;
              const name = getPropertyName(prop.key);
              if (name !== 'url' && name !== 'uri' && name !== 'baseURL') continue;
              if (!expressionContainsUntrusted(prop.value as TSESTree.Node)) continue;
              const client =
                cls.kind === 'qualified' && cls.receiver ? `${cls.receiver}()` : 'fetch()';
              reportSsrf(prop.value as TSESTree.Node, client);
              return;
            }
            return;
          }

          if (!expressionContainsUntrusted(first as TSESTree.Node)) return;

          const calleeText =
            node.callee.type === 'Identifier'
              ? `${node.callee.name}()`
              : cls.receiver
                ? `${cls.receiver}.${
                    node.callee.type === 'MemberExpression' && node.callee.property.type === 'Identifier'
                      ? node.callee.property.name
                      : 'request'
                  }()`
                : 'http client';
          reportSsrf(first as TSESTree.Node, calleeText);
        } catch (err) {
          debugLog('no-ssrf', err);
        }
      },
    };
  },
});
