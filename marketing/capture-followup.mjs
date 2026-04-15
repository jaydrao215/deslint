#!/usr/bin/env node
// Capture the three follow-up marketing assets:
//
//   pr-comment.{webm,mp4,gif}           — 1200x800 PR-review teaser   (≈ 10s)
//   vscode-squiggle.{webm,mp4,gif}      — 1200x800 VSCode quick-fix   (≈ 12s)
//   comparison-table.{webm,mp4,gif}     — 1200x675 animated matrix    (≈ 4s video)
//   comparison-table.png                — final-frame tweet card      (still image)
//
// Run with `node marketing/capture-followup.mjs`. Requires `ffmpeg` on $PATH.

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(
  require.resolve('playwright', {
    paths: ['/opt/node22/lib/node_modules', ...(process.env.NODE_PATH?.split(':') ?? [])],
  }),
);
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdirSync, renameSync, readdirSync, unlinkSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, 'output');
mkdirSync(out, { recursive: true });

async function recordFixture({
  fixture,
  outName,
  viewport,
  durationMs,
  makeMp4 = true,
  gifOpts = { fps: 16, width: 720 },
  screenshotAtMs = null,
  screenshotName = null,
}) {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    recordVideo: { dir: out, size: viewport },
  });
  const page = await context.newPage();
  await page.goto(pathToFileURL(fixture).href);
  await page.waitForTimeout(300);

  if (screenshotAtMs != null && screenshotName) {
    await page.waitForTimeout(screenshotAtMs);
    await page.screenshot({ path: resolve(out, screenshotName), fullPage: false });
    await page.waitForTimeout(Math.max(0, durationMs - screenshotAtMs - 300));
  } else {
    await page.waitForTimeout(durationMs);
  }

  await page.close();
  await context.close();
  await browser.close();

  const webms = readdirSync(out).filter(
    (f) =>
      f.endsWith('.webm') &&
      !f.startsWith('cli-demo') &&
      !f.startsWith('social-') &&
      !f.startsWith('walkthrough') &&
      !f.startsWith('pr-comment') &&
      !f.startsWith('vscode-squiggle') &&
      !f.startsWith('comparison-table'),
  );
  const latest = webms.sort().pop();
  if (!latest) throw new Error('playwright did not emit a webm for ' + outName);
  const stable = resolve(out, `${outName}.webm`);
  if (existsSync(stable)) unlinkSync(stable);
  renameSync(resolve(out, latest), stable);

  const palette = resolve(out, `.${outName}.palette.png`);
  const gif = resolve(out, `${outName}.gif`);
  execSync(
    `ffmpeg -y -i "${stable}" -vf "fps=${gifOpts.fps},scale=${gifOpts.width}:-1:flags=lanczos,palettegen=stats_mode=diff" "${palette}"`,
    { stdio: 'pipe' },
  );
  execSync(
    `ffmpeg -y -i "${stable}" -i "${palette}" -lavfi "fps=${gifOpts.fps},scale=${gifOpts.width}:-1:flags=lanczos [x]; [x][1:v] paletteuse=dither=bayer:bayer_scale=5" "${gif}"`,
    { stdio: 'pipe' },
  );
  unlinkSync(palette);

  if (makeMp4) {
    const mp4 = resolve(out, `${outName}.mp4`);
    execSync(
      `ffmpeg -y -i "${stable}" -c:v libx264 -pix_fmt yuv420p -movflags +faststart -preset medium -crf 20 "${mp4}"`,
      { stdio: 'pipe' },
    );
  }
}

// 1. GitHub PR review teaser — 10s @ 1200x800
await recordFixture({
  fixture: resolve(here, 'fixtures/pr-comment.html'),
  outName: 'pr-comment',
  viewport: { width: 1200, height: 800 },
  durationMs: 10000,
  makeMp4: true,
  gifOpts: { fps: 14, width: 720 },
});
console.log('✓ pr-comment');

// 2. VSCode quick-fix teaser — 12s @ 1200x800
await recordFixture({
  fixture: resolve(here, 'fixtures/vscode-squiggle.html'),
  outName: 'vscode-squiggle',
  viewport: { width: 1200, height: 800 },
  durationMs: 12000,
  makeMp4: true,
  gifOpts: { fps: 14, width: 720 },
});
console.log('✓ vscode-squiggle');

// 3. Comparison table — short 4s reveal + final-frame PNG (tweet card)
await recordFixture({
  fixture: resolve(here, 'fixtures/comparison-table.html'),
  outName: 'comparison-table',
  viewport: { width: 1200, height: 675 },
  durationMs: 4200,
  makeMp4: true,
  gifOpts: { fps: 18, width: 800 },
  screenshotAtMs: 3600,
  screenshotName: 'comparison-table.png',
});
console.log('✓ comparison-table (+ png)');

console.log(`\nAll follow-up outputs in ${out}`);
