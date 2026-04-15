# deslint — launch & growth playbook

Creative ideas for the `v0.4.0 — "Autofix that preserves your design"` launch
and ongoing marketing. Grouped by channel, with a clear CTA for each.

The narrative thread across everything is:

> **We lint our own bugs in public. Here's what we caught.**

That's what CodeRabbit, SonarQube, and GitGuardian got right — they turn
their own dogfooding into a weekly content engine. We have the same
advantage: every autofix bug we find in a real codebase becomes a post.

---

## 1. npm README (already built)

**Asset:** `cli-demo.gif` at the top of the README.

Terminal recording of `npx deslint scan` → `npx deslint fix --interactive`
showing real violations, interactive approval, a clean diff, and zero
regressions at the end. Use this *above* the install snippet — people skim,
so the hero image earns the install.

**Below the fold:**
- A "preserved vs broken" side-by-side (`full.png`)
- The three rule shields: `dark-mode-coverage`, `no-arbitrary-zindex`,
  `prefers-reduced-motion` with one-line wins
- Install → config → scan → fix in four code blocks

**CTA:** `npx deslint init`

---

## 2. Social media — three 15-second clips

Files: `social-01-dashboard.mp4`, `social-02-ecommerce.mp4`,
`social-03-spinner.mp4` (1080×1080, H.264, MP4 + GIF fallback).

### Caption templates

**Clip 1 — SaaS dashboard goes dark**
> Your lint rule shouldn't have to ruin your brand.
>
> We found a bug in our own `dark-mode-coverage` rule — it was silently
> adding `dark:` variants to every class, turning light SaaS into dark SaaS
> on the next `--fix`.
>
> Fixed in v0.4.0: dark-mode coverage is suggest-only by default.
>
> 🔗 `npm i -D deslint`

**Clip 2 — e-commerce toast disappears**
> `z-[9999]` was getting clamped to `z-50`. Every modal, toast, and
> dropdown with a high z-index was sinking behind the app header.
>
> Shoppers tap "Add to cart" and see nothing. They leave.
>
> Fixed: portal z-indices (999, 1000, 9999) are now allowlisted.

**Clip 3 — loading spinner freezes**
> 15% of your users run with `prefers-reduced-motion`. Our rule wrapped
> `animate-spin` in `motion-safe:`. The spinner stopped spinning for them.
>
> WCAG 2.3.3 compliance, shipped as "Is it broken?"
>
> Fixed: `animate-spin` / `animate-ping` exempt by default — motion IS the
> signal, not decoration.

### Where to post

| Channel | Format | Hook |
|---|---|---|
| X / Twitter | MP4, 15s | Thread of 3 tweets, one clip each, landing with "All three shipped in v0.4.0 →" |
| LinkedIn | MP4, 15s | "We lint our own lint bugs. Here's what the v0.3 → v0.4 review found." |
| Bluesky | MP4, 15s | Same as X, different community |
| Reddit r/reactjs, r/webdev | GIF + long post | Full autopsy — what broke, why, how we fixed it |
| Dev.to / Hashnode | MP4 embed + case study | Long-form teardown of each regression |
| Discord / Slack communities (Next.js, Shadcn, Radix) | GIF | "This is why deslint defaults to suggest-only now" |

---

## 3. GitHub README / release notes

The `v0.4.0` release notes should *lead* with the regression gallery, not
the patch list. Most users scan for "will this break my project?" — answer
that first.

```markdown
## v0.4.0 — Autofix that preserves your design

![dashboard regression fixed](marketing/output/social-01-dashboard.gif)
![modal z-index fixed](marketing/output/social-02-ecommerce.gif)
![spinner fixed](marketing/output/social-03-spinner.gif)

**TL;DR:** We hunted every silent-rewrite bug in v0.3 and made them opt-in.
Your design is preserved by default — opt into riskier transforms when
you're ready.

### Fixed
- `dark-mode-coverage` …
- `no-arbitrary-zindex` …
- `prefers-reduced-motion` …
- …
```

---

## 4. Docs site (apps/docs)

### New page: `/blog/v0.4-autopsy`

"The seven bugs we found in our own autofix." One section per rule, each
with an interactive before/after toggle (reuse the fixtures already in
`marketing/fixtures/`). Long-form authority content — indexable, quotable,
linkable.

### Landing-page hero swap

Replace the current hero with an embedded loop of `cli-demo.webm` on the
left, three stacked before/after cards on the right. "**Lint without
breaking production.**" as the H1.

### Rule docs

Each rule page should have a *Fixed in 0.4* callout where relevant:

> **v0.4 behaviour change:** this rule is now suggest-only by default.
> Opt in with `{ autofix: true }` when your token mapping is complete.

---

## 5. HackerNews & Product Hunt launch

