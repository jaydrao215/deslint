# Cowork Task: Twitter/X Launch Thread + ADA Title II Thread (S9 items 9.6 + 9.11)

## What you are doing
Posting two separate Twitter/X threads:
1. **Soft launch thread (9.6)** — post as soon as deslint.com is live
2. **ADA Title II deadline thread (9.11)** — post during the week of April 20-24, 2026

## Authentication required
- **Twitter/X account** — go to https://x.com, sign in, then return here.

## Asset required
- `apps/docs/public/demo/visual-proof.mp4` (1.3 MB) — attach to Tweet 1 of the launch thread.
  Pull the repo locally and find this file, or download it from the GitHub raw URL.

---

## THREAD 1 — Soft Launch (9.6)

Post this when deslint.com is deployed. Best time: **Tuesday 10:00 ET**.
Post all tweets as a single thread (reply to each previous tweet).

### Tweet 1 of 10 — Hook + attach visual-proof.mp4 to THIS tweet
```
AI writes fast. Deslint keeps it clean.

Your AI just shipped `bg-[#1a1a1a] p-[13px] z-[9999]` and a `<img>` with no alt.

Your screenshot diff looks fine. Your lint passes. Your design system is quietly bleeding.

I built the thing that catches this. 🧵
```
⚠️ ATTACH visual-proof.mp4 to this tweet before posting.

### Tweet 2 of 10
```
4,061 files scanned across 7 real production projects.

3,395 violations caught.
0 false positives. 0 crashes.

Every one of them was design-system drift or a WCAG failure that landed in a PR nobody caught.
```

### Tweet 3 of 10
```
Deslint is an ESLint plugin + CLI + MCP server.

20 rules. Design-system drift + WCAG 2.2 / 2.1 AA accessibility. React, Vue, Svelte, Angular, plain HTML — same rule, every framework.

Local-first. Deterministic. Zero cloud. Zero LLM calls.
```

### Tweet 4 of 10
```
The part I'm most proud of:

@deslint/mcp lets Cursor and Claude Code self-correct their own output in the same edit loop that wrote the bug.

analyze_file → analyze_and_fix round trip: 701 ms on a real 6-violation file. No cloud. No prompts. Just AST.
```
⚠️ On this tweet ONLY, add at the end: `@cursor_ai @AnthropicAI`

### Tweet 5 of 10
```
Why this matters if you've tried others:

• jsx-a11y: JSX only
• Tailwind plugin: arbitrary values only
• SonarQube: no design system, no Tailwind v4
• LLM reviewers: non-deterministic, cloud-only, can't gate CI

Deslint is the intersection. Shipping today.
```

### Tweet 6 of 10
```
8 accessibility rules mapped to 13 WCAG Success Criteria. Both 2.2 AA and the 2.1 AA subset ADA Title II actually cites.

The compliance report is the shareable artifact non-technical buyers (legal, accessibility consultants, design ops) can read in 30 seconds.
```

### Tweet 7 of 10
```
30 seconds to try:

npm i -D @deslint/eslint-plugin
npx deslint init
npx deslint scan

You get a 0-100 Design Health Score, category breakdown, and a per-rule violation list. Auto-fix is `deslint fix --all` for the 14/20 rules that are safely fixable.
```

### Tweet 8 of 10
```
Things I'm *not* claiming:

• It does not replace Playwright visual regression
• It does not do cross-file design graphs (yet — v0.3.0)
• It does not scan raw CSS (yet)
• It is not a design tool

It's an ESLint plugin that keeps AI code from drifting. That's the entire pitch.
```

### Tweet 9 of 10
```
MIT-licensed. Repo is public. The landing page has 4 interactive beats + a 40-second silent MP4 — no signup, nothing to install.

🔗 github.com/jaydrao215/deslint
🔗 deslint.com

If you break it, open an issue. The 0% FP number holds only because I hear about every FP the day it lands.
```

### Tweet 10 of 10 (optional — use during ADA deadline week instead if timing overlaps)
```
ADA Title II's technical standard is WCAG 2.1 AA. Deadline for public entities is Apr 26, 2026.

Deslint ships the only open-source ESLint plugin that maps 13 of those criteria end-to-end and gives you a compliance HTML report you can hand to your legal team.

That's it. That's the thread.
```

**After posting:** If the thread gets >50 engagements in the first hour, quote-tweet the thread 24 hours later with a brief update ("Here's what happened...").

---

## THREAD 2 — ADA Title II Deadline (9.11)

⚠️ POST THIS DURING THE WEEK OF APRIL 20-24, 2026 ONLY.
Do NOT post before April 20 — the news peg won't land early.
Best time: Monday April 20 or Tuesday April 21, 09:00 ET.

Post all tweets as a single thread (reply to each previous tweet).

### Tweet 1 of 10
```
The ADA Title II deadline for public entities is this Saturday, Apr 26, 2026.

The technical standard it cites is WCAG 2.1 Level AA — not 2.2, not 2.0.

If your state / local / university / public-library website isn't 2.1 AA conformant by Saturday, you're out of compliance. Here's what that actually means. 🧵
```

### Tweet 2 of 10
```
Title II applies to:

• State and local government websites
• Public K-12 and higher-ed (any program receiving federal funds)
• Public libraries, public hospitals, transit authorities
• Any contractor building websites for any of the above

The DOJ rule was finalized April 2024. The 2-year clock ran out Apr 26.
```

### Tweet 3 of 10
```
WCAG 2.1 Level AA covers 50 Success Criteria across 4 principles: Perceivable, Operable, Understandable, Robust.

The top-10 that catch the most real failures in AI-assisted codebases:

1.1.1 Alt text
1.3.1 Info & relationships
1.4.3 Contrast
1.4.4 Resize text
1.4.10 Reflow
1.4.11 Non-text contrast
2.4.4 Link purpose
2.4.6 Headings & labels
3.1.1 Language of page
4.1.2 Name, role, value
```

### Tweet 4 of 10
```
The brutal part for 2026: most teams shipping code right now have AI in the loop. Claude, Cursor, v0, Bolt, Lovable.

AI-generated code fails these criteria constantly. Empty alts. Generic link text. Heading skips. Missing `lang` attributes. Hallucinated ARIA.

And most review pipelines don't catch any of it.
```

### Tweet 5 of 10
```
The usual a11y tooling stack has a hole right where AI codegen lives:

• eslint-plugin-jsx-a11y — JSX only, misses Next.js <Link> components
• axe-core / Lighthouse — runtime only, catches after merge
• Manual audit — expensive, doesn't scale, doesn't block PRs
• LLM reviewers — cloud, non-deterministic, can't gate CI
```

### Tweet 6 of 10
```
This is the problem I've been shipping against. Deslint is an open-source ESLint plugin that catches 13 WCAG criteria statically, across React, Vue, Svelte, Angular, and plain HTML.

Not the full 50. The 13 that AI codegen fails most, with 0% false positives validated on 4,061 files.

github.com/jaydrao215/deslint
```

### Tweet 7 of 10
```
One thing I built specifically for Title II: the CLI exports an HTML compliance report.

Per-level conformance. WCAG 2.2 AA and the 2.1 AA subset side-by-side. Explicit callout stating that 2.1 AA is the ADA Title II technical standard.

Hand it to your legal team. Hand it to your auditor.
```

### Tweet 8 of 10
```
If your org has a Title II deadline Saturday:

npm i -D @deslint/eslint-plugin @deslint/cli
npx deslint init
npx deslint compliance ./dist

You'll get a pass/fail per criterion in ~3 seconds. It won't make you compliant by itself, but it shows exactly what's left.
```

### Tweet 9 of 10
```
What Deslint will and won't do for your Title II deadline:

✅ Static HTML + React + Vue + Svelte + Angular
✅ 13 of the 50 WCAG 2.1 AA criteria, statically, deterministically
✅ Machine-readable (SARIF) + HTML reports

❌ PDFs (use PAC 3 or similar)
❌ Video captions (manual review)
❌ Runtime-only assertions

Use it alongside axe-core + manual audit, not instead of.
```

### Tweet 10 of 10
```
Title II is one deadline. The deeper problem — AI codegen that ships a11y failures the moment the code lands — isn't going away.

If you build software for any entity touched by Title II, and you have 4 days: github.com/jaydrao215/deslint. MIT-licensed. Free forever.

Good luck this week. 🫡
```

---

## Done when
- [ ] Soft launch thread posted (9.6) — after deslint.com is live
- [ ] ADA Title II thread posted (9.11) — week of April 20-24, 2026
