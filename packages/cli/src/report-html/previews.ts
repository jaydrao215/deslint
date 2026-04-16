import { esc } from './types.js';
import type { VisualPattern } from './types.js';
import { twClassToHex } from './colors.js';

export function renderContrastPreview(patterns: VisualPattern[]): string {
  if (patterns.length === 0) return '';
  const items = patterns.slice(0, 6);
  return `<div class="section">
    <div class="section-head">Contrast issues <span class="sh-count">${patterns.length} unique pair${patterns.length !== 1 ? 's' : ''}, ${patterns.reduce((s, p) => s + p.count, 0)} total</span></div>
    <div class="section-desc">Each pair shows the actual text-on-background rendering. WCAG AA requires 4.5:1 for normal text, 3:1 for large text.</div>
    <div class="vp-grid">${items.map(p => {
      const textHex = twClassToHex(p.data.textClass) ?? '#ffffff';
      const bgHex = twClassToHex(p.data.bgClass) ?? '#000000';
      const sugTextHex = p.data.suggestedText ? (twClassToHex(p.data.suggestedText) ?? textHex) : null;
      const sugBgHex = p.data.suggestedBg ? (twClassToHex(p.data.suggestedBg) ?? bgHex) : null;
      return `<div class="vp-card">
        <div class="vp-label"><span class="pill pill-err">FAIL</span> ${esc(p.data.ratio)}:1 — needs ${esc(p.data.required)}:1 <span class="vp-count">&times;${p.count}</span></div>
        <div class="vp-contrast-row">
          <div class="vp-contrast-box" style="background:${bgHex};color:${textHex}">
            <div class="vp-contrast-sample">Sample Text</div>
            <div class="vp-contrast-meta">${esc(p.data.textClass)} on ${esc(p.data.bgClass)}</div>
          </div>
          ${sugTextHex || sugBgHex ? `<div class="vp-arrow">&rarr;</div>
          <div class="vp-contrast-box" style="background:${sugBgHex ?? bgHex};color:${sugTextHex ?? textHex};border-color:var(--pass)">
            <div class="vp-contrast-sample">Sample Text</div>
            <div class="vp-contrast-meta">${esc(p.data.suggestedText ?? p.data.textClass)} on ${esc(p.data.suggestedBg ?? p.data.bgClass)}${p.data.suggestedRatio ? ` (${p.data.suggestedRatio}:1)` : ''}</div>
          </div>` : ''}
        </div>
        <div class="vp-files">${p.files.size} file${p.files.size !== 1 ? 's' : ''}</div>
      </div>`;
    }).join('')}</div>
  </div>`;
}

export function renderColorPreview(patterns: VisualPattern[]): string {
  if (patterns.length === 0) return '';
  const items = patterns.slice(0, 8);
  return `<div class="section">
    <div class="section-head">Arbitrary colors <span class="sh-count">${patterns.length} unique, ${patterns.reduce((s, p) => s + p.count, 0)} total</span></div>
    <div class="vp-grid vp-grid-sm">${items.map(p => {
      const hexM = p.data.className.match(/\[([^\]]+)\]/);
      const hex = hexM?.[1] ?? '#888';
      const sugHex = p.data.suggested ? (twClassToHex(p.data.suggested) ?? null) : null;
      return `<div class="vp-card vp-card-sm">
        <div class="vp-color-row">
          <div class="vp-color-swatch" style="background:${/^#[0-9a-fA-F]{3,8}$/.test(hex) ? hex : 'var(--bg4)'}"></div>
          ${sugHex ? `<div class="vp-arrow-sm">&rarr;</div><div class="vp-color-swatch" style="background:${sugHex};border-color:var(--pass)"></div>` : ''}
        </div>
        <div class="vp-color-label mono">${esc(p.data.className)}</div>
        ${p.data.suggested ? `<div class="vp-color-sug">&rarr; ${esc(p.data.suggested)}</div>` : ''}
        <div class="vp-count-sm">&times;${p.count} in ${p.files.size} file${p.files.size !== 1 ? 's' : ''}</div>
      </div>`;
    }).join('')}</div>
  </div>`;
}

