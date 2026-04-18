# Deslint 0.6.0 — Pre-release validation

Date: 2026-04-18
Branch: `claude/validate-npm-packages-oss`
Node: 20.19+

Reproducible via `scripts/validate-published-packages.sh` (runs the full
sequence below against a sandbox runner workspace).

## Scope

All four publishable packages built from HEAD, packed, installed as
tarballs into a clean consumer workspace, and exercised against real
open-source projects:

| Package                   | Version |
| ------------------------- | ------- |
| `@deslint/shared`         | 0.6.0   |
| `@deslint/eslint-plugin`  | 0.6.0   |
| `@deslint/cli`            | 0.6.0   |
| `@deslint/mcp`            | 0.6.0   |

OSS projects used:

- [`shadcn/taxonomy`](https://github.com/shadcn/taxonomy) — Next.js 14 +
  Tailwind app (primary consumer profile).
- [`vercel/ai-chatbot`](https://github.com/vercel/ai-chatbot) — Next.js
  15 + Tailwind + MDX (breadth check).

## Build

`pnpm -r build` → all packages green. `next build` produces the expected
docs route table with no duplicate JSX / missing import errors.

## Unit tests

| Package                 | Pass / Total | Notes                                       |
| ----------------------- | ------------ | ------------------------------------------- |
| `@deslint/shared`       | 264 / 264    | budget schema, loader, evaluator, trailer   |
| `@deslint/eslint-plugin`| 1159 / 1159  | 38 test files, all 34 rules covered         |
| `@deslint/cli`          | 237 / 239    | 2 `git-diff` tests fail in sandbox only[^1] |
| `@deslint/mcp`          | 34 / 34      | `enforce_budget` + tools + install          |

Totals: **1694 / 1696** (2 env-only failures, no deslint regression).

[^1]: `tests/git-diff.test.ts` calls `git commit` inside a temp repo.
      The sandbox commit-signing server rejects these commits with
      `400 missing source`. The failures reproduce on `main` with no
      deslint changes staged. Outside the sandbox (where `git commit`
      is unsigned or the developer key is available) both cases pass.

## Packing and consumer install

`npm pack` preserves `workspace:*` references in the emitted tarball,
which would fail `npm install` outside pnpm. The harness:

1. extracts each tarball,
2. rewrites `workspace:*` / `workspace:^` to the literal `0.6.0`
   version in that tarball's `package.json`,
3. repacks with the `package/` prefix intact,
4. installs all four tarballs into a fresh runner workspace,
5. verifies `require('@deslint/cli/package.json').version === '0.6.0'`.

Install surface works unchanged under pnpm, npm, and yarn classic when
the rewriting step is applied — a reminder that we must run this
rewrite during the `release.yml` publish step (pnpm publish does this
automatically; plain `npm publish` does not).

## CLI smoke (taxonomy)

```
deslint scan              → 12 rules fire, Design Health Score reported
deslint scan --diff HEAD~50
                          → 92 diff-scoped violations, no false positives
                            from unrelated base-branch churn
deslint scan --budget .deslint/budget.yml
                          → exit 1 when enforce: true and minOverallScore
                            breached; structured budget report printed
deslint attest            → JSON with { schema, createdAt, deslint,
                            projectDir, rulesetHash, score, files[94],
                            budget }; each file entry carries a sha256
```

Budget file used (schema from `packages/shared/src/budget-schema.ts`):

```yaml
enforce: true
minOverallScore: 95
maxViolations: 20
maxRuleViolations:
  deslint/prefers-reduced-motion: 10
  deslint/no-arbitrary-spacing: 5
  deslint/responsive-required: 5
```

## ESLint plugin flat config

Tested both consumer projects with a minimal flat config:

```js
import deslint from '@deslint/eslint-plugin';
import tseslint from 'typescript-eslint';

export default [
  { ignores: ['**/node_modules/**', '**/.next/**', '**/dist/**'] },
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaFeatures: { jsx: true }, ecmaVersion: 'latest', sourceType: 'module' },
    },
    plugins: { deslint: deslint.configs.recommended.plugins.deslint },
    rules: deslint.configs.recommended.rules,
  },
];
```

Results: **17 distinct rules fire** across both projects out of 34
total, **0 parse errors, 0 crashes**. The previous doc claim of "33
rules" was stale — the plugin now ships 34.

## MCP server smoke (`@deslint/mcp`)

Protocol `2025-06-18`. The stdio harness at
`/tmp/deslint-validation/mcp-smoke.mjs` performs the full handshake:

```
initialize            → protocolVersion 2025-06-18, serverInfo ok
notifications/initialized
tools/list            → 7 tools exposed
tools/call enforce_budget
                      → { allowed: false, reasons: [...] }
                        matches CLI --budget output exactly
```

## Release readiness checklist

- [x] Package versions bumped to `0.6.0`.
- [x] `CHANGELOG.md` updated with the 0.6.0 entry.
- [x] Build green: `pnpm -r build`.
- [x] Tests green modulo sandbox-only git signing failures.
- [x] Tarball install verified on real consumer projects.
- [x] Harness committed at `scripts/validate-published-packages.sh`.
- [ ] **Merge this branch into `main` and push the `v0.6.0` tag** —
      `.github/workflows/release.yml` gates on `v*.*.*` tag push,
      validates `packages/*/package.json` versions match the tag, then
      publishes idempotently per package. Claude does not tag or
      publish; that step is operator-only.
