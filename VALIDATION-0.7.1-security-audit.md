# VALIDATION — 0.7.1 security + multi-OSS audit

Post-release audit before cutting `v0.7.1`. Installed the 0.7.1
tarballs (packed from this branch, including the bundled
`@typescript-eslint/parser` fix), scanned three fresh public OSS
targets not in our prior audit set, and ran a set of adversarial
inputs against the CLI and MCP surfaces.

- **Date:** 2026-04-22.
- **Install path:** `npm install` of `deslint-{shared,eslint-plugin,cli,mcp}-0.7.1.tgz` into a fresh `npm init -y` runner.
- **npm audit:** 0 vulnerabilities across 221 packages.
- **Sigstore stack:** `@sigstore/bundle@4.0.0`, `@sigstore/sign@4.1.1`, `@sigstore/verify@3.1.0`, `sigstore@4.1.0`. All current, no known CVEs.

## Multi-OSS scan summary

| Target | Type | Files | Score | Violations | Parse errors | Wall | ms/file |
|---|---|---:|---:|---:|---:|---:|---:|
| elk-zone/elk            | Vue 3 / Nuxt 3       | 259  | 100 ❌ | 259 | **259**  | 2.3 s | 9 |
| tldraw/tldraw           | React canvas + Tailwind | 242  | 98     | 41  | 0        | 5.1 s | 21 |
| steven-tey/dub          | Next.js SaaS         | 1317 | 85     | 2009| 0        | 12.8 s | 10 |

The elk result is **misleading**: score 100 while 100% of .vue files
failed to parse. Detailed below under Finding 3.

## Findings by severity

### P0 — security / ship-blocker (fixed on this branch)

**1. `import-tokens --output` allowed arbitrary path traversal.**

Command:
```
deslint import-tokens --style-dictionary src.json \
  --output "../../../../../../tmp/evil.json" --force
```
**Before fix:** wrote JSON to `/tmp/evil.json`, outside the project.
Attack vector is narrow (needs a CI pipeline parameterising
`--output` from user input), but a project-scoped tool must not
write outside the project. **Fixed** in `packages/cli/src/import-tokens.ts`
— the shared `writeOutputFile` guard now refuses any output path
whose relative-to-cwd form starts with `..` or is absolute, regardless
of `--force`.

Verified after fix:
```
Error: Refusing to write outside the project directory. --output
resolved to /tmp/evil.json, which is outside /tmp/audit071/traversal2.
```

**2. Adversarial .tsx files crashed the CLI with SIGABRT.**

A 9.9 MB `.tsx` with hundreds of thousands of class tokens ran for
~45 s and then aborted with exit code 134. A 6.2 MB variant also
crashed at the 30 s timeout. Realistic attack: malicious PR drops
a generated `.tsx` into the repo; the CI scan on that PR crashes and
blocks the pipeline. **Fixed** by adding a file-size gate in
`packages/cli/src/discover.ts` — files over **2 MB** are skipped at
discovery time with a visible stderr notice, so the ESLint parse
pass never receives them.

Verified: 6.2 MB file skipped cleanly, scan completes in 2.3 s.

Also disabled symlink following (`follow: false`) in the glob call —
a symlink pointing at `/etc/passwd` (or any file outside the repo)
previously got fed to the parser. The parse attempt produced a parse
error rather than leaking the file, but the symlink resolution
itself was an unintended read of a file the user didn't author.

### P0 — correctness / user-trust (document, defer fix)

**3. Vue / Svelte / Angular projects silently scan as "100/100 pass".**

`elk` (a Mastodon web client, Vue 3 + Nuxt 3, 259 `.vue` files)
reports **score 100**, grade pass, 259 files scanned, 0 errors —
while every single `.vue` file produced a "File ignored because no
matching configuration was supplied" ESLint message. Root cause:
`vue-eslint-parser`, `svelte-eslint-parser`, and
`@angular-eslint/template-parser` are `importOptional(...)` in
`packages/cli/src/lint-runner.ts`. None are direct deps of
`@deslint/cli`. A fresh `npm install @deslint/cli` has no Vue parser
in `node_modules`, so the dynamic import fails, the Vue config block
is never pushed, and ESLint has nothing to handle `**/*.vue`.

The score calculation then sees zero rule hits (because nothing got
linted) and returns 100. A user's dashboard would display "pass" on
a codebase Deslint couldn't actually scan.

**Why not fixed in 0.7.1:** same latent issue on `.svelte` and Angular
templates; the right fix is a packaging change (either promote
optional parsers to deps, or fail loudly when a known framework
extension is encountered without its parser). Both options deserve
their own scope.

Recommended 0.7.2 fix:
- Detect which framework extensions are present in the discovered
  file set.
- If any are present AND the corresponding parser is absent, short-
  circuit with `overall: null`, `grade: 'skipped'`, and a reason
  string pointing at the missing dep. Same contract 0.7.0 already
  uses for CSS-in-JS projects via the applicability gate.

**4. MCP `analyze_and_fix` leaks file contents outside the declared `projectDir`.**

Reproduced Codex Finding 2 on the live 0.7.1 tarball:
```js
mcp.analyzeAndFix({
  filePath: '../sibling/leak.tsx',
  projectDir: '/tmp/audit071/mcp-traverse/proj',
});
// returns { originalCode: 'const S="secret";\n', ... }
```
The `resolveProjectDir` helper silently pivots `projectDir` to
`dirname(absPath)` when `filePath` escapes the requested directory,
and `analyzeAndFix` returns `originalCode` + `fixedCode` — so an
MCP-calling agent can read any file path it hands in, even when the
caller pinned a narrower `projectDir`.