export function renderSpacingPreview(patterns: VisualPattern[]): string {
  if (patterns.length === 0) return '';
  const items = patterns.slice(0, 8);
  return `<div class="section">
    <div class="section-head">Spacing issues <span class="sh-count">${patterns.length} unique pattern${patterns.length !== 1 ? 's' : ''}, ${patterns.reduce((s, p) => s + p.count, 0)} total</span></div>
    <div class="section-desc">Each bar shows the arbitrary value vs. the nearest design token. Tokenized spacing keeps your layout on a consistent rhythm.</div>
    <div class="vp-spacing-list">${items.map(p => {
      const valM = p.data.className.match(/\[([\d.]+)(px|rem|em)?\]/);
      const arbPx = valM ? (valM[2] === 'rem' ? parseFloat(valM[1]) * 16 : parseFloat(valM[1])) : 0;
      const sugM = p.data.suggested?.match(/^[a-z]+-(\d+(?:\.\d+)?)$/);
      // Tailwind spacing scale: 1 unit = 4px (e.g. `p-3` → 12px).
      const sugPx = sugM ? parseFloat(sugM[1]) * 4 : arbPx;
      const maxPx = Math.max(arbPx, sugPx, 1);
      const scale = 200 / maxPx;
      return `<div class="vp-spacing-row">
        <div class="vp-spacing-bars">
          <div class="vp-spacing-pair">
            <div class="vp-spacing-bar vp-bar-before" style="width:${Math.max(arbPx * scale, 2)}px">${Math.round(arbPx)}px</div>
            <span class="mono vp-spacing-cls">${esc(p.data.className)}</span>
          </div>
          ${p.data.suggested ? `<div class="vp-spacing-pair">
            <div class="vp-spacing-bar vp-bar-after" style="width:${Math.max(sugPx * scale, 2)}px">${Math.round(sugPx)}px</div>
            <span class="mono vp-spacing-cls" style="color:var(--pass)">${esc(p.data.suggested)}</span>
          </div>` : ''}
        </div>
        <div class="vp-count-sm">&times;${p.count} in ${p.files.size} file${p.files.size !== 1 ? 's' : ''}</div>
      </div>`;
    }).join('')}</div>
  </div>`;
}

export function renderTypographyPreview(patterns: VisualPattern[]): string {
  if (patterns.length === 0) return '';
  const items = patterns.slice(0, 6);
  const TW_FONT_SIZE: Record<string, number> = {
    'text-xs': 12, 'text-sm': 14, 'text-base': 16, 'text-lg': 18,
    'text-xl': 20, 'text-2xl': 24, 'text-3xl': 30, 'text-4xl': 36,
    'text-5xl': 48, 'text-6xl': 60, 'text-7xl': 72, 'text-8xl': 96, 'text-9xl': 128,
  };
  return `<div class="section">
    <div class="section-head">Typography issues <span class="sh-count">${patterns.length} unique, ${patterns.reduce((s, p) => s + p.count, 0)} total</span></div>
    <div class="section-desc">Each row renders text at the arbitrary size vs. the nearest scale value. Sticking to the type scale keeps hierarchy consistent.</div>
    <div class="vp-typo-list">${items.map(p => {
      const valM = p.data.className.match(/\[([\d.]+)(px|rem|em)?\]/);
      const arbPx = valM ? (valM[2] === 'rem' ? parseFloat(valM[1]) * 16 : parseFloat(valM[1])) : 16;
      // Clamp rendering size so extreme values (e.g. text-[4px] or text-[120px])
      // don't distort the side-by-side comparison. Actual value still shown in the label.
      const clampedPx = Math.min(Math.max(arbPx, 10), 48);
      const sugPx = p.data.suggested ? (TW_FONT_SIZE[p.data.suggested] ?? 16) : null;
      const clampedSugPx = sugPx ? Math.min(Math.max(sugPx, 10), 48) : null;
      return `<div class="vp-typo-row">
        <div class="vp-typo-pair">
          <div class="vp-typo-sample" style="font-size:${clampedPx}px"><span style="color:var(--fail)">Aa</span> <span class="mono" style="font-size:12px;color:var(--text3)">${esc(p.data.className)} (${Math.round(arbPx)}px)</span></div>
          ${clampedSugPx ? `<div class="vp-typo-sample" style="font-size:${clampedSugPx}px"><span style="color:var(--pass)">Aa</span> <span class="mono" style="font-size:12px;color:var(--text3)">${esc(p.data.suggested!)} (${sugPx}px)</span></div>` : ''}
        </div>
        <div class="vp-count-sm">&times;${p.count} in ${p.files.size} file${p.files.size !== 1 ? 's' : ''}</div>
      </div>`;
    }).join('')}</div>
  </div>`;
}

