// ESLint v10 flat config for @vizlint/docs (Next.js 15 + React 19 + TypeScript).
//
// Why a local config: the monorepo root eslint.config.js globally ignores
// apps/docs/** because it lacks a TypeScript parser. Next.js's official
// eslint-config-next still pulls in plugins capped at ESLint 9, so we cannot
// use it under the project's ESLint v10 + flat-config-only rule.
//
// This config gives docs proper TS/TSX linting using typescript-eslint v8
// (which IS ESLint 10 compatible — same as packages/eslint-plugin uses).
// React/Next-specific rules are intentionally omitted until upstream plugins
// catch up to ESLint 10.

import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['.next/**', 'out/**', 'node_modules/**', 'next-env.d.ts'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      // JSX intrinsics + React global aren't visible to plain JS rules.
      'no-undef': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
);