Severity: MEDIUM. The agent is already trusted with its own
workspace (it can `fs.readFileSync` directly via its own tools), so
this doesn't grant a new capability — but it violates the
`projectDir`-as-boundary contract the MCP tool schema implies.

**Why not fixed in 0.7.1:** noted at the time of the Codex review;
the intentional pivot is documented inline and helps recover from
`File ignored` failures when the caller asks about a file ESLint
wouldn't otherwise analyse. The right fix is to REFUSE the request
when `filePath` resolves outside `projectDir` **only for the tools
that return source contents** (`analyze_and_fix`) while keeping the
pivot for tools that only return metadata (`analyze_file`).

### P1 — UX / noise (defer)

**5. `deslint verify` (default mode) exits 0 on an unsigned-and-tampered attestation.**

Tampered the `overallScore` in `.deslint/attestation.json` directly;
`deslint verify` printed "Verification failed: Sidecar bundle not
found" but exited 0. That's defensible (unsigned means nothing to
check) but confusing — a user who committed a lying trailer expecting
`verify` to catch it gets a surprise. Upgrade path: make `verify`
exit 1 when an attestation is present but no sidecar is, OR match
the CLI's `--strict` flag convention and ship a `--require-sidecar`.

**6. `.ts` / `.js` files (without JSX) excluded from the default scan.**

`DEFAULT_EXTENSIONS = ['tsx', 'jsx', 'vue', 'svelte', 'html']` in
`packages/cli/src/discover.ts`. A project whose `cn()` / `clsx()` /
`cva()` helpers live in `lib/classes.ts` and generate class-name
strings programmatically goes unchecked. The `applicability` probe
recognises those call patterns (`CLASS_RE` in lint-runner.ts) but
the rules never see the files.

Fix: add `.ts` and `.js` to the default scan set; the rules are
already no-ops on source without class/style attributes, so cost
is minimal for projects that don't have programmatic class helpers.

**7. CLI `totalViolations` includes parse errors; Action does not.**

Same aggregate logic started life in the Action where 0.7.0
segregated `parseErrors` into its own counter and excluded them
from `totalViolations` / `errors` / `warnings`. The CLI's
`aggregateResults` still counts null-ruleId messages in every
bucket, so the elk scan reports `totalViolations: 259, warnings:
259, parseErrors: 259` — three times the same data, two of them
misleading.

Fix: mirror the Action's segregation in `packages/cli/src/lint-runner.ts`.

### Known issues carried from the 0.7.0 audit

- **`prefer-semantic-html` false positives** on `<svg role="img">`
  (canonical accessible-SVG pattern) and `<div role="img" aria-label="...">`
  (composed visual). Confirmed on tldraw, 14 hits. False-positive
  guidance: "replace with `<img>`" is impossible when there's no
  image file. Documented in `VALIDATION-0.7.0-oss-audit.md`.
- **OG image routes** trigger `image-alt-text` + `responsive-image-optimization`.
  Confirmed on dub (326 `responsive-image-optimization` hits — most
  from satori `ImageResponse` routes). The `<img>` inside those
  routes renders to a PNG; alt / loading / width are inert. Need a
  file-path heuristic that skips `og.tsx`, `opengraph-image.tsx`,
  `twitter-image.tsx`, and `app/**/route.{ts,tsx}`.
- **`no-arbitrary-spacing --fix` converts `em` units to scale values
  backed by `rem`.** These are physically different (`em` = element
  font-size, `rem` = root font-size). Any em-based design token
  breaks under `deslint fix --all`. Documented in the nextra
  pre-publish test in `VALIDATION-0.7.0-oss-audit.md`.

## Adversarial test matrix

| # | Input | Before | After |
|---|---|---|---|
| 1 | `scan ../../../../../etc` | "No files found" (extensions don't match) | Same — safe |
| 2 | `import-tokens --output ../../tmp/evil.json` | Wrote `/tmp/evil.json` | **Refused** |
| 3 | `{"__proto__": {...}}` in .deslintrc.json | Safe — zod rejected as unrecognized keys | Same — safe |
| 4 | Symlink `secret.tsx → /etc/passwd` | Followed + parsed → parse error | **`follow: false` disables symlink traversal** |
| 5 | 6+ MB `.tsx` with adversarial class attr | SIGABRT / OOM | **Skipped at 2 MB cap** |
| 6 | MCP `analyze_and_fix` path traversal | Returned file contents | Documented, 0.7.2 fix |
| 7 | Tampered `attestation.json` + `deslint verify` | Exit 0 (false pass) | Documented, 0.7.2 UX improvement |

## Ship decision for 0.7.1

**Blockers resolved on this branch:**
- Finding 1 (path traversal) — fixed in `writeOutputFile` guard.
- Finding 2 (DoS via giant file) — fixed via file-size gate + no-follow-symlinks.

**Documented for 0.7.2:**
- Finding 3 (Vue/Svelte/Angular silent 100-score).
- Finding 4 (MCP `analyze_and_fix` path pivot on out-of-workspace paths).
- Finding 5 (`deslint verify` exit code on unsigned-and-tampered attestation).
- Finding 6 (`.ts`/`.js` default scan exclusion).
- Finding 7 (CLI `totalViolations` conflates parse errors).
- Three rule-level false positives carried from 0.7.0 audit.

0.7.1 **is shippable** once the two security fixes in this branch
merge. Everything else is correctness / UX work that's scoped for
0.7.2 without blocking the MCP-onboarding + marketing release 0.7.1
is primarily delivering.
