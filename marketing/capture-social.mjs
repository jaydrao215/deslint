#!/usr/bin/env node
// Capture social-media clips + CLI demo.
//
// Outputs to marketing/output/:
//   cli-demo.webm        — 920x540 terminal animation (≈ 22s)
//   cli-demo.gif         — same, gif (for the npm README hero)
//   social-01-dashboard.mp4
//   social-02-ecommerce.mp4
//   social-03-spinner.mp4
//   social-0x.gif        — gif fallback for each
//
// All social videos are 1080×1080 (square, IG/X/LinkedIn safe) and 15s.

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(
  require.resolve('playwright', {
    paths: ['/opt/node22/lib/node_modules', ...(process.env.NODE_PATH?.split(':') ?? [])],
  }),
);
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve, basename, join } from 'node:path';
import { mkdirSync, renameSync, readdirSync, unlinkSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, 'output');
mkdirSync(out, { recursive: true });

/**
 * Record a fixture for a fixed duration, then rename the webm to a stable
 * filename and convert to GIF and MP4. The `__done` global from the fixture
 * is treated as "soft" — we stop at the hard duration cap either way so the
 * output length is predictable for social posts.
 */
async function recordFixture({
  fixture,
  outName,
  viewport,
  durationMs,
  makeMp4 = true,
  gifOpts = { fps: 16, width: 540 },
}) {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    recordVideo: { dir: out, size: viewport },
  });
  const page = await context.newPage();
  await page.goto(pathToFileURL(fixture).href);
  // Let fonts/layout settle
  await page.waitForTimeout(300);
  await page.waitForTimeout(durationMs);
  await page.close();
  await context.close();
  await browser.close();

  // Find the webm playwright just wrote and rename it
  const webms = readdirSync(out).filter((f) => f.endsWith('.webm') && !f.startsWith('cli-demo') && !f.startsWith('social-') && !f.startsWith('walkthrough'));
  const latest = webms.sort().pop();
  if (!latest) throw new Error('playwright did not emit a webm for ' + outName);
  const stable = resolve(out, `${outName}.webm`);
  if (existsSync(stable)) unlinkSync(stable);
  renameSync(resolve(out, latest), stable);

  // Convert to GIF (ffmpeg 2-pass palette)
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

// ── CLI demo (terminal) ────────────────────────────────────────────────
// Duration chosen to cover all the typed commands with comfortable pauses.
await recordFixture({
  fixture: resolve(here, 'fixtures/cli-demo.html'),
  outName: 'cli-demo',
  viewport: { width: 960, height: 580 },
  durationMs: 22000,
  makeMp4: false,
  gifOpts: { fps: 18, width: 720 },
});
console.log('✓ cli-demo');

// ── Three 15s social clips ────────────────────────────────────────────
const social = [
  { fixture: 'fixtures/social-01-dashboard.html', outName: 'social-01-dashboard' },
  { fixture: 'fixtures/social-02-ecommerce.html', outName: 'social-02-ecommerce' },
  { fixture: 'fixtures/social-03-spinner.html', outName: 'social-03-spinner' },
];

for (const { fixture, outName } of social) {
  await recordFixture({
    fixture: resolve(here, fixture),
    outName,
    viewport: { width: 1080, height: 1080 },
    durationMs: 15000,
    makeMp4: true,
    gifOpts: { fps: 14, width: 540 },
  });
  console.log(`✓ ${outName}`);
}

console.log(`\nAll outputs in ${out}`);
