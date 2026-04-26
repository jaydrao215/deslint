<!--
Thanks for sending a PR! Please fill in the sections below so a
reviewer can merge with confidence. If this is a draft and not all
boxes apply yet, that's fine — just note which ones you'll fill in
before requesting review.
-->

## Summary

<!-- 1–3 sentences: what does this PR change and why? Link the issue
it closes (`Closes #123`) if one exists. -->

## Type of change

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New rule (adds to `@deslint/eslint-plugin`)
- [ ] Feature (CLI, Action, MCP server, or shared utility)
- [ ] Performance (rule or scan-path optimization)
- [ ] Refactor (no user-visible behavior change)
- [ ] Docs (README, `apps/docs`, inline comments)
- [ ] Tooling / CI / deps

## Deslint architecture checklist

<!-- These are hard requirements from CONTRIBUTING.md. A PR that
ticks none of the boxes that apply will be sent back. -->

- [ ] Every rule is wrapped in `try/catch` — a single bad file can't
      crash lint for the whole project.
- [ ] No type-aware ESLint rules (no `ParserServices.getTypeChecker()`).
- [ ] Any class-touching rule uses `createClassVisitor()`; any
      element-touching rule uses `createElementVisitor()`.
- [ ] Zero LLM / AI API calls and zero network I/O at rule runtime.
- [ ] Tailwind v3 AND v4 class names handled via the mapping in
      `packages/eslint-plugin/src/utils/class-extractor.ts`.
- [ ] Node.js `>=20.19.0` honored in every `package.json` you touched.

## Testing

- [ ] `pnpm -r --filter '!@deslint/docs' test` passes locally.
- [ ] `pnpm --filter @deslint/eslint-plugin bench` stays under the
      2 ms/file budget (only required when you touched a rule or
      the visitor infrastructure).
- [ ] New rule / feature has valid, invalid, edge-case, and autofix
      tests (where autofix applies).
- [ ] Validated on a real-world codebase at least once (not only
      synthetic fixtures). Paste a one-liner with what you scanned
      and what the score was.

## Breaking changes

- [ ] No
- [ ] Yes — described below, with a migration path and the next
      version bump target.

## DCO sign-off

By submitting this pull request I certify that I have the right to
submit the contribution under the project's open-source license, and
I agree to the [Developer Certificate of Origin](https://developercertificate.org/).

Sign your commits with `git commit -s` (or add `Signed-off-by: Your
Name <email@example.com>` to each commit message). Unsigned commits
will be blocked by the DCO check at merge time.

---

<!-- Optional: anything you want a reviewer to look at closely, any
open questions, or context that won't be obvious from the diff. -->
