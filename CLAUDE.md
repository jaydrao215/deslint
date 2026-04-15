# Claude working rules for this repo

## Never commit what you haven't built

**Every commit must pass build + tests + type-check before it is pushed.**
A deployment failure caused by a preventable local error is unacceptable — the
fix is always cheaper before the push than after.

Concretely, before `git commit` or `git push`:

1. **Build the app you changed.**
   - `apps/docs/**` → `pnpm --filter @deslint/docs build`
   - `packages/eslint-plugin/**` → `pnpm --filter @deslint/eslint-plugin build`
   - `packages/cli/**` → `pnpm --filter @deslint/cli build`
   - `packages/mcp/**` → `pnpm --filter @deslint/mcp build`
   - When in doubt, from repo root: `pnpm -r build`
2. **Run the type-checker.** Next.js runs `tsc --noEmit` during `next build`,
   so the build step covers this for `apps/docs`. For packages without a build
   step, run `pnpm -r typecheck` or equivalent.
3. **Run the tests** for anything non-trivial (`pnpm -r test` or filtered).
4. **Only then commit and push.**

If the build/tests/types fail, fix the underlying issue; do not paper over it
with `--no-verify`, `// @ts-expect-error`, or `git push --force`.

### Common traps this has caught

- **Duplicate JSX attributes** after an Edit splits/duplicates a `style={}` or
  `className=""`. TypeScript catches this during `next build` but not during
  casual file-reading. Always re-build after multi-prop Edits.
- **Missing files** (e.g. `.gitignore` swallowing a Next.js route directory
  named `coverage/`). `pnpm build` surfaces these as 404s in the route table —
  check the "Route (app)" list after every build.
- **Broken imports** from moved/renamed files. `next build` catches these; a
  passing build is the proof.

## Git push policy

- Push only the branch specified in the session brief; never push to `main` or
  another branch without explicit permission.
- Use `git push -u origin <branch>` and retry network failures with exponential
  backoff (2s, 4s, 8s, 16s) up to 4 times.
- Never use `--no-verify`, `--force`, or skip pre-commit hooks unless the user
  explicitly requests it.

## GitHub interactions

- Use the `mcp__github__*` MCP tools for all GitHub interactions (never the
  `gh` CLI).
- Only the `jaydrao215/deslint` repository is in scope.
- Do **not** open PRs unless the user explicitly asks.
- Post GitHub comments only when a reply is genuinely necessary (e.g., explaining
  why a review suggestion cannot be applied).
