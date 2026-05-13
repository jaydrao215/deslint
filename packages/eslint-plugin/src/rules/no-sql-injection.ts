import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import { debugLog } from '../utils/debug.js';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://deslint.com/docs/rules/${name}`
);

export type Options = [
  {
    /** Extra method names (on any receiver) that take a SQL string. */
    extraQueryMethods?: string[];
  },
];

export type MessageIds =
  | 'concatenatedQuery'
  | 'interpolatedQuery'
  | 'dynamicQueryCall';

/**
 * Method names commonly used to execute a SQL statement. We match by the
 * member name only — not the receiver type — because the AST gives us no
 * type info, and the cost of false negatives (silent SQLi) is much higher
 * than the cost of a couple of extra warnings on a `pg`/`mysql2`/`sqlite3`/
 * `knex`/`sequelize`/`prisma.$queryRaw` call.
 *
 * `prisma.$queryRaw` and `prisma.$executeRaw` are intentionally listed:
 * the tagged-template form is safe (Prisma parameterizes), but the
 * *call* form (`prisma.$queryRawUnsafe(...)`) is the documented-as-unsafe
 * variant. We accept the noise on the safe form because Prisma users
 * should be using the tagged template anyway.
 */
const QUERY_METHOD_NAMES: ReadonlySet<string> = new Set([
  'query',         // pg, mysql, mysql2, mssql
  'execute',       // mysql2, mssql, sequelize
  'raw',           // knex, sequelize, prisma.$queryRaw (call form)
  'prepare',       // better-sqlite3 — safe when followed by .bind, but
                   // an interpolated literal passed to prepare itself
                   // means the developer baked the value into the SQL.
  '$queryRaw',     // Prisma
  '$queryRawUnsafe',
  '$executeRaw',
  '$executeRawUnsafe',
  // Note on intentionally-omitted names:
  //   `exec`, `run`, `all`, `get` are common sqlite3 / better-sqlite3
  //   entrypoints, but they're also widely used by non-SQL APIs
  //   (`proxyaddr.all(req, trust)`, `pattern.exec(input)`, `obj.get(key)`,
  //   `task.run()`). Flagging `db.all(callback)` as SQL on the basis of
  //   the method name alone produces too many false positives in real
  //   codebases, and the concat / template-literal visitors below still
  //   catch the dangerous SHAPE regardless of method name — that's where
  //   the real signal lives.
]);

/**
 * SQL-shaped string heuristic. We only fire on strings that contain at
 * least one SQL keyword followed by syntactically-plausible structure.
 * Plain English sentences containing the word "select" must not match.
 */
/**
 * Anchored at the start of the text (after optional whitespace) so prose
 * containing the word "select … from" mid-sentence doesn't match. The
 * column list between SELECT and FROM is restricted to identifier / glob
 * / punctuation characters — prose words like "an option" don't fit.
 */
