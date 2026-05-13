import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import { debugLog } from '../utils/debug.js';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://deslint.com/docs/rules/${name}`
);

export type Options = [];

export type MessageIds =
  | 'weakHashAlgorithm'
  | 'mathRandomForSecurity'
  | 'weakCipher';

/** Hash algorithm names treated as broken for security use. */
const WEAK_HASHES: ReadonlySet<string> = new Set([
  'md4', 'md5', 'sha', 'sha1',
  'ripemd', 'ripemd160',
]);

/** Cipher names treated as broken for confidentiality. */
const WEAK_CIPHERS: ReadonlySet<string> = new Set([
  'des', 'des-ede', 'des-ede-cbc', 'des-ede3', 'des-ede3-cbc',
  '3des', 'des3',
  'rc2', 'rc2-cbc', 'rc2-40-cbc', 'rc2-64-cbc',
  'rc4', 'rc4-40',
  'bf', 'bf-cbc', 'bf-cfb', 'blowfish',
]);

/**
 * Identifier names that strongly suggest the value will be used as a
 * security primitive (auth token, session ID, password reset, CSRF
 * token, nonce, IV…). `Math.random()` assigned to one of these is
 * always wrong.
 */
const SECURITY_IDENTIFIERS: ReadonlySet<string> = new Set([
  'token', 'authtoken', 'apikey', 'apitoken',
  'sessionid', 'session', 'sid',
  'csrf', 'csrftoken', 'xsrf', 'xsrftoken',
  'nonce', 'iv', 'salt', 'password', 'passwd',
  'resettoken', 'verificationcode', 'verifytoken', 'otp',
  'secret', 'secretkey',
]);

