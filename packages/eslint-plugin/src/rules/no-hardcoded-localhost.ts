import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import { debugLog } from '../utils/debug.js';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://deslint.com/docs/rules/${name}`
);

export type Options = [
  {
    /** Extra hostnames to treat as local-only. */
    extraHosts?: string[];
  },
];

export type MessageIds = 'hardcodedLocalhost';

/**
 * Hosts that should never appear hardcoded in code that flows to a
 * production runtime. AI tools paste these straight from local-dev
 * curl commands.
 */
const LOCAL_HOSTS: ReadonlySet<string> = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '[::1]', '::1',
  '[::]', '::',
  // Local network conventions
  'host.docker.internal',
  'kubernetes.docker.internal',
]);

/**
 * Match against the host portion of a URL. We support:
 *
 *   http://localhost:3000/api
 *   https://127.0.0.1
 *   ws://0.0.0.0:8080/socket
 *   //localhost:3000/api          (protocol-relative)
 *   localhost:3000                (no protocol, when used in fetch/URL ctor)
 *
 * The bare-hostname form (`fetch('localhost:3000')`) only fires when
 * the string is passed to a URL-shaped sink — see the call-site logic.
 */
function extractHost(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  // Full URL with scheme.
  const schemed = /^([a-z][a-z0-9+.\-]*:)?\/\/([^/?#]+)/i.exec(trimmed);
  if (schemed) {
    const authority = schemed[2];
    // Strip user-info if present.
    const at = authority.lastIndexOf('@');
    const hostPort = at >= 0 ? authority.slice(at + 1) : authority;
    return stripPort(hostPort);
  }
  // Bare `localhost:3000` / `127.0.0.1` form. We only treat as a URL
  // host when the caller's context (e.g. a fetch arg) demands it; the
  // caller side handles that by setting `bareHostAllowed`.
  if (/^[a-zA-Z0-9._\-[\]:]+(?::\d+)?$/.test(trimmed)) {
    return stripPort(trimmed);
  }
  return null;
}

function stripPort(hostPort: string): string {
  // Handle IPv6 in brackets: [::1]:3000
  if (hostPort.startsWith('[')) {
    const closing = hostPort.indexOf(']');
    if (closing < 0) return hostPort;
    return hostPort.slice(0, closing + 1);
  }
  const colon = hostPort.lastIndexOf(':');
  if (colon < 0) return hostPort;
  // Don't strip if everything after the colon isn't digits.
  if (/^\d+$/.test(hostPort.slice(colon + 1))) return hostPort.slice(0, colon);
  return hostPort;
}

const URL_SINK_NAMES: ReadonlySet<string> = new Set([
  'fetch', 'axios', 'got', 'ky', 'request',
  'get', 'post', 'put', 'patch', 'delete', 'head', 'options',
]);

function getStaticString(node: TSESTree.Node): string | null {
  if (node.type === 'Literal' && typeof node.value === 'string') return node.value;
  if (node.type === 'TemplateLiteral' && node.expressions.length === 0) {
    return node.quasis.map((q) => q.value.cooked ?? '').join('');
  }
  return null;
}

function isInsideTestPath(filename: string): boolean {
  if (!filename) return false;
  return /\b(?:test|tests|__tests__|spec|specs|fixtures|e2e|playwright|cypress)\b/i.test(filename) ||
    /\.(test|spec)\.[jt]sx?$/.test(filename);
}

export default createRule<Options, MessageIds>({
  name: 'no-hardcoded-localhost',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Flag hardcoded `localhost` / `127.0.0.1` / `0.0.0.0` URLs in source code that ship to production. AI coding tools paste these from local curl tests; the result is a feature that 404s every real user. Test/fixture files are exempt.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          extraHosts: {
            type: 'array',
            items: { type: 'string' },
            description: 'Extra hostnames to treat as local-only.',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      hardcodedLocalhost:
        '`{{value}}` is a local-only address ({{host}}) hardcoded in source. AI-pasted from a curl test? Move it to an env var (e.g. `process.env.API_URL`) so the URL changes by environment.',
    },
  },
  defaultOptions: [{ extraHosts: [] }],
  create(context, [options]) {
    const filename =
      (context as unknown as { physicalFilename?: string }).physicalFilename ??
      context.filename ??
      '';
    if (isInsideTestPath(filename)) {
      // Tests routinely hit localhost — staying quiet is the right call.
      return {};
    }

    const extra = new Set<string>(options.extraHosts ?? []);
    function isLocalHost(host: string): boolean {
      const h = host.toLowerCase();
      if (LOCAL_HOSTS.has(h)) return true;
      return extra.has(h);
    }

    /**
     * Check a static string value for an embedded local URL. Returns
     * the host if found, null otherwise.
     */
    function findLocalHost(value: string, bareHostAllowed: boolean): string | null {
      // Strip leading/trailing whitespace.
      const t = value.trim();
      if (!t) return null;

      // Skip obvious documentation strings (e.g. JSDoc examples).
      // Those would be inside template literals usually, but we already
      // only inspect static strings, so this filter is light.
      if (t.includes(' ')) {
        // A URL with whitespace isn't a URL. Could still be an inline
        // mention; we only match exact URL substrings via regex.
        const urlRe = /(?:^|[^a-zA-Z0-9])((?:https?|ws|wss):\/\/[^\s'"`<>]+)/gi;
        let match;
        while ((match = urlRe.exec(t)) !== null) {
          const host = extractHost(match[1]);
          if (host && isLocalHost(host)) return host;
        }
        return null;
      }

      // Try as a full URL first.
      const host = extractHost(t);
      if (host && isLocalHost(host)) {
        // For the bare-host form (no scheme), only fire when the call
        // site explicitly demands a URL — otherwise lots of innocuous
        // host-port pairs slip through.
        const hasScheme = /^[a-z][a-z0-9+.\-]*:/i.test(t) || t.startsWith('//');
        if (!hasScheme && !bareHostAllowed) return null;
        return host;
      }
      return null;
    }

    function checkLiteral(node: TSESTree.Node, value: string, bareHostAllowed: boolean): void {
      const host = findLocalHost(value, bareHostAllowed);
      if (!host) return;
      context.report({
        node,
        messageId: 'hardcodedLocalhost',
        data: { value: value.length > 64 ? value.slice(0, 61) + '…' : value, host },
      });
    }

    return {
      Literal(node) {
        try {
          if (typeof node.value !== 'string') return;
          // Whether the caller context implies the string is a URL.
          const parent = (node as unknown as { parent?: TSESTree.Node }).parent;
          let bareHostAllowed = false;
          if (parent) {
            if (parent.type === 'CallExpression' && parent.arguments[0] === node) {
              const callee = parent.callee;
              if (callee.type === 'Identifier' && URL_SINK_NAMES.has(callee.name)) {
                bareHostAllowed = true;
              } else if (
                callee.type === 'MemberExpression' &&
                callee.property.type === 'Identifier' &&
                URL_SINK_NAMES.has(callee.property.name)
              ) {
                bareHostAllowed = true;
              }
            }
            if (parent.type === 'NewExpression' && parent.callee.type === 'Identifier' && parent.callee.name === 'URL') {
              bareHostAllowed = true;
            }
          }
          checkLiteral(node, node.value, bareHostAllowed);
        } catch (err) {
          debugLog('no-hardcoded-localhost', err);
        }
      },
      TemplateLiteral(node) {
        try {
          if (node.expressions.length !== 0) return;
          const value = getStaticString(node);
          if (value === null) return;
          checkLiteral(node, value, false);
        } catch (err) {
          debugLog('no-hardcoded-localhost', err);
        }
      },
    };
  },
});
