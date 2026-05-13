import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import rule from '../../src/rules/no-weak-crypto.js';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester();

ruleTester.run('no-weak-crypto', rule, {
  valid: [
    // Strong hashes.
    { code: 'crypto.createHash("sha256");' },
    { code: 'crypto.createHash("sha512");' },
    { code: 'crypto.createHmac("sha256", key);' },
    { code: 'crypto.createHash("blake2b512");' },
    // Strong ciphers.
    { code: 'crypto.createCipheriv("aes-256-gcm", key, iv);' },
    { code: 'crypto.createCipheriv("chacha20-poly1305", key, iv);' },
    // Math.random for non-security purposes.
    { code: 'const jitter = Math.random() * 100;' },
    { code: 'const animationDelay = Math.random();' },
    { code: 'const x = Math.random();' },
    // Dynamic algo string — we don't speculate.
    { code: 'crypto.createHash(algo);' },
  ],
  invalid: [
    // MD5.
    {
      code: 'crypto.createHash("md5");',
      errors: [{ messageId: 'weakHashAlgorithm', data: { algo: 'md5' } }],
    },
    // SHA-1.
    {
      code: 'crypto.createHash("sha1");',
      errors: [{ messageId: 'weakHashAlgorithm', data: { algo: 'sha1' } }],
    },
    // HMAC with MD5.
    {
      code: 'crypto.createHmac("md5", secret);',
      errors: [{ messageId: 'weakHashAlgorithm', data: { algo: 'md5' } }],
    },
    // Case-insensitive.
    {
      code: 'crypto.createHash("MD5");',
      errors: [{ messageId: 'weakHashAlgorithm' }],
    },
    // RIPEMD-160.
    {
      code: 'crypto.createHash("ripemd160");',
      errors: [{ messageId: 'weakHashAlgorithm' }],
    },
    // DES cipher.
    {
      code: 'crypto.createCipheriv("des-ede3-cbc", key, iv);',
      errors: [{ messageId: 'weakCipher', data: { cipher: 'des-ede3-cbc' } }],
    },
    // RC4 cipher.
    {
      code: 'crypto.createCipheriv("rc4", key, iv);',
      errors: [{ messageId: 'weakCipher', data: { cipher: 'rc4' } }],
    },
    // Math.random assigned to a security identifier.
    {
      code: 'const token = Math.random().toString(36).slice(2);',
      errors: [{ messageId: 'mathRandomForSecurity', data: { identifier: 'token' } }],
    },
    {
      code: 'const sessionId = Math.random();',
      errors: [{ messageId: 'mathRandomForSecurity', data: { identifier: 'sessionId' } }],
    },
    {
      code: 'const resetToken = Math.random();',
      errors: [{ messageId: 'mathRandomForSecurity' }],
    },
    {
      code: 'const csrf = Math.random();',
      errors: [{ messageId: 'mathRandomForSecurity' }],
    },
    {
      code: 'config.apiKey = Math.random();',
      errors: [{ messageId: 'mathRandomForSecurity' }],
    },
    {
      code: 'const data = { nonce: Math.random() };',
      errors: [{ messageId: 'mathRandomForSecurity' }],
    },
  ],
});