function normalizeIdentifier(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function isSecurityContextName(name: string): boolean {
  return SECURITY_IDENTIFIERS.has(normalizeIdentifier(name));
}

function getStaticString(node: TSESTree.Node): string | null {
  if (node.type === 'Literal' && typeof node.value === 'string') {
    return node.value.toLowerCase();
  }
  if (node.type === 'TemplateLiteral' && node.expressions.length === 0) {
    return node.quasis.map((q) => q.value.cooked ?? '').join('').toLowerCase();
  }
  return null;
}

function getCalleeNames(node: TSESTree.CallExpression): { fn: string | null; receiver: string | null } {
  if (node.callee.type === 'Identifier') return { fn: node.callee.name, receiver: null };
  if (node.callee.type === 'MemberExpression' && node.callee.property.type === 'Identifier') {
    const receiver =
      node.callee.object.type === 'Identifier' ? node.callee.object.name : null;
    return { fn: node.callee.property.name, receiver };
  }
  return { fn: null, receiver: null };
}

/**
 * Walk the parent chain past method calls (`.toString().slice()…`) and
 * coercions (`String(…)`, `+x`, `\`${…}\``) to find what the value
 * eventually gets bound to. We stop at the first declarator / assignment
 * / object property / safe-function call.
 */
function resolveTargetName(node: TSESTree.Node): string | null {
  let current: TSESTree.Node = node;
  for (let i = 0; i < 6; i++) {
    const parent = (current as { parent?: TSESTree.Node }).parent;
    if (!parent) return null;

    if (parent.type === 'VariableDeclarator' && parent.id.type === 'Identifier') {
      return parent.id.name;
    }
    if (parent.type === 'AssignmentExpression') {
      if (parent.left.type === 'Identifier') return parent.left.name;
      if (parent.left.type === 'MemberExpression' && parent.left.property.type === 'Identifier') {
        return parent.left.property.name;
      }
      return null;
    }
    if (parent.type === 'Property' && !parent.computed) {
      if (parent.key.type === 'Identifier') return parent.key.name;
      if (parent.key.type === 'Literal' && typeof parent.key.value === 'string') return parent.key.value;
      return null;
    }

    // Climb past chained member-access / calls / template wraps.
    if (parent.type === 'MemberExpression' && parent.object === current) {
      current = parent;
      continue;
    }
    if (parent.type === 'CallExpression' && parent.callee !== current) {
      // The value is an argument to a call — that call's callee name is
      // the "target" if it looks like a security function (e.g.
      // `setSessionId(Math.random())`).
      const callee = parent.callee;
      if (callee.type === 'Identifier') return callee.name;
      if (callee.type === 'MemberExpression' && callee.property.type === 'Identifier') {
        return callee.property.name;
      }
      return null;
    }
    if (parent.type === 'CallExpression' && parent.callee === current) {
      // We're being CALLED (e.g. `Math.random()` is itself the callee of
      // some chained call) — climb past it.
      current = parent;
      continue;
    }
    if (parent.type === 'TemplateLiteral' || parent.type === 'BinaryExpression') {
      current = parent;
      continue;
    }
    return null;
  }
  return null;
}

export default createRule<Options, MessageIds>({
  name: 'no-weak-crypto',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Flag use of broken cryptographic primitives: `crypto.createHash("md5"|"sha1")`, `crypto.createCipheriv("des"|"rc4"|…)`, and `Math.random()` assigned to a security-sensitive identifier (`token`, `nonce`, `csrf`, …). AI coding tools default to whichever algorithm shows up first in their training data — that is frequently MD5/SHA-1, neither of which are collision-resistant for any modern threat model.',
    },
    schema: [],
    messages: {
      weakHashAlgorithm:
        '`{{algo}}` is cryptographically broken for security use (collisions are practical). Use `sha256`, `sha384`, `sha512`, or BLAKE2/BLAKE3 instead.',
      mathRandomForSecurity:
        '`Math.random()` is not cryptographically secure — assigning it to `{{identifier}}` produces predictable values. Use `crypto.randomBytes(n)` / `crypto.randomUUID()` / Web Crypto `getRandomValues` instead.',
      weakCipher:
        '`{{cipher}}` is a broken or deprecated cipher. Use an authenticated cipher (`aes-256-gcm`, `chacha20-poly1305`) and a fresh random IV per message.',
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      CallExpression(node) {
        try {
          const { fn } = getCalleeNames(node);
          if (!fn) return;

          // crypto.createHash("md5") / crypto.createHmac("sha1", key) — first arg is the algo.
          if (fn === 'createHash' || fn === 'createHmac') {
            const algoArg = node.arguments[0];
            if (!algoArg || algoArg.type === 'SpreadElement') return;
            const algo = getStaticString(algoArg);
            if (!algo) return;
            if (WEAK_HASHES.has(algo)) {
              context.report({
                node: algoArg as TSESTree.Node,
                messageId: 'weakHashAlgorithm',
                data: { algo },
              });
            }
            return;
          }

          // crypto.createCipheriv("des-cbc", key, iv).
          if (fn === 'createCipheriv' || fn === 'createDecipheriv' || fn === 'createCipher' || fn === 'createDecipher') {
            const algoArg = node.arguments[0];
            if (!algoArg || algoArg.type === 'SpreadElement') return;
            const algo = getStaticString(algoArg);
            if (!algo) return;
            // createCipher (no IV) is itself deprecated for every algorithm,
            // but we focus the cipher message on the broken algorithms.
            if (WEAK_CIPHERS.has(algo)) {
              context.report({
                node: algoArg as TSESTree.Node,
                messageId: 'weakCipher',
                data: { cipher: algo },
              });
            }
            return;
          }

          // Math.random() — only fires when bound to a security-sensitive identifier.
          if (
            node.callee.type === 'MemberExpression' &&
            node.callee.object.type === 'Identifier' &&
            node.callee.object.name === 'Math' &&
            node.callee.property.type === 'Identifier' &&
            node.callee.property.name === 'random'
          ) {
            const target = resolveTargetName(node);
            if (!target) return;
            if (!isSecurityContextName(target)) return;
            context.report({
              node,
              messageId: 'mathRandomForSecurity',
              data: { identifier: target },
            });
          }
        } catch (err) {
          debugLog('no-weak-crypto', err);
        }
      },
    };
  },
});
