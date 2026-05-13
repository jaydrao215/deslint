import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import { debugLog } from '../utils/debug.js';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://deslint.com/docs/rules/${name}`
);

export type Options = [
  {
    /** Extra regex patterns (as strings) to treat as secret-shaped values. */
    extraPatterns?: string[];
    /** Identifier names that mark a value as a secret when assigned/passed (e.g. ["apiKey","token"]). */
    secretIdentifiers?: string[];
  },
];

export type MessageIds = 'secretShapedLiteral' | 'secretAssignedToIdentifier';

/**
 * Provider-specific tokens we can fingerprint with very high precision —
 * matching one of these is almost never a false positive.
 *
 * Sources:
 *   - AWS access keys:           https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_identifiers.html
 *   - GitHub PATs:               https://github.blog/2021-04-05-behind-githubs-new-authentication-token-formats/
 *   - Stripe live keys:          https://stripe.com/docs/keys
 *   - Google API keys:           https://cloud.google.com/docs/authentication/api-keys
 *   - Slack tokens:              https://api.slack.com/authentication/token-types
 *   - OpenAI / Anthropic:        sk-/sk-ant-… project keys
 *   - Private key PEM blocks:    PKCS#1 / PKCS#8 / SSH banner
 *   - JWT:                       3 base64url segments separated by `.`
 */
const HIGH_CONFIDENCE_PATTERNS: ReadonlyArray<{ id: string; re: RegExp }> = [
  // AWS access key ID
  { id: 'aws-access-key-id', re: /\bAKIA[0-9A-Z]{16}\b/ },
  // AWS temporary / role keys
  { id: 'aws-temp-key-id', re: /\b(ASIA|AGPA|AIDA|AROA|ANPA|ANVA|ABIA|ACCA)[0-9A-Z]{16}\b/ },
  // GitHub personal access tokens / fine-grained / app tokens
  { id: 'github-token', re: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/ },
  { id: 'github-fine-grained', re: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/ },
  // Stripe live secret key
  { id: 'stripe-secret', re: /\bsk_live_[A-Za-z0-9]{20,}\b/ },
  { id: 'stripe-restricted', re: /\brk_live_[A-Za-z0-9]{20,}\b/ },
  // Google API key
  { id: 'google-api-key', re: /\bAIza[0-9A-Za-z\-_]{35}\b/ },
  // Slack tokens (bot / user / app / config tokens)
  { id: 'slack-token', re: /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/ },
  // OpenAI / Anthropic project keys (best-effort — these keep evolving)
  { id: 'openai-key', re: /\bsk-(?:proj-)?[A-Za-z0-9_-]{40,}\b/ },
  { id: 'anthropic-key', re: /\bsk-ant-[A-Za-z0-9_-]{20,}\b/ },
  // PEM private key blocks
  { id: 'private-key-pem', re: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/ },
  // JWT — 3 base64url segments. Require an `eyJ` header to avoid generic
  // `a.b.c` matches; the header decodes to `{"…` for any real JWT.
  { id: 'jwt', re: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/ },
];

/**
 * Identifier names that, when used as a target for a string literal,
 * strongly suggest the literal is a secret. Used for the
 * `secretAssignedToIdentifier` arm — only fires when the literal is also
 * "non-trivial" (entropy + length), so common test fixtures like
 * `password = "x"` don't trip the rule.
 */
const DEFAULT_SECRET_IDENTIFIERS: ReadonlySet<string> = new Set([
  'apikey', 'api_key',
  'secret', 'secretkey', 'secret_key',
  'token', 'authtoken', 'auth_token', 'accesstoken', 'access_token',
  'password', 'passwd',
  'privatekey', 'private_key',
  'clientsecret', 'client_secret',
  'awssecretaccesskey', 'aws_secret_access_key',
  'sessiontoken', 'session_token',
]);

/** Identifiers that are almost always placeholders, not real secrets. */
const PLACEHOLDER_VALUES: ReadonlySet<string> = new Set([
  '', 'changeme', 'change-me', 'change_me', 'placeholder',
  'todo', 'tbd', 'fixme', 'redacted', 'x', 'xxx', 'xxxx', 'xxxxx',
  'your-secret-here', 'your_secret_here', 'your-api-key',
  'example', 'sample', 'test', 'testing', 'demo', 'dummy', 'fake', 'mock',
  'password', 'secret', 'token', 'apikey', 'api_key',
  'process.env.api_key', '<api_key>', '<secret>', '<token>',
]);

/**
 * Shannon entropy in bits/char. High entropy => suspicious random-looking
 * value; low entropy => prose-like, almost certainly not a secret.
 */
