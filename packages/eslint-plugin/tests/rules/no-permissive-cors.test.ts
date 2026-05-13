import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import rule from '../../src/rules/no-permissive-cors.js';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester();

ruleTester.run('no-permissive-cors', rule, {
  valid: [
    // No credentials — wildcard origin is fine (the spec covers this).
    { code: 'app.use(cors({ origin: "*" }));' },
    { code: 'app.use(cors());' },
    // Allowlist origin with credentials — the correct shape.
    {
      code: 'app.use(cors({ origin: ["https://app.example.com"], credentials: true }));',
    },
    // Origin callback that actually checks against an allowlist.
    {
      code: `app.use(cors({
        origin: function (origin, cb) {
          if (allowedHosts.includes(origin)) return cb(null, true);
          return cb(new Error("blocked"));
        },
        credentials: true,
      }));`,
    },
    // Manual headers — fixed origin, with credentials.
    {
      code: `function handler(req, res) {
        res.setHeader("Access-Control-Allow-Origin", "https://app.example.com");
        res.setHeader("Access-Control-Allow-Credentials", "true");
      }`,
    },
    // Only one of wildcard / credentials set.
    {
      code: `function handler(req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*");
      }`,
    },
    // Static string but a different value than 'true'.
    {
      code: `function handler(req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Credentials", "false");
      }`,
    },
  ],
  invalid: [
    // The canonical AI mistake.
    {
      code: 'app.use(cors({ origin: "*", credentials: true }));',
      errors: [{ messageId: 'wildcardWithCredentials' }],
    },
    // Reverse property order.
    {
      code: 'app.use(cors({ credentials: true, origin: "*" }));',
      errors: [{ messageId: 'wildcardWithCredentials' }],
    },
    // Wildcard inside an array.
    {
      code: 'app.use(cors({ origin: ["*", "https://app.example.com"], credentials: true }));',
      errors: [{ messageId: 'wildcardWithCredentials' }],
    },
    // Reflect-any-origin callback (expression body).
    {
      code: 'app.use(cors({ origin: (origin, cb) => cb(null, true), credentials: true }));',
      errors: [{ messageId: 'reflectiveOrigin' }],
    },
    // Reflect-any-origin callback (block body).
    {
      code: `app.use(cors({
        origin: function (origin, cb) { cb(null, true); },
        credentials: true,
      }));`,
      errors: [{ messageId: 'reflectiveOrigin' }],
    },
    // origin: true literal.
    {
      code: 'app.use(cors({ origin: true, credentials: true }));',
      errors: [{ messageId: 'reflectiveOrigin' }],
    },
    // Manual headers — both bad in the same handler.
    {
      code: `function handler(req, res) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Credentials", "true");
      }`,
      errors: [{ messageId: 'wildcardHeader' }],
    },
    // Reverse order of header calls.
    {
      code: `function handler(req, res) {
        res.setHeader("Access-Control-Allow-Credentials", "true");
        res.setHeader("Access-Control-Allow-Origin", "*");
      }`,
      errors: [{ messageId: 'wildcardHeader' }],
    },
  ],
});
