import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import { debugLog } from '../utils/debug.js';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://deslint.com/docs/rules/${name}`
);

export type Options = [
  {
    /** Additional prefixes to consider client-safe (e.g. `STORYBOOK_`). */
    extraPublicPrefixes?: string[];
  },
];

export type MessageIds = 'leakedEnv' | 'unmarkedEnvInClientFile';

/**
 * Catch the pattern where AI-generated code references a server-only
 * environment variable from a client-side file. Three signals decide
 * "client":
 *
 *   1. The file starts with `'use client'` or `"use client"` (Next.js
 *      App Router).
 *   2. The file path looks client-side (.client.{tsx,jsx,ts,js},
 *      `pages/_app.{tsx,jsx}`, `pages/_document.{tsx,jsx}` excluded).
 *   3. The file imports from `react-dom/client`, `react-dom/server` —
 *      these are runtime markers.
 *
 * (1) is the dominant signal; the others are a small safety net for
 * teams that mix Pages Router + App Router.
 *
 * Once a file is identified as client-side, any `process.env.X` read
 * where X doesn't start with a public prefix
 * (`NEXT_PUBLIC_`, `VITE_`, `PUBLIC_`, `REACT_APP_`, `EXPO_PUBLIC_`,
 * `GATSBY_`, `NUXT_PUBLIC_`, `STORYBOOK_`, …) is reported.
 *
 * Why this matters: Next.js inlines `process.env.SOMETHING` into the
 * client bundle, redacting only those vars whose names match the
 * configured `NEXT_PUBLIC_` prefix. Referencing a server-only var
 * from a client component either leaks the secret (older Next.js) or
 * silently resolves to `undefined` (newer Next.js) — both bad outcomes
 * AI-generated code introduces routinely.
 */

const DEFAULT_PUBLIC_PREFIXES: ReadonlyArray<string> = [
  'NEXT_PUBLIC_',
  'VITE_',
  'PUBLIC_',
  'REACT_APP_',
  'EXPO_PUBLIC_',
  'GATSBY_',
  'NUXT_PUBLIC_',
  'STORYBOOK_',
  'NX_',
];

/** Common env vars that ARE safe to reference on the client by convention. */
const ALWAYS_PUBLIC_NAMES: ReadonlySet<string> = new Set([
  'NODE_ENV',
  'BASE_URL',
]);

function isClientFile(context: ReturnType<typeof createRule>['create'] extends (c: infer C) => any ? C : never): boolean {
  // 1. 'use client' directive at file start.
  const program = context.sourceCode.ast;
  for (const stmt of program.body) {
    if (
      stmt.type === 'ExpressionStatement' &&
      stmt.expression.type === 'Literal' &&
      typeof stmt.expression.value === 'string'
    ) {
      const v = stmt.expression.value;
      if (v === 'use client') return true;
      // Continue past other directives like 'use strict'.
      continue;
    }
    break;
  }

  // 2. File path heuristic — `.client.{tsx,jsx,ts,js}` suffix.
  // ESLint v8+ exposes `context.filename` and `context.physicalFilename`
  // (the latter survives `--stdin-filename` rewrites and matches what
  // `linter.verify(source, config, filename)` passes). Check both.
  const filename =
    (context as { physicalFilename?: string }).physicalFilename ??
    context.filename ??
    (context as { getFilename?: () => string }).getFilename?.() ??
    '';
  if (/\.client\.[jt]sx?$/.test(filename)) return true;

  return false;
}

export default createRule<Options, MessageIds>({
  name: 'no-leaked-env-on-client',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Flag references to non-public `process.env.X` from files marked client-side (`"use client"`, `*.client.{ts,tsx,js,jsx}`). AI coding tools regularly paste `process.env.OPENAI_API_KEY` into a React component, where the value is either inlined into the bundle (leaking the secret) or silently undefined (breaking the feature). Use `NEXT_PUBLIC_*` / `VITE_*` / `PUBLIC_*` for values that genuinely need to be on the client.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          extraPublicPrefixes: {
            type: 'array',
            items: { type: 'string' },
            description: 'Extra env var prefixes to treat as client-safe.',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      leakedEnv:
        '`process.env.{{name}}` is read from a client-side file. {{name}} is not prefixed with a public marker (`NEXT_PUBLIC_`, `VITE_`, etc.), so it will either leak a server secret into the JS bundle or silently resolve to `undefined` on the client.',
      unmarkedEnvInClientFile:
        '`process.env[{{expr}}]` — dynamic env var lookup inside a client file. Move env access to a server boundary (a server action / API route / loader), or rename the variable to a public-prefixed alias.',
    },
  },
  defaultOptions: [{ extraPublicPrefixes: [] }],
  create(context, [options]) {
    const publicPrefixes = [
      ...DEFAULT_PUBLIC_PREFIXES,
      ...(options.extraPublicPrefixes ?? []),
    ];

    let isClient: boolean | null = null;
    function evaluateOnce(): boolean {
      if (isClient !== null) return isClient;
      isClient = isClientFile(context);
      return isClient;
    }

    function isPublicName(name: string): boolean {
      if (ALWAYS_PUBLIC_NAMES.has(name)) return true;
      return publicPrefixes.some((p) => name.startsWith(p));
    }

    return {
      MemberExpression(node: TSESTree.MemberExpression) {
        try {
          // Match `process.env.X` and `process.env["X"]`.
          if (
            node.object.type !== 'MemberExpression' ||
            node.object.object.type !== 'Identifier' ||
            node.object.object.name !== 'process' ||
            node.object.property.type !== 'Identifier' ||
            node.object.property.name !== 'env'
          ) {
            return;
          }
          if (!evaluateOnce()) return;

          // Skip assignments — `process.env.X = "..."` is a write, not a read.
          const parent = (node as { parent?: TSESTree.Node }).parent;
          if (
            parent &&
            parent.type === 'AssignmentExpression' &&
            parent.left === node
          ) {
            return;
          }

          if (!node.computed && node.property.type === 'Identifier') {
            const name = node.property.name;
            if (isPublicName(name)) return;
            context.report({
              node,
              messageId: 'leakedEnv',
              data: { name },
            });
            return;
          }
          if (node.computed) {
            if (node.property.type === 'Literal' && typeof node.property.value === 'string') {
              const name = node.property.value;
              if (isPublicName(name)) return;
              context.report({
                node,
                messageId: 'leakedEnv',
                data: { name },
              });
              return;
            }
            // Dynamic key — `process.env[someExpr]`.
            context.report({
              node,
              messageId: 'unmarkedEnvInClientFile',
              data: { expr: '<dynamic>' },
            });
          }
        } catch (err) {
          debugLog('no-leaked-env-on-client', err);
        }
      },
    };
  },
});
