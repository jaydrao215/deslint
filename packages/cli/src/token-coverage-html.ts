/**
 * Render the Token Coverage Report as a self-contained, print-ready HTML
 * document. Users export to PDF via their browser's Print dialog — no
 * headless Chrome dependency, no server, offline.
 */

import type {
  TokenCoverageResult,
  CategoryCoverage,
  CoverageCategory,
} from './token-coverage.js';

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const CATEGORY_LABELS: Record<CoverageCategory, string> = {
  colors: 'Colors',
  spacing: 'Spacing',
  typography: 'Typography',
  borderRadius: 'Border radius',
};

/**
 * Colour each adoption bar by on-scale%:
 *  <40 red, 40–70 amber, ≥70 green.
 * This is a coverage signal, not a verdict — the copy under the number
 * explains whether the team has even imported tokens yet.
 */
function adoptionColor(onScalePct: number): string {
  if (onScalePct >= 70) return '#059669';
  if (onScalePct >= 40) return '#d97706';
  return '#dc2626';
}

function renderCategoryBar(c: CategoryCoverage): string {
  if (c.total === 0) {
    return `<div class="bar empty">No usage detected</div>`;
  }
  const t = (c.token / c.total) * 100;
  const d = (c.default / c.total) * 100;
  const a = (c.arbitrary / c.total) * 100;
  return `
    <div class="bar">
      <div class="seg token" style="width:${t.toFixed(2)}%;" title="Token: ${c.token}"></div>
      <div class="seg default" style="width:${d.toFixed(2)}%;" title="Default: ${c.default}"></div>
      <div class="seg arbitrary" style="width:${a.toFixed(2)}%;" title="Arbitrary: ${c.arbitrary}"></div>
    </div>
    <div class="bar-legend">
      <span><span class="swatch token"></span>Token ${c.token}</span>
      <span><span class="swatch default"></span>Default ${c.default}</span>
      <span><span class="swatch arbitrary"></span>Arbitrary ${c.arbitrary}</span>
    </div>
  `;
}

function renderCategoryCard(name: CoverageCategory, c: CategoryCoverage): string {
  const topTokens = c.topTokens.length
    ? `<ol>${c.topTokens
        .map((t) => `<li><code>${esc(t.name)}</code><span class="count">${t.count}</span></li>`)
        .join('')}</ol>`
    : `<p class="empty">No imported tokens used in this category yet.</p>`;

  const topDrift = c.topDrift.length
    ? `<ol>${c.topDrift
        .map((d) => `<li><code>${esc(d.value)}</code><span class="count">${d.count}</span></li>`)
        .join('')}</ol>`
    : `<p class="empty">No drift detected. 🎉</p>`;

  return `
    <section class="card">
      <header>
        <h2>${esc(CATEGORY_LABELS[name])}</h2>
        <div class="pct" style="color:${adoptionColor(c.onScalePct)};">
          ${c.onScalePct.toFixed(1)}%<span class="pct-label">on scale</span>
        </div>
      </header>

      ${renderCategoryBar(c)}

      <div class="card-grid">
        <div>
          <h3>Top tokens used</h3>
          ${topTokens}
        </div>
        <div>
          <h3>Drift leaderboard</h3>
          ${topDrift}
        </div>
      </div>
    </section>
  `;
}

function renderHeadline(result: TokenCoverageResult): string {
  if (!result.hasDesignSystem) {
    return `
      <div class="headline no-ds">
        <div class="big">${result.overallOnScalePct.toFixed(1)}%</div>
        <div class="label">on scale (default Tailwind + arbitraries excluded)</div>
        <p>
          No design system detected in <code>.deslintrc.json</code>.
          Import tokens with <code>deslint import-tokens --figma &lt;file-id&gt;</code>
          or populate <code>designSystem</code> directly to turn the coverage numbers into an adoption signal.
        </p>
      </div>
    `;
  }
  return `
    <div class="headline">
      <div class="row">
        <div>
          <div class="big" style="color:${adoptionColor(result.overallOnScalePct)};">
            ${result.overallOnScalePct.toFixed(1)}%
          </div>
          <div class="label">on scale</div>
          <div class="sublabel">token + default Tailwind ÷ all category classes</div>
        </div>
        <div>
          <div class="big">${result.overallTokenPct.toFixed(1)}%</div>
          <div class="label">design-system tokens</div>
          <div class="sublabel">numerator of on-scale %</div>
        </div>
        <div>
          <div class="big">${result.totalClassUsages.toLocaleString()}</div>
          <div class="label">class usages scanned</div>
          <div class="sublabel">across ${result.totalFiles.toLocaleString()} files</div>
        </div>
      </div>
    </div>
  `;
}

