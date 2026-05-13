import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import { debugLog } from '../utils/debug.js';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://deslint.com/docs/rules/${name}`
);

export type Options = [];

export type MessageIds =
  | 'execWithDynamicCommand'
  | 'preferArgvForm'
  | 'shellTrueWithDynamic';

/**
 * Functions that interpret their first argument as a shell command line —
 * any `${…}` interpolation here is an injection path.
 */
const SHELL_FUNCTIONS: ReadonlySet<string> = new Set([
  'exec',
  'execSync',
  // child_process.execFile is safer (no shell), but if someone writes
  // `execFile("sh", ["-c", "rm " + path])` they've reintroduced the
  // problem. We don't try to detect that here; the goal is to push
  // people off the exec family entirely.
]);

/**
 * Spawn-like functions that take an argv array. We flag these when
 * `{ shell: true }` is passed AND the command/argv is dynamic — that
 * shape is equivalent to `exec` and shares the same injection surface.
 */
const SPAWN_FUNCTIONS: ReadonlySet<string> = new Set([
  'spawn',
  'spawnSync',
  'execFile',
  'execFileSync',
  'fork',
]);

function isDynamicString(node: TSESTree.Node): boolean {
  if (node.type === 'Literal') return false;
  if (node.type === 'TemplateLiteral') return node.expressions.length > 0;
  if (node.type === 'BinaryExpression' && node.operator === '+') {
    // A `+` concatenation containing anything dynamic is dynamic.
    function hasDynamic(n: TSESTree.Node): boolean {
      if (n.type === 'Literal') return false;
      if (n.type === 'TemplateLiteral' && n.expressions.length === 0) return false;
      if (n.type === 'BinaryExpression' && n.operator === '+') {
        return hasDynamic(n.left) || hasDynamic(n.right);
      }
      return true;
    }
    return hasDynamic(node);
  }
  // Identifiers, member expressions, calls, etc. are dynamic.
  return true;
}

/**
 * Receivers we treat as "this is definitely child_process". Any other
 * receiver (`this.regexp.exec(...)`, `Buffer.from(...).exec(...)`, etc.)
 * is not a shell call and must not trip the rule.
 */
const CHILD_PROCESS_RECEIVERS: ReadonlySet<string> = new Set([
  'child_process', 'childProcess', 'cp', 'cproc', 'cprocess',
]);

/**
 * Three shapes we consider:
 *   `bareExec`     — `exec(cmd)`        — destructured from `child_process`
 *   `qualifiedExec`— `cp.exec(cmd)`     — only when `cp` is a known receiver
 *   `notShell`     — `this.r.exec(cmd)` / `regex.exec(input)` etc. — skip
 *
 * We distinguish them by INSPECTING the callee shape directly rather than
 * collapsing to `{fn, receiver}`, because "MemberExpression callee with a
 * non-Identifier receiver" is a different ground truth from "bare
 * Identifier callee" — both used to look like `receiver=null` and that
 * fused two very different things together.
 */
function classifyShellCall(node: TSESTree.CallExpression): { fn: string | null; kind: 'bare' | 'qualified' | 'not-shell' } {
  if (node.callee.type === 'Identifier') {
    const fn = node.callee.name;
    if (SHELL_FUNCTIONS.has(fn) || SPAWN_FUNCTIONS.has(fn)) {
      return { fn, kind: 'bare' };
    }
    return { fn: null, kind: 'not-shell' };
  }
  if (node.callee.type === 'MemberExpression' && node.callee.property.type === 'Identifier') {
    const fn = node.callee.property.name;
    if (!SHELL_FUNCTIONS.has(fn) && !SPAWN_FUNCTIONS.has(fn)) {
      return { fn: null, kind: 'not-shell' };
    }
    // Receiver must be an Identifier in the known child_process aliases —
    // anything else (ThisExpression, chained MemberExpression, a regex
    // pattern variable, …) is not a shell call.
    if (
      node.callee.object.type === 'Identifier' &&
      CHILD_PROCESS_RECEIVERS.has(node.callee.object.name)
    ) {
      return { fn, kind: 'qualified' };
    }
    return { fn: null, kind: 'not-shell' };
  }
  return { fn: null, kind: 'not-shell' };
}

