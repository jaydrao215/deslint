# Deslint 0.7 — OSS validation report (internal)

Date: 2026-04-20
Branch: `claude/deslint-feature-planning-647TR`
Status: **pre-release — do not ship 0.7 until the P0 bugs below are fixed**
Reviewer: Claude (automated sweep against real OSS)

> This is an internal working doc. It is deliberately unflattering. The
> point is to find what's broken in Deslint itself before we claim
> anything externally. Marketing-style framing belongs in a later
> `VALIDATION.md` for 0.7 once the fixes land.

## Scope

Deslint CLI `@deslint/cli` HEAD (0.6.0 + P0 #1–#4) run against three
production OSS repos picked for diversity of stack, scale, and coding
style — not cherry-picked to look good:

| Repo               | Stars    | Stack                              | Files scanned | Cold scan |
| ------------------ | -------- | ---------------------------------- | ------------- | --------- |
| `shadcn-ui/ui`     | ~70k     | Next.js 14 + Tailwind v3 + v4      | 3110          | 23.34 s   |
| `twentyhq/twenty`  | ~20k     | Nx + React + **Emotion/styled**    | 3355          | 24.43 s   |
| `calcom/cal.com`   | ~31k     | Next.js + Tailwind + TS            | 1162          | 24.37 s   |

Runtime: Node 20.19, Linux runner, cold cache, no fixtures, no
`--diff`, default recommended config.

## Headline numbers

| Repo        | Score | Violations | Severity=error | CLI exit |
| ----------- | ----- | ---------- | -------------- | -------- |
| shadcn-ui   | 88    | 3780       | 0              | 0        |
| twenty      | **100** | 87       | 0              | 0        |
| calcom      | 81    | 2192       | 2              | **1**    |

A 65k-file React codebase (twenty) scoring a **perfect 100** is the
single loudest signal in this report. See Bug #4.

## Bugs surfaced (fix before any 0.7 release blurb)

### Bug #1 — `prefers-reduced-motion` double/triple-counts per element  (P0)

`packages/eslint-plugin/src/rules/prefers-reduced-motion.ts` fires one
violation per matched *prefix* on the same class attribute. A single
element with `class="transition-all duration-100 ease-linear"` produces
**three** violations even though one `motion-safe:` wrap fixes all of
them.

Effect on the numbers:

- shadcn-ui: **1978 / 3780 violations (52%)** attributed to
  `prefers-reduced-motion`. Manual sampling says the true element
  count is closer to 700 — we're over-reporting by ~2.8×.
- The Design Health Score (which weights raw violation count) is
  dragged down by this inflation across every scanned repo.

Fix direction: group class-list reports by `(node, motion-safe coverage
status)` and emit at most one violation per element, or alternatively
dedupe by `cls.split(':').pop()` across the visitor pass.

### Bug #2 — `prefers-reduced-motion` flags non-vestibular transitions  (P0)

WCAG 2.3.3 scopes to *non-essential animation from interactions*.
Color/shadow/opacity transitions are not vestibular triggers. The
current rule's `MOTION_PREFIXES = ['transition-', ...]` matches
`transition-colors`, `transition-shadow`, `transition-opacity`
indiscriminately — which is a false positive against WCAG itself and
the single biggest source of reviewer fatigue in shadcn-ui.

Sample hits that should not fire:

```
transition-colors            → theme toggle, hover tint — never vestibular
transition-shadow            → card hover — never vestibular
transition-opacity           → fades — not "motion from interactions"
```

Fix direction: narrow the motion prefix list to true motion
(`animate-`, `transition-transform`, `transition-all`, `transition`
bare, `transition-none` already safe), and move color/shadow/opacity
transitions to an opt-in `strictTransitions: true` option.

### Bug #3 — Orphan `duration-*` / `ease-*` flagged without any `transition-*`  (P1)

Tailwind's `duration-*` and `ease-*` utilities are **no-ops without an
accompanying `transition-*`**. The rule flags them anyway — a cosmetic
noise violation that the author cannot meaningfully fix (wrapping a
no-op in `motion-safe:` is theatre).

Fix direction: pre-scan the class list; only emit violations for
`duration-*`/`ease-*`/`delay-*` when the same element also has a
matching `transition-*` utility (and that `transition-*` isn't already
in `SAFE_CLASSES`).

### Bug #4 — Score inflation when project doesn't use Tailwind  (P0)

twenty ships 3355 component files and scored **100**. Twenty uses
Emotion / styled-components, not Tailwind. **All 20+ class-based rules
return zero hits by construction**, the category score collapses to
100, and the overall Design Health Score floors at "perfect."

This is not honest output. A caller reading `score=100` assumes
"Deslint found nothing wrong." The true answer is "Deslint has nothing
to say about this codebase." Those are different states and conflating
them will burn trust the first time a Deslint-clean CSS-in-JS repo
ships a real design regression.

Fix direction:

1. Emit a top-level `applicability` field in JSON output:
   `{ tailwind: <count of Tailwind class attributes seen>, css: <count>, ... }`.
2. If `applicability.tailwind === 0` and only class-based rules ran,
   downgrade `score` to `null` (not `100`) and surface a comment:
   "No Tailwind usage detected — class-based rules did not apply."
3. CLI exit code remains 0 but Action / MCP should pass through the
   `null` score so downstream workflows don't falsely gate on 100.

### Bug #5 — Performance regression vs README claim  (P1)

README claims ~1.66 ms/file (1838 files in 3.05 s). Measured:

| Repo       | ms/file |
| ---------- | ------- |
| shadcn-ui  | 7.50    |
| twenty     | 7.28    |
| calcom     | 20.97   |

cal.com is **12.6×** the advertised cost. Even the best case is 4.5×
over. The README number looks like it was taken from a warm cache or a
small synthetic repo — we should either rerun the benchmark honestly
against a 3k-file Next.js app or restate the budget as "< 25 ms/file
at 95p on a typical Next.js + Tailwind repo" and keep the 2 ms/file
target as an internal rule-level ceiling.

Fix direction: commit a `scripts/bench-oss.sh` that clones a pinned
OSS ref (e.g. shadcn-ui@<sha>) and writes the p50 / p95 ms/file into
CI output; update the README quote once we have a defensible number.

### Bug #6 — CLI JSON output shape inconsistent with Action  (P2)

`deslint scan --json` does not emit a top-level `topViolations` field.
The Action's scan wrapper does emit one (`action/src/scan.ts`
post-processes the CLI run). Consumers of the CLI JSON have to
recompute `topViolations` themselves — and the two shapes have drifted
in subtle ways (Action wraps violation objects with `{ rule, file,
line, column, message, severity }`, CLI emits `violations[].ruleId`).

