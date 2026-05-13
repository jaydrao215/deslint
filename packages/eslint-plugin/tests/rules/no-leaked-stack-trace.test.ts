import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import rule from '../../src/rules/no-leaked-stack-trace.js';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester();

ruleTester.run('no-leaked-stack-trace', rule, {
  valid: [
    // Generic error responses.
    { code: 'res.status(500).json({ error: "internal_error" });' },
    { code: 'res.status(400).json({ error: "invalid_input", code: "VALIDATION_FAILED" });' },
    { code: 'res.send("Server error");' },
    { code: 'reply.code(500).send({ message: "Something went wrong" });' },
    // Non-error variable named differently.
    { code: 'res.json({ user, items });' },
    // Response with safe body.
    { code: 'return new Response("ok", { status: 200 });' },
    { code: 'return NextResponse.json({ ok: true });' },
    // Non-response receiver with similar method.
    { code: 'queue.send(message);' },
    { code: 'channel.send(payload);' },
  ],
  invalid: [
    // The classic — err.stack straight into res.send.
    {
      code: 'res.status(500).send(err.stack);',
      errors: [{ messageId: 'leakedStack' }],
    },
    // Whole error object via res.json.
    {
      code: 'res.json({ error: err });',
      errors: [{ messageId: 'leakedErrorObject' }],
    },
    // Wrapping the stack explicitly.
    {
      code: 'res.json({ message: e.message, stack: e.stack });',
      errors: [{ messageId: 'leakedStack' }],
    },
    // Concat with stack.
    {
      code: 'res.send("Boom: " + err.stack);',
      errors: [{ messageId: 'leakedStack' }],
    },
    // Template literal with stack interpolation.
    {
      code: 'res.send(`Error: ${err.stack}`);',
      errors: [{ messageId: 'leakedStack' }],
    },
    // Bare exception identifier.
    {
      code: 'res.send(err);',
      errors: [{ messageId: 'leakedErrorObject' }],
    },
    // Fastify-style reply.
    {
      code: 'reply.code(500).send(err.stack);',
      errors: [{ messageId: 'leakedStack' }],
    },
    {
      code: 'reply.send({ error: e });',
      errors: [{ messageId: 'leakedErrorObject' }],
    },
    // Next.js Response.
    {
      code: 'return new Response(err.stack, { status: 500 });',
      errors: [{ messageId: 'leakedStack' }],
    },
    // NextResponse.json shape.
    {
      code: 'return NextResponse.json({ error: err });',
      errors: [{ messageId: 'leakedErrorObject' }],
    },
    // Koa ctx.
    {
      code: 'ctx.body = { error: e }; ctx.json({ error: e });',
      errors: [{ messageId: 'leakedErrorObject' }],
    },
  ],
});