function findShellTrueOption(args: readonly TSESTree.CallExpressionArgument[]): boolean {
  for (const arg of args) {
    if (arg.type !== 'ObjectExpression') continue;
    for (const prop of arg.properties) {
      if (prop.type !== 'Property' || prop.computed) continue;
      const key = prop.key;
      const name =
        key.type === 'Identifier' ? key.name :
        key.type === 'Literal' && typeof key.value === 'string' ? key.value :
        null;
      if (name !== 'shell') continue;
      const value = prop.value;
      if (value.type === 'Literal' && value.value === true) return true;
      // shell: "/bin/bash" — string truthy
      if (value.type === 'Literal' && typeof value.value === 'string' && value.value.length > 0) {
        return true;
      }
    }
  }
  return false;
}

export default createRule<Options, MessageIds>({
  name: 'no-shell-injection',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Flag `child_process.exec` / `execSync` / `spawn({ shell: true })` calls whose command is built from dynamic input. AI-generated handlers routinely splice `req.body.filename` or a path argument into a shell command, which is RCE if any operand contains a shell metacharacter. Prefer `execFile(cmd, [arg1, arg2])` so values are passed as positional args, never re-parsed by a shell.',
    },
    schema: [],
    messages: {
      execWithDynamicCommand:
        '`{{fn}}()` is invoked with a dynamic command string — any unsanitized operand is a shell-injection (RCE) path. Switch to `execFile(cmd, [args])` or pass `{ shell: false }` to `spawn` and a hardcoded argv.',
      preferArgvForm:
        '`{{fn}}()` runs its argument through the system shell. Prefer the argv form (`execFile`/`spawn` with `shell: false`) so user input is never re-parsed as shell syntax.',
      shellTrueWithDynamic:
        '`{{fn}}(…, { shell: true })` with a dynamic command/argv re-enables shell interpretation, including pipes, redirection, and command substitution. Remove `shell: true` and pass the program and arguments as separate array elements.',
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      CallExpression(node) {
        try {
          const { fn: name, kind } = classifyShellCall(node);
          if (!name || kind === 'not-shell') return;

          // exec / execSync family.
          if (SHELL_FUNCTIONS.has(name)) {
            const first = node.arguments[0];
            if (!first || first.type === 'SpreadElement') return;
            if (isDynamicString(first)) {
              context.report({
                node: first as TSESTree.Node,
                messageId: 'execWithDynamicCommand',
                data: { fn: name },
              });
              return;
            }
            // Static literal still gets the soft nudge, because exec is
            // strictly worse than execFile.
            // (Skipping for now — keep the rule tight to dynamic shapes.)
            return;
          }

          // spawn-family with `{ shell: true }` and a dynamic command.
          if (SPAWN_FUNCTIONS.has(name)) {
            if (!findShellTrueOption(node.arguments)) return;
            const first = node.arguments[0];
            if (!first || first.type === 'SpreadElement') return;
            const second = node.arguments[1];
            const firstDynamic = isDynamicString(first);
            const secondDynamic =
              second && second.type !== 'SpreadElement' && second.type !== 'ObjectExpression'
                ? // argv array — flag if any element is dynamic.
                  second.type === 'ArrayExpression'
                  ? second.elements.some(
                      (el) =>
                        el !== null &&
                        el.type !== 'SpreadElement' &&
                        isDynamicString(el as TSESTree.Node),
                    )
                  : isDynamicString(second as TSESTree.Node)
                : false;

            if (firstDynamic || secondDynamic) {
              context.report({
                node,
                messageId: 'shellTrueWithDynamic',
                data: { fn: name },
              });
            }
          }
        } catch (err) {
          debugLog('no-shell-injection', err);
        }
      },
    };
  },
});
