import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import rule from '../../src/rules/secure-cookies.js';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester();

ruleTester.run('secure-cookies', rule, {
  valid: [
    // All three flags present.
    {
      code: 'res.cookie("preference", v, { httpOnly: true, secure: true, sameSite: "lax" });',
    },
    {
      code: 'reply.setCookie("ui", v, { httpOnly: true, secure: true, sameSite: "strict" });',
    },
    // Next.js cookies().set object form.
    {
      code: 'cookies().set({ name: "session", value: v, httpOnly: true, secure: true, sameSite: "lax" });',
    },
    // Non-cookie set call — unrelated state setter.
    { code: 'state.set("key", "value");' },
    { code: 'map.set(k, v);' },
    // Bare `set()` with no receiver — too generic to flag.
    { code: 'set("a", "b", { x: 1 });' },
  ],
  invalid: [
    // Missing httpOnly (preference cookie).
    {
      code: 'res.cookie("preference", v, { secure: true, sameSite: "lax" });',
      errors: [{ messageId: 'missingHttpOnly' }],
    },
    // Missing secure.
    {
      code: 'res.cookie("preference", v, { httpOnly: true, sameSite: "lax" });',
      errors: [{ messageId: 'missingSecure' }],
    },
    // Missing sameSite.
    {
      code: 'res.cookie("preference", v, { httpOnly: true, secure: true });',
      errors: [{ messageId: 'missingSameSite' }],
    },
    // Completely missing options object → all three missing → reports the first (httpOnly).
    {
      code: 'res.cookie("preference", v);',
      errors: [{ messageId: 'missingHttpOnly' }],
    },
    // Session-shaped name with missing flags → louder `insecureSession`.
    {
      code: 'res.cookie("session", token);',
      errors: [{ messageId: 'insecureSession' }],
    },
    {
      code: 'res.cookie("connect.sid", id, { secure: true });',
      errors: [{ messageId: 'insecureSession' }],
    },
    {
      code: 'reply.setCookie("auth_token", t);',
      errors: [{ messageId: 'insecureSession' }],
    },
    {
      code: 'reply.setCookie("next-auth.session-token", t, { sameSite: "lax" });',
      errors: [{ messageId: 'insecureSession' }],
    },
    // Next.js cookies().set object form, missing flags.
    {
      code: 'cookies().set({ name: "session", value: v });',
      errors: [{ messageId: 'insecureSession' }],
    },
    // sameSite: false is treated as missing.
    {
      code: 'res.cookie("preference", v, { httpOnly: true, secure: true, sameSite: false });',
      errors: [{ messageId: 'missingSameSite' }],
    },
    // Koa/Next style cookies.set with token cookie missing all.
    {
      code: 'ctx.cookies.set("token", t);',
      errors: [{ messageId: 'insecureSession' }],
    },
  ],
});
