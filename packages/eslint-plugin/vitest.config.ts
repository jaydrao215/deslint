import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/index.ts'],
      // v0.1.0 enforced baseline. CLAUDE.md target is 95/90 — these
      // thresholds were aspirational and never actually enforced (the CI
      // step was silently broken because @vitest/coverage-v8 wasn't
      // installed). Ratchet upward in the KPMG Phase 2 coverage sprint.
      thresholds: {
        lines: 86,
        branches: 75,
      },
    },
  },
});
