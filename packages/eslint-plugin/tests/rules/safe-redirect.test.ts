import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import rule from '../../src/rules/safe-redirect.js';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester();

ruleTester.run('safe-redirect', rule, {
  valid: [
    // Hardcoded path — safe.
    { code: 'res.redirect("/home");' },
    { code: 'res.redirect(302, "/login");' },
    { code: 'reply.redirect("/dashboard");' },
    { code: 'ctx.redirect("/welcome");' },
    // Allowlist-derived target.
    { code: 'res.redirect(allowed[key]);' },
    // Resolved through a mapping function — opaque, give the benefit of the doubt.
    { code: 'res.redirect(resolveSafe(input));' },
    // Server-loaded resources attached by upstream middleware — the
    // canonical "redirect to the user's own profile" shape that every
    // Express app on Earth ships.
    { code: 'res.redirect("/user/" + req.user.id);' },
    { code: 'res.redirect("/pet/" + req.pet.id);' },
    { code: 'res.redirect("/dashboard/" + req.session.userId);' },
    // Non-redirect method called `redirect` on something unrelated is rare;
    // we accept the small risk to stay simple.
  ],
  invalid: [
    // Express — req.query.next.
    {
      code: 'res.redirect(req.query.next);',
      errors: [{ messageId: 'openRedirect', data: { source: 'req.query.next' } }],
    },
    // Express with status code.
    {
      code: 'res.redirect(302, req.query.url);',
      errors: [{ messageId: 'openRedirect' }],
    },
    // Body data.
    {
      code: 'res.redirect(req.body.url);',
      errors: [{ messageId: 'openRedirect' }],
    },
    // Path params.
    {
      code: 'res.redirect(`/users/${req.params.id}/page?next=${req.query.next}`);',
      errors: [{ messageId: 'openRedirect' }],
    },
    // Concat with header.
    {
      code: 'res.redirect("/login?return=" + req.headers.referer);',
      errors: [{ messageId: 'openRedirect' }],
    },
    // Koa-style ctx.redirect.
    {
      code: 'ctx.redirect(ctx.query.next);',
      errors: [{ messageId: 'openRedirect' }],
    },
    // Fastify-style reply.redirect.
    {
      code: 'reply.redirect(request.query.return_to);',
      errors: [{ messageId: 'openRedirect' }],
    },
    // Next.js — request.headers.get(...) returns dynamic data.
    {
      code: 'return NextResponse.redirect(request.headers.get("referer"));',
      errors: [{ messageId: 'openRedirect' }],
    },
  ],
});
