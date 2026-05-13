import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import rule from '../../src/rules/no-sql-injection.js';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester();

ruleTester.run('no-sql-injection', rule, {
  valid: [
    // Parameterized — values are bound separately.
    {
      code: 'db.query("SELECT * FROM users WHERE id = ?", [userId]);',
    },
    {
      code: 'pool.query("UPDATE users SET name = $1 WHERE id = $2", [name, id]);',
    },
    {
      code: 'db.execute("INSERT INTO logs (msg) VALUES (?)", [msg]);',
    },
    // Static SQL literal — no dynamic operand at all.
    {
      code: 'db.query("SELECT 1");',
    },
    {
      code: 'db.query(`SELECT * FROM users`);',
    },
    // SQL tag template — parameterizes safely.
    {
      code: 'db.query(sql`SELECT * FROM users WHERE id = ${id}`);',
    },
    {
      code: 'await prisma.$queryRaw(sql`SELECT * FROM t WHERE x = ${x}`);',
    },
    {
      code: 'sql`SELECT * FROM users WHERE id = ${id}`',
    },
    // Plain English prose containing SQL keywords — not SQL-shaped.
    {
      code: 'const msg = "Please select an option from the list" + name;',
    },
    {
      code: 'const greeting = `Hello, ${name}, please select an option`;',
    },
    // Module-scope SQL constant referenced by identifier.
    {
      code: 'db.query(USER_QUERY);',
    },
    // Bare static literal call.
    {
      code: 'const q = "SELECT * FROM t"; db.query(q);',
    },
    // Callback-style ORM fetch — `User.all(cb)`. Method name happens to
    // overlap with sqlite3, but the arg is a function, not a SQL string.
    {
      code: 'User.all(function(err, users) { res.send(users); });',
    },
    {
      code: 'Pet.get(id, (err, pet) => { res.send(pet); });',
    },
    // proxyaddr.all(req, trust) — utility libraries with overloaded names.
    {
      code: 'var addrs = proxyaddr.all(this, trust);',
    },
  ],
  invalid: [
    // Classic concat injection.
    {
      code: 'db.query("SELECT * FROM users WHERE name = \'" + name + "\'");',
      errors: [{ messageId: 'concatenatedQuery' }],
    },
    // Template-literal interpolation.
    {
      code: 'db.query(`SELECT * FROM users WHERE id = ${id}`);',
      errors: [{ messageId: 'interpolatedQuery' }],
    },
    // INSERT with concatenation.
    {
      code: 'pool.execute("INSERT INTO logs (msg) VALUES (\'" + userInput + "\')");',
      errors: [{ messageId: 'concatenatedQuery' }],
    },
    // UPDATE with template literal.
    {
      code: 'connection.query(`UPDATE users SET name = \'${newName}\' WHERE id = ${id}`);',
      errors: [{ messageId: 'interpolatedQuery' }],
    },
    // DELETE with concatenation.
    {
      code: 'db.execute("DELETE FROM users WHERE id = " + id);',
      errors: [{ messageId: 'concatenatedQuery' }],
    },
    // sqlite3-style `.all(sql, params)` with a SQL-shaped concat as the
    // first arg is still caught by the BinaryExpression visitor — the
    // method name no longer matters.
    {
      code: 'db.all("SELECT * FROM users WHERE id = " + id, callback);',
      errors: [{ messageId: 'concatenatedQuery' }],
    },
    // Prisma unsafe raw with interpolation.
    {
      code: 'prisma.$queryRawUnsafe(`SELECT * FROM users WHERE id = ${id}`);',
      errors: [{ messageId: 'interpolatedQuery' }],
    },
    // Concat used outside a query call — still report, the developer was clearly building a query.
    {
      code: 'const q = "SELECT * FROM users WHERE name = \'" + name + "\'";',
      errors: [{ messageId: 'concatenatedQuery' }],
    },
    // Template literal alone, building a SELECT.
    {
      code: 'const q = `SELECT * FROM users WHERE id = ${id}`;',
      errors: [{ messageId: 'interpolatedQuery' }],
    },
    // knex raw with template literal.
    {
      code: 'knex.raw(`SELECT * FROM users WHERE id = ${id}`);',
      errors: [{ messageId: 'interpolatedQuery' }],
    },
    // better-sqlite3 prepare with interpolated value.
    {
      code: 'const stmt = db.prepare(`SELECT * FROM users WHERE name = \'${name}\'`);',
      errors: [{ messageId: 'interpolatedQuery' }],
    },
    // Callback-shape on a method that LOOKS like SQL must not fire, but
    // a SQL-shaped concat anywhere else still does.
    {
      code: 'const q = "SELECT * FROM users WHERE id=\'" + id + "\'"; await db.query(q);',
      errors: [{ messageId: 'concatenatedQuery' }],
    },
    // CTE form (WITH … AS) is recognized as SQL-shaped.
    {
      code: 'db.query("WITH recent AS (SELECT * FROM events WHERE id = " + id + ") SELECT * FROM recent");',
      errors: [{ messageId: 'concatenatedQuery' }],
    },
  ],
});
