import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import rule from '../../src/rules/no-floating-promise-handler.js';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester();

ruleTester.run('no-floating-promise-handler', rule, {
  valid: [
    // Sync handler — fine.
    { code: 'app.get("/x", (req, res) => res.send("ok"));' },
    // Async handler wrapped in try/catch at top level.
    {
      code: `app.get("/x", async (req, res, next) => {
        try { const u = await load(); res.json(u); } catch (e) { next(e); }
      });`,
    },
    // Async handler that returns a .catch(next) chain.
    {
      code: `app.post("/y", async (req, res, next) => {
        return load().then(u => res.json(u)).catch(next);
      });`,
    },
    // asyncHandler wrapper.
    {
      code: `app.get("/x", asyncHandler(async (req, res) => {
        const u = await load(); res.json(u);
      }));`,
    },
    // express.Router().get(...) — not in receiver list, but it's not
    // our concern (the wrapper detector still catches it on direct
    // app.use chains; this is a deliberate scope choice).
    { code: 'expressRouter.get("/x", async (req, res) => { await load(); });' },
    // Receiver isn't a router — skip.
    { code: 'eventBus.on("event", async () => { await handle(); });' },
    // Custom safeWrappers option.
    {
      code: 'app.get("/x", wrapMe(async (req, res) => { await load(); }));',
      options: [{ safeWrappers: ['wrapMe'] }],
    },
  ],
  invalid: [
    // Classic AI mistake — async handler, no try/catch.
    {
      code: 'app.get("/x", async (req, res) => { const u = await load(); res.json(u); });',
      errors: [{ messageId: 'unwrappedAsyncHandler' }],
    },
    // POST handler.
    {
      code: 'app.post("/login", async (req, res) => { const u = await auth(req.body); res.json(u); });',
      errors: [{ messageId: 'unwrappedAsyncHandler' }],
    },
    // Async function expression form.
    {
      code: 'app.put("/y", async function (req, res) { await save(req.body); res.sendStatus(204); });',
      errors: [{ messageId: 'unwrappedAsyncHandler' }],
    },
    // Async arrow with expression body (no block).
    {
      code: 'app.get("/items", async (req, res) => res.json(await all()));',
      errors: [{ messageId: 'unwrappedAsyncHandler' }],
    },
    // Async middleware chain — second arg in app.use(mw1, mw2).
    {
      code: 'app.use(authMiddleware, async (req, res, next) => { req.user = await fetchUser(req); next(); });',
      errors: [{ messageId: 'unwrappedAsyncHandler' }],
    },
    // `router.get(...)`.
    {
      code: 'router.get("/x", async (req, res) => { const x = await fetch(); res.json(x); });',
      errors: [{ messageId: 'unwrappedAsyncHandler' }],
    },
  ],
});
