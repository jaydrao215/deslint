import { formatDebt } from '../debt.js';
import { RULE_CATEGORY_MAP, type RuleCategory } from '../lint-runner.js';
import { categoryLabel, esc } from './types.js';
import type { ReportData } from './types.js';
import { REPORT_STYLESHEET } from './styles.js';
import { extractPatterns } from './patterns.js';
import {
  buildGradeRing,
  buildTrendSvg,
  computeQualityGate,
  formatFilePath,
  formatUtcTimestamp,
  gradeColor,
  groupViolationsByFile,
  letterGrade,
} from './grading.js';
import {
  renderColorPreview,
  renderConsistencyPreview,
  renderContrastPreview,
  renderDarkModePreview,
  renderMissingStatesPreview,
  renderResponsivePreview,
  renderSpacingPreview,
  renderTypographyPreview,
} from './previews.js';

const CATEGORY_KEYS: RuleCategory[] = ['colors', 'spacing', 'typography', 'responsive', 'consistency'];

function violationCategoryKey(ruleId: string): RuleCategory | 'other' {
  return RULE_CATEGORY_MAP[ruleId] ?? 'other';
}

export function buildHtml(data: ReportData): string {
  const cats = data.score.categories;
  const fixableCount = data.ruleSummaries.filter(r => r.fixable).reduce((s, r) => s + r.count, 0);
  const allPatterns = extractPatterns(data.violations);

  const gate = computeQualityGate(data.score.overall, data.summary.errors);
  const gateClass = gate === 'PASSED' ? 'qg-passed' : gate === 'AT_RISK' ? 'qg-at-risk' : 'qg-failed';
  const gateLabelText = gate === 'PASSED' ? 'PASSED' : gate === 'AT_RISK' ? 'AT RISK' : 'FAILED';
  const gateIcon = gate === 'PASSED' ? '&#10003;' : gate === 'AT_RISK' ? '!' : '&#10007;';
  const gateSummary = gate === 'PASSED'
    ? 'All rules satisfied at the configured severity. Safe to ship.'
    : gate === 'AT_RISK'
      ? 'Warnings present but no blockers. Review before shipping.'
      : data.summary.errors > 0
        ? `${data.summary.errors} blocker${data.summary.errors === 1 ? '' : 's'} must be fixed before shipping.`
        : `Score ${data.score.overall}/100 is below the 70 threshold required to ship.`;

  const overallColor = gradeColor(data.score.overall);
  const overallLetter = letterGrade(data.score.overall);
  const timestamp = formatUtcTimestamp(data.timestamp);
  const fileCoverage = data.summary.totalFiles > 0
    ? Math.round(data.summary.filesWithViolations / data.summary.totalFiles * 100)
    : 0;

  const heroSummary = [
    `Scanned <strong>${data.summary.totalFiles}</strong> file${data.summary.totalFiles === 1 ? '' : 's'}`,
    `<strong>${data.summary.totalViolations}</strong> violation${data.summary.totalViolations === 1 ? '' : 's'} across <strong>${data.ruleSummaries.length}</strong> rule${data.ruleSummaries.length === 1 ? '' : 's'}`,
    fixableCount > 0 ? `<strong>${fixableCount}</strong> auto-fixable` : null,
    data.debt.totalMinutes > 0 ? `~${esc(formatDebt(data.debt.totalMinutes))} to fix` : null,
  ].filter(Boolean).join(' &middot; ');

  const violationsShown = data.violations.slice(0, 80);
  const violationsByFile = groupViolationsByFile(violationsShown);
  const ruleFilterKeys = [...new Set(data.violations.map(v => v.ruleId.replace('deslint/', '')))];

  // Only the remaining (paginated) violations need to be serialized into the
  // page — the first 80 are already rendered server-side. Rule summaries and
  // hotspots aren't re-rendered by the client so they're omitted from PENDING.
  const pendingJson = JSON.stringify(
    data.violations.slice(80).map(v => ({ ...v, category: violationCategoryKey(v.ruleId) })),
  ).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="generator" content="Deslint v${esc(data.version)}">
<meta name="robots" content="noindex, nofollow">
<title>Deslint — ${esc(data.projectName)} (${data.score.overall}/100 · ${gateLabelText})</title>
<style>${REPORT_STYLESHEET}</style>
</head>
<body>

<header class="topbar" role="banner">
  <a href="#overview" class="brand" title="Deslint — ${esc(data.projectName)}">
    <svg class="brand-icon" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="32" height="32" rx="6.66" fill="#534AB7"/>
      <rect x="4.48" y="4.32" width="23.04" height="23.68" rx="3.01" fill="white" opacity="0.07"/>
      <rect x="7.33" y="8.64" width="10.66" height="1.66" rx="0.83" fill="white" opacity="0.50"/>
      <rect x="7.33" y="12.64" width="14.66" height="1.66" rx="0.83" fill="white" opacity="0.85"/>
      <rect x="7.33" y="16.64" width="8.0" height="1.66" rx="0.83" fill="#1D9E75"/>
      <circle cx="24.0" cy="17.47" r="2.34" fill="#1D9E75"/>
      <path d="M22.95 17.47 L23.88 18.64 L25.22 16.18" fill="none" stroke="white" stroke-width="0.61" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <span class="brand-word"><span>des</span><span class="brand-word-accent">lint</span></span>
    <span class="brand-sep">/</span>
    <span class="project-name">${esc(data.projectName)}</span>
  </a>
  <nav class="topnav" aria-label="Report sections">
    <a href="#overview">Overview</a>
    <a href="#categories">Categories</a>
    <a href="#rules">Rules</a>
    ${data.fileHotspots.length > 0 ? '<a href="#files">Files</a>' : ''}
    ${data.debt.totalMinutes > 0 ? '<a href="#debt">Debt</a>' : ''}
    ${data.history.length > 1 ? '<a href="#trend">Trend</a>' : ''}
    ${allPatterns.length > 0 ? '<a href="#previews">Previews</a>' : ''}
    <a href="#violations">Violations</a>
  </nav>
  <div class="topbar-meta">
    <span>v${esc(data.version)}</span>
    <span class="sep">·</span>
    <span>${esc(timestamp)}</span>
  </div>
</header>

<main>

<div class="qg ${gateClass}" role="status">
  <div class="qg-icon" aria-hidden="true">${gateIcon}</div>
  <div class="qg-text">
    <div class="qg-label">Quality Gate<strong>${gateLabelText}</strong></div>
    <div class="qg-summary">${esc(gateSummary)}</div>
  </div>
</div>

<section id="overview" class="hero">
  <div class="grade-ring">${buildGradeRing(data.score.overall, overallColor, overallLetter)}</div>
  <div class="hero-body">
    <h1>Design Health Score</h1>
    <p class="hero-summary">${heroSummary}.</p>
    <div class="hero-actions">
      ${fixableCount > 0 ? `<a class="btn btn-primary" href="#violations">Fix ${fixableCount} auto-fixable</a>` : ''}
      <a class="btn btn-ghost" href="#rules">Rules breakdown</a>
      ${data.debt.totalMinutes > 0 ? '<a class="btn btn-ghost" href="#debt">Design debt</a>' : ''}
    </div>
  </div>
</section>

<section id="categories" class="section">
  <div class="section-head">Categories <span class="sh-count">${data.summary.totalViolations} violation${data.summary.totalViolations === 1 ? '' : 's'} across 5 dimensions</span></div>
  <div class="section-desc">Click a category to jump to the matching violations below.</div>
  <div class="cat-grid">
    ${CATEGORY_KEYS.map(k => {
      const c = cats[k];
      const cc = gradeColor(c.score);
      const lg = letterGrade(c.score);
      const interactive = c.violations > 0;
      const linkAttrs = interactive
        ? `href="#violations" data-jump-cat="${k}"`
        : `href="#violations" aria-disabled="true" tabindex="-1" style="pointer-events:none;opacity:.7"`;
      return `<a class="cat-card" ${linkAttrs}>
        <div class="cat-card-head">
          <span class="cat-card-name">${esc(categoryLabel(k))}</span>
          <span class="cat-card-grade" style="color:${cc};background:${cc}1a">${lg}</span>
        </div>
        <div class="cat-card-score" style="color:${cc}">${c.score}</div>
        <div class="cat-card-sub">${c.violations} violation${c.violations !== 1 ? 's' : ''}</div>
        <div class="cat-card-bar"><div class="cat-card-bar-fill" style="width:${c.score}%;background:${cc}"></div></div>
      </a>`;
    }).join('')}
  </div>
</section>

<section id="rules" class="section">
  <div class="section-head">Top rules to fix <span class="sh-count">${data.ruleSummaries.length} rule${data.ruleSummaries.length === 1 ? '' : 's'} triggered</span></div>
  ${fixableCount > 0 ? `<div class="fix-hint" role="note">
    <strong>${fixableCount}</strong> violation${fixableCount === 1 ? '' : 's'} across <strong>${data.ruleSummaries.filter(r => r.fixable).length}</strong> rule${data.ruleSummaries.filter(r => r.fixable).length === 1 ? '' : 's'} can be auto-fixed. Run:
    <code class="fix-hint-cmd">deslint fix --all</code>
  </div>` : '<div class="section-desc">No auto-fixable rules triggered — every rule here requires a manual change.</div>'}
  ${data.ruleSummaries.length === 0
    ? '<div class="empty-state"><div class="es-icon">&#10003;</div>No rules triggered. Every configured rule passed.</div>'
    : `<table class="tbl">
      <thead><tr><th>Rule</th><th>Category</th><th style="text-align:right">Violations</th><th style="text-align:right">Files</th><th>Fix</th><th></th></tr></thead>
      <tbody>
        ${data.ruleSummaries.slice(0, 15).map(r => `<tr>
          <td><span class="mono" style="color:var(--primary);font-weight:500">${esc(r.shortName)}</span></td>
          <td><span class="pill pill-cat">${esc(r.category)}</span></td>
          <td style="text-align:right;font-weight:600;color:var(--text)">${r.count}</td>
          <td style="text-align:right;color:var(--text3)">${r.files.size}</td>
          <td>${r.fixable
            ? `<span class="pill pill-fix">Auto-fix</span> <code class="mono fix-cmd">deslint fix --rule ${esc(r.shortName)}</code>`
            : '<span class="pill pill-cat">Manual</span>'}</td>
          <td style="text-align:right"><a href="https://deslint.com/docs/rules#${esc(r.shortName)}" target="_blank" rel="noopener">View rule &rarr;</a></td>
        </tr>`).join('')}
      </tbody>
    </table>
    ${data.ruleSummaries.length > 15 ? `<div style="text-align:center;margin-top:.75rem;font-size:12px;color:var(--text3)">+ ${data.ruleSummaries.length - 15} more rules in the violation list below</div>` : ''}`}
</section>

${data.fileHotspots.length > 0 ? `<section id="files" class="section">
  <div class="section-head">File hotspots <span class="sh-count">Top ${data.fileHotspots.length} file${data.fileHotspots.length === 1 ? '' : 's'} by violation count</span></div>
  <div class="section-desc">Files with the most issues. Start remediation here for the largest reduction.</div>
  <div class="hotspots">
    ${data.fileHotspots.map(([file, count]) => {
      const maxC = data.fileHotspots[0]?.[1] ?? 1;
      return `<div class="hotspot">
        <span class="h-count">${count}</span>
        <div class="h-bar-bg"><div class="h-bar" style="width:${(count / maxC) * 100}%"></div></div>
        <span class="h-file">${formatFilePath(file)}</span>
      </div>`;
    }).join('')}
  </div>
</section>` : ''}

${data.debt.totalMinutes > 0 ? `<section id="debt" class="section">
  <div class="section-head">Design debt <span class="sh-count">${esc(formatDebt(data.debt.totalMinutes))} estimated remediation effort</span></div>
  <div class="section-desc">Effort estimates calibrated from real auto-fix data. Auto-fixable rules take 2&ndash;3 minutes each; design and accessibility decisions take longer.</div>
  <table class="tbl">
    <thead><tr><th>Rule</th><th style="text-align:right">Violations</th><th style="text-align:right">Per violation</th><th style="text-align:right">Total effort</th></tr></thead>
    <tbody>
      ${data.debt.breakdown.slice(0, 10).map(b => `<tr>
        <td><span class="mono" style="color:var(--primary);font-weight:500">${esc(b.ruleId.replace(/^deslint\//, ''))}</span></td>
        <td style="text-align:right;color:var(--text3)">${b.violations}</td>
        <td style="text-align:right;color:var(--text3)">${b.minutesPerViolation}m</td>
        <td style="text-align:right;font-weight:600;color:var(--text)">${esc(formatDebt(b.totalMinutes))}</td>
      </tr>`).join('')}
    </tbody>
  </table>
</section>` : ''}

${data.history.length > 1 ? `<section id="trend" class="section">
  <div class="section-head">Score trend <span class="sh-count">Last ${data.history.length} scan${data.history.length === 1 ? '' : 's'}</span></div>
  <div class="trend-box">${buildTrendSvg(data.history)}</div>
</section>` : ''}

${allPatterns.length > 0 ? `<section id="previews" class="section">
  <div class="section-head">Visual previews <span class="sh-count">${allPatterns.length} unique pattern${allPatterns.length === 1 ? '' : 's'}</span></div>
  <div class="section-desc">Grouped by shape. Each card compares the current (red) and suggested (green) rendering — what you'd see in the browser.</div>
  ${renderContrastPreview(allPatterns.filter(p => p.ruleId === 'deslint/a11y-color-contrast'))}
  ${renderColorPreview(allPatterns.filter(p => p.ruleId === 'deslint/no-arbitrary-colors'))}
  ${renderSpacingPreview(allPatterns.filter(p => p.ruleId === 'deslint/no-arbitrary-spacing' || p.ruleId === 'deslint/no-magic-numbers-layout'))}
  ${renderTypographyPreview(allPatterns.filter(p => p.ruleId === 'deslint/no-arbitrary-typography'))}
  ${renderDarkModePreview(allPatterns.filter(p => p.ruleId === 'deslint/dark-mode-coverage'))}
  ${renderMissingStatesPreview(allPatterns.filter(p => p.ruleId === 'deslint/missing-states'))}
  ${renderConsistencyPreview(allPatterns.filter(p => p.ruleId === 'deslint/consistent-border-radius' || p.ruleId === 'deslint/consistent-component-spacing'))}
  ${renderResponsivePreview(allPatterns.filter(p => p.ruleId === 'deslint/responsive-required'))}
</section>` : ''}

<section id="violations" class="section">
  <div class="section-head">All violations <span class="sh-count">${data.summary.totalViolations}${data.summary.totalViolations > 500 ? ' (showing first 500)' : ''}</span></div>
  <div class="section-desc">Grouped by file. ${data.summary.errors > 0 ? `<strong style="color:var(--fail-deep)">${data.summary.errors} error${data.summary.errors === 1 ? '' : 's'}</strong> must be fixed before shipping. ` : ''}${data.summary.warnings > 0 ? `${data.summary.warnings} warning${data.summary.warnings === 1 ? '' : 's'} to review.` : ''}</div>
  ${data.violations.length === 0
    ? '<div class="empty-state"><div class="es-icon">&#10003;</div>No violations across the scanned project.</div>'
    : `<div class="v-filters v-filters-cat" role="group" aria-label="Filter by category">
      <span class="v-filter-label">Category:</span>
      <button class="on" data-cat="all">All (${data.summary.totalViolations})</button>
      ${CATEGORY_KEYS.map(k => `<button data-cat="${k}">${esc(categoryLabel(k))} (${cats[k].violations})</button>`).join('')}
    </div>
    <div class="v-filters v-filters-rule" role="group" aria-label="Filter by rule">
      <span class="v-filter-label">Rule:</span>
      <button class="on" data-r="all">All</button>
      ${ruleFilterKeys.map(r => `<button data-r="${esc(r)}">${esc(r)}</button>`).join('')}
    </div>
    <div class="v-list" id="v-list">
      ${violationsByFile.map(g => `<div class="v-file-group">
        <div class="v-file-head">${formatFilePath(g.file)} <span class="v-file-count">${g.items.length} issue${g.items.length === 1 ? '' : 's'}</span></div>
        ${g.items.map(v => {
          const short = v.ruleId.replace('deslint/', '');
          return `<div class="v-item sev-${esc(v.severity)}" data-r="${esc(short)}" data-cat="${violationCategoryKey(v.ruleId)}">
          <span class="v-sev" aria-label="${esc(v.severity)}"></span>
          <div class="v-body">
            <div class="v-msg">${esc(v.message)}</div>
            <div class="v-loc"><b>line ${v.line}</b>, col ${v.column}</div>
          </div>
          <a class="v-rule-link" href="https://deslint.com/docs/rules#${esc(short)}" target="_blank" rel="noopener">${esc(short)} &rarr;</a>
        </div>`;
        }).join('')}
      </div>`).join('')}
    </div>
    ${data.violations.length > 80 ? `<button class="more-btn" id="more-btn">Show ${data.violations.length - 80} more</button>` : ''}`}
</section>

</main>

<footer class="footer">
  Generated by <a href="https://deslint.com" target="_blank" rel="noopener">Deslint v${esc(data.version)}</a>
  &nbsp;·&nbsp; Scanned ${esc(timestamp)}
  &nbsp;·&nbsp; ${data.summary.totalFiles} file${data.summary.totalFiles === 1 ? '' : 's'} (${fileCoverage}% with issues)
  &nbsp;·&nbsp; <a href="https://deslint.com/docs/rules" target="_blank" rel="noopener">Rules documentation</a>
</footer>

<script>
(function () {
  'use strict';
  var PENDING = ${pendingJson};
  var escHtml = function (s) { var d = document.createElement('div'); d.textContent = String(s); return d.innerHTML; };

  var state = { cat: 'all', rule: 'all' };

  function applyFilters() {
    document.querySelectorAll('.v-item').forEach(function (el) {
      var catOk = state.cat === 'all' || el.dataset.cat === state.cat;
      var ruleOk = state.rule === 'all' || el.dataset.r === state.rule;
      el.style.display = (catOk && ruleOk) ? '' : 'none';
    });
    document.querySelectorAll('.v-file-group').forEach(function (g) {
      var visible = g.querySelectorAll('.v-item:not([style*="display: none"])').length;
      g.style.display = visible > 0 ? '' : 'none';
    });
  }

  function setActive(group, attr, value) {
    document.querySelectorAll('.v-filters-' + group + ' button').forEach(function (b) {
      b.classList.toggle('on', b.dataset[attr] === value);
    });
  }

  document.querySelectorAll('.v-filters-cat button').forEach(function (btn) {
    btn.addEventListener('click', function () {
      state.cat = btn.dataset.cat;
      setActive('cat', 'cat', state.cat);
      applyFilters();
    });
  });

  document.querySelectorAll('.v-filters-rule button').forEach(function (btn) {
    btn.addEventListener('click', function () {
      state.rule = btn.dataset.r;
      setActive('rule', 'r', state.rule);
      applyFilters();
    });
  });

  // Category cards jump to #violations via their href; before the browser
  // scrolls we activate the matching filter so the list is already pruned
  // by the time the user lands.
  document.querySelectorAll('[data-jump-cat]').forEach(function (card) {
    card.addEventListener('click', function () {
      var cat = card.dataset.jumpCat;
      state.cat = cat;
      state.rule = 'all';
      setActive('cat', 'cat', cat);
      setActive('rule', 'r', 'all');
      applyFilters();
    });
  });

  var moreBtn = document.getElementById('more-btn');
  if (moreBtn && PENDING.length) {
    moreBtn.addEventListener('click', function () {
      var list = document.getElementById('v-list');
      var g = document.createElement('div');
      g.className = 'v-file-group';
      var h = document.createElement('div');
      h.className = 'v-file-head';
      h.innerHTML = 'Additional violations <span class="v-file-count">' + PENDING.length + ' item' + (PENDING.length === 1 ? '' : 's') + '</span>';
      g.appendChild(h);
      PENDING.forEach(function (v) {
        var d = document.createElement('div');
        d.className = 'v-item sev-' + v.severity;
        var short = v.ruleId.replace('deslint/', '');
        d.dataset.r = short;
        d.dataset.cat = v.category || 'other';
        d.innerHTML =
          '<span class="v-sev"></span>' +
          '<div class="v-body">' +
            '<div class="v-msg">' + escHtml(v.message) + '</div>' +
            '<div class="v-loc">' + escHtml(v.file) + ' <b>line ' + v.line + '</b>, col ' + v.column + '</div>' +
          '</div>' +
          '<a class="v-rule-link" href="https://deslint.com/docs/rules#' + escHtml(short) + '" target="_blank" rel="noopener">' + escHtml(short) + ' &rarr;</a>';
        g.appendChild(d);
      });
      list.appendChild(g);
      moreBtn.remove();
      applyFilters();
    });
  }
})();
</script>
</body>
</html>`;
}