const STYLES = `
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: #f8fafc;
    color: #0f172a;
    -webkit-font-smoothing: antialiased;
  }
  main { max-width: 960px; margin: 0 auto; padding: 2.5rem 1.5rem 4rem; }
  h1 { margin: 0 0 .25rem; font-size: 1.75rem; letter-spacing: -0.02em; }
  .subtitle { color: #475569; margin: 0 0 2rem; font-size: .95rem; }

  .headline {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 1.75rem;
    margin-bottom: 2rem;
  }
  .headline .row { display: flex; gap: 2rem; flex-wrap: wrap; }
  .headline .row > div { flex: 1 1 180px; }
  .big { font-size: 2.75rem; font-weight: 700; letter-spacing: -0.03em; }
  .label { font-size: .85rem; color: #334155; text-transform: uppercase; letter-spacing: .05em; margin-top: .1rem; }
  .sublabel { font-size: .8rem; color: #64748b; margin-top: .25rem; }
  .headline.no-ds { text-align: left; }
  .headline.no-ds p { margin: 1rem 0 0; color: #475569; font-size: .9rem; line-height: 1.55; }
  .headline code { background: #f1f5f9; padding: .1rem .35rem; border-radius: 4px; font-size: .85em; }

  .card {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 1.5rem;
    margin-bottom: 1.25rem;
    page-break-inside: avoid;
  }
  .card header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 1rem;
  }
  .card h2 { margin: 0; font-size: 1.15rem; }
  .pct { font-size: 1.75rem; font-weight: 700; letter-spacing: -0.02em; }
  .pct-label { font-size: .7rem; color: #64748b; font-weight: 500; margin-left: .4rem; letter-spacing: .05em; text-transform: uppercase; }

  .bar {
    display: flex;
    height: 12px;
    background: #f1f5f9;
    border-radius: 6px;
    overflow: hidden;
    margin-bottom: .5rem;
  }
  .bar.empty {
    display: block;
    text-align: center;
    line-height: 12px;
    font-size: .8rem;
    color: #94a3b8;
    height: 32px;
    line-height: 32px;
  }
  .seg.token { background: #059669; }
  .seg.default { background: #3b82f6; }
  .seg.arbitrary { background: #dc2626; }
  .bar-legend {
    display: flex;
    gap: 1rem;
    font-size: .8rem;
    color: #475569;
    margin-bottom: 1rem;
  }
  .swatch {
    display: inline-block;
    width: 10px; height: 10px;
    border-radius: 2px;
    margin-right: .35rem;
    vertical-align: middle;
  }
  .swatch.token { background: #059669; }
  .swatch.default { background: #3b82f6; }
  .swatch.arbitrary { background: #dc2626; }

  .card-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
  }
  .card-grid h3 { font-size: .85rem; text-transform: uppercase; color: #64748b; letter-spacing: .05em; margin: 0 0 .5rem; }
  .card-grid ol {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .card-grid li {
    display: flex;
    justify-content: space-between;
    padding: .35rem 0;
    font-size: .9rem;
    border-bottom: 1px solid #f1f5f9;
  }
  .card-grid li:last-child { border-bottom: 0; }
  .card-grid code {
    background: #f8fafc;
    padding: .1rem .4rem;
    border-radius: 4px;
    font-size: .85em;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  }
  .count { color: #64748b; font-variant-numeric: tabular-nums; }
  .empty { color: #94a3b8; font-size: .9rem; font-style: italic; margin: 0; padding: .5rem 0; }

  footer {
    margin-top: 2rem;
    color: #94a3b8;
    font-size: .8rem;
    text-align: center;
  }

  @media print {
    body { background: #fff; }
    main { max-width: none; padding: 1rem; }
    .headline, .card {
      border-color: #cbd5e1;
      box-shadow: none;
    }
    .card { page-break-inside: avoid; }
  }
`;

export function renderCoverageHtml(
  result: TokenCoverageResult,
  opts: { projectName: string; version: string },
): string {
  const date = new Date(result.scannedAt).toLocaleString();
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Token Drift Score — ${esc(opts.projectName)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>${STYLES}</style>
</head>
<body>
<main>
  <h1>Token Drift Score — ${esc(opts.projectName)}</h1>
  <p class="subtitle">Generated ${esc(date)} · deslint ${esc(opts.version)}</p>

  ${renderHeadline(result)}

  ${(['colors', 'spacing', 'typography', 'borderRadius'] as const)
    .map((cat) => renderCategoryCard(cat, result.categories[cat]))
    .join('\n')}

  <footer>
    Adoption = (design-system tokens + default Tailwind scale) ÷ total category classes.
    Arbitrary <code>prefix-[value]</code> usages count as drift.
    Print this page to save as PDF.
  </footer>
</main>
</body>
</html>`;
}
