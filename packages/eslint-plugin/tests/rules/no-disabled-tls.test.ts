import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import rule from '../../src/rules/no-disabled-tls.js';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester();

ruleTester.run('no-disabled-tls', rule, {
  valid: [
    { code: 'const agent = new https.Agent({ ca });' },
    { code: 'axios.get(url, { httpsAgent: new https.Agent({ ca: bundle }) });' },
    { code: 'request({ url, rejectUnauthorized: true });' },
    { code: 'const opts = { rejectUnauthorized: dynamic };' },
    // unrelated false literal on a different key
    { code: 'const opts = { followRedirects: false };' },
    // Setting other env vars is fine.
    { code: 'process.env.SOMETHING_ELSE = "0";' },
  ],
  invalid: [
    // Object literal in any context.
    {
      code: 'const opts = { rejectUnauthorized: false };',
      errors: [{ messageId: 'rejectUnauthorizedFalse' }],
    },
    {
      code: 'axios.get(url, { httpsAgent: new https.Agent({ rejectUnauthorized: false }) });',
      errors: [{ messageId: 'agentInsecureTls' }],
    },
    {
      code: 'const agent = new https.Agent({ rejectUnauthorized: false });',
      errors: [{ messageId: 'agentInsecureTls', data: { ctor: 'https.Agent' } }],
    },
    {
      code: 'request({ url: "https://x", rejectUnauthorized: false });',
      errors: [{ messageId: 'rejectUnauthorizedFalse' }],
    },
    // Env var assignment.
    {
      code: 'process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";',
      errors: [{ messageId: 'tlsEnvDisabled' }],
    },
  ],
});
