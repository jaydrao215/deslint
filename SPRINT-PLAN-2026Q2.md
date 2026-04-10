# Deslint Sprint Plan — 2026 Q2: Pathway to Revenue & Continental Traction

> **Date:** 2026-04-10
> **Author:** Jay + Claude
> **Status:** Active planning document
> **Supersedes:** ROADMAP.md, DESLINT-EXECUTION.md (moved to deslint-internal)
> **Branch:** `claude/security-hardening-revenue-review-RWfwn`

---

## 1. Where We Are Today (Honest Assessment)

### What's Built & Shipped
- **28 ESLint rules** (8 design system, 3 responsive/dark mode, 8 WCAG-mapped a11y, 8 new in latest commit, 1 quality gate)
- **1,303 tests**, 0% false positive rate across 4,061 real-world files
- **5 packages:** eslint-plugin, CLI, MCP server (6 tools), shared, GitHub Action
- **5 frameworks:** React, Vue, Svelte, Angular, plain HTML
- **Performance:** 602 files/sec, 25x under budget
- **npm published:** `@deslint/*@0.1.1` (KPMG Phase 1 features included)
- **Landing page:** Built at deslint.com with visual proof gallery, comparison table, pricing page
- **Security hardening:** Completed 2026-04-10 — path traversal, input validation, resource bounds

### What's NOT Done Yet
- **deslint.com not deployed** — landing page is built but DNS/Vercel not connected
- **v0.2.0 not tagged** — S1-S7.5 code is on feature branch, not released to npm
- **Zero users outside the founder** — no distribution, no community, no installs
- **Zero revenue** — pricing page exists but no Stripe, no billing, no waitlist backend
- **No VS Code extension** — users rely on ESLint extension only
- **No Figma integration** — W3C tokens parser shipped, but no direct Figma Variables import
- **No cross-file analysis** — all rules are per-file only
- **No embeddable core** — can't be integrated into Lovable/Bolt/v0 yet

### Honest Market Position
Deslint is a **pre-launch product with strong technical foundations but zero market
validation**. The technology is differentiated (deterministic, local-first, cross-framework
design quality gate), but differentiation means nothing without users.

---

## 2. Realistic Revenue Pathway

### Revenue Model: Open-Core SaaS

| Tier | Price | Target | What They Get |
|------|-------|--------|---------------|
| **Open Source** | Free forever | Individual devs, OSS projects | 28 rules, CLI, MCP, GitHub Action, MIT licensed |
| **Teams** | $29/dev/month | 5-50 person dev teams | Team dashboard, shared configs, trend analytics, Slack alerts, priority support |
| **Enterprise** | Custom ($99+/dev/month) | 100+ person orgs, regulated industries | SSO/SAML, RBAC, compliance exports (PDF/DOCX), audit trail, SLA, self-hosted option |

### Revenue Milestones (Realistic Timeline)

| Milestone | Target | Revenue | When (Realistic) |
|-----------|--------|---------|-------------------|
| **First 100 npm installs** | Organic | $0 | May 2026 |
| **First paying customer** | Teams tier | ~$145/mo | Jul-Aug 2026 |
| **$1K MRR** | 5-10 teams | $1,000/mo | Oct-Dec 2026 |
| **$5K MRR** | 20-30 teams | $5,000/mo | Q1 2027 |
| **$10K MRR** | 50+ teams, 1-2 enterprise | $10,000/mo | Q2-Q3 2027 |
| **$100K ARR** | Validation threshold | $8,300/mo | Q3-Q4 2027 |
| **$1M ARR** | Growth stage, acquisition-interesting | $83,000/mo | 2028 |

**Why these timelines are realistic:**
- Developer tools typically take 6-12 months from launch to first revenue
- ESLint plugins are free ecosystem expectations — paid value must be clearly differentiated
- The Teams dashboard doesn't exist yet — building it takes 2-3 months
- Enterprise sales cycles are 3-6 months minimum
- Comparable tools: SonarQube took years; Snyk raised $7M before meaningful revenue