export function renderDarkModePreview(patterns: VisualPattern[]): string {
  if (patterns.length === 0) return '';
  const items = patterns.slice(0, 6);
  return `<div class="section">
    <div class="section-head">Dark mode gaps <span class="sh-count">${patterns.length} unique, ${patterns.reduce((s, p) => s + p.count, 0)} total</span></div>
    <div class="section-desc">Light mode looks fine. Dark mode breaks. Each card shows what happens when the user switches themes.</div>
    <div class="vp-grid">${items.map(p => {
      const hex = twClassToHex(p.data.className) ?? '#ffffff';
      const darkHex = twClassToHex(p.data.suggested) ?? '#1f2937';
      return `<div class="vp-card">
        <div class="vp-label mono">${esc(p.data.className)} <span class="vp-count">&times;${p.count}</span></div>
        <div class="vp-dark-row">
          <div class="vp-dark-panel" style="background:#f9fafb">
            <div class="vp-dark-elem" style="background:${hex};color:${hex === '#ffffff' ? '#111' : '#fff'}">Card</div>
            <div class="vp-dark-mode-label">Light &#10003;</div>
          </div>
          <div class="vp-dark-panel" style="background:#111827">
            <div class="vp-dark-elem" style="background:${hex};color:${hex === '#ffffff' ? '#111' : '#fff'}">Card</div>
            <div class="vp-dark-mode-label" style="color:var(--fail)">Dark &#10007;</div>
          </div>
          <div class="vp-dark-panel" style="background:#111827">
            <div class="vp-dark-elem" style="background:${darkHex};color:#fff">Card</div>
            <div class="vp-dark-mode-label" style="color:var(--pass)">Fixed &#10003;</div>
          </div>
        </div>
        <div class="vp-files">${p.files.size} file${p.files.size !== 1 ? 's' : ''} &mdash; add <code class="mono" style="color:var(--pass)">${esc(p.data.suggested)}</code></div>
      </div>`;
    }).join('')}</div>
  </div>`;
}

export function renderMissingStatesPreview(patterns: VisualPattern[]): string {
  if (patterns.length === 0) return '';
  const items = patterns.slice(0, 6);
  return `<div class="section">
    <div class="section-head">Missing states <span class="sh-count">${patterns.length} unique, ${patterns.reduce((s, p) => s + p.count, 0)} total</span></div>
    <div class="section-desc">Interactive elements need visible feedback for every state. Missing states break keyboard navigation and accessibility.</div>
    <div class="vp-grid vp-grid-sm">${items.map(p => {
      const el = p.data.element ?? 'button';
      const isBtn = el === 'button' || el === 'Button';
      const stateLabel = p.data.stateType === 'disabled state' ? 'disabled' : p.data.stateType === 'error state' ? 'aria-invalid' : 'required';
      return `<div class="vp-card vp-card-sm">
        <div class="vp-label mono">&lt;${esc(el)}&gt; — ${stateLabel} <span class="vp-count">&times;${p.count}</span></div>
        <div class="vp-states-row">
          <div class="vp-state-box">
            <div class="vp-state-elem ${isBtn ? 'vp-state-btn' : 'vp-state-input'}">${isBtn ? 'Submit' : ''}</div>
            <div class="vp-state-label">Default &#10003;</div>
          </div>
          <div class="vp-state-box">
            <div class="vp-state-elem ${isBtn ? 'vp-state-btn' : 'vp-state-input'} vp-state-missing">${isBtn ? 'Submit' : ''}</div>
            <div class="vp-state-label" style="color:var(--fail)">${stateLabel} &#10007;</div>
          </div>
        </div>
        <div class="vp-files">${p.files.size} file${p.files.size !== 1 ? 's' : ''}</div>
      </div>`;
    }).join('')}</div>
  </div>`;
}

