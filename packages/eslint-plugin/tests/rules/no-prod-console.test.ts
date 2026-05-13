import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import rule from '../../src/rules/no-prod-console.js';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester();

ruleTester.run('no-prod-console', rule, {
  valid: [
    // Production-allowed methods.
    { code: 'console.error("DB connection failed", err);' },
    { code: 'console.warn("Cache miss", key);' },
    // Test files — exempt by filename.
    {
      filename: 'src/__tests__/user.test.ts',
      code: 'console.log("running test");',
    },
    {
      filename: 'tests/api.spec.ts',
      code: 'console.log("setup");',
    },
    {
      filename: 'cypress/e2e/login.cy.ts',
      code: 'console.log("ok");',
    },
    // CLI / scripts.
    {
      filename: 'scripts/migrate.ts',
      code: 'console.log("migrating user", id);',
    },
    {
      filename: 'bin/release.ts',
      code: 'console.log("publishing");',
    },
    // Non-`console` object with `.log`.
    { code: 'logger.log("info");' },
    { code: 'this.console.log("ok");' },
    // Custom allow list.
    {
      code: 'console.log("ok");',
      options: [{ allowMethods: ['log', 'error', 'warn'] }],
    },
  ],
  invalid: [
    // The classic AI artefact.
    {
      code: 'console.log("got here");',
      errors: [{ messageId: 'prodConsole', data: { method: 'log' } }],
    },
    // debug.
    {
      code: 'console.debug({ user, body });',
      errors: [{ messageId: 'prodConsole', data: { method: 'debug' } }],
    },
    // info.
    {
      code: 'console.info("loaded", user);',
      errors: [{ messageId: 'prodConsole' }],
    },
    // dir.
    {
      code: 'console.dir(deepObj);',
      errors: [{ messageId: 'prodConsole' }],
    },
    // trace.
    {
      code: 'console.trace();',
      errors: [{ messageId: 'prodConsole' }],
    },
    // table — common for "let me eyeball the rows".
    {
      code: 'console.table(users);',
      errors: [{ messageId: 'prodConsole' }],
    },
    // Custom forbidden set.
    {
      code: 'console.error("bad");',
      options: [{ forbiddenMethods: ['error'], allowMethods: [] }],
      errors: [{ messageId: 'prodConsole', data: { method: 'error' } }],
    },
  ],
});