### What Must Be True for Revenue

1. **deslint.com deployed and discoverable** — without this, nothing else matters
2. **v0.2.0 released** — users need a stable, tagged version to trust
3. **100+ organic installs** — proof that people want the free tier before building paid
4. **Teams dashboard MVP** — the paid tier needs to exist before it can generate revenue
5. **At least 1 integration partner conversation** — Anthropic, Figma, or an AI codegen platform

---

## 3. Continental Traction Strategy

### Phase 1: North America (Now → Aug 2026) — Beachhead

**Why NA first:**
- ADA Title II deadline (2026-04-26) creates immediate accessibility urgency
- Largest concentration of AI-native dev teams (Cursor, Claude Code, v0 users)
- English-language content is the default for dev tools
- YC/tech Twitter/Hacker News ecosystem for early visibility

**Channels:**
| Channel | Action | Timeline | Expected Impact |
|---------|--------|----------|-----------------|
| **npm + GitHub** | v0.2.0 release, clean README, correct npm keywords | Apr 2026 | Foundation — search discovery |
| **Show HN** | Post with visual-proof MP4 + "0% FP across 4K files" hook | May 2026 | 50-200 stars, 30-100 installs |
| **awesome-eslint PR** | Add to curated ESLint plugin lists | May 2026 | Steady long-tail traffic |
| **Dev.to / Hashnode** | "How AI code generators break WCAG" article series | May-Jun 2026 | SEO, establish thought leadership |
| **Reddit** (r/webdev, r/react, r/accessibility) | Share real before/after examples | May-Jun 2026 | Community awareness |
| **Twitter/X** | Thread: "6 WCAG bugs we found in shadcn/ui taxonomy" | May 2026 | Developer credibility |
| **ADA deadline press** | Pitch to accessibility-focused outlets, The Verge, Ars | Apr 2026 | Time-sensitive window |
| **Claude Code / Cursor marketplace** | MCP server listing | Jun 2026 | Direct to power users |

### Phase 2: Europe (Jul-Dec 2026) — Regulatory Pull

**Why Europe second:**
- **European Accessibility Act (EAA)** enforcement begins June 2025 — all digital products/services must comply
- **GDPR alignment** — Deslint's "zero cloud, zero telemetry" is a natural fit for EU privacy-conscious orgs
- Strong design system culture (Nordics, Netherlands, Germany)
- Large Angular userbase (enterprise, government)

**Channels:**
| Channel | Action | Timeline |
|---------|--------|----------|
| **Localized landing page** | deslint.com/eu with EAA compliance framing | Aug 2026 |
| **EU tech conferences** | CSSConf EU, JSConf EU, beyond tellerrand, Accessibility Club | Sep-Nov 2026 |
| **Design system communities** | Design Tokens Community Group, Figma Config EU | Sep 2026 |
| **Government / public sector** | EU public sector websites mandate WCAG 2.1 AA — Deslint generates the compliance artifact they need | Oct 2026 |
| **Partnerships** | Approach EU-based design system consultancies (Intergalactico, Clearleft) | Oct 2026 |

### Phase 3: Asia-Pacific (2027) — Scale

**Why APAC third:**
- Growing AI-first development culture (Japan, Korea, India, Australia)
- Large Angular/React ecosystems in India and Southeast Asia
- Less regulatory pressure (opportunity to grow organically)
- Different go-to-market: developer community + agency partnerships

**Channels:**
| Channel | Action | Timeline |
|---------|--------|----------|
| **Japanese localization** | Japan has strong accessibility awareness (JIS X 8341) | Q1 2027 |
| **Indian dev communities** | Dev.to India, Twitter India dev scene, GDG chapters | Q1 2027 |
| **Australian accessibility** | DDA (Disability Discrimination Act) creates compliance need | Q2 2027 |
| **APAC conferences** | JSConf Asia, ReactConf India, RubyKaigi (design system track) | Q2-Q3 2027 |

