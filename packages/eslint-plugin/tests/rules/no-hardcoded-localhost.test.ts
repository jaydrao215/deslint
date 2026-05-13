import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import rule from '../../src/rules/no-hardcoded-localhost.js';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester();

ruleTester.run('no-hardcoded-localhost', rule, {
  valid: [
    // Env-driven URLs.
    { code: 'fetch(process.env.API_URL);' },
    { code: 'const url = process.env.NEXT_PUBLIC_API_URL ?? "https://api.example.com";' },
    // Production-shaped hardcoded URL — fine, not our concern.
    { code: 'fetch("https://api.example.com/v1/users");' },
    // Plain prose / SQL / regex literals.
    { code: 'const msg = "user prefers dark mode";' },
    { code: 'const re = /^[a-z]+$/;' },
    // Test files — exempted by filename.
    {
      filename: 'src/__tests__/api.test.ts',
      code: 'await fetch("http://localhost:3000/health");',
    },
    {
      filename: 'tests/e2e/login.spec.ts',
      code: 'await page.goto("http://127.0.0.1:3000/login");',
    },
    {
      filename: 'cypress/e2e/api.cy.ts',
      code: 'cy.request("http://localhost:8080/items");',
    },
    // String literal that contains "localhost" but isn't a URL.
    {
      code: 'const help = "set the host to localhost when developing locally";',
    },
    // Bare hostname not at a URL sink — too noisy to flag.
    { code: 'const host = "localhost";' },
  ],
  invalid: [
    // Classic — hardcoded in fetch call.
    {
      code: 'fetch("http://localhost:3000/api/items");',
      errors: [{ messageId: 'hardcodedLocalhost' }],
    },
    // 127.0.0.1.
    {
      code: 'const r = await fetch("http://127.0.0.1:8080/health");',
      errors: [{ messageId: 'hardcodedLocalhost' }],
    },
    // axios.get.
    {
      code: 'axios.get("http://localhost:4000/users");',
      errors: [{ messageId: 'hardcodedLocalhost' }],
    },
    // WS URL.
    {
      code: 'const s = new WebSocket("ws://localhost:9001/socket");',
      errors: [{ messageId: 'hardcodedLocalhost' }],
    },
    // 0.0.0.0.
    {
      code: 'const cfg = { base: "http://0.0.0.0:3000" };',
      errors: [{ messageId: 'hardcodedLocalhost' }],
    },
    // Embedded inside a longer string with whitespace — still found.
    {
      code: 'const helpText = "Fetch from http://localhost:3000/api for local dev";',
      errors: [{ messageId: 'hardcodedLocalhost' }],
    },
    // Template literal (no expressions).
    {
      code: 'const url = `http://localhost:3000/api/v1`;',
      errors: [{ messageId: 'hardcodedLocalhost' }],
    },
    // new URL ctor.
    {
      code: 'const u = new URL("http://localhost:3000");',
      errors: [{ messageId: 'hardcodedLocalhost' }],
    },
    // host.docker.internal.
    {
      code: 'axios.get("http://host.docker.internal:5432/health");',
      errors: [{ messageId: 'hardcodedLocalhost' }],
    },
  ],
});
