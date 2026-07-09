# Cowork Task: Deploy deslint.com (S6 Final Step)

## What you are doing
Deploying the already-built Next.js landing page to deslint.com via Vercel.
The site is already built and passes all checks — this is purely infrastructure.
Completing this unblocks: Show HN (9.9), Product Hunt (9.10), tech press (9.12).

## Authentication required
- **Vercel account** — go to https://vercel.com, sign in (or create a free account).
  Vercel supports GitHub OAuth — one click if you have a GitHub account.
- **DNS registrar access** — wherever deslint.com was purchased (Namecheap, Cloudflare, GoDaddy, etc.).
  You'll need to add a CNAME or A record. Log in there too before starting.

## Pre-flight check
Before starting, confirm the site builds cleanly locally:
```bash
cd /path/to/deslint
pnpm --filter @deslint/docs build
```
Expected output: clean build, ~74.5 kB first-load JS. If it fails, stop and fix before deploying.

---

## Step 1 — Create a Vercel project
1. Go to https://vercel.com/new
2. Click "Import Git Repository"
3. Connect your GitHub account if not connected
4. Select the `jaydrao215/deslint` repository
5. Vercel will auto-detect Next.js. Confirm it does.

## Step 2 — Configure build settings
In the Vercel project settings, set:

| Setting | Value |
|---------|-------|
| Framework Preset | Next.js |
| Root Directory | `apps/docs` |
| Build Command | `pnpm --filter @deslint/docs build` |
| Output Directory | `apps/docs/.next` (leave as default — Next.js sets this) |
| Install Command | `pnpm install` |
| Node.js Version | 20.x |

**Environment variables:** None required for the static landing page.

## Step 3 — Deploy
Click "Deploy". Wait for the build to complete (typically 2-3 minutes).

Vercel will assign a preview URL like `deslint-docs.vercel.app`. Open it and verify:
- [ ] Hero section loads
- [ ] MetricsBanner shows numbers
- [ ] VisualProofSection loads and autoplay works
- [ ] BeforeAfter code panels render
- [ ] Footer links are correct

If anything is broken, do NOT proceed to Step 4 — fix the issue first.

## Step 4 — Add the custom domain
1. In the Vercel project, go to Settings → Domains
2. Add `deslint.com`
3. Also add `www.deslint.com` (Vercel will redirect www → apex automatically)
4. Vercel will show you the DNS records you need to add

## Step 5 — Update DNS records
Log in to your DNS registrar (wherever deslint.com was purchased).

Add the records Vercel shows you. Typically:
- **A record:** `@` → `76.76.21.21` (Vercel's IP — use whatever Vercel shows you)
- **CNAME record:** `www` → `cname.vercel-dns.com`

DNS propagation takes 5-30 minutes. You can check status at https://dnschecker.org/#A/deslint.com

## Step 6 — Verify live site
Once DNS propagates, open https://deslint.com in an incognito window.
Verify:
- [ ] HTTPS works (padlock in browser)
- [ ] All 4 visual proof beats play
- [ ] deslint scan code block renders correctly
- [ ] GitHub link points to https://github.com/jaydrao215/deslint
- [ ] npm install command is correct

## Step 7 — Run compliance check (must pass before announcing)
```bash
cd /path/to/deslint
npx deslint compliance apps/docs/out
```
Expected: **Level AA, 13/13 passing, 0 failing**
If anything fails, fix it before announcing — the site runs its own tool.

## Step 8 — Update canonical URLs in Dev.to post
If you already published the Dev.to post (03-devto.md) without a canonical URL:
1. Go to your Dev.to post
2. Edit → Settings
3. Set canonical URL to `https://deslint.com/blog/design-quality-gate-for-ai-code`
4. Save

---

## Done when
- [ ] Vercel project created and deployed
- [ ] deslint.com resolves over HTTPS
- [ ] All sections render correctly
- [ ] `deslint compliance apps/docs/out` passes Level AA
- [ ] Dev.to canonical URL updated

## What this unblocks
Once deslint.com is live, you can proceed with:
- **9.9 Show HN** — draft is in your chat history; post weekday Pacific morning
- **9.10 Product Hunt** — needs 1 day prep; landing URL is now available
- **9.12 Tech press email** — pitch TechCrunch, The Verge, The Register with the live URL
