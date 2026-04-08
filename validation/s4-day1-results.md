# S4 Day 1 — Real-World Validation Results

> **Date:** 2026-04-08
> **Sprint:** Accessibility Foundation (Apr 8 – Apr 22)
> **Rules under test:** `lang-attribute` (WCAG 3.1.1, A) + `viewport-meta` (WCAG 1.4.4, AA)
> **Sprint items covered:** S4 1/6 + S4 2/6

## Why this run

CEO directive: "I dont want to blindly build things that doesnt work." Synthetic
unit tests prove the code runs; they do not prove the rules catch real
problems through the real CLI pipeline. This run wires both new S4 rules
through `@deslint/cli` end-to-end and exercises them against real OSS code.

## Test matrix

| Project | Source | Files | Total violations | New-rule hits | FPs |
|---|---|---:|---:|---:|---:|
| Deslint docs (apps/docs) | dogfood | 18 | 68 | 0 | **0** |
| shadcn-ui/taxonomy | github (clone --depth=1) | 125 | 46 | 0 | **0** |
| leerob/next-saas-starter | github (clone --depth=1) | 23 | 11 | 0 | **0** |
| `/tmp/deslint-real-test` | hand-crafted broken fixture | 3 | 4 | 4 | **0** |
| **Cumulative** | | **169** | **129** | **4 (TP)** | **0** |

## Why 0 new-rule hits on the well-maintained projects is correct

All three OSS projects in the matrix are Next.js apps that:

1. Set `<html lang="en">` in their root `app/layout.tsx`, so `lang-attribute`
   has nothing to flag → correct silence.
2. Configure the viewport via the Next.js Metadata API (`export const viewport`
   or `export const metadata = { viewport: ... }`) — they don't ship a JSX
   `<meta name="viewport">` tag, so `viewport-meta` has nothing to traverse →
   correct silence.

This is the expected outcome for production-grade React apps. We need a
**positive** test to prove the rules actually fire when broken code IS present
— that's what the synthetic broken fixture is for.

## Positive test — `/tmp/deslint-real-test`

Three files modeling code that v0/Lovable/Bolt routinely emits:

| File | Defect | Rule | Severity |
|---|---|---|---|
| `BadLayout.tsx` | `<html>` with no `lang` | `lang-attribute` | warning |
| `BadLayout.tsx` | `<meta name="viewport" content="...user-scalable=no...">` | `viewport-meta` | error |
| `BadLayout.tsx` | `<meta name="viewport" content="...maximum-scale=1...">` | `viewport-meta` | error (separate report) |
| `EnglishLang.tsx` | `<html lang="english">` (full word, AI mistake) | `lang-attribute` | warning |
| `GoodLayout.tsx` | `<html lang="en-US">` + viewport `width=device-width, initial-scale=1` | (none) | — |

**CLI scan output:**

```
Total violations: 4
Files with violations: 2

src/BadLayout.tsx:6:5  warning  deslint/lang-attribute
  `<html>` is missing a `lang` attribute. WCAG 3.1.1 requires the page language to be programmatically set so screen readers pronounce content correctly.
src/BadLayout.tsx:9:9  error    deslint/viewport-meta
  `<meta name="viewport">` sets `user-scalable=no`, which prevents users from zooming the page. WCAG 1.4.4 (Resize Text, AA) failure F77.
src/BadLayout.tsx:9:9  error    deslint/viewport-meta
  `<meta name="viewport">` sets `maximum-scale=1`, which blocks pinch-zoom. WCAG 1.4.4 (Resize Text, AA) failure F77.
src/EnglishLang.tsx:4:5 warning deslint/lang-attribute
  `<html lang="english">` does not look like a valid BCP 47 language tag. Use a short code like "en", "en-US", "zh-CN", or "pt-BR".
```

All four expected violations fire. `GoodLayout.tsx` is silent. **0 false
positives, 4/4 expected true positives.**

## Autofix verification

`deslint fix --all` was run on the broken fixture:

```
✓ Fixed violations in 1 file
  3 violations remaining (not auto-fixable)
```

