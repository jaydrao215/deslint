#!/usr/bin/env node
// Capture PNG screenshots + an MP4 video of the before/after marketing page.
// Run:  node marketing/capture.mjs
//
// Outputs:
//   marketing/output/01-dark-mode.png
//   marketing/output/02-zindex.png
//   marketing/output/03-spinner.png
//   marketing/output/full.png
//   marketing/output/walkthrough.webm   (screen recording of a scroll)

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
// Resolve the globally-installed playwright (no local devDependency needed).
const { chromium } = require(
  require.resolve('playwright', {
    paths: ['/opt/node22/lib/node_modules', ...(process.env.NODE_PATH?.split(':') ?? [])],
  }),
);
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

const here = dirname(fileURLToPath(import.meta.url));
const fixture = resolve(here, 'fixtures/before-after.html');
const out = resolve(here, 'output');
mkdirSync(out, { recursive: true });

const VIEWPORT = { width: 1280, height: 720 };

const browser = await chromium.launch();

// ── First pass: one-shot PNGs (no video). ───────────────────────────────
{
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2 });
  const page = await context.newPage();
  await page.goto(pathToFileURL(fixture).href);
  // Give Tailwind's CDN compiler a beat to finish laying out.
  await page.waitForTimeout(600);

  await page.screenshot({ path: resolve(out, 'full.png'), fullPage: true });

  const sections = [
    { idx: 1, label: '01-dark-mode', heading: 'Dark-mode autofix' },
    { idx: 2, label: '02-zindex',    heading: 'Portal/modal z-index' },
    { idx: 3, label: '03-spinner',   heading: 'Loading spinner' },
  ];

  for (const { label, heading } of sections) {
    // The section header + its `.pairWrap` directly under it.
    const header = page.getByText(heading, { exact: false }).first();
    await header.scrollIntoViewIfNeeded();
    // capture header + card grid together
    const section = await page.evaluateHandle((h) => {
      const hs = Array.from(document.querySelectorAll('.sectionHeader'));
      const match = hs.find((n) => n.textContent.includes(h));
      if (!match) return null;
      const grid = match.nextElementSibling;
      const wrap = document.createElement('div');
      const top = match.getBoundingClientRect().top + window.scrollY;
      const bottom = grid.getBoundingClientRect().bottom + window.scrollY;
      return { top, bottom };
    }, heading);
    const rect = await section.jsonValue();
    if (!rect) continue;
    await page.screenshot({
      path: resolve(out, `${label}.png`),
      fullPage: true,
      clip: { x: 0, y: Math.max(rect.top - 12, 0), width: VIEWPORT.width, height: Math.min(rect.bottom - rect.top + 24, 900) },
    });
  }

  await context.close();
}

// ── Second pass: animated walkthrough (mp4/webm). ───────────────────────
{
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    recordVideo: { dir: out, size: VIEWPORT },
  });
  const page = await context.newPage();
  await page.goto(pathToFileURL(fixture).href);
  await page.waitForTimeout(500);

  const scrollHeight = await page.evaluate(() => document.body.scrollHeight);
  const viewportH = VIEWPORT.height;
  // Slow smooth scroll so the before/after lanes land side-by-side in frame.
  const steps = 80;
  for (let i = 0; i <= steps; i++) {
    const y = ((scrollHeight - viewportH) * i) / steps;
    await page.evaluate((yv) => window.scrollTo({ top: yv, behavior: 'instant' }), y);
    await page.waitForTimeout(80);
  }
  await page.waitForTimeout(800);
  await page.close();
  await context.close();
}

await browser.close();
console.log('Wrote marketing/output/*.png and walkthrough video (.webm) to marketing/output/');
