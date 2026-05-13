import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import rule from '../../src/rules/no-unsafe-mass-assignment.js';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester();

ruleTester.run('no-unsafe-mass-assignment', rule, {
  valid: [
    // Allowlist DTO build.
    { code: 'const dto = { name: req.body.name, email: req.body.email };' },
    // Validated body.
    { code: 'const parsed = userSchema.parse(req.body); user.update(parsed);' },
    // Prisma typed update — second-level data object, no req.body splat.
    {
      code: 'prisma.user.update({ where: { id }, data: { name: req.body.name } });',
    },
    // Object.assign with safe source.
    { code: 'Object.assign(user, defaults);' },
    // Spread of a non-request object.
    { code: 'const merged = { ...defaults, ...current };' },
    // ORM mutation called with a DTO (literal object) — not the raw body.
    { code: 'User.create({ name: req.body.name, email: req.body.email });' },
    // Method called update on something that isn't ORM-shaped — but
    // we still flag a bare `update(req.body)` since the rule can't
    // tell. The AI-mistake target here outweighs the FP; tests above
    // demonstrate the safe shapes that don't fire.
  ],
  invalid: [
    // Classic — Object.assign with req.body.
    {
      code: 'Object.assign(user, req.body);',
      errors: [{ messageId: 'massAssignObject' }],
    },
    // Multiple sources, untrusted in 2nd position.
    {
      code: 'Object.assign(user, defaults, req.body);',
      errors: [{ messageId: 'massAssignObject' }],
    },
    // Spread.
    {
      code: 'const next = { ...user, ...req.body };',
      errors: [{ messageId: 'massAssignSpread' }],
    },
    // Spread into freshly created object.
    {
      code: 'await User.create({ ...req.body });',
      errors: [{ messageId: 'massAssignSpread' }],
    },
    // ORM .update(req.body) shortcut.
    {
      code: 'await user.update(req.body);',
      errors: [{ messageId: 'massAssignSave' }],
    },
    // Static-method form.
    {
      code: 'await User.create(req.body);',
      errors: [{ messageId: 'massAssignSave' }],
    },
    // Mongoose .save() shape — uncommon but possible.
    {
      code: 'user.save(req.body);',
      errors: [{ messageId: 'massAssignSave' }],
    },
    // request.body (full word).
    {
      code: 'Object.assign(account, request.body);',
      errors: [{ messageId: 'massAssignObject' }],
    },
    // req.query — also untrusted.
    {
      code: 'Object.assign(filters, req.query);',
      errors: [{ messageId: 'massAssignObject' }],
    },
    // Next.js Web Request: `await request.json()`.
    {
      code: 'await user.update(await request.json());',
      errors: [{ messageId: 'massAssignSave' }],
    },
  ],
});