function shannonEntropy(s: string): number {
  if (s.length === 0) return 0;
  const counts = new Map<string, number>();
  for (const c of s) counts.set(c, (counts.get(c) ?? 0) + 1);
  let entropy = 0;
  for (const n of counts.values()) {
    const p = n / s.length;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

/** Looks like a high-entropy random-ish secret (≥32 chars, ≥3.5 bits/char). */
function looksLikeHighEntropySecret(s: string): boolean {
  if (s.length < 32) return false;
  // Must include at least one digit AND at least one letter — pure prose
  // sentences can hit 4 bits/char too.
  if (!/\d/.test(s)) return false;
  if (!/[A-Za-z]/.test(s)) return false;
  // Must not contain whitespace or quotes — those indicate prose / SQL / etc.
  if (/[\s"'`]/.test(s)) return false;
  return shannonEntropy(s) >= 3.5;
}

function normalizeIdentifier(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function getStringValue(node: TSESTree.Node): string | null {
  if (node.type === 'Literal' && typeof node.value === 'string') return node.value;
  if (node.type === 'TemplateLiteral' && node.expressions.length === 0) {
    return node.quasis.map((q) => q.value.cooked ?? '').join('');
  }
  return null;
}

function fingerprintSecret(value: string): string | null {
  for (const { id, re } of HIGH_CONFIDENCE_PATTERNS) {
    if (re.test(value)) return id;
  }
  return null;
}

function isPlaceholder(value: string): boolean {
  const trimmed = value.trim().toLowerCase();
  if (PLACEHOLDER_VALUES.has(trimmed)) return true;
  // Pattern-based placeholders: <…>, {{…}}, ${…}, $(…)
  if (/^[<{[($].*[>}\])]$/.test(trimmed)) return true;
  return false;
}

/**
 * Walk back through MemberExpression / Property keys to recover the
 * semantic name a literal is being bound to. Examples returned:
 *   config.apiKey = "..."         -> "apiKey"
 *   { apiKey: "..." }             -> "apiKey"
 *   const apiKey = "..."          -> "apiKey"
 *   fn({ password: "..." })       -> "password"
 *
 * Returns null when there's no useful target name (anonymous use).
 */
function resolveTargetName(node: TSESTree.Node): string | null {
  const parent = (node as { parent?: TSESTree.Node }).parent;
  if (!parent) return null;

  switch (parent.type) {
    case 'VariableDeclarator':
      if (parent.id.type === 'Identifier') return parent.id.name;
      return null;
    case 'AssignmentExpression':
      if (parent.left.type === 'Identifier') return parent.left.name;
      if (parent.left.type === 'MemberExpression' && parent.left.property.type === 'Identifier') {
        return parent.left.property.name;
      }
      return null;
    case 'Property':
      if (!parent.computed) {
        if (parent.key.type === 'Identifier') return parent.key.name;
        if (parent.key.type === 'Literal' && typeof parent.key.value === 'string') {
          return parent.key.value;
        }
      }
      return null;
    default:
      return null;
  }
}

export default createRule<Options, MessageIds>({
  name: 'no-hardcoded-secrets',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Flag hardcoded API keys, tokens, credentials, and private keys. AI coding tools routinely paste literal example secrets, leak training-data tokens, or autocomplete a value that looks plausible. This rule fires on (1) provider-specific fingerprints (AWS, GitHub, Stripe, Google, Slack, OpenAI, Anthropic, JWT, PEM) and (2) high-entropy literals assigned to a secret-named identifier.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          extraPatterns: {
            type: 'array',
            items: { type: 'string' },
            description: 'Additional regex patterns (as strings) to treat as secrets.',
          },
          secretIdentifiers: {
            type: 'array',
            items: { type: 'string' },
            description: 'Identifier names that, when assigned a high-entropy literal, mark it as a secret.',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      secretShapedLiteral:
        'Hardcoded {{kind}} detected. Move it to an environment variable or secret manager — do not commit it to source.',
      secretAssignedToIdentifier:
        'High-entropy literal assigned to `{{identifier}}` — looks like a real secret. Load it from `process.env` / a secret manager instead.',
    },
  },
  defaultOptions: [{ extraPatterns: [], secretIdentifiers: [] }],
  create(context, [options]) {
    const extraPatterns = (options.extraPatterns ?? [])
      .map((p) => {
        try {
          return new RegExp(p);
        } catch {
          return null;
        }
      })
      .filter((r): r is RegExp => r !== null);

    const secretIdentifiers = new Set<string>(DEFAULT_SECRET_IDENTIFIERS);
    for (const id of options.secretIdentifiers ?? []) {
      secretIdentifiers.add(normalizeIdentifier(id));
    }

    function checkLiteral(node: TSESTree.Node, value: string): void {
      if (value.length < 8) return;
      if (isPlaceholder(value)) return;

      // Arm 1: provider fingerprint — always reports, regardless of context.
      const kind = fingerprintSecret(value);
      if (kind) {
        context.report({
          node,
          messageId: 'secretShapedLiteral',
          data: { kind },
        });
        return;
      }

      // Arm 1b: user-supplied extra regexes
      for (const re of extraPatterns) {
        if (re.test(value)) {
          context.report({
            node,
            messageId: 'secretShapedLiteral',
            data: { kind: 'custom pattern' },
          });
          return;
        }
      }

      // Arm 2: high-entropy literal bound to a secret-named identifier.
      if (!looksLikeHighEntropySecret(value)) return;
      const target = resolveTargetName(node);
      if (!target) return;
      if (!secretIdentifiers.has(normalizeIdentifier(target))) return;

      context.report({
        node,
        messageId: 'secretAssignedToIdentifier',
        data: { identifier: target },
      });
    }

    return {
      Literal(node) {
        try {
          if (typeof node.value !== 'string') return;
          checkLiteral(node, node.value);
        } catch (err) {
          debugLog('no-hardcoded-secrets', err);
        }
      },
      TemplateLiteral(node) {
        try {
          if (node.expressions.length !== 0) return;
          const value = getStringValue(node);
          if (value === null) return;
          checkLiteral(node, value);
        } catch (err) {
          debugLog('no-hardcoded-secrets', err);
        }
      },
    };
  },
});
