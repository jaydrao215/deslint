import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import { debugLog } from '../utils/debug.js';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://deslint.com/docs/rules/${name}`
);

export type Options = [];
export type MessageIds = 'untypedAssertion' | 'untypedSatisfies';

/**
 * The specific AI-coding shape this catches: a type assertion that
 * pretends an untrusted runtime value has a particular static shape
 * without going through a runtime validator. TypeScript stops
 * complaining, the type system is "satisfied," but at runtime any
 * field can be anything — including `undefined`, an array, or a
 * prototype-polluted object.
 *
 *   const body = req.body as CreateUserInput;
 *   const data = (await request.json()) as { email: string };
 *   const filters = req.query as Record<string, string>;
 *   const id = req.params.id as string;
 *
 * Why these are dangerous: every downstream consumer assumes the type
 * holds. Mass-assignment, SQL/NoSQL injection, and undefined-property
 * crashes all follow.
 *
 * The fix is uniform: pipe the untrusted value through a parser
 * (`zod.parse`, `valibot.parse`, `Joi.attempt`, `yup.cast`,
 * `class-validator`, hand-written guard, …). Severity: warn, because
 * a small percentage of these are legitimately "I know it's safe"
 * (e.g. internal service calls behind a gateway that already
 * validated the body) and shouldn't block a merge — but every one is
 * worth a review pair of eyes.
 */

const REQUEST_ROOTS: ReadonlySet<string> = new Set([
  'req', 'request', 'ctx', 'context', 'event',
]);

const UNTRUSTED_REQUEST_PROPS: ReadonlySet<string> = new Set([
  'body', 'query', 'params', 'headers', 'header', 'cookies', 'rawHeaders',
  'searchParams', 'nextUrl',
]);

/**
 * Methods on a request that return user-controlled data and are
 * commonly type-asserted in AI-generated code.
 *
 *   await request.json() as User
 *   await req.json() as User
 *   await request.formData() as ...   (rarely typed but technically untrusted)
 *   request.text() as ...             (string but still untrusted shape if parsed)
 */
const UNTRUSTED_REQUEST_METHODS: ReadonlySet<string> = new Set([
  'json', 'formData', 'text', 'arrayBuffer', 'blob',
]);

function isUntrustedExpression(node: TSESTree.Node): boolean {
  if (node.type === 'AwaitExpression') return isUntrustedExpression(node.argument);
  if (node.type === 'ChainExpression') return isUntrustedExpression(node.expression);

  // Member access: req.body, request.body.x, req.query.q, etc.
  if (node.type === 'MemberExpression') {
    let cur: TSESTree.Node = node;
    const chain: string[] = [];
    while (cur.type === 'MemberExpression') {
      if (cur.property.type === 'Identifier') chain.unshift(cur.property.name);
      else if (cur.property.type === 'Literal' && typeof cur.property.value === 'string') {
        chain.unshift(cur.property.value);
      }
      cur = cur.object;
    }
    if (cur.type !== 'Identifier' || !REQUEST_ROOTS.has(cur.name)) return false;
    return chain.length > 0 && UNTRUSTED_REQUEST_PROPS.has(chain[0]);
  }

  // Method calls: await request.json(), req.json().
  if (node.type === 'CallExpression') {
    if (node.callee.type === 'MemberExpression' && node.callee.property.type === 'Identifier') {
      const method = node.callee.property.name;
      if (UNTRUSTED_REQUEST_METHODS.has(method)) {
        const obj = node.callee.object;
        if (obj.type === 'Identifier' && REQUEST_ROOTS.has(obj.name)) return true;
        // request.nextUrl.searchParams.get('x') / req.headers.get('Referer')
        if (obj.type === 'MemberExpression') {
          let cur: TSESTree.Node = obj;
          while (cur.type === 'MemberExpression') cur = cur.object;
          if (cur.type === 'Identifier' && REQUEST_ROOTS.has(cur.name)) return true;
        }
      }
    }
  }
  return false;
}

