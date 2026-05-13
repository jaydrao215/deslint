import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import { debugLog } from '../utils/debug.js';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://deslint.com/docs/rules/${name}`
);

export type Options = [];

export type MessageIds =
  | 'rejectUnauthorizedFalse'
  | 'tlsEnvDisabled'
  | 'agentInsecureTls';

/**
 * AI tools love writing `rejectUnauthorized: false` to "make it work
 * locally" against a self-signed cert. That setting then ships to
 * production and silently disables certificate validation, which
 * defeats the entire purpose of TLS. Same story for
 * `NODE_TLS_REJECT_UNAUTHORIZED = '0'` and
 * `process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'`.
 *
 * Note on test files: this rule is intentionally NOT scoped to
 * production paths. Disabling TLS verification in tests is also a
 * smell — it normalizes the pattern and the same line is one
 * search-and-replace away from production. The fix is to use a
 * test-only CA bundle, not to disable verification.
 */

function getPropertyName(node: TSESTree.Node | null | undefined): string | null {
  if (!node) return null;
  if (node.type === 'Identifier') return node.name;
  if (node.type === 'Literal' && typeof node.value === 'string') return node.value;
  return null;
}

function isLiteralFalse(node: TSESTree.Node): boolean {
  return node.type === 'Literal' && node.value === false;
}

function isStringValue(node: TSESTree.Node, value: string): boolean {
  return node.type === 'Literal' && typeof node.value === 'string' && node.value === value;
}

/**
 * Walks an ObjectExpression looking for a property whose key matches.
 * Returns the property or null. Skips computed keys and spread elements.
 */
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

export default createRule<Options, MessageIds>({
  name: 'no-disabled-tls',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Flag code that disables TLS certificate validation: `rejectUnauthorized: false`, `NODE_TLS_REJECT_UNAUTHORIZED = "0"`, and `new https.Agent({ rejectUnauthorized: false })`. Each of these turns HTTPS into "HTTP plus a vague feeling" and silently ships once a developer copy-pastes the local fix.',
    },
    schema: [],
    messages: {
      rejectUnauthorizedFalse:
        '`rejectUnauthorized: false` disables TLS certificate validation — every connection is now MITM-able. Trust a CA bundle (`ca: fs.readFileSync(...)`) or fix the underlying cert error.',
      tlsEnvDisabled:
        'Setting `NODE_TLS_REJECT_UNAUTHORIZED = "0"` disables TLS validation for the entire Node process. This is one of the most dangerous environment variables in Node.js — never set it for production code.',
      agentInsecureTls:
        '`new {{ctor}}({ rejectUnauthorized: false })` disables certificate validation for all requests on this agent. Provide a `ca` option pointing at the right CA bundle instead.',
    },
  },
  defaultOptions: [],
  create(context) {
    function checkObjectExpression(obj: TSESTree.ObjectExpression, agentCtor?: string): void {
      const prop = findProperty(obj, 'rejectUnauthorized');
      if (!prop) return;
      if (!isLiteralFalse(prop.value as TSESTree.Node)) return;
      if (agentCtor) {
        context.report({
          node: prop as TSESTree.Node,
          messageId: 'agentInsecureTls',
          data: { ctor: agentCtor },
        });
      } else {
        context.report({
          node: prop as TSESTree.Node,
          messageId: 'rejectUnauthorizedFalse',
        });
      }
    }

    return {
      // Any ObjectExpression in source code containing
      // `rejectUnauthorized: false`. We don't try to identify the
      // call site — this option means "off" in every library that
      // accepts it (axios, request, http.request, https.request,
      // fetch via undici options, node-fetch, etc.).
      ObjectExpression(node) {
        try {
          // If the parent is a NewExpression we'll handle it in the
          // NewExpression visitor so we can report the constructor name.
          const parent = (node as { parent?: TSESTree.Node }).parent;
          if (parent && parent.type === 'NewExpression') return;
          checkObjectExpression(node);
        } catch (err) {
          debugLog('no-disabled-tls', err);
        }
      },
      NewExpression(node) {
        try {
          // new https.Agent({ rejectUnauthorized: false })
          // new http.Agent({...}) — http.Agent has no TLS, but if
          // someone writes the option there we still want to flag it
          // (it's a smell).
          let ctor: string | null = null;
          if (node.callee.type === 'Identifier') ctor = node.callee.name;
          else if (
            node.callee.type === 'MemberExpression' &&
            node.callee.property.type === 'Identifier'
          ) {
            ctor = node.callee.property.name;
          }
          if (!ctor) return;
          if (ctor !== 'Agent') return;

          const opts = node.arguments[0];
          if (opts && opts.type === 'ObjectExpression') {
            // Build a friendly constructor label.
            let label = 'Agent';
            if (node.callee.type === 'MemberExpression' && node.callee.object.type === 'Identifier') {
              label = `${node.callee.object.name}.Agent`;
            }
            checkObjectExpression(opts, label);
          }
        } catch (err) {
          debugLog('no-disabled-tls', err);
        }
      },
      AssignmentExpression(node) {
        try {
          // process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"
          if (
            node.left.type === 'MemberExpression' &&
            node.left.object.type === 'MemberExpression' &&
            node.left.object.object.type === 'Identifier' &&
            node.left.object.object.name === 'process' &&
            node.left.object.property.type === 'Identifier' &&
            node.left.object.property.name === 'env' &&
            node.left.property.type === 'Identifier' &&
            node.left.property.name === 'NODE_TLS_REJECT_UNAUTHORIZED'
          ) {
            if (isStringValue(node.right as TSESTree.Node, '0')) {
              context.report({ node, messageId: 'tlsEnvDisabled' });
            }
          }
        } catch (err) {
          debugLog('no-disabled-tls', err);
        }
      },
    };
  },
});
