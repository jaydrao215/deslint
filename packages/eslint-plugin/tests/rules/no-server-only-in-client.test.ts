import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import rule from '../../src/rules/no-server-only-in-client.js';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

ruleTester.run('no-server-only-in-client', rule, {
  valid: [
    // Server file (no "use client") — anything goes.
    { code: 'import fs from "fs";' },
    { code: 'import { readFile } from "node:fs/promises";' },
    // Client file importing browser-safe libs — fine.
    {
      code: `'use client';\nimport React from 'react';\nimport { useEffect } from 'react';`,
    },
    {
      code: `'use client';\nimport clsx from 'clsx';\nimport { z } from 'zod';`,
    },
    // Common-but-safe imports — wouldn't appear in the deny list.
    {
      code: `'use client';\nimport axios from 'axios';`,
    },
  ],
  invalid: [
    // node:fs in a client file.
    {
      code: `'use client';\nimport fs from 'fs';`,
      errors: [{ messageId: 'serverOnlyImport', data: { spec: 'fs', mod: 'fs' } }],
    },
    // node: protocol form.
    {
      code: `'use client';\nimport { readFile } from 'node:fs/promises';`,
      errors: [{ messageId: 'serverOnlyImport' }],
    },
    // child_process.
    {
      code: `'use client';\nimport { exec } from 'child_process';`,
      errors: [{ messageId: 'serverOnlyImport' }],
    },
    // crypto.
    {
      code: `'use client';\nimport crypto from 'crypto';`,
      errors: [{ messageId: 'serverOnlyImport' }],
    },
    // DB driver.
    {
      code: `'use client';\nimport { PrismaClient } from '@prisma/client';`,
      errors: [{ messageId: 'serverOnlyImport' }],
    },
    // server-only package.
    {
      code: `'use client';\nimport 'server-only';`,
      errors: [{ messageId: 'serverOnlyImport' }],
    },
    // require() form.
    {
      code: `'use client';\nconst fs = require('fs');`,
      errors: [{ messageId: 'serverOnlyRequire' }],
    },
    // dynamic import().
    {
      code: `'use client';\nconst p = import('node:crypto');`,
      errors: [{ messageId: 'serverOnlyImport' }],
    },
    // *.client.tsx filename heuristic.
    {
      filename: 'app/components/Inner.client.tsx',
      code: `import { readFile } from 'fs/promises';`,
      errors: [{ messageId: 'serverOnlyImport' }],
    },
    // AWS SDK in a client file.
    {
      code: `'use client';\nimport { S3Client } from '@aws-sdk/client-s3';`,
      errors: [{ messageId: 'serverOnlyImport' }],
    },
    // Custom extra-server-modules option.
    {
      code: `'use client';\nimport { secret } from 'my-server-lib';`,
      options: [{ extraServerModules: ['my-server-lib'] }],
      errors: [{ messageId: 'serverOnlyImport' }],
    },
  ],
});