### Phase 4: Latin America & Africa (2027-2028) — Long Tail

- Partner with local dev communities and bootcamps
- Focus on the "AI code quality" angle rather than compliance
- Lower price points for Teams tier in developing markets

---

## 4. Sprint Plan: Q2 2026 (April-June)

### Sprint 10: Ship & Launch (Apr 10-22, 2026)

| # | Task | Effort | Priority |
|---|------|--------|----------|
| S10.1 | **Deploy deslint.com** — DNS + Vercel static export | 0.5d | P0 |
| S10.2 | **Merge feature branches to main** — clean rebase + single merge | 0.5d | P0 |
| S10.3 | **Tag + publish v0.2.0** — changelog, npm publish, GitHub Release | 0.5d | P0 |
| S10.4 | **Update README** — 28 rules (not 20), 1,303 tests (not 1,145) | 0.5d | P0 |
| S10.5 | **Security hardening commit** — this PR | Done | P0 |
| S10.6 | **Show HN draft** — write post, prepare visual assets | 1d | P1 |
| S10.7 | **awesome-eslint PR** — submit to curated list | 0.5d | P1 |
| S10.8 | **ADA deadline article** — "How to audit your AI-generated code for WCAG 2.2 AA" | 1d | P1 |
| S10.9 | **Waitlist backend** — simple Supabase or Resend for pricing page email capture | 1d | P1 |

**Sprint goal:** Deslint is publicly available, discoverable, and generating its first organic traffic.

### Sprint 11: Distribution & Community (Apr 22 - May 6, 2026)

| # | Task | Effort | Priority |
|---|------|--------|----------|
| S11.1 | **Show HN launch** | 0.5d | P0 |
| S11.2 | **Dev.to article series** (1 of 3): "AI writes fast, ships WCAG failures" | 1d | P0 |
| S11.3 | **Reddit posts** — r/webdev, r/react, r/accessibility | 0.5d | P1 |
| S11.4 | **Twitter launch thread** | 0.5d | P1 |
| S11.5 | **Respond to community feedback** — issues, PRs, questions | Ongoing | P0 |
| S11.6 | **Measure: npm installs, GitHub stars, deslint.com traffic** | 0.5d | P0 |
| S11.7 | **Claude Code / Cursor MCP listing** | 1d | P1 |
| S11.8 | **CI integration: add `pnpm audit` to GitHub Actions** | 0.5d | P2 |

**Sprint goal:** 50+ GitHub stars, 100+ npm installs, initial community signal.

### Sprint 12: Foundation for Paid Tier (May 6-20, 2026)

| # | Task | Effort | Priority |
|---|------|--------|----------|
| S12.1 | **Stripe integration** — billing, subscription management | 3d | P0 |
| S12.2 | **Teams dashboard MVP** — web app with auth (NextAuth/Clerk) | 5d | P0 |
| S12.3 | **Shared config sync** — teams share .deslintrc.json via dashboard | 2d | P1 |
| S12.4 | **Trend visualization** — line charts for Design Health Score over time | 2d | P1 |
| S12.5 | **Dev.to article 2 of 3**: "Building a design quality gate for CI/CD" | 1d | P2 |

**Sprint goal:** Teams tier is functional and purchasable.

### Sprint 13: Partnerships & Enterprise Prep (May 20 - Jun 3, 2026)

| # | Task | Effort | Priority |
|---|------|--------|----------|
| S13.1 | **VS Code extension MVP** — score in status bar, violation highlights | 5d | P0 |
| S13.2 | **Reach out to Anthropic** — Claude Code integration story, MCP listing | 1d | P0 |
| S13.3 | **Reach out to Figma** — design-to-code verification story | 1d | P1 |
| S13.4 | **Enterprise compliance exports** — PDF report with WCAG mapping | 3d | P1 |
| S13.5 | **KPMG Phase 2 start: Cross-file design graph** | 5d | P2 |

