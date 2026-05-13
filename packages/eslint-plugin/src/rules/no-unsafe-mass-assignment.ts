import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import { debugLog } from '../utils/debug.js';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://deslint.com/docs/rules/${name}`
);

export type Options = [];

export type MessageIds = 'massAssignObject' | 'massAssignSpread' | 'massAssignSave';

/**
 * Catches the "mass assignment" antipattern — splatting an unfiltered
 * request body into a database model / domain object. Classic OWASP
 * A04. AI tools love this shape because it's two characters shorter
 * than picking the allowlisted fields.
 *
 * Patterns covered:
 *
 *   Object.assign(user, req.body)            // ← target = model
 *   Object.assign(model, req.body)
 *   user.update(req.body)                    // ORM update shortcut
 *   user.save(req.body)
 *   await Model.create(req.body)             // ORM create with raw body
 *   await db.users.update({...}, req.body)
 *
 *   const newUser = { ...user, ...req.body };
 *   Object.assign({}, defaults, req.body);  // even into a new object
 *                                            // — the result then flows
 *                                            // into a write call.
 *
 * Heuristic: we flag any expression that splats `req.body` /
 * `request.body` / a `request.json()` result into an object target OR
 * passes it as the argument to an ORM mutation method.
 */

const REQUEST_ROOTS: ReadonlySet<string> = new Set([
  'req', 'request', 'ctx', 'context', 'event',
]);

const UNTRUSTED_REQUEST_PROPS: ReadonlySet<string> = new Set([
  'body', 'query', 'params',
]);

/** ORM-style mutation method names. */
const MUTATION_METHODS: ReadonlySet<string> = new Set([
  'update', 'updateOne', 'updateMany', 'findOneAndUpdate', 'findByIdAndUpdate',
  'replaceOne', 'create', 'insert', 'insertOne', 'insertMany',
  'save',
  'set', // mongoose .set()
  'patch',
  // Prisma-style methods.
  'createMany', 'upsert',
]);

function getPropertyName(node: TSESTree.Node | null | undefined): string | null {
  if (!node) return null;
  if (node.type === 'Identifier') return node.name;
  if (node.type === 'Literal' && typeof node.value === 'string') return node.value;
  return null;
}

/**
 * True if the expression resolves to user-controlled request data.
 * Recognises:
 *   req.body / request.body
 *   req.body.<x>      (still untrusted)
 *   req.query[<k>]
 *   await request.json()
 *   request.formData()
 */
function isUntrustedRequestExpression(node: TSESTree.Node): boolean {
  if (node.type === 'MemberExpression') {
    let current: TSESTree.Node = node;
    const chain: string[] = [];
    while (current.type === 'MemberExpression') {
      const p = getPropertyName(current.property);
      if (p !== null) chain.unshift(p);
      current = current.object;
    }
    if (current.type !== 'Identifier') return false;
    if (!REQUEST_ROOTS.has(current.name)) return false;
    return chain.length > 0 && UNTRUSTED_REQUEST_PROPS.has(chain[0]);
  }
  if (node.type === 'AwaitExpression') return isUntrustedRequestExpression(node.argument);
  if (node.type === 'CallExpression') {
    // request.json() / request.formData()
    if (
      node.callee.type === 'MemberExpression' &&
      node.callee.property.type === 'Identifier' &&
      (node.callee.property.name === 'json' || node.callee.property.name === 'formData')
    ) {
      const obj = node.callee.object;
      if (obj.type === 'Identifier' && REQUEST_ROOTS.has(obj.name)) return true;
    }
  }
  return false;
}

function getCalleeInfo(node: TSESTree.CallExpression): { fn: string | null } {
  if (node.callee.type === 'Identifier') return { fn: node.callee.name };
  if (node.callee.type === 'MemberExpression' && node.callee.property.type === 'Identifier') {
    return { fn: node.callee.property.name };
  }
  return { fn: null };
}