Fix direction: unify the JSON schema in `@deslint/shared` (one Zod
schema used by both surfaces), add a golden fixture test that locks
the shape, and bump the CLI `--json` to emit the unified shape with a
`schemaVersion` field so downstream tools can version-gate.

### Bug #7 — Exit-code behavior undocumented  (P1)

`deslint scan` exits `1` when any violation has `severity: "error"`
and `0` otherwise. That's the behavior observed on cal.com (2 viewport
`user-scalable=no` findings → exit 1) vs shadcn-ui (0 errors even with
3780 violations → exit 0). The README / CLI help do not document this.

Worse: there's no flag to invert it. A CI job that wants "fail on any
violation" has to re-parse the JSON, and a job that wants "never fail,
just report" has to swallow the exit with `|| true`.

Fix direction: document the current behavior in `packages/cli/README.md`
and `apps/docs/src/pages/docs/cli.md`, and add two explicit flags:

```
--fail-on error|warning|any|never    # default: error (current behavior)
--exit-zero                           # alias for --fail-on=never
```

## Positive signals (keep, don't regress)

- **Zero parse errors / zero crashes** across 7627 scanned files. Every
  rule's try/catch survived real code. This is the core moat — don't
  erode it while fixing the bugs above.
- **Real finding on cal.com**: `apps/web/components/PageWrapper.tsx:67`
  has `<meta name="viewport" content="... user-scalable=no, maximum-scale=1.0">`
  — a genuine WCAG 1.4.4 F77 violation. Deslint caught it; a human
  reviewer did not. This is the kind of case the product is for.
- **Attestation + Sigstore pipeline** (P0 #1) ran without network
  errors on the OSS sandboxes. `.deslint/attestation.json` + `.sigstore`
  were produced and round-tripped through `verifySignature()`.
- **Per-agent scorecard** (P0 #2) correctly attributed zero violations
  to Claude/Cursor/Codex on cal.com (the viewport error predates any
  AI co-author in the blame history) — no false-positive attribution.
- **Token drift** (P0 #4) produced an empty diff on all three repos
  (none of them ship `.deslintrc.json`), no errors, no shallow-checkout
  crashes.

## Bug-fix priority order (proposed)

The fixes chain into each other; cleanest order:

1. **Bug #4** — applicability gating. Fixing this first means the
   score numbers we collect for the other bugs stop being misleading.
2. **Bug #1** — reduced-motion dedupe. This alone will drop shadcn-ui
   violation count from 3780 → ~2000 and make every subsequent metric
   easier to reason about.
3. **Bug #2** — narrow the motion prefix list. Cuts another ~30% of
   shadcn-ui noise and removes the most common "Deslint is wrong"
   complaint we'll hear from Tailwind users.
4. **Bug #3** — orphan `duration-*` / `ease-*`. Trivial fix, stacks
   cleanly on top of #2.
5. **Bug #5** — honest perf number. Requires a real bench harness, not
   a prose edit.
6. **Bug #7** — document exit codes + add `--fail-on`. Pre-req for any
   CI integration doc we publish.
7. **Bug #6** — unify JSON schema. Bigger refactor; safe to land last.

## What this report is NOT

- Not a security audit. That is the next pass (pen-test subagent
  against commits `9091d26..34e7e6a`).
- Not a benchmark. The ms/file numbers above are indicative, not
  reproducible under controlled conditions.
- Not a release note. When we ship 0.7, the public `VALIDATION.md`
  should cite the *fixed* behavior, not this pre-release state.

## Reproducer

```bash
# From a clean /tmp workspace, with the branch built:
pnpm --filter @deslint/cli build
DESLINT=/home/user/deslint/packages/cli/dist/index.js

for repo in shadcn-ui/ui twentyhq/twenty calcom/cal.com; do
  dir=/tmp/deslint-oss/${repo##*/}
  git clone --depth=1 "https://github.com/${repo}" "$dir" 2>/dev/null || true
  ( cd "$dir" && node "$DESLINT" scan --json > "/tmp/${repo##*/}.json" )
done
```

The JSON blobs in `/tmp/*.json` are the raw inputs behind every number
in this document.
