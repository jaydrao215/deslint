import js from '@eslint/js';
import tseslint from 'typescript-eslint';

// Root ESLint v10 flat config for the monorepo.
//
// apps/docs has its own local eslint.config.mjs (Next.js + React 19) and is
// globally ignored here so it isn't accidentally linted by these rules.
//
// typescript-eslint v8 is ESLint v10 compatible (same version used in
// packages/eslint-plugin) and gives us a real TS parser for the rest of the
// workspace.

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/.turbo/**',
      '**/coverage/**',
      'apps/docs/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      'no-unused-vars': 'off', // handled by typescript-eslint
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'off', // permitted in AST node handlers per CLAUDE.md
    },
  },
);