export default createRule<Options, MessageIds>({
  name: 'no-unvalidated-input',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Flag type assertions (`as T`, `<T>x`) and `satisfies T` on untrusted request data (`req.body`, `req.query`, `req.params`, `await request.json()`, etc.) without going through a runtime validator. The type system is satisfied; the runtime is not. Use `zod.parse`, `valibot.parse`, `Joi.attempt`, `yup.cast`, or a manual guard.',
    },
    schema: [],
    messages: {
      untypedAssertion:
        '`as {{ typeText }}` on `{{ source }}` is a runtime lie — the value is whatever the client sent. Pipe it through a parser (zod / valibot / yup / Joi) so the shape is checked at runtime, not just at compile time.',
      untypedSatisfies:
        '`satisfies {{ typeText }}` on `{{ source }}` doesn\'t change the runtime value either — every assumption downstream still trusts unverified client input. Validate with a real parser before the assertion.',
    },
  },
  defaultOptions: [],
  create(context) {
    function describeSource(node: TSESTree.Node): string {
      if (node.type === 'AwaitExpression') return `await ${describeSource(node.argument)}`;
      if (node.type === 'MemberExpression') {
        const parts: string[] = [];
        let cur: TSESTree.Node = node;
        while (cur.type === 'MemberExpression') {
          if (cur.property.type === 'Identifier') parts.unshift(cur.property.name);
          cur = cur.object;
        }
        if (cur.type === 'Identifier') parts.unshift(cur.name);
        return parts.join('.');
      }
      if (node.type === 'CallExpression' && node.callee.type === 'MemberExpression' && node.callee.property.type === 'Identifier') {
        const obj = node.callee.object;
        const root = obj.type === 'Identifier' ? obj.name : describeSource(obj);
        return `${root}.${node.callee.property.name}()`;
      }
      return 'request data';
    }

    function typeText(typeAnnotation: TSESTree.Node | undefined | null): string {
      if (!typeAnnotation) return '<type>';
      const text = context.sourceCode.getText(typeAnnotation as TSESTree.Node);
      if (!text) return '<type>';
      return text.length > 40 ? text.slice(0, 37) + '…' : text;
    }

    return {
      TSAsExpression(node: TSESTree.TSAsExpression) {
        try {
          if (!isUntrustedExpression(node.expression as TSESTree.Node)) return;
          // Bail on `as any` / `as unknown` — those are widening, not narrowing,
          // and a separate (real) concern.
          const t = (node as any).typeAnnotation;
          if (t?.type === 'TSAnyKeyword' || t?.type === 'TSUnknownKeyword') return;
          context.report({
            node: node as TSESTree.Node,
            messageId: 'untypedAssertion',
            data: {
              typeText: typeText(t),
              source: describeSource(node.expression as TSESTree.Node),
            },
          });
        } catch (err) {
          debugLog('no-unvalidated-input', err);
        }
      },
      TSTypeAssertion(node: any) {
        try {
          if (!isUntrustedExpression(node.expression)) return;
          const t = node.typeAnnotation;
          if (t?.type === 'TSAnyKeyword' || t?.type === 'TSUnknownKeyword') return;
          context.report({
            node,
            messageId: 'untypedAssertion',
            data: {
              typeText: typeText(t),
              source: describeSource(node.expression),
            },
          });
        } catch (err) {
          debugLog('no-unvalidated-input', err);
        }
      },
      TSSatisfiesExpression(node: any) {
        try {
          if (!isUntrustedExpression(node.expression)) return;
          context.report({
            node,
            messageId: 'untypedSatisfies',
            data: {
              typeText: typeText(node.typeAnnotation),
              source: describeSource(node.expression),
            },
          });
        } catch (err) {
          debugLog('no-unvalidated-input', err);
        }
      },
    };
  },
});
