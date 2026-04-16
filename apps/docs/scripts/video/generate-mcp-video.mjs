import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import { mkdirSync, rmSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FRAMES_DIR = resolve(__dirname, '.frames');
const OUT_DIR = resolve(__dirname, '..', '..', 'public', 'demo');
const FFMPEG = resolve(
  __dirname, '..', '..', '..', '..', 'node_modules', '.pnpm',
  '@ffmpeg-installer+linux-x64@4.1.0', 'node_modules',
  '@ffmpeg-installer', 'linux-x64', 'ffmpeg',
);
const ICON_SVG = readFileSync(resolve(__dirname, '..', '..', 'public', 'icons', 'icon-512.svg'), 'utf-8');
const LOCKUP_SVG = readFileSync(resolve(__dirname, '..', '..', 'public', 'icons', 'lockup-dark.svg'), 'utf-8');

const W = 1920, H = 1080, FPS = 30;
const B = {
  bg: '#0F0D1A', primary: '#534AB7', primaryLight: '#7B6DC7',
  green: '#1D9E75', greenLight: '#34D399', red: '#EF4444', redLight: '#F87171',
  warn: '#F59E0B', text: '#F8FAFC', muted: '#94A3B8',
  mono: "'JetBrains Mono','Fira Code',monospace", sans: "'Inter',system-ui,sans-serif",
};

function css() {
  return `*{margin:0;padding:0;box-sizing:border-box}body{width:${W}px;height:${H}px;background:${B.bg};font-family:${B.sans};color:${B.text};overflow:hidden;display:flex;align-items:center;justify-content:center}.wm{position:absolute;bottom:32px;right:40px;opacity:.5}`;
}

function titleSlide(rule, wcag, headline, stat) {
  return `<style>${css()}</style>
<div style="display:flex;flex-direction:column;align-items:center;gap:20px">
  <div style="width:80px;height:80px">${ICON_SVG}</div>
  <div style="font-family:${B.mono};font-size:15px;color:${B.muted}">${rule} · ${wcag}</div>
  <div style="font-size:44px;font-weight:700;letter-spacing:-1px;text-align:center;max-width:900px">${headline}</div>
  <div style="font-size:18px;color:${B.muted}">Found in <span style="color:${B.primaryLight};font-weight:600">cal.com</span> — ${stat}</div>
</div>`;
}

function ctaSlide() {
  return `<style>${css()}</style>
<div style="display:flex;flex-direction:column;align-items:center;gap:24px">
  <div style="width:64px;height:64px">${ICON_SVG}</div>
  <div style="font-size:36px;font-weight:700;text-align:center;max-width:700px;line-height:1.3">33 rules. Zero false positives.<br/><span style="background:linear-gradient(135deg,${B.primary},${B.primaryLight});-webkit-background-clip:text;-webkit-text-fill-color:transparent">Runs inside your AI agent loop.</span></div>
  <div style="font-size:16px;color:${B.muted}">Plugin · CLI · MCP Server · GitHub Action</div>
  <div style="background:${B.primary};padding:14px 28px;border-radius:12px;font-weight:600;font-size:16px">npx @deslint/mcp install</div>
  <div style="font-size:13px;color:#475569;font-family:${B.mono}">deslint.com</div>
</div>`;
}

function beforeAfterSlide(label, isAfter, uiHtml) {
  const color = isAfter ? B.greenLight : B.redLight;
  const icon = isAfter ? '✓' : '✗';
  return `<style>${css()}.card{background:#15122A;border:1px solid #2D2A45;border-radius:16px;overflow:hidden;width:85%}.label{padding:16px 28px;font-size:14px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${color};border-bottom:1px solid #2D2A45}.ui-frame{background:#fff;margin:24px;border-radius:12px;overflow:hidden;min-height:500px}</style>
<div class="card">
  <div class="label">${icon} ${label}</div>
  <div class="ui-frame">${uiHtml}</div>
</div>
<div class="wm">${LOCKUP_SVG}</div>`;
}

const violations = [
  {
    name: 'color-contrast',
    rule: 'deslint/a11y-color-contrast',
    wcag: 'WCAG 1.4.3',
    headline: 'Black Text on Black Background',
    stat: 'Contrast ratio 1:1 — completely invisible',
    beforeLabel: 'Before — Ratio 1:1 (invisible)',
    afterLabel: 'After — Ratio 21:1 (WCAG AAA)',
    beforeUI: `<div style="font-family:system-ui;padding:40px">
      <div style="background:#1a1a1a;border-radius:12px;padding:32px;margin-bottom:20px">
        <h2 style="color:#fff;font-size:22px;margin-bottom:16px">Booking Confirmed</h2>
        <hr style="border:none;height:2px;background:#000;margin:20px 0">
        <div style="display:flex;gap:40px;margin-top:16px">
          <div><span style="font-weight:600;color:#000">What</span></div>
          <div><span style="color:#000">30 min Meeting with Jay</span></div>
        </div>
        <div style="display:flex;gap:40px;margin-top:12px">
          <div><span style="font-weight:600;color:#000">When</span></div>
          <div><span style="color:#000">April 16, 2026 at 2:00 PM</span></div>
        </div>
      </div>
      <div style="background:#fee2e2;border:2px solid #ef4444;border-radius:8px;padding:12px 16px;font-size:13px;color:#991b1b">
        <strong>Deslint:</strong> Contrast ratio 1:1 between text-black and bg-black. Content is completely invisible to all users.
      </div>
    </div>`,
    afterUI: `<div style="font-family:system-ui;padding:40px">
      <div style="background:#1a1a1a;border-radius:12px;padding:32px;margin-bottom:20px">
        <h2 style="color:#fff;font-size:22px;margin-bottom:16px">Booking Confirmed</h2>
        <hr style="border:none;height:2px;background:#374151;margin:20px 0">
        <div style="display:flex;gap:40px;margin-top:16px">
          <div><span style="font-weight:600;color:#e5e7eb">What</span></div>
          <div><span style="color:#d1d5db">30 min Meeting with Jay</span></div>
        </div>
        <div style="display:flex;gap:40px;margin-top:12px">
          <div><span style="font-weight:600;color:#e5e7eb">When</span></div>
          <div><span style="color:#d1d5db">April 16, 2026 at 2:00 PM</span></div>
        </div>
      </div>
      <div style="background:#d1fae5;border:2px solid #10b981;border-radius:8px;padding:12px 16px;font-size:13px;color:#065f46">
        <strong>Deslint:</strong> Contrast ratio 15.4:1 — WCAG AAA compliant. All content clearly visible.
      </div>
    </div>`,
  },
  {
    name: 'touch-target',
    rule: 'deslint/touch-target-size',
    wcag: 'WCAG 2.5.8',
    headline: 'Touch Targets Too Small to Tap',
    stat: 'Checkboxes at 16×16px — below 24px minimum',
    beforeLabel: 'Before — 16×16px targets',
    afterLabel: 'After — 44×44px targets',
    beforeUI: `<div style="font-family:system-ui;padding:40px;background:#f9fafb">
      <h3 style="font-size:18px;font-weight:600;margin-bottom:20px;color:#111">Select Event Types</h3>
      ${[['30 Min Meeting','30 min'],['Quick Chat','15 min'],['Consultation','60 min']].map(([t,d])=>`
      <div style="display:flex;align-items:center;gap:12px;padding:12px 16px;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:8px;background:#fff;cursor:pointer">
        <input type="checkbox" style="width:16px;height:16px;accent-color:#1a1a1a" checked>
        <div><div style="font-weight:600;font-size:14px;color:#111">${t}</div><div style="font-size:12px;color:#6b7280">${d}</div></div>
      </div>`).join('')}
      <div style="background:#fee2e2;border:2px solid #ef4444;border-radius:8px;padding:12px 16px;font-size:13px;color:#991b1b;margin-top:16px">
        <strong>Deslint:</strong> Touch targets 16×16px — below WCAG 2.5.8 minimum of 24×24px. Difficult to tap on mobile.
      </div>
    </div>`,
    afterUI: `<div style="font-family:system-ui;padding:40px;background:#f9fafb">
      <h3 style="font-size:18px;font-weight:600;margin-bottom:20px;color:#111">Select Event Types</h3>
      ${[['30 Min Meeting','30 min'],['Quick Chat','15 min'],['Consultation','60 min']].map(([t,d])=>`
      <div style="display:flex;align-items:center;gap:16px;padding:14px 18px;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:8px;background:#fff;cursor:pointer">
        <input type="checkbox" style="width:24px;height:24px;accent-color:#1a1a1a" checked>
        <div><div style="font-weight:600;font-size:14px;color:#111">${t}</div><div style="font-size:12px;color:#6b7280">${d}</div></div>
      </div>`).join('')}
      <div style="background:#d1fae5;border:2px solid #10b981;border-radius:8px;padding:12px 16px;font-size:13px;color:#065f46;margin-top:16px">
        <strong>Deslint:</strong> Touch targets 24×24px — meets WCAG 2.5.8 Target Size Minimum. Easy to tap on all devices.
      </div>
    </div>`,
  },
  {
    name: 'viewport-zoom',
    rule: 'deslint/viewport-meta',
    wcag: 'WCAG 1.4.4',
    headline: 'Pinch-to-Zoom Blocked for All Users',
    stat: 'user-scalable=0 prevents zoom on mobile',
    beforeLabel: 'Before — Zoom disabled',
    afterLabel: 'After — Zoom enabled',
    beforeUI: `<div style="font-family:system-ui;padding:40px;display:flex;gap:32px;align-items:flex-start">
      <div style="width:320px;border:3px solid #374151;border-radius:24px;padding:16px;background:#fff">
        <div style="background:#f3f4f6;border-radius:8px;padding:8px 12px;font-size:11px;color:#6b7280;margin-bottom:12px;text-align:center">cal.com — Mobile Safari</div>
        <div style="padding:8px">
          <p style="font-size:11px;color:#111;line-height:1.5">Your booking is confirmed for April 16th. Please check your email for details about the meeting location and agenda items.</p>
          <p style="font-size:11px;color:#111;line-height:1.5;margin-top:8px">If you need to reschedule, please contact support within 24 hours.</p>
        </div>
        <div style="text-align:center;margin-top:12px;font-size:10px;color:#9ca3af">🔒 Pinch-to-zoom: BLOCKED</div>
      </div>
      <div style="flex:1;padding-top:20px">
        <div style="background:#fee2e2;border:2px solid #ef4444;border-radius:8px;padding:16px;font-size:13px;color:#991b1b">
          <strong>Deslint:</strong> <code style="background:#fecaca;padding:2px 6px;border-radius:4px">user-scalable=0</code> and <code style="background:#fecaca;padding:2px 6px;border-radius:4px">maximum-scale=1.0</code> prevent users with low vision from zooming. WCAG 1.4.4 failure.
        </div>
        <div style="margin-top:16px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;font-family:monospace;font-size:12px;color:#dc2626">
          &lt;meta name="viewport"<br>
          &nbsp;&nbsp;content="...<br>
          &nbsp;&nbsp;<span style="background:#fecaca;padding:1px 4px">maximum-scale=1.0,</span><br>
          &nbsp;&nbsp;<span style="background:#fecaca;padding:1px 4px">user-scalable=0</span>"&gt;
        </div>
      </div>
    </div>`,
    afterUI: `<div style="font-family:system-ui;padding:40px;display:flex;gap:32px;align-items:flex-start">
      <div style="width:320px;border:3px solid #374151;border-radius:24px;padding:16px;background:#fff">
        <div style="background:#f3f4f6;border-radius:8px;padding:8px 12px;font-size:11px;color:#6b7280;margin-bottom:12px;text-align:center">cal.com — Mobile Safari</div>
        <div style="padding:8px;transform:scale(1.4);transform-origin:top left;width:70%">
          <p style="font-size:11px;color:#111;line-height:1.5">Your booking is confirmed for April 16th. Please check your email for details about the meeting</p>
        </div>
        <div style="text-align:center;margin-top:60px;font-size:10px;color:#10b981">🔍 Pinch-to-zoom: ENABLED</div>
      </div>
      <div style="flex:1;padding-top:20px">
        <div style="background:#d1fae5;border:2px solid #10b981;border-radius:8px;padding:16px;font-size:13px;color:#065f46">
          <strong>Deslint:</strong> Zoom restrictions removed. Users with low vision can pinch-to-zoom freely. WCAG 1.4.4 compliant.
        </div>
        <div style="margin-top:16px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;font-family:monospace;font-size:12px;color:#059669">
          &lt;meta name="viewport"<br>
          &nbsp;&nbsp;content="width=device-width,<br>
          &nbsp;&nbsp;<span style="background:#d1fae5;padding:1px 4px">initial-scale=1.0,</span><br>
          &nbsp;&nbsp;<span style="background:#d1fae5;padding:1px 4px">viewport-fit=cover</span>"&gt;
        </div>
      </div>
    </div>`,
  },
  {
    name: 'link-text',
    rule: 'deslint/link-text',
    wcag: 'WCAG 2.4.4',
    headline: 'Generic "Click Here" Links — 278 Found',
    stat: 'Screen readers announce "here" with no context',
    beforeLabel: 'Before — Generic link text',
    afterLabel: 'After — Descriptive link text',
    beforeUI: `<div style="font-family:system-ui;padding:40px;background:#fff">
      <div style="max-width:600px">
        <div style="border:1px solid #e5e7eb;border-radius:12px;padding:24px;margin-bottom:16px">
          <h3 style="font-size:16px;font-weight:600;color:#111;margin-bottom:12px">App Configuration</h3>
          <p style="font-size:14px;color:#374151;line-height:1.6">This App seems to be disabled. If you are an admin, you can enable this app from <a href="#" style="color:#3b82f6;text-decoration:underline">here</a>.</p>
        </div>
        <div style="border:1px solid #e5e7eb;border-radius:12px;padding:24px;margin-bottom:16px">
          <h3 style="font-size:16px;font-weight:600;color:#111;margin-bottom:12px">Need Help?</h3>
          <p style="font-size:14px;color:#374151;line-height:1.6">For more information, click <a href="#" style="color:#3b82f6;text-decoration:underline">here</a>. To manage your account, go <a href="#" style="color:#3b82f6;text-decoration:underline">here</a>.</p>
        </div>
        <div style="background:#1a1a1a;border-radius:8px;padding:16px;margin-bottom:16px">
          <div style="font-size:11px;color:#9ca3af;margin-bottom:8px">SCREEN READER OUTPUT</div>
          <div style="font-family:monospace;font-size:13px;color:#fbbf24">Link: "here"<br>Link: "here"<br>Link: "here"</div>
        </div>
        <div style="background:#fee2e2;border:2px solid #ef4444;border-radius:8px;padding:12px 16px;font-size:13px;color:#991b1b">
          <strong>Deslint:</strong> "here" gives no context about link destination. Screen reader users hear only "link: here" repeatedly.
        </div>
      </div>
    </div>`,
    afterUI: `<div style="font-family:system-ui;padding:40px;background:#fff">
      <div style="max-width:600px">
        <div style="border:1px solid #e5e7eb;border-radius:12px;padding:24px;margin-bottom:16px">
          <h3 style="font-size:16px;font-weight:600;color:#111;margin-bottom:12px">App Configuration</h3>
          <p style="font-size:14px;color:#374151;line-height:1.6">This App seems to be disabled. If you are an admin, you can enable this app from <a href="#" style="color:#3b82f6;text-decoration:underline">app settings</a>.</p>
        </div>
        <div style="border:1px solid #e5e7eb;border-radius:12px;padding:24px;margin-bottom:16px">
          <h3 style="font-size:16px;font-weight:600;color:#111;margin-bottom:12px">Need Help?</h3>
          <p style="font-size:14px;color:#374151;line-height:1.6">Read the <a href="#" style="color:#3b82f6;text-decoration:underline">integration documentation</a>. To manage your account, visit <a href="#" style="color:#3b82f6;text-decoration:underline">account settings</a>.</p>
        </div>
        <div style="background:#1a1a1a;border-radius:8px;padding:16px;margin-bottom:16px">
          <div style="font-size:11px;color:#9ca3af;margin-bottom:8px">SCREEN READER OUTPUT</div>
          <div style="font-family:monospace;font-size:13px;color:#34d399">Link: "app settings"<br>Link: "integration documentation"<br>Link: "account settings"</div>
        </div>
        <div style="background:#d1fae5;border:2px solid #10b981;border-radius:8px;padding:12px 16px;font-size:13px;color:#065f46">
          <strong>Deslint:</strong> Descriptive link text — each link clearly communicates its destination. WCAG 2.4.4 compliant.
        </div>
      </div>
    </div>`,
  },
  {
    name: 'arbitrary-colors',
    rule: 'deslint/no-arbitrary-colors',
    wcag: 'Design System',
    headline: 'Hardcoded Hex Colors — Design Drift',
    stat: '13 arbitrary color values outside the token palette',
    beforeLabel: 'Before — Random hex values',
    afterLabel: 'After — Design tokens',
    beforeUI: `<div style="font-family:system-ui;padding:40px;background:#f9fafb">
      <h3 style="font-size:18px;font-weight:600;color:#111;margin-bottom:20px">Payment Methods</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
        <div style="border:1px solid #e5e7eb;border-radius:12px;padding:20px;background:#fff">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
            <div style="width:40px;height:40px;border-radius:8px;background:#ffc439;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;color:#003087">PP</div>
            <div><div style="font-weight:600;font-size:14px;color:#111">PayPal</div><div style="font-size:12px;color:#6b7280">Pay with PayPal</div></div>
          </div>
          <code style="font-size:11px;background:#fef3c7;padding:2px 6px;border-radius:4px;color:#92400e">bg-[#ffc439]</code>
        </div>
        <div style="border:1px solid #e5e7eb;border-radius:12px;padding:20px;background:#fff">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
            <div style="width:40px;height:40px;border-radius:8px;background:#5B93F9;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;color:#fff">+</div>
            <div><div style="font-weight:600;font-size:14px;color:#111">Add to Home</div><div style="font-size:12px;color:#5B93F9">Install app</div></div>
          </div>
          <code style="font-size:11px;background:#fef3c7;padding:2px 6px;border-radius:4px;color:#92400e">text-[#5B93F9]</code>
        </div>
      </div>
      <div style="background:#fee2e2;border:2px solid #ef4444;border-radius:8px;padding:12px 16px;font-size:13px;color:#991b1b">
        <strong>Deslint:</strong> Hardcoded hex values bypass the design system. Colors diverge across components over time.
      </div>
    </div>`,
    afterUI: `<div style="font-family:system-ui;padding:40px;background:#f9fafb">
      <h3 style="font-size:18px;font-weight:600;color:#111;margin-bottom:20px">Payment Methods</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
        <div style="border:1px solid #e5e7eb;border-radius:12px;padding:20px;background:#fff">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
            <div style="width:40px;height:40px;border-radius:8px;background:#fbbf24;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;color:#78350f">PP</div>
            <div><div style="font-weight:600;font-size:14px;color:#111">PayPal</div><div style="font-size:12px;color:#6b7280">Pay with PayPal</div></div>
          </div>
          <code style="font-size:11px;background:#d1fae5;padding:2px 6px;border-radius:4px;color:#065f46">bg-amber-400</code>
        </div>
        <div style="border:1px solid #e5e7eb;border-radius:12px;padding:20px;background:#fff">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
            <div style="width:40px;height:40px;border-radius:8px;background:#60a5fa;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;color:#fff">+</div>
            <div><div style="font-weight:600;font-size:14px;color:#111">Add to Home</div><div style="font-size:12px;color:#60a5fa">Install app</div></div>
          </div>
          <code style="font-size:11px;background:#d1fae5;padding:2px 6px;border-radius:4px;color:#065f46">text-blue-400</code>
        </div>
      </div>
      <div style="background:#d1fae5;border:2px solid #10b981;border-radius:8px;padding:12px 16px;font-size:13px;color:#065f46">
        <strong>Deslint:</strong> Design tokens from Tailwind palette. Colors stay consistent as components evolve.
      </div>
    </div>`,
  },
  {
    name: 'image-alt',
    rule: 'deslint/image-alt-text',
    wcag: 'WCAG 1.1.1',
    headline: 'Missing Alt Text on Login Icons',
    stat: '273 images without meaningful alt text',
    beforeLabel: 'Before — Empty alt attributes',
    afterLabel: 'After — Descriptive alt or role="presentation"',
    beforeUI: `<div style="font-family:system-ui;padding:40px;background:#fff;display:flex;justify-content:center">
      <div style="width:400px;border:1px solid #e5e7eb;border-radius:16px;padding:32px">
        <h2 style="font-size:22px;font-weight:700;text-align:center;margin-bottom:24px;color:#111">Sign in to Cal.com</h2>
        <button style="width:100%;display:flex;align-items:center;justify-content:center;gap:12px;padding:12px;border:1px solid #e5e7eb;border-radius:8px;background:#fff;font-size:14px;color:#374151;cursor:pointer;margin-bottom:10px">
          <div style="width:20px;height:20px;background:#4285f4;border-radius:4px"></div>
          Sign in with Google
        </button>
        <button style="width:100%;display:flex;align-items:center;justify-content:center;gap:12px;padding:12px;border:1px solid #e5e7eb;border-radius:8px;background:#fff;font-size:14px;color:#374151;cursor:pointer;margin-bottom:16px">
          <div style="width:20px;height:20px;background:#00a4ef;border-radius:4px"></div>
          Sign in with Microsoft
        </button>
        <div style="background:#1a1a1a;border-radius:8px;padding:14px;margin-bottom:16px">
          <div style="font-size:11px;color:#9ca3af;margin-bottom:6px">SCREEN READER OUTPUT</div>
          <div style="font-family:monospace;font-size:12px;color:#fbbf24">img: "" (empty)<br>Button: "Sign in with Google"<br>img: "" (empty)<br>Button: "Sign in with Microsoft"</div>
        </div>
        <div style="background:#fee2e2;border:2px solid #ef4444;border-radius:8px;padding:10px 14px;font-size:12px;color:#991b1b">
          <strong>Deslint:</strong> Empty alt="" — screen readers announce a meaningless blank image before each button.
        </div>
      </div>
    </div>`,
    afterUI: `<div style="font-family:system-ui;padding:40px;background:#fff;display:flex;justify-content:center">
      <div style="width:400px;border:1px solid #e5e7eb;border-radius:16px;padding:32px">
        <h2 style="font-size:22px;font-weight:700;text-align:center;margin-bottom:24px;color:#111">Sign in to Cal.com</h2>
        <button style="width:100%;display:flex;align-items:center;justify-content:center;gap:12px;padding:12px;border:1px solid #e5e7eb;border-radius:8px;background:#fff;font-size:14px;color:#374151;cursor:pointer;margin-bottom:10px">
          <div style="width:20px;height:20px;background:#4285f4;border-radius:4px" role="presentation"></div>
          Sign in with Google
        </button>
        <button style="width:100%;display:flex;align-items:center;justify-content:center;gap:12px;padding:12px;border:1px solid #e5e7eb;border-radius:8px;background:#fff;font-size:14px;color:#374151;cursor:pointer;margin-bottom:16px">
          <div style="width:20px;height:20px;background:#00a4ef;border-radius:4px" role="presentation"></div>
          Sign in with Microsoft
        </button>
        <div style="background:#1a1a1a;border-radius:8px;padding:14px;margin-bottom:16px">
          <div style="font-size:11px;color:#9ca3af;margin-bottom:6px">SCREEN READER OUTPUT</div>
          <div style="font-family:monospace;font-size:12px;color:#34d399">Button: "Sign in with Google"<br>Button: "Sign in with Microsoft"</div>
        </div>
        <div style="background:#d1fae5;border:2px solid #10b981;border-radius:8px;padding:10px 14px;font-size:12px;color:#065f46">
          <strong>Deslint:</strong> Decorative icons marked role="presentation" — screen readers skip them cleanly. WCAG 1.1.1 compliant.
        </div>
      </div>
    </div>`,
  },
];

async function renderVideo(v, browser) {
  const name = v.name;
  const output = resolve(OUT_DIR, `violation-${name}.mp4`);
  console.log(`\n=== ${name} ===`);

  if (existsSync(FRAMES_DIR)) rmSync(FRAMES_DIR, { recursive: true });
  mkdirSync(FRAMES_DIR, { recursive: true });

  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();

  const slides = [
    { duration: 2, html: titleSlide(v.rule, v.wcag, v.headline, v.stat) },
    { duration: 3, html: beforeAfterSlide(v.beforeLabel, false, v.beforeUI) },
    { duration: 3, html: beforeAfterSlide(v.afterLabel, true, v.afterUI) },
    { duration: 2, html: ctaSlide() },
  ];

  let fi = 0;
  for (const s of slides) {
    const n = Math.round(s.duration * FPS);
    await page.setContent(`<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${s.html}</body></html>`, { waitUntil: 'load' });
    const buf = await page.screenshot({ type: 'png' });
    for (let f = 0; f < n; f++) {
      writeFileSync(resolve(FRAMES_DIR, `f_${String(fi++).padStart(6,'0')}.png`), buf);
    }
  }
  await ctx.close();
  console.log(`  ${fi} frames captured`);

  execSync([FFMPEG, '-y', `-framerate ${FPS}`, `-i ${FRAMES_DIR}/f_%06d.png`,
    '-c:v libx264', '-pix_fmt yuv420p', '-preset medium', '-crf 18',
    '-movflags +faststart', output].join(' '), { stdio: 'pipe' });

  rmSync(FRAMES_DIR, { recursive: true });
  console.log(`  Saved: ${output}`);
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  });

  const target = process.argv[2];
  const list = target ? violations.filter(v => v.name === target) : violations;

  for (const v of list) {
    await renderVideo(v, browser);
  }
  await browser.close();
  console.log('\nDone.');
}

main().catch(e => { console.error(e); process.exit(1); });