export function renderConsistencyPreview(patterns: VisualPattern[]): string {
  if (patterns.length === 0) return '';
  const items = patterns.slice(0, 6);
  const RADIUS_MAP: Record<string, string> = {
    'rounded-none':'0','rounded-sm':'2px','rounded':'4px','rounded-md':'6px',
    'rounded-lg':'8px','rounded-xl':'12px','rounded-2xl':'16px','rounded-3xl':'24px','rounded-full':'9999px',
  };
  return `<div class="section">
    <div class="section-head">Consistency issues <span class="sh-count">${patterns.length} unique, ${patterns.reduce((s, p) => s + p.count, 0)} total</span></div>
    <div class="section-desc">Same component, different values. Standardize to the dominant pattern for visual consistency.</div>
    <div class="vp-grid">${items.map(p => {
      if (p.ruleId === 'deslint/consistent-border-radius') {
        const actR = RADIUS_MAP[p.data.actual] ?? '8px';
        const domR = RADIUS_MAP[p.data.dominant] ?? '8px';
        return `<div class="vp-card">
          <div class="vp-label mono">${esc(p.data.component)} <span class="vp-count">&times;${p.count}</span></div>
          <div class="vp-consistency-row">
            <div class="vp-consistency-box">
              <div class="vp-radius-demo" style="border-radius:${actR}"></div>
              <div class="mono" style="font-size:.7rem;color:var(--fail)">${esc(p.data.actual)}</div>
            </div>
            <div class="vp-arrow">&rarr;</div>
            <div class="vp-consistency-box">
              <div class="vp-radius-demo" style="border-radius:${domR}"></div>
              <div class="mono" style="font-size:.7rem;color:var(--pass)">${esc(p.data.dominant)} (${p.data.count}/${p.data.total})</div>
            </div>
          </div>
        </div>`;
      }
      return `<div class="vp-card">
        <div class="vp-label mono">${esc(p.data.component)} — ${esc(p.data.category ?? '')} <span class="vp-count">&times;${p.count}</span></div>
        <div class="vp-consistency-row">
          <div class="vp-consistency-box">
            <div class="mono" style="font-size:.85rem;color:var(--fail)">${esc(p.data.actual)}</div>
            <div style="font-size:.65rem;color:var(--text4)">this instance</div>
          </div>
          <div class="vp-arrow">&rarr;</div>
          <div class="vp-consistency-box">
            <div class="mono" style="font-size:.85rem;color:var(--pass)">${esc(p.data.dominant)}</div>
            <div style="font-size:.65rem;color:var(--text4)">${p.data.count}/${p.data.total} instances</div>
          </div>
        </div>
      </div>`;
    }).join('')}</div>
  </div>`;
}

export function renderResponsivePreview(patterns: VisualPattern[]): string {
  if (patterns.length === 0) return '';
  const items = patterns.slice(0, 6);
  return `<div class="section">
    <div class="section-head">Responsive issues <span class="sh-count">${patterns.length} unique, ${patterns.reduce((s, p) => s + p.count, 0)} total</span></div>
    <div class="section-desc">Fixed-width elements overflow on mobile. These components have no responsive breakpoints.</div>
    <div class="vp-grid">${items.map(p => {
      const px = parseInt(p.data.px ?? '600', 10);
      return `<div class="vp-card">
        <div class="vp-label mono">${esc(p.data.className)} <span class="vp-count">&times;${p.count}</span></div>
        <div class="vp-responsive-row">
          <div class="vp-viewport vp-vp-desktop">
            <div class="vp-vp-elem" style="width:${Math.min(px / 4, 100)}%"></div>
            <div class="vp-vp-label">Desktop &#10003;</div>
          </div>
          <div class="vp-viewport vp-vp-mobile">
            <div class="vp-vp-elem vp-vp-overflow" style="width:${Math.min(px / 2, 200)}%"></div>
            <div class="vp-vp-label" style="color:var(--fail)">Mobile &#10007;</div>
          </div>
        </div>
        <div class="vp-files">${p.data.px}px fixed — ${p.files.size} file${p.files.size !== 1 ? 's' : ''}</div>
      </div>`;
    }).join('')}</div>
  </div>`;
}