**HN post title candidates** (most to least direct):
1. "deslint — a design-system linter that doesn't break your design"
2. "We found seven autofix regressions in our own lint rules. Post-mortem + fixes."
3. "Show HN: deslint — lint Tailwind/WCAG without silent rewrites"

**Best hook** = #2. HN's front page loves public post-mortems; every other
lint tool ships "fewer false positives" — we're selling "fewer silent
regressions". That's a different frame.

**Product Hunt assets:**
- Gallery: 5 × 1080×1080 GIFs (the three social clips + two docs screenshots)
- Maker video: 45s cut — CLI scan/fix → one before/after → logo
- First comment from maker: the post-mortem story

---

## 6. Comparison table content

A single tweetable graphic (PNG + MP4 with typewriter reveal) titled
"**What does 'safe autofix' mean?**":

| Scenario | ESLint plugin X | deslint 0.3 | deslint 0.4 |
|---|---|---|---|
| Adds `dark:` variants everywhere | ✖ | ✖ | ✓ suggest-only |
| Clamps `z-[9999]` → `z-50` | — | ✖ | ✓ allowlisted |
| Wraps `animate-spin` in motion-safe | ✖ | ✖ | ✓ exempt |
| Stamps `lang="en"` on foreign sites | — | ✖ | ✓ opt-in |
| Lazy-loads LCP hero images | ✖ | ✖ | ✓ priority-aware |

This one graphic is worth more than a 1000-word blog post on "why deslint
is different" — competitors compete on rule count, we compete on trust.

---

## 7. Weekly content engine — "Lint Bug of the Week"

One short post per week, one rule per post. Template:

1. **Violation** — a screenshot of the broken UI
2. **Diff** — the 3-line change that caused it
3. **Why the lint rule thought it was safe** — explain the heuristic
4. **Our fix** — the gating logic / opt-in / exemption list
5. **Config you can copy** — the `.deslintrc.json` stanza

Ship this to:
- `deslint/blog` (docs site)
- LinkedIn post + X thread (repurpose screenshots)
- An email newsletter for early adopters (monthly digest of 4 posts)

This format is exactly what CodeRabbit does on LinkedIn — low lift, high
frequency, self-perpetuating (every release gives you four more posts).

---

## 8. GitHub Action marketplace listing

The action is already shipped. Marketplace listing should feature:

- Animated hero: the `cli-demo.gif` but capturing the Action's check-run
  comment rendering (need a separate fixture: GitHub-style PR comment with
  the annotations expanded).
- A video: "PR gets opened → deslint runs → one-click 'Apply suggestion'
  on each violation → PR merges green" (≈ 40s).

**One-line pitch:** "Design-aware linting on every PR. Doesn't break your
design."

---

## 9. VSCode extension teaser (even before it ships)

A looping MP4 of "squiggles in editor → quick-fix lightbulb → accept →
squiggles gone → zero diff noise outside the fixed range". This is the
"you'd never adopt it without it" feature, even if the extension is a
month out. Seed the demand early.

---

## 10. Partnerships & community seeding

- **Tailwind Labs**: deslint catches arbitrary classes that Tailwind itself
  won't. Pitch a joint post for the Tailwind blog: "Linting your tokens,
  now for real."
- **Radix UI / Headless UI / shadcn/ui**: we just fixed the rule that was
  flagging their components. Send the maintainers a thank-you + a PR
  adding a `@deslint/react` preset to their examples.
- **Vercel**: the `fix --interactive` flow is a perfect fit for their
  Preview Comments feature. Demo it in an integration post.
- **A11y Twitter / Bluesky**: our `prefers-reduced-motion` fix is the
  correct answer to "WCAG 2.3.3 shouldn't break loaders". Start that
  thread ourselves.

---

## Assets index

| Asset | Location | Use |
|---|---|---|
| `cli-demo.gif` (4.7 MB) | `marketing/output/` | npm README hero, docs homepage |
| `cli-demo.webm` | `marketing/output/` | Higher quality source |
| `social-01-dashboard.mp4` (1.3 MB, 15s) | `marketing/output/` | X / LinkedIn / Bluesky |
| `social-02-ecommerce.mp4` (800 KB) | same | same |
| `social-03-spinner.mp4` (940 KB) | same | same |
| `social-0x.gif` fallbacks | same | PR descriptions, Slack |
| `01-dark-mode.png` / `02-zindex.png` / `03-spinner.png` | same | Release notes, blog embeds |
| `full.png` | same | "Why v0.4" one-pager |
| `walkthrough.webm` | same | Docs hero loop |

## Regeneration

```bash
# installs ffmpeg if missing, then regenerates everything
node marketing/capture.mjs          # static before/after + walkthrough
node marketing/capture-social.mjs   # CLI demo + 3 social clips
```

All fixtures in `marketing/fixtures/*.html` are standalone — open any of
them in a browser to iterate on copy, timing, or styling without running
playwright.
