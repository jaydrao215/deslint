import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import { mkdirSync, rmSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FRAMES_DIR = resolve(__dirname, '.frames');
const OUTPUT = resolve(__dirname, '..', '..', 'public', 'demo', 'mcp-before-after.mp4');
const FFMPEG = resolve(
  __dirname, '..', '..', '..', '..', 'node_modules', '.pnpm',
  '@ffmpeg-installer+linux-x64@4.1.0', 'node_modules',
  '@ffmpeg-installer', 'linux-x64', 'ffmpeg',
);

const W = 1920;
const H = 1080;
const FPS = 30;

const ICON_SVG = readFileSync(
  resolve(__dirname, '..', '..', 'public', 'icons', 'icon-512.svg'), 'utf-8',
);
const LOCKUP_SVG = readFileSync(
  resolve(__dirname, '..', '..', 'public', 'icons', 'lockup-dark.svg'), 'utf-8',
);

const BRAND = {
  bg: '#0F0D1A',
  primary: '#534AB7',
  primaryLight: '#7B6DC7',
  green: '#1D9E75',
  greenLight: '#34D399',
  red: '#EF4444',
  redLight: '#F87171',
  warn: '#F59E0B',
  text: '#F8FAFC',
  textMuted: '#94A3B8',
  mono: "'JetBrains Mono', 'Fira Code', monospace",
  sans: "'Inter', system-ui, sans-serif",
};

function baseStyle() {
  return `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: ${W}px; height: ${H}px;
      background: ${BRAND.bg};
      font-family: ${BRAND.sans};
      color: ${BRAND.text};
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.5px;
    }
    .badge-error { background: ${BRAND.red}22; color: ${BRAND.redLight}; border: 1px solid ${BRAND.red}44; }
    .badge-pass { background: ${BRAND.green}22; color: ${BRAND.greenLight}; border: 1px solid ${BRAND.green}44; }
    .badge-warn { background: ${BRAND.warn}22; color: ${BRAND.warn}; border: 1px solid ${BRAND.warn}44; }
    .code-block {
      background: #0D0B14;
      border: 1px solid #2D2A45;
      border-radius: 12px;
      padding: 24px 28px;
      font-family: ${BRAND.mono};
      font-size: 15px;
      line-height: 1.7;
      white-space: pre;
      overflow: hidden;
    }
    .line-bad { color: ${BRAND.redLight}; }
    .line-good { color: ${BRAND.greenLight}; }
    .line-neutral { color: #94A3B8; }
    .dot { display: inline-block; width: 12px; height: 12px; border-radius: 50%; margin-right: 8px; }
    .dot-red { background: #EF4444; }
    .dot-yellow { background: #F59E0B; }
    .dot-green { background: #10B981; }
    .header-dots { margin-bottom: 16px; }
    .watermark { position: absolute; bottom: 32px; right: 40px; opacity: 0.5; }
  `;
}

const wm = `<div class="watermark">${LOCKUP_SVG}</div>`;
const dots = `<div class="header-dots"><span class="dot dot-red"></span><span class="dot dot-yellow"></span><span class="dot dot-green"></span></div>`;

function slideStyle() {
  return `
    .container { width: 85%; }
    .title { font-size: 16px; color: ${BRAND.textMuted}; margin-bottom: 8px; font-family: ${BRAND.mono}; }
    .rule { font-size: 28px; font-weight: 700; margin-bottom: 6px; }
    .desc { font-size: 16px; color: ${BRAND.textMuted}; margin-bottom: 24px; }
    .split { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
    .panel-label { font-size: 13px; font-weight: 600; margin-bottom: 10px; letter-spacing: 1px; text-transform: uppercase; }
    .panel-label.before { color: ${BRAND.redLight}; }
    .panel-label.after { color: ${BRAND.greenLight}; }
  `;
}

const slides = [
  {
    duration: 2,
    html: `
      <style>${baseStyle()}</style>
      <div style="display:flex;flex-direction:column;align-items:center;gap:24px;">
        <div style="width:120px;height:120px;">${ICON_SVG}</div>
        <div style="font-size:48px;font-weight:700;letter-spacing:-1px;">Deslint MCP Server</div>
        <div style="font-size:22px;color:${BRAND.textMuted};max-width:700px;text-align:center;line-height:1.5;">
          Real design violations found in <span style="color:${BRAND.primaryLight};font-weight:600;">cal.com</span> — 2,149 issues across 1,162 files
        </div>
        <div style="margin-top:16px;display:flex;gap:12px;">
          <span class="badge badge-error">2 errors</span>
          <span class="badge badge-warn">2,147 warnings</span>
          <span class="badge badge-pass">Score: 81/100</span>
        </div>
      </div>
    `,
  },

  {
    duration: 1.5,
    html: `
      <style>${baseStyle()}${slideStyle()}</style>
      <div class="container">
        <div class="title">deslint/a11y-color-contrast · WCAG 1.4.3</div>
        <div class="rule">Color Contrast Failure</div>
        <div class="desc">cal.com · <code style="font-family:${BRAND.mono};color:${BRAND.primaryLight};">pages/[bookingUid].tsx:58</code></div>
        <div class="split">
          <div>
            <div class="panel-label before">✗ Before — Ratio 1:1</div>
            <div class="code-block">${dots}<span class="line-neutral">&lt;hr</span>
  <span class="line-bad">className="bg-black text-black"</span>
<span class="line-neutral">/&gt;</span>

<span style="color:#475569;">// black text on black background</span>
<span style="color:#475569;">// completely invisible content</span></div>
          </div>
          <div>
            <div class="panel-label after">✓ After — Ratio 21:1</div>
            <div class="code-block">${dots}<span class="line-neutral">&lt;hr</span>
  <span class="line-good">className="bg-black text-white"</span>
<span class="line-neutral">/&gt;</span>

<span style="color:#475569;">// white text on black background</span>
<span style="color:#475569;">// WCAG AAA compliant</span></div>
          </div>
        </div>
      </div>
      ${wm}
    `,
  },

  {
    duration: 1.5,
    html: `
      <style>${baseStyle()}${slideStyle()}</style>
      <div class="container">
        <div class="title">deslint/viewport-meta · WCAG 1.4.4</div>
        <div class="rule">Zoom Blocking — Accessibility Error</div>
        <div class="desc">cal.com · <code style="font-family:${BRAND.mono};color:${BRAND.primaryLight};">components/PageWrapper.tsx:67</code></div>
        <div class="split">
          <div>
            <div class="panel-label before">✗ Before — Pinch zoom disabled</div>
            <div class="code-block">${dots}<span class="line-neutral">&lt;meta</span>
  <span class="line-neutral">name="viewport"</span>
  <span class="line-bad">content="width=device-width,</span>
    <span class="line-bad">initial-scale=1.0,</span>
    <span class="line-bad">maximum-scale=1.0,</span>
    <span class="line-bad">user-scalable=0"</span>
<span class="line-neutral">/&gt;</span></div>
          </div>
          <div>
            <div class="panel-label after">✓ After — Users can zoom</div>
            <div class="code-block">${dots}<span class="line-neutral">&lt;meta</span>
  <span class="line-neutral">name="viewport"</span>
  <span class="line-good">content="width=device-width,</span>
    <span class="line-good">initial-scale=1.0,</span>
    <span class="line-good">viewport-fit=cover"</span>
<span class="line-neutral">/&gt;</span>

<span style="color:#475569;">// zoom restrictions removed</span></div>
          </div>
        </div>
      </div>
      ${wm}
    `,
  },

  {
    duration: 1.5,
    html: `
      <style>${baseStyle()}${slideStyle()}</style>
      <div class="container">
        <div class="title">deslint/link-text · WCAG 2.4.4</div>
        <div class="rule">Generic Link Text — 278 Instances</div>
        <div class="desc">cal.com · <code style="font-family:${BRAND.mono};color:${BRAND.primaryLight};">modules/apps/[slug]/slug-view.tsx:30</code></div>
        <div class="split">
          <div>
            <div class="panel-label before">✗ Before — "here" is meaningless</div>
            <div class="code-block">${dots}<span class="line-neutral">&lt;Link</span>
  <span class="line-neutral">href="/settings/admin/apps"</span>
  <span class="line-neutral">className="text-blue-500"</span>
<span class="line-neutral">&gt;</span>
  <span class="line-bad">here</span>
<span class="line-neutral">&lt;/Link&gt;</span></div>
          </div>
          <div>
            <div class="panel-label after">✓ After — Descriptive text</div>
            <div class="code-block">${dots}<span class="line-neutral">&lt;Link</span>
  <span class="line-neutral">href="/settings/admin/apps"</span>
  <span class="line-neutral">className="text-blue-500"</span>
<span class="line-neutral">&gt;</span>
  <span class="line-good">app settings</span>
<span class="line-neutral">&lt;/Link&gt;</span></div>
          </div>
        </div>
      </div>
      ${wm}
    `,
  },

  {
    duration: 1.5,
    html: `
      <style>${baseStyle()}${slideStyle()}</style>
      <div class="container">
        <div class="title">deslint/no-arbitrary-colors · Design System</div>
        <div class="rule">Hardcoded Colors — Design Drift</div>
        <div class="desc">cal.com · <code style="font-family:${BRAND.mono};color:${BRAND.primaryLight};">components/AddToHomescreen.tsx:23</code></div>
        <div class="split">
          <div>
            <div class="panel-label before">✗ Before — Arbitrary hex values</div>
            <div class="code-block">${dots}<span class="line-neutral">&lt;span className="</span>
  <span class="line-bad">text-[#5B93F9]</span>
<span class="line-neutral">"&gt;Add to home&lt;/span&gt;</span>

<span class="line-neutral">&lt;div className="</span>
  <span class="line-bad">bg-[#ffc439]</span>
<span class="line-neutral">"&gt;PayPal&lt;/div&gt;</span></div>
          </div>
          <div>
            <div class="panel-label after">✓ After — Design tokens</div>
            <div class="code-block">${dots}<span class="line-neutral">&lt;span className="</span>
  <span class="line-good">text-blue-400</span>
<span class="line-neutral">"&gt;Add to home&lt;/span&gt;</span>

<span class="line-neutral">&lt;div className="</span>
  <span class="line-good">bg-amber-400</span>
<span class="line-neutral">"&gt;PayPal&lt;/div&gt;</span></div>
          </div>
        </div>
      </div>
      ${wm}
    `,
  },

  {
    duration: 2,
    html: `
      <style>${baseStyle()}</style>
      <div style="display:flex;flex-direction:column;align-items:center;gap:28px;">
        <div style="width:80px;height:80px;">${ICON_SVG}</div>
        <div style="font-size:40px;font-weight:700;letter-spacing:-0.5px;text-align:center;max-width:800px;line-height:1.3;">
          33 rules. Zero false positives.<br/>
          <span style="background:linear-gradient(135deg,${BRAND.primary},${BRAND.primaryLight});-webkit-background-clip:text;-webkit-text-fill-color:transparent;">Runs inside your AI agent loop.</span>
        </div>
        <div style="font-size:18px;color:${BRAND.textMuted};text-align:center;max-width:600px;">
          Plugin · CLI · MCP Server · GitHub Action
        </div>
        <div style="display:flex;gap:16px;margin-top:8px;">
          <div style="background:${BRAND.primary};padding:14px 32px;border-radius:12px;font-weight:600;font-size:17px;">
            npx @deslint/mcp install
          </div>
        </div>
        <div style="font-size:14px;color:#475569;font-family:${BRAND.mono};">deslint.com</div>
      </div>
    `,
  },
];

async function main() {
  if (existsSync(FRAMES_DIR)) rmSync(FRAMES_DIR, { recursive: true });
  mkdirSync(FRAMES_DIR, { recursive: true });

  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  });
  const context = await browser.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  let frameIndex = 0;
  for (let si = 0; si < slides.length; si++) {
    const slide = slides[si];
    const numFrames = Math.round(slide.duration * FPS);
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${slide.html}</body></html>`;

    await page.setContent(html, { waitUntil: 'load' });
    const screenshot = await page.screenshot({ type: 'png' });

    for (let f = 0; f < numFrames; f++) {
      const idx = String(frameIndex).padStart(6, '0');
      writeFileSync(resolve(FRAMES_DIR, `frame_${idx}.png`), screenshot);
      frameIndex++;
    }
    console.log(`Slide ${si + 1}/${slides.length}: ${numFrames} frames (${slide.duration}s)`);
  }

  await browser.close();
  console.log(`\nTotal frames: ${frameIndex}`);
  console.log('Encoding MP4...');

  mkdirSync(dirname(OUTPUT), { recursive: true });
  execSync([
    FFMPEG, '-y',
    `-framerate ${FPS}`,
    `-i ${FRAMES_DIR}/frame_%06d.png`,
    '-c:v libx264', '-pix_fmt yuv420p',
    '-preset medium', '-crf 18',
    '-movflags +faststart',
    OUTPUT,
  ].join(' '), { stdio: 'inherit' });

  rmSync(FRAMES_DIR, { recursive: true });
  console.log(`\nVideo saved: ${OUTPUT}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
