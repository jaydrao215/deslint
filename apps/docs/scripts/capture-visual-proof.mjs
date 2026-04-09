#!/usr/bin/env node
// Records apps/docs/public/demo/visual-proof.{webm,mp4} by driving the
// landing page's VisualProofSection through its 4-beat autoplay loop.
// Usage: `pnpm --filter @deslint/docs dev` then `node apps/docs/scripts/capture-visual-proof.mjs`.
// Env: VP_HOST (default http://localhost:3000). Requires playwright (devDep).

import { chromium } from 'playwright';
import { existsSync, mkdirSync, renameSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..'); // apps/docs
const OUTPUT_DIR = join(ROOT, 'public', 'demo');
const WEBM_PATH = join(OUTPUT_DIR, 'visual-proof.webm');
const MP4_PATH = join(OUTPUT_DIR, 'visual-proof.mp4');

const HOST = process.env.VP_HOST ?? 'http://localhost:3000';
const URL = `${HOST}/?vp-autoplay=1#visual-proof`;

// 4 beats × 9s = 36s loop + 4s tail.
const RECORD_MS = 40000;
const WIDTH = 1280;
const HEIGHT = 900;

async function main() {
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log(`> Recording ${URL}`);
  console.log(`> Output: ${WEBM_PATH}`);

  const tmpDir = join(OUTPUT_DIR, '.tmp-record');
  if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true });
  mkdirSync(tmpDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 2,
    recordVideo: {
      dir: tmpDir,
      size: { width: WIDTH, height: HEIGHT },
    },
  });

  const page = await context.newPage();
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.error('  [page error]', msg.text());
  });

  try {
    await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForSelector('#visual-proof', { timeout: 10000 });
    await page.waitForTimeout(800);

    console.log(`> Recording for ${RECORD_MS / 1000}s…`);
    const startTime = Date.now();

    const interval = setInterval(async () => {
      try {
        const active = await page.$eval(
          '[aria-current="step"]',
          (el) => el.textContent?.trim() ?? '',
        );
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        process.stdout.write(`\r  [${elapsed}s] ${active.slice(0, 60).padEnd(60)}`);
      } catch {
        /* not mounted yet */
      }
    }, 500);

    await page.waitForTimeout(RECORD_MS);
    clearInterval(interval);
    process.stdout.write('\n');
  } finally {
    await page.close();
    await context.close();
    await browser.close();
  }

  const webmFiles = readdirSync(tmpDir).filter((f) => f.endsWith('.webm'));
  if (webmFiles.length === 0) {
    throw new Error('Playwright did not produce a .webm file');
  }
  const source = join(tmpDir, webmFiles[0]);
  if (existsSync(WEBM_PATH)) rmSync(WEBM_PATH);
  renameSync(source, WEBM_PATH);
  rmSync(tmpDir, { recursive: true, force: true });

  console.log(`✓ WebM: ${WEBM_PATH}`);

  const ffmpegPath = await resolveFfmpeg();
  if (ffmpegPath) {
    console.log(`> Transcoding to MP4 via ${ffmpegPath}…`);
    await runCmd(ffmpegPath, [
      '-y',
      '-i',
      WEBM_PATH,
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      '-crf',
      '22',
      '-preset',
      'medium',
      '-an',
      MP4_PATH,
    ]);
    console.log(`✓ MP4:  ${MP4_PATH}`);
  } else {
    console.log('⚠ ffmpeg not found — skipping MP4 transcode.');
    console.log('  Install via: pnpm add -D @ffmpeg-installer/ffmpeg');
    console.log('  The .webm alone is fine for the landing page <video> tag.');
  }
}

async function resolveFfmpeg() {
  try {
    const require = createRequire(import.meta.url);
    const installer = require('@ffmpeg-installer/ffmpeg');
    if (installer?.path && existsSync(installer.path)) return installer.path;
  } catch {
    /* not installed */
  }
  const whichResult = await new Promise((resolve) => {
    const p = spawn('which', ['ffmpeg']);
    let output = '';
    p.stdout.on('data', (chunk) => (output += chunk.toString()));
    p.on('close', (code) => resolve(code === 0 ? output.trim() : null));
    p.on('error', () => resolve(null));
  });
  return whichResult || null;
}

function runCmd(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: 'inherit' });
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
    p.on('error', reject);
  });
}

main().catch((err) => {
  console.error('✗ Capture failed:', err);
  process.exit(1);
});