export default createRule<Options, MessageIds>({
  name: 'no-unsafe-mass-assignment',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Flag mass-assignment shapes that splat an unfiltered request body into a model: `Object.assign(user, req.body)`, `{ ...model, ...req.body }`, `Model.create(req.body)`, `user.update(req.body)`. A client can set fields the server never intended to expose (e.g. `isAdmin`, `tenantId`). OWASP A04 (Insecure Design / Mass Assignment).',
    },
    schema: [],
    messages: {
      massAssignObject:
        '`Object.assign(target, {{source}})` copies every property from the request body onto the target, including ones the client should not be able to set (`isAdmin`, `tenantId`, etc.). Pick allowlisted fields explicitly.',
      massAssignSpread:
        'Spreading `{{source}}` into an object that flows into a database write is a mass-assignment vector — a client can set fields the server never intended to expose. Use a validated DTO (zod / joi / yup) that strips unknown keys.',
      massAssignSave:
        '`{{method}}({{source}})` passes the raw request body straight to the ORM. Pick allowlisted fields, or validate the body against a schema first.',
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      CallExpression(node) {
        try {
          // Object.assign(target, req.body, …).
          if (
            node.callee.type === 'MemberExpression' &&
            node.callee.object.type === 'Identifier' &&
            node.callee.object.name === 'Object' &&
            node.callee.property.type === 'Identifier' &&
            node.callee.property.name === 'assign'
          ) {
            // First arg is the target. Untrusted sources are arg[1..n].
            for (let i = 1; i < node.arguments.length; i++) {
              const arg = node.arguments[i];
              if (!arg || arg.type === 'SpreadElement') continue;
              if (!isUntrustedRequestExpression(arg as TSESTree.Node)) continue;
              context.report({
                node: arg as TSESTree.Node,
                messageId: 'massAssignObject',
                data: { source: describe(arg as TSESTree.Node) },
              });
              return;
            }
            return;
          }

          // ORM mutation method: <model>.update(req.body), Model.create(req.body), …
          const { fn } = getCalleeInfo(node);
          if (!fn || !MUTATION_METHODS.has(fn)) return;

          // Prisma / typed ORMs typically take an options object first
          // (`prisma.user.update({ where, data: { ... } })`). We don't
          // try to peer into that — the dangerous shape we want to
          // catch is the "ORM-shortcut" form where the request body
          // is passed directly:  `User.create(req.body)` /
          // `user.update(req.body)`.
          const firstArg = node.arguments[0];
          if (!firstArg || firstArg.type === 'SpreadElement') return;
          if (!isUntrustedRequestExpression(firstArg as TSESTree.Node)) return;

          context.report({
            node: firstArg as TSESTree.Node,
            messageId: 'massAssignSave',
            data: { method: fn, source: describe(firstArg as TSESTree.Node) },
          });
        } catch (err) {
          debugLog('no-unsafe-mass-assignment', err);
        }
      },
      ObjectExpression(node) {
        try {
          // { ...existing, ...req.body }: any SpreadElement whose
          // argument is untrusted is the violation.
          for (const prop of node.properties) {
            if (prop.type !== 'SpreadElement') continue;
            if (!isUntrustedRequestExpression(prop.argument as TSESTree.Node)) continue;
            // Skip if the surrounding object is obviously a discrim-
            // inated DTO build: `{ name: req.body.name, email: req.body.email }`.
            // That's the allowlist pattern. By definition that doesn't
            // include a SpreadElement.
            context.report({
              node: prop as TSESTree.Node,
              messageId: 'massAssignSpread',
              data: { source: describe(prop.argument as TSESTree.Node) },
            });
            return;
          }
        } catch (err) {
          debugLog('no-unsafe-mass-assignment', err);
        }
      },
    };
  },
});

function describe(node: TSESTree.Node): string {
  if (node.type === 'MemberExpression') {
    const parts: string[] = [];
    let cur: TSESTree.Node = node;
    while (cur.type === 'MemberExpression') {
      const p = (cur.property as TSESTree.Identifier).name ?? '';
      if (p) parts.unshift(p);
      cur = cur.object;
    }
    if (cur.type === 'Identifier') parts.unshift(cur.name);
    return parts.join('.');
  }
  if (node.type === 'AwaitExpression') return `await ${describe(node.argument)}`;
  if (node.type === 'CallExpression') {
    if (node.callee.type === 'MemberExpression' && node.callee.property.type === 'Identifier') {
      return `${describe(node.callee.object as TSESTree.Node)}.${node.callee.property.name}()`;
    }
  }
  return 'request data';
}
