# Contributing to Deslint

Thanks for your interest in contributing. Deslint is a deterministic
design quality gate for AI-generated frontend code — the bar for
contributions is high because the moat is "zero false positives, every
rule wrapped, predictable across every framework." Please read this
whole guide before opening a PR.

## Development Setup

### Prerequisites

- Node.js **≥ 20.19.0** (see `.nvmrc`)
- pnpm **9.x** or later
- macOS, Linux, or WSL2 (native Windows paths are untested)

### Getting Started

```bash
git clone https://github.com/jaydrao215/deslint.git
cd deslint
pnpm install
pnpm build
pnpm -r --filter '!@deslint/docs' test
pnpm typecheck
```

## Monorepo Structure

```
packages/
  eslint-plugin/  — ESLint rules + configs    (npm: @deslint/eslint-plugin)
  cli/            — Commander.js CLI          (npm: @deslint/cli)
  mcp/            — MCP server                (npm: @deslint/mcp)
  shared/         — Types, schemas, compliance (npm: @deslint/shared)
apps/
  docs/           — deslint.com marketing + docs (not published)
action/           — GitHub Action for PR design reviews
```

## Non-negotiable architecture rules

These are **hard requirements** for any code that lands on `main`. A PR
that violates any of them will be sent back for changes regardless of
how useful the feature is.

- **ESLint v10+ flat config only.** No legacy `.eslintrc` support
  anywhere in the code or docs.
- **Node.js ≥ 20.19.0.** Declared in every `package.json` engines field.
- **No type-aware ESLint rules.** All rules use AST pattern matching
  only — no TypeChecker access. This is how Deslint stays under the
  2 ms/file performance budget.
- **Every rule wrapped in try/catch.** An unhandled exception crashes
  linting for the entire file. Swallow to `debugLog()` (zero-overhead
  in production) and skip the node.
- **Tailwind v3 AND v4 support.** Use the class mapping in
  `packages/eslint-plugin/src/utils/class-extractor.ts`. Never assume
  v3-only class names.
- **Framework-agnostic from day one.** Any new rule that touches
  elements or attributes should use `createElementVisitor()`; any rule
  that touches classes should use `createClassVisitor()`. Both cover
  React JSX, Vue SFC, Svelte, Angular templates, and plain HTML from
  one source file.
- **Zero LLM / AI API calls, ever.** Every rule is pure deterministic
  static analysis. Same input → same output.
- **Zero network I/O at rule runtime.** The only network access
  allowed anywhere in the codebase is the `@deslint/docs` build-time
  GitHub stars fetch (apps/docs/src/lib/github-stars.ts).

## Code Style

- TypeScript strict mode everywhere.
- No `any` types except in ESLint AST node handlers where the types
  are genuinely complex. Prefer narrowing with `unknown` + type guards.
- `const` over `let`. Never `var`.
- Rule files: **kebab-case** (`no-arbitrary-colors.ts`, `heading-hierarchy.ts`).
- Utility files and exported functions: **camelCase**
  (`extractClassesFromString`, `findNearestColor`).
- Comments only where logic isn't self-evident. No narrative preambles.
- Don't add docstrings, comments, or type annotations to code you
  didn't change.
- Don't add error handling, fallbacks, or validation for scenarios
  that can't happen. Trust internal code and framework guarantees.
  Only validate at system boundaries (user input, external APIs).

## Performance Budgets (enforced in CI)

- **Individual rule: < 2 ms per file** on the benchmark (`pnpm --filter
  @deslint/eslint-plugin bench`).
- **Full scan (500 files): < 15 seconds cold**, < 5 seconds cached.
- If your rule causes the benchmark to regress, the CI run will fail
  and the PR will be blocked.

## Testing Standards

- **Every rule needs** valid cases, invalid cases, edge cases, and
  autofix tests (where applicable).
- Enforced coverage baseline: **86% lines / 75% branches** on
  `@deslint/eslint-plugin`. Ratchet up via targeted tests for specific
  files, not big-bang sprints.
- Test with **real-world class patterns** from v0, Lovable, Bolt,
  Claude Code output — not synthetic fixtures. If you're adding a rule
  for a real AI-generated anti-pattern, include the original
  AI-generated code as a test fixture.
- Use `@typescript-eslint/rule-tester` with Vitest.

```bash
# Run all tests
pnpm -r --filter '!@deslint/docs' test

# Run tests for a specific package
pnpm --filter @deslint/eslint-plugin test

# Watch mode
pnpm --filter @deslint/eslint-plugin test:watch

# Self-dogfood (lint our own eslint-plugin source with our own rules)
pnpm --filter @deslint/eslint-plugin lint

# Benchmark
pnpm --filter @deslint/eslint-plugin bench
```

## Adding a New Rule

1. **Create `packages/eslint-plugin/src/rules/your-rule-name.ts`**
2. **Pick the right visitor:**
   - `createClassVisitor()` from `utils/class-visitor.ts` — for rules
     that inspect Tailwind classes on any framework
   - `createElementVisitor()` from `utils/element-visitor.ts` — for
     rules that inspect element tags and attributes across React JSX,
     Vue, Svelte, Angular, and plain HTML. Supports an `onComplete`
     hook for collect-then-evaluate rules like `heading-hierarchy` or
     `form-labels`
3. **Wrap the rule body in try/catch** — never crash linting.
4. **Set `fixable: 'code'`** and implement auto-fix where the transform
   is unambiguous. Suggestion-only or warn-only otherwise.
5. **Register in `packages/eslint-plugin/src/index.ts`**.
6. **Map to a WCAG Success Criterion** in
   `packages/shared/src/compliance.ts` if the rule is accessibility-related.
7. **Write tests** in `packages/eslint-plugin/tests/rules/your-rule-name.test.ts`
   — valid cases, invalid cases, edge cases, autofix cases.
8. **Add to the CLI rule registry** in
   `packages/cli/src/lint-runner.ts` so the `deslint scan` command
   picks it up (the MCP server delegates to the CLI, so this is a
   single source of truth).
9. **Validate on a real codebase** before merging. If your rule has
   never been run against non-test code, it will likely have false
   positives.
10. **Run `pnpm -r --filter '!@deslint/docs' test`** to verify nothing
    else regresses, then `pnpm --filter @deslint/eslint-plugin bench`
    to confirm you're under the 2 ms/file budget.

## Commit messages

Conventional-commits style:

- `feat(eslint-plugin): add skip-navigation rule`
- `fix(cli): handle missing tailwind.config.ts gracefully`
- `test(heading-hierarchy): cover nested portal case`
- `docs(readme): clarify cross-framework rule count`
- `refactor(shared): extract colorspace conversions`
- `chore(deps): bump vitest to 3.3`

## Reporting bugs

Please open an issue at https://github.com/jaydrao215/deslint/issues with:

- **Minimal repro** (10-line component, if possible, or a link to a
  public repo branch)
- **Expected vs actual behavior**
- **Deslint version** (`npm list @deslint/eslint-plugin`)
- **ESLint version and config** (flat config snippet)
- **Framework + parser** (React, Vue, Svelte, Angular, HTML)

False-positive reports get the highest priority — they erode the
core trust metric.

## Security issues

See [SECURITY.md](./SECURITY.md) for responsible disclosure. Do not
file security reports as public issues.

## License

By contributing, you agree that your contributions will be licensed
under the MIT License (same as the project itself — see
[LICENSE](./LICENSE)).
