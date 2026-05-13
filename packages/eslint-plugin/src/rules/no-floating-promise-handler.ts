import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import { debugLog } from '../utils/debug.js';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://deslint.com/docs/rules/${name}`
);

export type Options = [
  {
    /** Wrapper names that already trap async rejections — calls of the
     *  form `app.get('/x', asyncHandler(async (req, res) => …))` count
     *  as safe. Default: ['asyncHandler','catchAsync','wrap','tryCatch']. */
    safeWrappers?: string[];
  },
];

export type MessageIds = 'unwrappedAsyncHandler';

/**
 * Express-style HTTP verbs whose 2nd+ arg is treated as a request
 * handler. We restrict the receiver to a small list to avoid firing on
 * unrelated `app.use(...)` patterns on non-Express receivers.
 */
const HTTP_VERBS: ReadonlySet<string> = new Set([
  'get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'all', 'use',
]);

const ROUTER_RECEIVERS: ReadonlySet<string> = new Set([
  'app', 'router', 'server', 'route', 'api',
  // Express-style child routers usually keep one of these names too.
]);

const DEFAULT_SAFE_WRAPPERS: ReadonlyArray<string> = [
  'asyncHandler', 'catchAsync', 'wrap', 'tryCatch', 'asyncMiddleware',
];

function isAsyncFn(node: TSESTree.Node): boolean {
  return (
    (node.type === 'ArrowFunctionExpression' || node.type === 'FunctionExpression') &&
    node.async === true
  );
}

function fnHasTopLevelTryCatch(
  node: TSESTree.ArrowFunctionExpression | TSESTree.FunctionExpression,
): boolean {
  const body = node.body;
  // Arrow with expression body: no try/catch possible at that level.
  if (body.type !== 'BlockStatement') return false;
  for (const stmt of body.body) {
    if (stmt.type === 'TryStatement') return true;
    // `return await` with a `.catch(...)` chained on it — the simplest
    // shape is `return doThing().catch(next);`. Treat that as handled.
    if (
      stmt.type === 'ReturnStatement' &&
      stmt.argument &&
      stmt.argument.type === 'CallExpression' &&
      stmt.argument.callee.type === 'MemberExpression' &&
      stmt.argument.callee.property.type === 'Identifier' &&
      stmt.argument.callee.property.name === 'catch'
    ) {
      return true;
    }
  }
  return false;
}

function isWrappedInSafeFn(node: TSESTree.Node, safeWrappers: ReadonlySet<string>): boolean {
  const parent = (node as { parent?: TSESTree.Node }).parent;
  if (!parent) return false;
  if (parent.type !== 'CallExpression') return false;
  // The handler must be an argument of the wrapper call, not its callee.
  if (parent.callee === node) return false;
  const callee = parent.callee;
  if (callee.type === 'Identifier' && safeWrappers.has(callee.name)) return true;
  if (
    callee.type === 'MemberExpression' &&
    callee.property.type === 'Identifier' &&
    safeWrappers.has(callee.property.name)
  ) {
    return true;
  }
  return false;
}

function getCallee(node: TSESTree.CallExpression): { fn: string | null; receiver: string | null } {
  if (node.callee.type !== 'MemberExpression' || node.callee.property.type !== 'Identifier') {
    return { fn: null, receiver: null };
  }
  const fn = node.callee.property.name;
  const obj = node.callee.object;
  const receiver =
    obj.type === 'Identifier' ? obj.name :
    obj.type === 'MemberExpression' && obj.property.type === 'Identifier' ? obj.property.name :
    null;
  return { fn, receiver };
}

export default createRule<Options, MessageIds>({
  name: 'no-floating-promise-handler',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Flag `async` route handlers (`app.get(path, async (req, res) => …)`) whose body is neither wrapped in `try/catch`, returned via `.catch(next)`, nor passed through an async-wrapping helper. In Express 4 a rejected promise from a handler hangs the request forever; in Fastify and some Express 5 setups it crashes the process. AI-generated code routinely writes this shape.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          safeWrappers: {
            type: 'array',
            items: { type: 'string' },
            description: 'Wrapper function names that handle async rejection (e.g. `asyncHandler`).',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      unwrappedAsyncHandler:
        '`{{verb}}` was passed an async handler with no `try/catch`, no `.catch(next)`, and no async-wrapper (e.g. `asyncHandler`). A thrown error here will hang the request or crash the process. Wrap the body in try/catch and call `next(err)`, or use `express-async-handler` / `express-async-errors`.',
    },
  },
  defaultOptions: [{ safeWrappers: [] }],
  create(context, [options]) {
    const safeWrappers = new Set<string>([
      ...DEFAULT_SAFE_WRAPPERS,
      ...(options.safeWrappers ?? []),
    ]);

    return {
      CallExpression(node) {
        try {
          const { fn, receiver } = getCallee(node);
          if (!fn || !HTTP_VERBS.has(fn)) return;
          if (receiver === null || !ROUTER_RECEIVERS.has(receiver)) return;

          // Walk every handler-shaped argument (path string is arg[0];
          // handlers are arg[1..n] for `app.use(mw1, mw2)` style chains).
          for (let i = 1; i < node.arguments.length; i++) {
            const arg = node.arguments[i];
            if (!arg || arg.type === 'SpreadElement') continue;

            // Wrapper call: `asyncHandler(async (req, res) => ...)`.
            if (arg.type === 'CallExpression') {
              const wrapperCallee = arg.callee;
              if (wrapperCallee.type === 'Identifier' && safeWrappers.has(wrapperCallee.name)) continue;
              if (
                wrapperCallee.type === 'MemberExpression' &&
                wrapperCallee.property.type === 'Identifier' &&
                safeWrappers.has(wrapperCallee.property.name)
              ) {
                continue;
              }
              continue; // unrecognised wrapper, but not our concern — fall through.
            }

            if (!isAsyncFn(arg as TSESTree.Node)) continue;
            const asyncFn = arg as TSESTree.ArrowFunctionExpression | TSESTree.FunctionExpression;
            if (fnHasTopLevelTryCatch(asyncFn)) continue;
            if (isWrappedInSafeFn(asyncFn, safeWrappers)) continue;

            context.report({
              node: asyncFn,
              messageId: 'unwrappedAsyncHandler',
              data: { verb: `${receiver}.${fn}` },
            });
          }
        } catch (err) {
          debugLog('no-floating-promise-handler', err);
        }
      },
    };
  },
});
