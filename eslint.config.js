import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/.turbo/**'],
  },
  {
    files: ['**/*.ts'],
    rules: {
      'no-unused-vars': 'off', // handled by TypeScript
    },
  },
];
