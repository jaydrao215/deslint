import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import rule from '../../src/rules/no-ssrf.js';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester();

ruleTester.run('no-ssrf', rule, {
  valid: [
    // Hardcoded URL.
    { code: 'fetch("https://api.example.com/users");' },
    { code: 'axios.get("https://api.example.com/data");' },
    { code: 'http.get(`https://api.example.com/${id}`);' }, // id is server-side, not req-sourced
    { code: 'axios.post("https://api.example.com/upload", payload);' },
    // Allowlist mapping.
    { code: 'fetch(allowedHosts[req.query.region]);' },
    // Server-loaded resource attached by middleware.
    { code: 'fetch("https://api.example.com/users/" + req.user.id);' },
    // db / non-http receiver with same method name.
    { code: 'db.get(req.query.id);' },
    { code: 'cache.get(req.params.key);' },
    // Config-object with hardcoded URL.
    { code: 'axios({ url: "https://api.example.com" });' },
  ],
  invalid: [
    // fetch with body URL.
    {
      code: 'fetch(req.body.url);',
      errors: [{ messageId: 'ssrf' }],
    },
    // fetch with query URL.
    {
      code: 'fetch(req.query.target);',
      errors: [{ messageId: 'ssrf' }],
    },
    // Template literal interpolation.
    {
      code: 'fetch(`${req.query.host}/api/v1/data`);',
      errors: [{ messageId: 'ssrf' }],
    },
    // axios.get.
    {
      code: 'axios.get(req.query.url);',
      errors: [{ messageId: 'ssrf' }],
    },
    // axios.post.
    {
      code: 'await axios.post(req.body.callback, payload);',
      errors: [{ messageId: 'ssrf' }],
    },
    // axios config-object form.
    {
      code: 'axios({ url: req.body.url, method: "GET" });',
      errors: [{ messageId: 'ssrf' }],
    },
    // got.
    {
      code: 'got(req.body.url);',
      errors: [{ messageId: 'ssrf' }],
    },
    // http.request.
    {
      code: 'http.request(req.params.url);',
      errors: [{ messageId: 'ssrf' }],
    },
    // https.get.
    {
      code: 'https.get(req.headers.host);',
      errors: [{ messageId: 'ssrf' }],
    },
    // Concat.
    {
      code: 'fetch("http://" + req.body.host + "/api");',
      errors: [{ messageId: 'ssrf' }],
    },
    // Named local axios instance.
    {
      code: 'apiClient.get(req.body.path);',
      errors: [{ messageId: 'ssrf' }],
    },
    // new URL with untrusted input.
    {
      code: 'fetch(new URL(req.query.path, "https://internal.example.com"));',
      errors: [{ messageId: 'ssrf' }],
    },
    // Next.js — request.nextUrl.searchParams.get.
    {
      code: 'fetch(request.nextUrl.searchParams.get("u"));',
      errors: [{ messageId: 'ssrf' }],
    },
  ],
});