const SQL_KEYWORD_RE =
  /^\s*(?:SELECT\s+(?:\*|DISTINCT\s+|[\w\s,.()`"*]+)\s+FROM\s+|INSERT\s+INTO\s+|UPDATE\s+\w+\s+SET\s+|DELETE\s+FROM\s+|MERGE\s+INTO\s+|WITH\s+\w+\s+AS\s*\(|TRUNCATE\s+TABLE\s+|ALTER\s+TABLE\s+|CREATE\s+(?:TABLE|INDEX|VIEW)\s+|DROP\s+(?:TABLE|INDEX|VIEW)\s+)/i;

function isSqlLike(text: string): boolean {
  return SQL_KEYWORD_RE.test(text);
}

/**
 * Walk a `+` / `+=` chain, collecting the joined operands. Returns the
 * concatenated *static* text plus the list of dynamic operands.
 */
function collectConcat(node: TSESTree.Expression): {
  staticText: string;
  hasDynamic: boolean;
} {
  let staticText = '';
  let hasDynamic = false;

  function walk(n: TSESTree.Expression): void {
    if (n.type === 'BinaryExpression' && n.operator === '+') {
      walk(n.left as TSESTree.Expression);
      walk(n.right as TSESTree.Expression);
      return;
    }
    if (n.type === 'Literal' && typeof n.value === 'string') {
      staticText += n.value;
      return;
    }
    if (n.type === 'TemplateLiteral' && n.expressions.length === 0) {
      for (const q of n.quasis) staticText += q.value.cooked ?? '';
      return;
    }
    hasDynamic = true;
  }
  walk(node);
  return { staticText, hasDynamic };
}

function templateStaticText(node: TSESTree.TemplateLiteral): string {
  return node.quasis.map((q) => q.value.cooked ?? '').join('');
}

/**
 * Detect tagged templates that parameterize their interpolations safely.
 * `sql`, `SQL`, `sqlTag` from common libraries (`sql-template-strings`,
 * `slonik`, `postgres` (a.k.a. `postgres-js`), Prisma `$queryRaw`).
 *
 * We allow these regardless of what they're called with.
 */
function isSafeTaggedTemplate(tagName: string): boolean {
  const lower = tagName.toLowerCase();
  return lower === 'sql' || lower === 'sqltag' || lower === 'postgres';
}

function getCalleeMemberName(node: TSESTree.CallExpression): string | null {
  if (node.callee.type !== 'MemberExpression') return null;
  if (node.callee.property.type !== 'Identifier') return null;
  return node.callee.property.name;
}

export default createRule<Options, MessageIds>({
  name: 'no-sql-injection',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Flag SQL queries built with string concatenation or template-literal interpolation. AI-generated handlers routinely splice `req.query` / `req.body` straight into a query string. This rule catches both shapes and points at parameterized queries / tagged-template SQL builders.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          extraQueryMethods: {
            type: 'array',
            items: { type: 'string' },
            description: 'Method names (on any receiver) that execute a SQL string.',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      concatenatedQuery:
        'SQL string built by `+` concatenation — any dynamic operand is an injection path. Use a parameterized query (`?` / `$1` placeholders or a tagged-template builder like `sql\\`…\\``).',
      interpolatedQuery:
        'SQL string built by template-literal interpolation — any `${…}` operand is an injection path. Switch to a parameterized query or a SQL tag (`sql\\`…\\``).',
      dynamicQueryCall:
        '`{{method}}()` called with a dynamic SQL value. Pass a parameterized query and bind values separately so user input cannot reach the SQL parser.',
    },
  },
  defaultOptions: [{ extraQueryMethods: [] }],
  create(context, [options]) {
    const queryMethods = new Set<string>(QUERY_METHOD_NAMES);
    for (const name of options.extraQueryMethods ?? []) queryMethods.add(name);

    function checkSqlExpression(node: TSESTree.Expression, fromQueryCall: boolean): void {
      // Concatenation form.
      if (node.type === 'BinaryExpression' && node.operator === '+') {
        const { staticText, hasDynamic } = collectConcat(node);
        if (!hasDynamic) return;
        if (!isSqlLike(staticText)) return;
        context.report({ node, messageId: 'concatenatedQuery' });
        return;
      }

      // Interpolated template literal.
      if (node.type === 'TemplateLiteral' && node.expressions.length > 0) {
        if (!isSqlLike(templateStaticText(node))) return;
        context.report({ node, messageId: 'interpolatedQuery' });
        return;
      }

      // Bare identifier / member access passed to a query method.
      if (fromQueryCall) {
        if (
          node.type === 'Literal' ||
          (node.type === 'TemplateLiteral' && node.expressions.length === 0)
        ) {
          return; // Static literal — fine.
        }
        if (node.type === 'TaggedTemplateExpression') {
          // sql`…` etc. — already safe.
          if (
            node.tag.type === 'Identifier' && isSafeTaggedTemplate(node.tag.name)
          ) {
            return;
          }
          if (
            node.tag.type === 'MemberExpression' &&
            node.tag.property.type === 'Identifier' &&
            isSafeTaggedTemplate(node.tag.property.name)
          ) {
            return;
          }
        }
        // Any other shape (Identifier, MemberExpression, CallExpression,
        // etc.) is an opaque-but-dynamic value — that's what we want to
        // flag when it lands inside a known query method.
        // ESCAPE HATCH: bare identifiers named like a static query
        // (`SQL`, `QUERY`, `Q_…`) are usually module-scope constants. We
        // can't see their definition, so we stay quiet to avoid noise.
        if (node.type === 'Identifier') {
          const n = node.name;
          if (/^[A-Z_][A-Z0-9_]*$/.test(n)) return;
        }
      }
    }

    return {
      CallExpression(node) {
        try {
          const member = getCalleeMemberName(node);
          if (!member || !queryMethods.has(member)) return;
          const arg = node.arguments[0];
          if (!arg || arg.type === 'SpreadElement') return;

          // `User.all(callback)` / `Pet.get(cb)` — callback-style ORM
          // fetches reuse the same method names as SQL drivers. A
          // function expression as the first arg means "give me the
          // results", not "here's a SQL string". Skip.
          if (arg.type === 'ArrowFunctionExpression' || arg.type === 'FunctionExpression') return;

          // Concat / interpolated-template args are already reported by the
          // BinaryExpression / TemplateLiteral visitors below. Skip them
          // here to avoid duplicate diagnostics.
          if (arg.type === 'BinaryExpression' && arg.operator === '+') return;
          if (arg.type === 'TemplateLiteral' && arg.expressions.length > 0) return;

          // Safe shapes: static literal, static template, safe tagged template.
          if (arg.type === 'Literal') return;
          if (arg.type === 'TemplateLiteral' && arg.expressions.length === 0) return;
          if (arg.type === 'TaggedTemplateExpression') {
            if (arg.tag.type === 'Identifier' && isSafeTaggedTemplate(arg.tag.name)) return;
            if (
              arg.tag.type === 'MemberExpression' &&
              arg.tag.property.type === 'Identifier' &&
              isSafeTaggedTemplate(arg.tag.property.name)
            ) {
              return;
            }
          }
          // SCREAMING_CASE identifier — typically a module-scope static query
          // constant. We can't see the definition, so stay quiet.
          if (arg.type === 'Identifier' && /^[A-Z_][A-Z0-9_]*$/.test(arg.name)) return;
          // Bare lowercase identifier — also opaque, but the developer almost
          // always assigned a static literal to it. Stay quiet to avoid
          // noise; the BinaryExpression/TemplateLiteral visitors catch the
          // dangerous shape at the build site.
          if (arg.type === 'Identifier') return;

          // Everything else (function calls, member access, conditional) is
          // genuinely opaque and dynamic — flag it.
          context.report({
            node: arg as TSESTree.Node,
            messageId: 'dynamicQueryCall',
            data: { method: member },
          });
        } catch (err) {
          debugLog('no-sql-injection', err);
        }
      },
      BinaryExpression(node) {
        try {
          if (node.operator !== '+') return;
          // Avoid double-reporting: only fire on top-level concat (the
          // outermost `+` chain), so we don't report on left/right
          // sub-expressions.
          const parent = (node as { parent?: TSESTree.Node }).parent;
          if (
            parent &&
            parent.type === 'BinaryExpression' &&
            parent.operator === '+'
          ) {
            return;
          }
          checkSqlExpression(node, false);
        } catch (err) {
          debugLog('no-sql-injection', err);
        }
      },
      TemplateLiteral(node) {
        try {
          if (node.expressions.length === 0) return;
          // Don't double-report SQL tag templates: `sql\`SELECT … ${x}\``.
          const parent = (node as { parent?: TSESTree.Node }).parent;
          if (
            parent &&
            parent.type === 'TaggedTemplateExpression' &&
            parent.quasi === node
          ) {
            const tag = parent.tag;
            if (tag.type === 'Identifier' && isSafeTaggedTemplate(tag.name)) return;
            if (
              tag.type === 'MemberExpression' &&
              tag.property.type === 'Identifier' &&
              isSafeTaggedTemplate(tag.property.name)
            ) {
              return;
            }
          }
          checkSqlExpression(node, false);
        } catch (err) {
          debugLog('no-sql-injection', err);
        }
      },
    };
  },
});
