import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import rule from '../../src/rules/no-hardcoded-secrets.js';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester();

/*
 * Test fixtures are constructed at runtime via concatenation so the
 * source of THIS file never contains a string that matches a real
 * secret-fingerprint regex. GitHub push protection (and every other
 * org-grade secret scanner) will reject a commit that contains one,
 * even inside a test file. Building the fixtures in TypeScript runtime
 * means the linter still sees the full string in the source it lints,
 * but git/grep never see it in this file.
 */
const AWS_ACCESS_KEY = 'AKIA' + 'IOSFODNN' + '7EXAMPLE';
const GITHUB_PAT = 'gh' + 'p_abcdefghijklmnopqrstuvwxyz0123456789';
const STRIPE_LIVE = 'sk_' + 'live_abcdefghijklmnopqrstuvwxyz0123';
const GOOGLE_API = 'AI' + 'zaSyA-1234567890abcdefghijklmnopqrstu';
const SLACK_BOT = 'xo' + 'xb-1234567890-abcdef-ABCDEF1234567890';
const OPENAI_PROJECT = 'sk-' + 'proj-abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGH';
const ANTHROPIC_KEY = 'sk-' + 'ant-api03-abcdefghijklmnopqrstuvwxyz0123';
const JWT_TOKEN =
  'eyJh' + 'bGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' +
  '.eyJzdWIiOiIxMjM0NTY3ODkwIn0' +
  '.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
const HIGH_ENTROPY = 'Zx9k7Lm2Pq8Rn4Tv6Wy1Aj3Bg5Cf0Dh2Ei4Fk6';

ruleTester.run('no-hardcoded-secrets', rule, {
  valid: [
    // Short / placeholder literals stay quiet — AI tools paste these constantly.
    { code: 'const apiKey = "";' },
    { code: 'const apiKey = "changeme";' },
    { code: 'const password = "x";' },
    { code: 'const token = "<TOKEN>";' },
    { code: 'const apiKey = "your-api-key";' },
    { code: 'const password = process.env.PASSWORD;' },
    { code: 'const token = process.env.GITHUB_TOKEN;' },
    // Prose / SQL / URLs that happen to be long don't fire.
    { code: 'const msg = "The cat sat on the mat and looked at the sun";' },
    { code: 'const sql = "SELECT id, name, email FROM users WHERE active = 1";' },
    { code: 'const url = "https://example.com/api/v2/users/12345/profile";' },
    // Long high-entropy literal NOT bound to a secret-named identifier — let it pass.
    { code: 'const fingerprint = "f8b4c2a9e1d6f0b3a7c5d8e9f0a1b2c3d4e5";' },
    { code: 'const checksum = "8f9a2b1c3d4e5f6789abcdef0123456789ab";' },
    // Random-looking but bound to a non-secret identifier.
    { code: 'const userId = "abc123def456ghi789jkl012mno345pqr678";' },
    // Test-y bindings — entropy is low enough that we skip them.
    { code: 'const apiKey = "test-api-key-123";' },
  ],
  invalid: [
    // AWS access key — fingerprint match, always fires.
    {
      code: `const key = "${AWS_ACCESS_KEY}";`,
      errors: [{ messageId: 'secretShapedLiteral' }],
    },
    // GitHub token (the format used by `gh auth token`).
    {
      code: `const token = "${GITHUB_PAT}";`,
      errors: [{ messageId: 'secretShapedLiteral' }],
    },
    // Stripe live key.
    {
      code: `const stripe = "${STRIPE_LIVE}";`,
      errors: [{ messageId: 'secretShapedLiteral' }],
    },
    // Google API key.
    {
      code: `const gkey = "${GOOGLE_API}";`,
      errors: [{ messageId: 'secretShapedLiteral' }],
    },
    // Slack bot token.
    {
      code: `const slack = "${SLACK_BOT}";`,
      errors: [{ messageId: 'secretShapedLiteral' }],
    },
    // OpenAI project key shape.
    {
      code: `const k = "${OPENAI_PROJECT}";`,
      errors: [{ messageId: 'secretShapedLiteral' }],
    },
    // Anthropic key shape.
    {
      code: `const k = "${ANTHROPIC_KEY}";`,
      errors: [{ messageId: 'secretShapedLiteral' }],
    },
    // JWT.
    {
      code: `const t = "${JWT_TOKEN}";`,
      errors: [{ messageId: 'secretShapedLiteral' }],
    },
    // PEM private key.
    {
      code: 'const pem = "-----BEGIN RSA PRIVATE KEY-----\\nMIIEowIBAA...";',
      errors: [{ messageId: 'secretShapedLiteral' }],
    },
    // High-entropy literal assigned to `apiKey` — arm 2.
    {
      code: `const apiKey = "${HIGH_ENTROPY}";`,
      errors: [{ messageId: 'secretAssignedToIdentifier' }],
    },
    // Object property form.
    {
      code: `const config = { secret_key: "${HIGH_ENTROPY}" };`,
      errors: [{ messageId: 'secretAssignedToIdentifier' }],
    },
    // Template literal with no expressions still counts.
    {
      code: `const accessToken = \`${HIGH_ENTROPY}\`;`,
      errors: [{ messageId: 'secretAssignedToIdentifier' }],
    },
    // Member expression assignment.
    {
      code: `config.apiKey = "${HIGH_ENTROPY}";`,
      errors: [{ messageId: 'secretAssignedToIdentifier' }],
    },
    // User-supplied extra pattern.
    {
      code: 'const x = "INTERNAL-CRED-1234567890";',
      options: [{ extraPatterns: ['INTERNAL-CRED-\\d+'] }],
      errors: [{ messageId: 'secretShapedLiteral' }],
    },
  ],
});
