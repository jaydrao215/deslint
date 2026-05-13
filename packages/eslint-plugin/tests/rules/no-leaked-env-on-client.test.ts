import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import rule from '../../src/rules/no-leaked-env-on-client.js';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

ruleTester.run('no-leaked-env-on-client', rule, {
  valid: [
    // No "use client" directive — server file, anything goes.
    {
      code: 'const key = process.env.OPENAI_API_KEY;',
    },
    // Client file with a public-prefixed var.
    {
      code: `'use client';\nconst url = process.env.NEXT_PUBLIC_API_URL;`,
    },
    {
      code: `'use client';\nconst v = process.env.VITE_FEATURE_FLAG;`,
    },
    {
      code: `"use client";\nconst v = process.env.PUBLIC_FEATURE;`,
    },
    // NODE_ENV — always allowed.
    {
      code: `'use client';\nif (process.env.NODE_ENV === 'production') { /* … */ }`,
    },
    // Client file but the access is an assignment (server bootstrap might do this).
    {
      code: `'use client';\nprocess.env.SOMETHING = "x";`,
    },
  ],
  invalid: [
    // Classic leak.
    {
      code: `'use client';\nconst key = process.env.OPENAI_API_KEY;`,
      errors: [{ messageId: 'leakedEnv', data: { name: 'OPENAI_API_KEY' } }],
    },
    // Double-quoted directive.
    {
      code: `"use client";\nconst k = process.env.STRIPE_SECRET_KEY;`,
      errors: [{ messageId: 'leakedEnv', data: { name: 'STRIPE_SECRET_KEY' } }],
    },
    // Computed key with a string literal.
    {
      code: `'use client';\nconst k = process.env["DATABASE_URL"];`,
      errors: [{ messageId: 'leakedEnv', data: { name: 'DATABASE_URL' } }],
    },
    // Inside JSX of a "use client" file.
    {
      code: `'use client';\nexport function C() { return <div>{process.env.SECRET_API_KEY}</div>; }`,
      errors: [{ messageId: 'leakedEnv', data: { name: 'SECRET_API_KEY' } }],
    },
    // Dynamic key in a client file.
    {
      code: `'use client';\nconst k = process.env[someVar];`,
      errors: [{ messageId: 'unmarkedEnvInClientFile' }],
    },
    // *.client.tsx — file-path heuristic.
    {
      filename: '/app/components/Settings.client.tsx',
      code: `const k = process.env.SUPABASE_SERVICE_ROLE_KEY;`,
      errors: [{ messageId: 'leakedEnv' }],
    },
  ],
});
