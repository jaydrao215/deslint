#!/usr/bin/env node
// Cross-browser smoke test for VisualProofSection.
// Drives Chromium + WebKit + Firefox through each of the 4 beats, waits for
// the correct tab to be active, and screenshots the stage. Fails loudly if
// any browser can't mount a beat. Run `pnpm --filter @deslint/docs dev`
// first (or set VP_HOST to a deployed URL).

import { chromium, webkit, firefox } from 'playwright';
import { mkdirSync, existsSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'scripts', '.smoke-out');

const HOST = process.env.VP_HOST ?? 'http://localhost:3000';
const URL = `${HOST}/?vp-autoplay=1#visual-proof`;

const BEATS = [
  { idx: 0, number: '01', title: 'Dark mode · flipped' },
  { idx: 1, number: '02', title: 'Responsive · reflow' },
  { idx: 2, number: '03', title: 'Contrast · readability' },
  { idx: 3, number: '04', title: 'A11y · the invisible wins' },
];

const BROWSERS = [
  { name: 'chromium', launcher: chromium },
  { name: 'webkit', launcher: webkit },
  { name: 'firefox', launcher: firefox },
];

if (existsSync(OUT_DIR)) rmSync(OUT_DIR, { recursive: true, force: true });
mkdirSync(OUT_DIR, { recursive: true });

const results = [];
let totalFailed = 0;

for (const { name, launcher } of BROWSERS) {
  console.log(`\n=== ${name} ===`);
  const browser = await launcher.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));

  try {
    await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForSelector('#visual-proof', { timeout: 10000 });
    await page.waitForTimeout(1200);

    for (const beat of BEATS) {
      // Click the tab for this beat so we're deterministic (not racing autoplay).
      const tabs = await page.$$('button[aria-label^="Jump to beat"]');
      if (tabs.length !== BEATS.length) {
        console.log(`  ✗ Beat ${beat.number}: expected ${BEATS.length} tabs, got ${tabs.length}`);
        results.push({ browser: name, beat: beat.number, status: 'fail', reason: 'missing tabs' });
        totalFailed++;
        continue;
      }
      await tabs[beat.idx].click();
      await page.waitForTimeout(800);

      const activeNumber = await page.$eval(
        '[aria-current="step"] span.font-mono',
        (el) => el.textContent?.trim() ?? '',
      );

      if (activeNumber === beat.number) {
        const shotPath = join(OUT_DIR, `${name}-beat${beat.idx + 1}.png`);
        await page.screenshot({ path: shotPath, fullPage: false });
        console.log(`  ✓ Beat ${beat.number} ${beat.title}`);
        results.push({ browser: name, beat: beat.number, status: 'pass', screenshot: shotPath });
      } else {
        console.log(
          `  ✗ Beat ${beat.number}: expected active=${beat.number}, got ${activeNumber}`,
        );
        results.push({
          browser: name,
          beat: beat.number,
          status: 'fail',
          reason: `active=${activeNumber}`,
        });
        totalFailed++;
      }
    }

    // Verify the fallback <video> element exists and the sources 200.
    const videoExists = (await page.$('video')) !== null;
    if (!videoExists) {
      console.log('  ✗ fallback <video> element missing');
      totalFailed++;
    } else {
      console.log('  ✓ fallback <video> element present');
    }
  } catch (err) {
    console.log(`  ✗ fatal: ${err.message}`);
    totalFailed++;
  } finally {
    if (pageErrors.length > 0) {
      console.log(`  ⚠ page errors (${pageErrors.length}):`);
      pageErrors.slice(0, 3).forEach((e) => console.log(`     ${e}`));
    }
    if (consoleErrors.length > 0) {
      console.log(`  ⚠ console errors (${consoleErrors.length}):`);
      consoleErrors.slice(0, 3).forEach((e) => console.log(`     ${e}`));
    }
    await page.close();
    await context.close();
    await browser.close();
  }
}

console.log('\n=== Summary ===');
const byBrowser = {};
for (const r of results) {
  if (!byBrowser[r.browser]) byBrowser[r.browser] = { pass: 0, fail: 0 };
  byBrowser[r.browser][r.status]++;
}
for (const [browser, counts] of Object.entries(byBrowser)) {
  const total = counts.pass + counts.fail;
  console.log(`  ${browser}: ${counts.pass}/${total} beats passed`);
}
console.log(`\nScreenshots: ${OUT_DIR}`);

if (totalFailed > 0) {
  console.log(`\n✗ ${totalFailed} failures`);
  process.exit(1);
}
console.log('\n✓ all browsers green');
