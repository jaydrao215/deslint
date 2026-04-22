# VALIDATION — 0.7.0 OSS audit (openstatus)

Post-release audit of Deslint `@deslint/cli@0.7.0` and `@deslint/mcp@0.7.0`
on a fresh public open-source codebase **not** previously used for
validation (shadcn-ui, twenty.com, and cal.com were the pre-0.7 test
set — 0.7.0 was tuned against those, so they'd be a biased signal).

- **Target:** [`openstatusHQ/openstatus`](https://github.com/openstatusHQ/openstatus),
  monitoring / status-page platform, Next.js + Tailwind v4 + shadcn/ui.
- **Clone:** shallow, default branch, 2,700 files checked out.
- **Install:** `npm install @deslint/cli@0.7.0 @deslint/eslint-plugin@0.7.0
  @deslint/mcp@0.7.0` in a scratch directory (openstatus itself uses
  `workspace:*` which npm installed outside its own lockfile won't
  resolve; the scratch install is the realistic first-touch user flow).
- **No `deslint init`, no `.deslintrc.json`.** Pure "install and scan"
  path — this tests defaults + Tailwind v4 auto-discovery.
- **Date:** 2026-04-22.

Internal validation report. The public release notes should cite the
behaviour below, not rewrite it.

## Headline numbers

| Surface | Files | Files with hits | Violations | Errors | Parse errors | Score | Wall time | ms/file |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| `apps/web/src`        |  97 | 15 |  30 | 0 | 0 | 97 |  2.7 s | 28 |
| `apps/dashboard/src`  | 299 | 90 | 138 | 0 | 0 | 95 |  4.2 s | 14 |

Aggregate: 396 files scanned, 168 warnings, **zero errors**, **zero
parser failures**, **zero crashes**. Bundled `@typescript-eslint/parser`
did its job — the "13 errors, score 99, rule=unknown" regression that
blocked 0.7 pre-release does not reappear here on `.ts` / `.tsx`.

### Perf read

README claim: sub-10 ms/file. Actual on openstatus:

- 97-file scan (`apps/web`): ~28 ms/file (cold-start dominated — TS parser
  load + ESLint config build amortize over small batches).
- 299-file scan (`apps/dashboard`): ~14 ms/file.

28 ms on small batches and 14 ms on larger ones is credible but above
the stated target. Either refine the claim to "~15 ms/file amortized,
higher on small batches" or profile the cold-start cost.

### Applicability gate

`apps/web`: `applicable: true`, 65 tailwind files, 11 style-based
files → rules engage, score computes, no N/A fabrication. The 0.7
applicability gate correctly distinguishes "scanned and scored" from
"no applicable input" (openstatus uses Tailwind v4 heavily, so the
applicable branch is the right one).

## False-positive findings

Spot-checked every rule that fired. Three rules produce incorrect
guidance; severity ranked by user blast radius.

### P1 — `prefer-semantic-html` flags `role="img"` as replaceable with `<img>`

Two distinct false positives, same rule, same wrong advice:

**A. `<svg role="img">`** — `apps/web/src/components/icons.tsx:179`
```tsx
<svg role="img" viewBox="0 0 24 24 " {...props}>
  <path fill="currentColor" d="..." />
</svg>
```
Our message: *`role="img"` on `<svg>` should be replaced with the
semantic element `<img>`*. This is the canonical accessible-SVG
pattern — ARIA Authoring Practices, WebAIM, and every accessibility
guide recommends `role="img"` on inline SVG icons. You cannot replace
this with an `<img>` without losing `currentColor` theming,
`fill`/`stroke` control, and inline path geometry.

**B. `<div role="img" aria-label="Step N">`** — `apps/dashboard/src/components/forms/step-card.tsx:72`
```tsx
<div role="img" aria-label={`Step ${step}`}
     className="flex h-6 w-6 ... rounded-full">
  {step}
</div>
```
A circular badge rendering a step number. Screen-reader label is
correct (`aria-label`). Our "replace with `<img>`" advice is
physically impossible — there is no image file to `src` at. The rule
conflates "element has `role="img"`" with "element wraps a raster
image."

Recommended fix for 0.7.1:
- On `<svg>`: the rule should NEVER fire — `role="img"` on `<svg>` is
  the recommended pattern.
- On non-`<svg>` elements: fire only when the element contains an
  actual image child (`<img>`, `<picture>`, CSS `background-image`
  pointing at a URL). Otherwise treat `role="img"` + `aria-label` as
  an acceptable "composed visual" idiom.

### P1 — `image-alt-text` / `responsive-image-optimization` fire inside `ImageResponse` routes

`apps/web/src/app/api/og/post/route.tsx:47` — Next.js OG image
generator. The `<img>` inside `ImageResponse` renders to a PNG via
satori; it is never parsed by a user-agent and never reaches a DOM
accessibility tree. `alt`, `loading`, `width` / `height`, and
`aspect-ratio` are inert in that rendering pipeline.

Our scan fires three rules on that single `<img>` (one alt, two
responsive-image-optimization). All three are technically correct
advice for HTML-rendered images but wrong here — the file exports a
`GET` handler that returns an `ImageResponse`, not a React view.

Recommended fix for 0.7.1: rules that target raster `<img>` tags
should skip files whose filename is `og.tsx` / `opengraph-image.tsx`
/ `twitter-image.tsx`, OR whose default export is an `ImageResponse`,
OR that sit under an `app/**/route.{ts,tsx}` Next.js route. File-path
heuristic is easier to ship and catches 100% of OG image generators
in the Next.js ecosystem.

### P2 — `consistent-component-spacing` message leaks JSX tokens

`apps/web/src/content/copy-button.tsx:80`:
```
Button uses padding-all `p-4` but 1 of 2 instances use `p-4",`. Consider standardising to …
```
The second quoted class reads `p-4",` — the comparator pulled the
trailing quote + comma from the raw JSX attribute stringification
instead of the isolated class name. Rule logic is correct (there
really is a `p-4` / other-value inconsistency across two `Button`
usages); only the user-facing message is malformed.

Recommended fix: tokenize on whitespace / strip trailing punctuation
before interpolating into the message.

### P2 — `no-arbitrary-zindex` fires inside arbitrary variant selectors

`apps/web/src/content/image-zoom.tsx:39`:
```
[&_[data-rmiz-btn-unzoom]]:z-[1]
```
Hit message: *Arbitrary z-index `[&_[data-rmiz-btn-unzoom]]:z-[1]`
detected. Use scale value `z-1` instead.* Two problems:

1. The matched string includes the variant selector, not just `z-[1]`.
   The suggestion to use `z-1` would apply a z-index to the parent,
   not the descendant the variant targets.
2. `z-1` isn't in the default Tailwind scale — the scale is
   `z-0, z-10, z-20, z-30, z-40, z-50, z-auto`. Suggesting `z-1`
   points users at a non-existent utility.

Recommended fix: inside arbitrary variants (`[&_...]:`), either skip
the rule or at minimum produce a suggestion that preserves the
variant prefix and points at a real scale value.

## Rules that behaved correctly (sampled)

- **`prefers-reduced-motion`** (16 hits across web + dashboard). All
  post-0.7 narrowing held: only real motion classes
  (`transition-all`, `transition duration-*`, `animate-*`) fire; no
  hits on `transition-colors` / `transition-shadow` / `transition-opacity`
  from the pre-0.7 regression.
- **`link-text`** (23 hits). Every sampled hit was a legitimate WCAG
  2.4.4 issue — either an icon-only `<a>` whose accessible name lives
  in a tooltip (hover-only, fails screen readers) or generic
  "Read more" / "Learn more" text. Zero false positives in the sample.
- **`no-arbitrary-spacing` + `responsive-required`** firing on the
  same `w-[100px]` at `content/latency-chart-table.tsx:35` — different
  rules, different concerns, both correct. Not a duplicate.
- **`icon-accessibility`**. Catches genuine icon-only buttons without
  `aria-label`. Sample hits pointed at `<Button variant="ghost"
  size="sm">` wrapping a single `<Icon />` with no accessible name —
  true positive every time.

## Release-safety guards (VALIDATION against the shipped artifact)

The three 0.7.0 release-safety guards all hold on the live npm
package, not just in our test suite.

### `import-tokens` clobber guard

Reproduced the three branches against `@deslint/cli@0.7.0`:

| Case | Command | Result |
|---|---|---|
| Existing file, no `--force` | `deslint import-tokens --style-dictionary tokens.json --output output.json` | Refused; existing file byte-identical after refusal. |
| Existing file, with `--force` | same + `--force` | Overwrote cleanly; exit 0. |
| `.deslintrc.json` with `--force` | `--output .deslintrc.json --format deslintrc --force` | Refused — `.deslintrc.json` is hard-refused regardless of `--force`; file was not created. |

### `@deslint/mcp install` atomic write

```
$ npx @deslint/mcp install
  Configured: Claude Desktop (Linux)
    /root/.config/Claude/claude_desktop_config.json
  Configured: Cursor (Linux)
    /root/.cursor/mcp.json
```
Post-install: both configs contain valid JSON with one `mcpServers.deslint`
entry each, nothing else. `find ~/.config/Claude ~/.cursor -name '*.tmp'`
returns nothing — the `renameSync` cleanup holds.

### MCP `analyze_file` / `analyze_and_fix` / `analyze_project` parity

Direct `require('@deslint/mcp/dist/tools.js')` calls against the live
package:

| Claim | Test | Result |
|---|---|---|
| `analyzeFile` respects `.deslintrc.json` | violation file + `{ "rules": { "no-arbitrary-colors": "off" } }` → `no-arbitrary-colors` absent from result. | ✅ |
| `analyzeAndFix` respects `.deslintrc.json` | same + check `remainingViolations` doesn't contain the disabled rule. | ✅ |
| `analyzeAndFix` leaves source byte-identical | read → analyzeAndFix → re-read; contents match. | ✅ |
| `analyzeProject` returns N/A on zero files | empty directory → `overallScore: null`, `grade: 'skipped'`, `totalFiles: 0`. | ✅ |

## UX / API surface notes

- **`deslint scan` takes only one directory argument.** Passing three
  (`scan apps/web/src apps/dashboard/src apps/status-page/src`) errors
  with *"too many arguments for 'scan'. Expected 1 argument but got 3."*
  Trivial UX paper cut for monorepo users — either accept multiple
  roots or document that users should scan from a common ancestor.
- **`deslint init` has no `-y` / non-interactive flag.** Fine for
  humans, awkward for CI bootstrap scripts. Worth adding a
  `--yes` / `--non-interactive` flag with sensible defaults if we want
  automation to seed `.deslintrc.json`.
- **No `-o <file>` on `deslint scan`.** Users must use shell
  redirection (`> scan.json`). Minor; shell redirect is fine but
  `-o` is a frequent first expectation.

## Won-when / shippability verdict

| Check | Result |
|---|---|
| Zero crashes on 396 files across two apps | ✅ |
| Zero parse errors on `.ts` / `.tsx` (0.7 bundled TS parser) | ✅ |
| Release-safety guards (import-tokens + MCP atomic) work on npm artifact | ✅ |
| MCP respects `.deslintrc.json` on npm artifact (Codex Findings 1 + 3) | ✅ |
| N/A contract holds on zero-file scans (Codex Finding 4) | ✅ |
| False positives that could mislead a real user | 2 rules (P1), deferred |
| Perf matches README claim | borderline (~14–28 ms/file vs claimed <10) |

**No 0.7.0 blocker.** The two P1 false positives (`prefer-semantic-html`
on `role="img"` + `image-alt-text` / `responsive-image-optimization`
inside OG routes) are worth patching in 0.7.1 — they produce advice
that's actively wrong, which hurts trust more than a missed-check
would. The P2 items (message leak, variant-selector z-index) are
quality-of-life.

## Follow-ups (0.7.1 candidates)

1. `prefer-semantic-html`: never fire on `<svg>`; only fire on
   non-svg elements that contain a rasterized image child.
2. `image-alt-text` / `responsive-image-optimization`: skip Next.js
   OG-image routes (`og.tsx`, `opengraph-image.tsx`, `twitter-image.tsx`,
   `app/**/route.{ts,tsx}` that returns `ImageResponse`).
3. `consistent-component-spacing`: clean trailing punctuation in the
   message interpolation.
4. `no-arbitrary-zindex`: suppress inside `[&_...]:` arbitrary
   variants; OR preserve the variant prefix in the suggestion AND
   verify the suggested class exists in the default Tailwind scale.
5. `deslint scan`: accept multiple directory arguments (low effort,
   frequent ask).
6. `deslint init --yes`: non-interactive mode for CI.
7. Perf claim: measure on cold start vs. warm, update README with the
   honest distribution rather than a single target.
