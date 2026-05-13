import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import { debugLog } from '../utils/debug.js';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://deslint.com/docs/rules/${name}`
);

export type Options = [
  {
    /** Extra module specifiers to treat as server-only. */
    extraServerModules?: string[];
  },
];

export type MessageIds = 'serverOnlyImport' | 'serverOnlyRequire';

/**
 * Modules that have no business inside a client component.
 *
 * Importing one of these into a `'use client'` file is either an outright
 * runtime error (Webpack/Turbopack still chase the import graph), a
 * subtle leak (Next.js inlines a stub but the developer thinks the code
 * runs), or a sign the developer confused which environment they're in.
 *
 * Both bare names (`fs`) and the `node:` protocol form (`node:fs`) are
 * covered. Subpath imports (`fs/promises`, `node:fs/promises`) match
 * because we prefix-match on the module name.
 */
const SERVER_ONLY_MODULES: ReadonlyArray<string> = [
  // Node core
  'fs', 'fs/promises',
  'path', 'os', 'crypto', 'child_process',
  'cluster', 'dgram', 'dns', 'net', 'tls', 'http', 'https', 'http2',
  'readline', 'repl', 'stream', 'tty', 'worker_threads', 'vm',
  'zlib', 'inspector', 'perf_hooks', 'process', 'v8', 'wasi',
  'async_hooks', 'diagnostics_channel', 'trace_events',
  'string_decoder', 'punycode', 'querystring', 'url',
  // node: protocol variants — covered by prefix match below
  // Common server-only packages
  'server-only',
  'better-sqlite3', 'sqlite3', 'mysql', 'mysql2', 'pg', 'mongodb',
  'mongoose', 'redis', 'ioredis', 'pg-pool', 'pg-native',
  '@prisma/client',
  'nodemailer', 'twilio',
  'jsonwebtoken', 'bcrypt', 'bcryptjs', 'argon2',
  // AWS / cloud SDKs — server-only by intent
  'aws-sdk', '@aws-sdk/client-s3', '@aws-sdk/client-dynamodb',
  '@aws-sdk/client-secrets-manager',
  '@google-cloud/storage', '@google-cloud/firestore',
];

function isClientFile(context: ReturnType<typeof createRule>['create'] extends (c: infer C) => any ? C : never): boolean {
  const program = context.sourceCode.ast;
  for (const stmt of program.body) {
    if (
      stmt.type === 'ExpressionStatement' &&
      stmt.expression.type === 'Literal' &&
      typeof stmt.expression.value === 'string'
    ) {
      const v = stmt.expression.value;
      if (v === 'use client') return true;
      continue;
    }
    break;
  }
  const filename =
    (context as { physicalFilename?: string }).physicalFilename ??
    context.filename ??
    (context as { getFilename?: () => string }).getFilename?.() ??
    '';
  if (/\.client\.[jt]sx?$/.test(filename)) return true;
  return false;
}

function isServerOnly(spec: string, serverOnly: ReadonlyArray<string>): string | null {
  // Strip `node:` protocol prefix for matching.
  const bare = spec.startsWith('node:') ? spec.slice(5) : spec;
  // Match exact OR subpath (`fs/promises` matches `fs`).
  for (const mod of serverOnly) {
    if (bare === mod) return mod;
    if (bare.startsWith(`${mod}/`)) return mod;
  }
  return null;
}

export default createRule<Options, MessageIds>({
  name: 'no-server-only-in-client',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Forbid imports of server-only modules (Node core `fs`/`crypto`/`child_process`/…, DB drivers, the `server-only` package) from files marked client-side (`"use client"`, `*.client.{ts,tsx,js,jsx}`). AI-generated React components routinely paste `import fs from "fs"` into a component and either crash at build time or ship a broken bundle.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          extraServerModules: {
            type: 'array',
            items: { type: 'string' },
            description: 'Extra module specifiers to treat as server-only.',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      serverOnlyImport:
        '`import … from "{{spec}}"` pulls in a server-only module ({{mod}}) from a client file. This breaks the build (or ships a bundled stub that fails at runtime). Move the logic into a server component / API route, or behind a server action.',
      serverOnlyRequire:
        '`require("{{spec}}")` resolves a server-only module ({{mod}}) inside a client file. Move the call into a server boundary.',
    },
  },
  defaultOptions: [{ extraServerModules: [] }],
  create(context, [options]) {
    const allServerOnly = [
      ...SERVER_ONLY_MODULES,
      ...(options.extraServerModules ?? []),
    ];

    let cachedClient: boolean | null = null;
    function ensureClient(): boolean {
      if (cachedClient !== null) return cachedClient;
      cachedClient = isClientFile(context);
      return cachedClient;
    }

    function checkSpecifier(spec: string, node: TSESTree.Node, isRequire: boolean): void {
      const mod = isServerOnly(spec, allServerOnly);
      if (!mod) return;
      if (!ensureClient()) return;
      context.report({
        node,
        messageId: isRequire ? 'serverOnlyRequire' : 'serverOnlyImport',
        data: { spec, mod },
      });
    }

    return {
      ImportDeclaration(node) {
        try {
          if (typeof node.source.value !== 'string') return;
          checkSpecifier(node.source.value, node, false);
        } catch (err) {
          debugLog('no-server-only-in-client', err);
        }
      },
      CallExpression(node) {
        try {
          // require("fs")
          if (
            node.callee.type === 'Identifier' &&
            node.callee.name === 'require' &&
            node.arguments.length === 1 &&
            node.arguments[0].type === 'Literal' &&
            typeof node.arguments[0].value === 'string'
          ) {
            checkSpecifier(node.arguments[0].value, node, true);
          }
        } catch (err) {
          debugLog('no-server-only-in-client', err);
        }
      },
      ImportExpression(node) {
        try {
          if (node.source.type !== 'Literal' || typeof node.source.value !== 'string') return;
          checkSpecifier(node.source.value, node as TSESTree.Node, false);
        } catch (err) {
          debugLog('no-server-only-in-client', err);
        }
      },
    };
  },
});
