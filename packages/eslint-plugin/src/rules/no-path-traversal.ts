import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import { debugLog } from '../utils/debug.js';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://deslint.com/docs/rules/${name}`
);

export type Options = [];
export type MessageIds = 'pathTraversal' | 'sendFileTraversal';

/**
 * Filesystem functions whose first argument is interpreted as a path on
 * disk. AI coding tools regularly pass `req.query.file` or
 * `req.params.name` straight to one of these without any normalize +
 * allowlist check — that's CWE-22 (path traversal), which gives an
 * attacker arbitrary read on the host process's uid.
 *
 * `path.join` / `path.resolve` are included because their output is
 * almost always passed to a `fs.*` call downstream. Flagging them at the
 * splice site catches the bug earlier in the AST than waiting for the
 * eventual `fs.readFile` and produces a clearer error message.
 */
const FS_FUNCTIONS: ReadonlySet<string> = new Set([
  // node:fs
  'readFile', 'readFileSync', 'createReadStream',
  'writeFile', 'writeFileSync', 'createWriteStream',
  'open', 'openSync', 'readSync',
  'appendFile', 'appendFileSync',
  'unlink', 'unlinkSync', 'rm', 'rmSync',
  'rmdir', 'rmdirSync',
  // node:fs/promises (same names)
  // path
  'join', 'resolve',
]);

/** Express / Koa / Fastify response methods that serve a file. */
const SEND_FILE_METHODS: ReadonlySet<string> = new Set([
  'sendFile', 'sendfile', 'download',
]);

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

/**
 * Walk a MemberExpression chain to its root identifier and the FIRST
 * property accessed off the root. Returns null if the chain doesn't
 * bottom out in an identifier we recognise as a request root.
 */
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

/** True iff this expression reads user-controlled data from the request. */
function isUntrustedRequestExpression(node: TSESTree.Node): boolean {
  if (node.type === 'MemberExpression') {
    const r = rootAndFirstProp(node);
    if (!r || !r.firstProp) return false;
    return UNTRUSTED_REQUEST_PROPS.has(r.firstProp);
  }
  if (node.type === 'CallExpression') {
    // req.get('X-Forwarded-For') / req.header('Host') / request.headers.get('Referer')
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

/** True iff any sub-expression in this template/concat is untrusted. */
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
  return false;
}

function getCalleeInfo(node: TSESTree.CallExpression): { fn: string | null; receiver: string | null } {
  if (node.callee.type === 'Identifier') return { fn: node.callee.name, receiver: null };
  if (node.callee.type === 'MemberExpression' && node.callee.property.type === 'Identifier') {
    const receiver =
      node.callee.object.type === 'Identifier' ? node.callee.object.name : null;
    return { fn: node.callee.property.name, receiver };
  }
  return { fn: null, receiver: null };
}

/**
 * The `fs.*` and `path.*` aliases we care about. We don't try to
 * validate "is this really the fs module" — we just look at the receiver
 * name. `fs.readFile`, `fsPromises.readFile`, `fsp.readFile`, the
 * destructured-bare `readFile(…)` form, `node:fs` import — all flow
 * through this list. False positives on a user-defined `something.join`
 * are mitigated by the untrusted-input gate; we only fire when the arg
 * is actually request-sourced.
 */
const FS_RECEIVERS: ReadonlySet<string> = new Set([
  'fs', 'fsPromises', 'fsp', 'fsync', 'fsAsync',
  'path', 'pathPosix', 'pathWin32',
]);

export default createRule<Options, MessageIds>({
  name: 'no-path-traversal',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Flag filesystem reads/writes and `res.sendFile` whose path is derived from request input without going through a normalize-and-allowlist check. CWE-22 (path traversal) is one of the most common backend vulnerabilities AI coding tools introduce when wiring up file upload/download endpoints.',
    },
    schema: [],
    messages: {
      pathTraversal:
        '`{{fn}}()` is invoked with a path built from `{{source}}` — that is a path-traversal (CWE-22) vector unless the value is normalized and resolved against an allowlisted root. Validate the input or use a server-side mapping.',
      sendFileTraversal:
        '`{{fn}}()` serves a file whose path is derived from request input — an attacker can request `../../etc/passwd`. Resolve the path against an allowlisted root and reject paths that escape it.',
    },
  },
  defaultOptions: [],
  create(context) {
    /**
     * Path-producing functions (`path.join`, `path.resolve`) accept user
     * input in any argument position, while file IO functions usually
     * take the path as the first arg. `checkAllArgs` toggles between
     * the two modes.
     */
    function reportOn(arg: TSESTree.Node, fnName: string, isSendFile: boolean): void {
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
      context.report({
        node: arg,
        messageId: isSendFile ? 'sendFileTraversal' : 'pathTraversal',
        data: { fn: fnName, source },
      });
    }

    function checkArgs(callNode: TSESTree.CallExpression, fnName: string, isSendFile: boolean, checkAll: boolean): void {
      const args = callNode.arguments;
      const range = checkAll ? args : args.slice(0, 1);
      for (const arg of range) {
        if (arg.type === 'SpreadElement') continue;
        if (!expressionContainsUntrusted(arg as TSESTree.Node)) continue;
        reportOn(arg as TSESTree.Node, fnName, isSendFile);
        return; // Report at most one violation per call.
      }
    }

    return {
      CallExpression(node) {
        try {
          const { fn, receiver } = getCalleeInfo(node);
          if (!fn) return;

          // Path-resolving / FS calls. Two forms:
          //   - `fs.readFile(p, cb)`             receiver in FS_RECEIVERS
          //   - destructured: `readFile(p, cb)`  receiver === null, fn in FS_FUNCTIONS
          if (FS_FUNCTIONS.has(fn) && (receiver === null || FS_RECEIVERS.has(receiver))) {
            // Skip the bare-identifier case when fn could collide with a
            // common DOM/library method. `join` and `resolve` are too
            // generic without a receiver. Require an explicit receiver.
            if (receiver === null && (fn === 'join' || fn === 'resolve' || fn === 'open')) return;
            // path.join / path.resolve can accept untrusted input in any
            // arg position; fs.* functions take the path as arg[0].
            const isPathBuilder = receiver === 'path' || receiver === 'pathPosix' || receiver === 'pathWin32';
            checkArgs(node, fn, false, isPathBuilder);
            return;
          }

          // res.sendFile / ctx.sendFile / res.download.
          // Express's API supports `{ root: <dir> }` as a second-arg
          // option that constrains the resolved file to a directory.
          // When that option is present, the call is considered safe
          // (Express returns 403 if the resolved path escapes `root`).
          if (SEND_FILE_METHODS.has(fn)) {
            const optsArg = node.arguments[1];
            if (
              optsArg &&
              optsArg.type === 'ObjectExpression' &&
              optsArg.properties.some(
                (p) => p.type === 'Property' && !p.computed && getPropertyName(p.key) === 'root',
              )
            ) {
              return;
            }
            checkArgs(node, fn, true, false);
            return;
          }
        } catch (err) {
          debugLog('no-path-traversal', err);
        }
      },
    };
  },
});