| File | Before | After | Behavior |
|---|---|---|---|
| `BadLayout.tsx` | `<html>` | `<html lang="en">` | autofixed (missing lang → default `en`) |
| `EnglishLang.tsx` | `<html lang="english">` | `<html lang="english">` | NOT fixed (correct — invalid value, not missing; no safe rewrite) |
| `BadLayout.tsx` viewport | unchanged | unchanged | NOT fixed (correct — content-string mutation deferred per quality bar) |

The "3 violations remaining" message is exactly the message we want: the CLI
honestly tells the user which violations need a human decision.

## Bug found and fixed during the run

**P1 — `lang-attribute` and `viewport-meta` were not enabled in the CLI**

`packages/cli/src/lint-runner.ts` hard-codes the rule list at lines 80–94
instead of pulling it from the plugin's `recommended` config. New rules
registered in `@deslint/eslint-plugin` were silently absent from CLI scans
even though the plugin built and unit-tested fine. This is exactly the kind
of integration drift unit tests can't catch — the rule existed, was correct,
and had 60 passing unit tests, but the CLI never invoked it.

**Fix:** added both new rules to the runner's rules map and to
`RULE_CATEGORY_MAP`. After the fix, the broken fixture surfaced all 4
expected violations on the next scan.

**Follow-up:** Tracked as a v0.3.0 cleanup — CLI should derive its rule
list from the plugin's `recommended` config instead of duplicating it. Filing
in ROADMAP "Won't do until v0.3.0" or "Tech debt".

## Performance

| Project | Files | Scan time | Rate |
|---|---:|---:|---:|
| apps/docs | 18 | ~0.6s | ~30 files/s |
| taxonomy | 125 | ~1.0s | ~125 files/s |
| saas-starter | 23 | ~0.5s | ~46 files/s |
| broken fixture | 3 | ~0.3s | — |

Scan rate scales as expected (cold-start dominates small runs). The two new
rules add no measurable overhead — both check at most 1 element per file
(`<html>` and `<meta>`).

## Cumulative trust metrics through Day 1 of S4

| Metric | Threshold | Result | Status |
|---|---|---|---|
| FP rate (new rules, real OSS) | < 5% | **0%** (0 FPs / 169 files) | MET |
| TP detection (positive control) | ≥ 1 per defect class | **4/4** | MET |
| Crash rate | 0 | **0** | MET |
| End-to-end CLI integration | working | **fixed mid-run, then verified** | MET |
| Autofix correctness | 100% safe | **1/1 safe fix; 3/3 correctly skipped** | MET |
| Unit tests | passing | **888/888** (704 plugin + 102 CLI + 82 shared) | MET |

## Takeaways for the rest of S4

1. **Every new rule needs a positive control** — clone or scaffold 1
   deliberately-broken example per rule, run through the real CLI, confirm
   the violation surfaces. The unit tests are necessary but not sufficient.

2. **Always update `lint-runner.ts` when adding a rule** — until the CLI is
   refactored to derive rules from the plugin config (v0.3.0 cleanup), this is
   manual. Add to a checklist for each S4 rule.

3. **0 violations on a real project is a meaningful signal** — but only when
   paired with a positive control. Without the broken fixture, today's "0
   hits on 3 OSS projects" would have been ambiguous (no FPs vs rule
   silently broken).

4. **Cohort projects in `/tmp/cohort/`** — not committed; clone fresh each
   sprint validation pass via:
   ```
   git clone --depth=1 https://github.com/shadcn-ui/taxonomy.git /tmp/cohort/taxonomy
   git clone --depth=1 https://github.com/leerob/next-saas-starter.git /tmp/cohort/saas-starter
   ```

## Status

- S4 1/6 (`lang-attribute`) — ✅ shipped, dogfooded, verified end-to-end
- S4 2/6 (`viewport-meta`) — ✅ shipped, dogfooded, verified end-to-end
- Next: S4 3/6 = `heading-hierarchy`, then `link-text`, `form-labels`,
  `aria-validation`. Each gets the same positive-control treatment.