**Sprint goal:** VS Code extension live, partnership conversations initiated.

### Sprint 14: Scale & Iterate (Jun 3-17, 2026)

| # | Task | Effort | Priority |
|---|------|--------|----------|
| S14.1 | **React to early user feedback** — fix top issues, improve DX | Ongoing | P0 |
| S14.2 | **Embeddable `@deslint/core`** — pure function API for platform integration | 5d | P1 |
| S14.3 | **Figma Variables API import** | 3d | P1 |
| S14.4 | **EU/EAA landing page variant** | 1d | P2 |
| S14.5 | **Dev.to article 3 of 3**: "EAA compliance for developers" | 1d | P2 |

**Sprint goal:** Platform integration API ready, EU traction seed planted.

---

## 5. Key Metrics to Track

| Metric | Week 1 Target | Month 1 | Month 3 | Month 6 |
|--------|:---:|:---:|:---:|:---:|
| **npm weekly installs** | 10 | 100 | 500 | 2,000 |
| **GitHub stars** | 20 | 100 | 500 | 1,500 |
| **deslint.com monthly visitors** | 50 | 500 | 2,000 | 10,000 |
| **GitHub issues (community)** | 2 | 10 | 30 | 100 |
| **Paying teams** | 0 | 0 | 1-3 | 10-20 |
| **MRR** | $0 | $0 | $50-150 | $500-2,000 |
| **Integration partners** | 0 | 0 | 1 conversation | 1 integration |

---

## 6. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|:-----------:|:------:|------------|
| **Nobody cares** — product doesn't resonate | Medium | Critical | Launch fast, measure signal, pivot positioning if needed. The ADA deadline provides a time-bound hook. |
| **Big player copies it** — SonarQube/CodeRabbit adds design rules | Low (6mo) | High | KPMG moat strategy: cross-file analysis, design debt scoring, compliance reports. They'd need to rebuild our entire CLI+MCP+Action surface. |
| **Free tier is "good enough"** — nobody upgrades to Teams | Medium | High | Teams value must be clearly differentiated: dashboard, shared configs, trend analytics. Individual devs don't need this; teams do. |
| **AI code quality improves** — LLMs stop making design mistakes | Low (2yr) | Medium | Design systems persist across tools; even perfect AI needs a config-as-code gate. Shift positioning from "catch AI bugs" to "enforce design standards." |
| **Runway pressure** — building too long without revenue | High | High | Keep burn minimal (solo founder + AI). Target $1K MRR by Q4 2026 as the survival milestone. |
| **Technical debt** — moving too fast breaks quality | Low | Medium | 1,303 tests, 0% FP rate, security hardening. Keep the quality bar. |

---

## 7. The 90-Day Bet

**If we execute Sprints 10-14 as planned, by July 2026 Deslint will have:**

1. A live, deployed website with SEO traffic flowing
2. v0.2.0+ on npm with 28+ rules and a growing install base
3. A Show HN launch post and 2-3 dev articles generating awareness
4. A VS Code extension for better developer experience
5. A functional Teams tier with Stripe billing
6. At least 1 partnership conversation with Anthropic, Figma, or a codegen platform
7. Early community signal (stars, issues, feedback) to validate or pivot

**The single most important thing right now:** Deploy deslint.com and ship v0.2.0. Everything else is downstream of having a live, installable, findable product.

---

## 8. Non-Negotiables (Carried Forward)

1. **No AI/LLM API calls** — deterministic static analysis only
2. **Local-first** — zero code leaves the user's machine
3. **Zero false positives** — precision over recall, always
4. **Every rule try/catch wrapped** — no crashes in production
5. **Test suite stays green** — no shipping broken code
6. **Security-first** — input validation, resource bounds, no secrets in code
7. **MIT licensed** — the open-source tier stays open forever
