import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import tsparser from '@typescript-eslint/parser';
import rule from '../../src/rules/no-unvalidated-input.js';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsparser,
    parserOptions: { sourceType: 'module' },
  },
});

ruleTester.run('no-unvalidated-input', rule, {
  valid: [
    // Validated through zod.
    { code: 'const body = userSchema.parse(req.body);' },
    { code: 'const body = userSchema.parse(await request.json());' },
    // Validated through Joi.
    { code: 'const body = Joi.attempt(req.body, schema);' },
    // Manual narrowing — fine.
    { code: 'const id = String(req.params.id);' },
    // Type assertion on non-request data — out of scope.
    { code: 'const x = (someValue) as number;' },
    { code: 'const cfg = config as Config;' },
    // `as any` is widening, not narrowing — skip.
    { code: 'const body = req.body as any;' },
    { code: 'const body = req.body as unknown;' },
    // Casting a server-loaded resource.
    { code: 'const u = req.user as AuthenticatedUser;' },
  ],
  invalid: [
    // Classic AI mistake — assertion on req.body.
    {
      code: 'const body = req.body as CreateUserInput;',
      errors: [{ messageId: 'untypedAssertion' }],
    },
    // `as { email: string }` on await request.json().
    {
      code: 'const data = (await request.json()) as { email: string; password: string };',
      errors: [{ messageId: 'untypedAssertion' }],
    },
    // req.query assertion.
    {
      code: 'const filters = req.query as Record<string, string>;',
      errors: [{ messageId: 'untypedAssertion' }],
    },
    // req.params.x assertion.
    {
      code: 'const id = req.params.id as string;',
      errors: [{ messageId: 'untypedAssertion' }],
    },
    // request.headers assertion.
    {
      code: 'const headers = request.headers as Record<string, string>;',
      errors: [{ messageId: 'untypedAssertion' }],
    },
    // request.cookies assertion.
    {
      code: 'const cookies = req.cookies as { sid: string };',
      errors: [{ messageId: 'untypedAssertion' }],
    },
    // `satisfies` on req.body.
    {
      code: 'const body = req.body satisfies CreateUserInput;',
      errors: [{ messageId: 'untypedSatisfies' }],
    },
    // await req.json() shape.
    {
      code: 'const data = (await req.json()) as User;',
      errors: [{ messageId: 'untypedAssertion' }],
    },
  ],
});
