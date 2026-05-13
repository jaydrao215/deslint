import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import rule from '../../src/rules/require-jwt-expiry.js';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester();

ruleTester.run('require-jwt-expiry', rule, {
  valid: [
    // Correct shape — expiresIn present.
    { code: 'jwt.sign(payload, secret, { expiresIn: "15m" });' },
    { code: 'jwt.sign(payload, secret, { algorithm: "HS256", expiresIn: "1h" });' },
    { code: 'JWT.sign(payload, secret, { expiresIn: 3600 });' },
    { code: 'jsonwebtoken.sign(payload, secret, { expiresIn: "7d" });' },
    { code: 'jwtService.sign(payload, secret, { expiresIn: "15m" });' },
    // Non-jwt namespace called `.sign`.
    { code: 'crypto.sign("sha256", buf, key);' },
    { code: 'wallet.sign(tx);' },
  ],
  invalid: [
    // No options at all.
    {
      code: 'jwt.sign(payload, secret);',
      errors: [{ messageId: 'missingExpiry' }],
    },
    // Options without expiresIn.
    {
      code: 'jwt.sign(payload, secret, { algorithm: "HS256" });',
      errors: [{ messageId: 'missingExpiry' }],
    },
    // algorithm: "none" — louder.
    {
      code: 'jwt.sign(payload, secret, { algorithm: "none", expiresIn: "15m" });',
      errors: [{ messageId: 'noneAlgorithm' }],
    },
    // Payload-side exp without expiresIn opt.
    {
      code: 'jwt.sign({ sub: id, exp: Math.floor(Date.now()/1000) + 900 }, secret);',
      errors: [{ messageId: 'expiryAlreadyInPayload' }],
    },
    // JWT.sign capitalised.
    {
      code: 'JWT.sign(payload, secret);',
      errors: [{ messageId: 'missingExpiry' }],
    },
  ],
});
