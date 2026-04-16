import { SATOSHI_BOLD_WOFF2_BASE64 } from './font.js';

/**
 * Complete stylesheet for the report, returned as a single string so it can be
 * inlined in a `<style>` block. The palette mirrors the tokens in
 * apps/docs/tailwind.config.ts and the CSS variables (--bg*, --text*, --pass,
 * etc.) are the contract every preview renderer reads from.
 */
export const REPORT_STYLESHEET = `
/* Brand font is embedded as a data URI so the report renders correctly when
   opened from disk, emailed, or printed — no network fetch at load time. */
@font-face {
  font-family: 'Deslint Satoshi';
  font-weight: 700;
  font-style: normal;
  font-display: swap;
  src: url('data:font/woff2;base64,${SATOSHI_BOLD_WOFF2_BASE64}') format('woff2');
}

:root {
  --bg:           #FAFAFB;
  --bg2:          #FFFFFF;
  --bg3:          #F4F4F5;
  --bg4:          #E4E4E7;
  --border:       #E5E7EB;
  --border2:      #D4D4D8;
  --text:         #111827;
  --text2:        #374151;
  --text3:        #6B7280;
  --text4:        #9CA3AF;
  --pass:         #10B981;
  --pass-soft:    #D1FAE5;
  --pass-deep:    #065F46;
  --warn:         #F59E0B;
  --warn-soft:    #FEF3C7;
  --warn-deep:    #854D0E;
  --fail:         #EF4444;
  --fail-soft:    #FEE2E2;
  --fail-deep:    #991B1B;
  --primary:      #534AB7;
  --primary-soft: #EEEDFA;
  --primary-deep: #362F83;
  --blue:         #534AB7;
  --purple:       #534AB7;
  --cyan:         #0891B2;
  --font:         'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  --font-brand:   'Deslint Satoshi', 'Inter', -apple-system, sans-serif;
  --mono:         'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
  --radius-sm:    6px;
  --radius:       10px;
  --radius-lg:    14px;
  --shadow:       0 1px 3px rgba(15,23,42,.06), 0 1px 2px rgba(15,23,42,.04);
}

* { margin: 0; padding: 0; box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body { background: var(--bg); color: var(--text); font-family: var(--font); font-size: 14px; line-height: 1.55; -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; }

a { color: var(--primary); text-decoration: none; }
a:hover { text-decoration: underline; }

.topbar {
  position: sticky; top: 0; z-index: 10;
  background: rgba(255,255,255,0.88);
  backdrop-filter: saturate(1.4) blur(12px);
  -webkit-backdrop-filter: saturate(1.4) blur(12px);
  border-bottom: 1px solid var(--border);
  padding: .875rem 2rem;
  display: flex; align-items: center; gap: 1.25rem;
}
.brand { display: flex; align-items: center; gap: .55rem; color: inherit; }
.brand:hover { text-decoration: none; }
.brand-icon { width: 30px; height: 30px; border-radius: 6px; flex-shrink: 0; }
.brand-word { font-family: var(--font-brand); font-weight: 700; font-size: 19px; letter-spacing: -0.025em; line-height: 1; color: var(--text); }
.brand-word-accent { color: var(--primary); }
.brand-sep { color: var(--text4); font-size: 14px; margin: 0 .15rem; }
.project-name { font-size: 14px; color: var(--text2); font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 260px; }

.topnav { display: flex; gap: .1rem; margin-left: auto; margin-right: 1rem; }
.topnav a {
  padding: .45rem .8rem;
  color: var(--text2);
  font-size: 13px; font-weight: 500;
  border-radius: var(--radius-sm);
  transition: background .12s, color .12s;
}
.topnav a:hover { color: var(--primary); background: var(--primary-soft); text-decoration: none; }

.topbar-meta { font-size: 12px; color: var(--text3); display: flex; gap: .6rem; align-items: center; flex-shrink: 0; }
.topbar-meta .sep { color: var(--border); }

main { max-width: 1180px; margin: 0 auto; padding: 1.5rem 2rem 3rem; }

.qg {
  display: flex; align-items: center; gap: 1rem;
  padding: 1.15rem 1.35rem;
  border-radius: var(--radius);
  border: 1px solid;
  margin-bottom: 1.5rem;
}
.qg-passed  { background: var(--pass-soft); border-color: #A7F3D0; color: var(--pass-deep); }
.qg-at-risk { background: var(--warn-soft); border-color: #FDE68A; color: var(--warn-deep); }
.qg-failed  { background: var(--fail-soft); border-color: #FECACA; color: var(--fail-deep); }
.qg-icon { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; font-weight: 700; color: #fff; flex-shrink: 0; }
.qg-passed  .qg-icon { background: var(--pass); }
.qg-at-risk .qg-icon { background: var(--warn); }
.qg-failed  .qg-icon { background: var(--fail); }
.qg-text { flex: 1; min-width: 0; }
.qg-label { font-size: 11px; text-transform: uppercase; letter-spacing: .1em; opacity: .75; }
.qg-label strong { font-weight: 700; letter-spacing: 0; text-transform: none; font-size: 14px; margin-left: .35rem; opacity: 1; }
.qg-summary { font-size: 14px; margin-top: .1rem; font-weight: 500; }

.hero {
  display: grid;
  grid-template-columns: 180px 1fr;
  gap: 1.75rem;
  align-items: center;
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 1.75rem;
  margin-bottom: 1.5rem;
  box-shadow: var(--shadow);
}
.grade-ring { position: relative; width: 180px; height: 180px; margin: -12px 0; }
.grade-ring svg { width: 100%; height: 100%; transform: rotate(-90deg); }
.ring-track { fill: none; stroke: var(--bg4); stroke-width: 11; }
.ring-fill  { fill: none; stroke-width: 11; stroke-linecap: round; }
.grade-ring-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: var(--font-brand); }
.grade-letter { font-size: 68px; font-weight: 700; line-height: 1; letter-spacing: -0.04em; }
.grade-score { font-size: 13px; color: var(--text3); margin-top: .35rem; font-family: var(--font); font-weight: 500; }

.hero-body h1 { font-size: 22px; font-weight: 700; letter-spacing: -0.015em; margin-bottom: .45rem; }
.hero-summary { font-size: 14px; color: var(--text2); line-height: 1.6; margin-bottom: 1.1rem; }
.hero-summary strong { color: var(--text); font-weight: 600; }

.hero-actions { display: flex; gap: .5rem; flex-wrap: wrap; }
.btn { display: inline-flex; align-items: center; gap: .35rem; padding: .5rem .9rem; border-radius: var(--radius-sm); font-size: 13px; font-weight: 500; transition: all .12s; border: 1px solid transparent; cursor: pointer; font-family: var(--font); }
.btn:hover { text-decoration: none; }
.btn-primary { background: var(--primary); color: #fff; }
.btn-primary:hover { background: var(--primary-deep); }
.btn-ghost { background: transparent; color: var(--text2); border-color: var(--border); }
.btn-ghost:hover { border-color: var(--primary); color: var(--primary); }

.section { margin-bottom: 1.75rem; }
.section-head { font-size: 15px; font-weight: 600; margin-bottom: .6rem; display: flex; align-items: baseline; gap: .5rem; }
.section-head .sh-count { font-size: 12px; color: var(--text3); font-weight: 400; }
.section-desc { font-size: 13px; color: var(--text3); margin-bottom: 1rem; line-height: 1.55; }
section[id] { scroll-margin-top: 80px; }

.cat-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: .75rem; }
.cat-card { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius); padding: 1rem; transition: border-color .12s, transform .12s; }
.cat-card:hover { border-color: var(--border2); transform: translateY(-1px); }
.cat-card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: .45rem; }
.cat-card-name { font-size: 11px; color: var(--text3); font-weight: 600; text-transform: uppercase; letter-spacing: .06em; }
.cat-card-grade { font-family: var(--font-brand); font-weight: 700; font-size: 13px; letter-spacing: -0.02em; padding: .1rem .45rem; border-radius: 4px; }
.cat-card-score { font-size: 30px; font-weight: 700; line-height: 1; font-family: var(--font-brand); letter-spacing: -0.03em; }
.cat-card-sub { font-size: 12px; color: var(--text3); margin-top: .2rem; }
.cat-card-bar { height: 4px; background: var(--bg4); border-radius: 2px; margin-top: .7rem; overflow: hidden; }
.cat-card-bar-fill { height: 100%; border-radius: 2px; }

.tbl { width: 100%; border-collapse: collapse; background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; font-size: 13px; }
.tbl th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: var(--text3); padding: .7rem 1rem; border-bottom: 1px solid var(--border); font-weight: 600; background: var(--bg3); }
.tbl td { padding: .7rem 1rem; border-bottom: 1px solid var(--border); color: var(--text2); }
.tbl tr:last-child td { border-bottom: none; }
.tbl tr:hover td { background: var(--bg3); }
.tbl a { color: var(--primary); font-weight: 500; }
.mono { font-family: var(--mono); font-size: 12px; }

.pill { display: inline-block; font-size: 11px; padding: .15rem .5rem; border-radius: 4px; font-weight: 500; white-space: nowrap; }
.pill-fix  { background: var(--pass-soft); color: var(--pass-deep); }
.pill-cat  { background: var(--bg3); color: var(--text2); }
.pill-err  { background: var(--fail-soft); color: var(--fail-deep); }
.pill-warn { background: var(--warn-soft); color: var(--warn-deep); }

.hotspots { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
.hotspot { display: flex; align-items: center; gap: 1rem; padding: .6rem 1rem; border-bottom: 1px solid var(--border); font-size: 13px; }
.hotspot:last-child { border-bottom: none; }
.hotspot:hover { background: var(--bg3); }
.hotspot .h-count { min-width: 32px; text-align: right; font-weight: 600; color: var(--text); }
.hotspot .h-bar-bg { flex: 0 0 120px; height: 5px; background: var(--bg4); border-radius: 3px; overflow: hidden; }
.hotspot .h-bar { height: 100%; border-radius: 3px; background: var(--primary); }
.hotspot .h-file { flex: 1; font-family: var(--mono); font-size: 12px; color: var(--text3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hotspot .h-file b { color: var(--text); font-weight: 600; }

.v-list { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
.v-file-group { border-bottom: 1px solid var(--border); }
.v-file-group:last-child { border-bottom: none; }
.v-file-head { display: flex; align-items: center; gap: .75rem; padding: .55rem 1rem; background: var(--bg3); font-family: var(--mono); font-size: 12px; font-weight: 500; color: var(--text3); }
.v-file-head b { color: var(--text); font-weight: 700; }
.v-file-head .v-file-count { margin-left: auto; font-family: var(--font); color: var(--text3); font-size: 11px; }
.v-item { display: grid; grid-template-columns: 14px 1fr auto; align-items: start; padding: .6rem 1rem; gap: .65rem; font-size: 13px; border-top: 1px solid var(--border); }
.v-item:first-of-type { border-top: none; }
.v-item:hover { background: var(--bg3); }
.v-item.sev-error   { border-left: 3px solid var(--fail); padding-left: calc(1rem - 3px); }
.v-item.sev-warning { border-left: 3px solid var(--warn); padding-left: calc(1rem - 3px); }
.v-sev { width: 10px; height: 10px; border-radius: 50%; margin-top: .35rem; flex-shrink: 0; }
.v-item.sev-error   .v-sev { background: var(--fail); }
.v-item.sev-warning .v-sev { background: var(--warn); }
.v-body { min-width: 0; }
.v-body .v-msg { color: var(--text2); line-height: 1.5; }
.v-body .v-loc { font-family: var(--mono); font-size: 11px; color: var(--text3); margin-top: .15rem; }
.v-body .v-loc b { color: var(--text2); }
.v-rule-link { font-family: var(--mono); font-size: 11px; color: var(--primary); font-weight: 500; white-space: nowrap; padding-top: .15rem; }

.v-filters { display: flex; gap: .3rem; margin-bottom: .85rem; flex-wrap: wrap; }
.v-filters button { background: var(--bg2); border: 1px solid var(--border); color: var(--text2); padding: .3rem .65rem; border-radius: var(--radius-sm); font-size: 12px; cursor: pointer; font-family: var(--font); transition: all .1s; }
.v-filters button:hover { border-color: var(--border2); }
.v-filters button.on { background: var(--primary); color: #fff; border-color: var(--primary); }
.more-btn { display: block; margin: 1rem auto; background: var(--bg2); border: 1px solid var(--border); color: var(--text2); padding: .5rem 1.5rem; border-radius: var(--radius-sm); cursor: pointer; font-family: var(--font); font-size: 13px; }
.more-btn:hover { border-color: var(--primary); color: var(--primary); }

.empty-state { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius); padding: 1.5rem; text-align: center; color: var(--text3); font-size: 13px; }
.empty-state .es-icon { width: 32px; height: 32px; margin: 0 auto .5rem; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: var(--pass-soft); color: var(--pass); font-size: 1.05rem; font-weight: 700; }

.swatches { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: .75rem; }
.swatch { display: flex; align-items: center; gap: .75rem; background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: .6rem .75rem; }
.swatch .sw-box { width: 36px; height: 36px; border-radius: var(--radius-sm); border: 1px solid var(--border2); flex-shrink: 0; }
.swatch .sw-hex { font-family: var(--mono); font-size: 12px; color: var(--text); }
.swatch .sw-sug { font-size: 11px; color: var(--pass); margin-top: .1rem; }
.swatch .sw-n   { font-size: 11px; color: var(--text4); margin-top: .1rem; }

.trend-box { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius); padding: 1.25rem; }
.trend-box svg { width: 100%; height: 110px; }
.trend-line { fill: none; stroke: var(--primary); stroke-width: 2; }
.trend-area { fill: url(#tg); opacity: .9; }
.trend-dot  { fill: var(--primary); }
.trend-empty { text-align: center; color: var(--text4); padding: 1.5rem; font-size: 13px; }

.vp-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: .85rem; margin-bottom: 1rem; }
.vp-grid-sm { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); }
.vp-card { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 1rem; }
.vp-card-sm { padding: .75rem; }
.vp-label { font-size: 12px; color: var(--text2); margin-bottom: .6rem; display: flex; align-items: center; gap: .4rem; flex-wrap: wrap; }
.vp-count { margin-left: auto; font-size: 11px; color: var(--text3); font-family: var(--mono); }
.vp-count-sm { font-size: 11px; color: var(--text4); margin-top: .4rem; }
.vp-files { font-size: 11px; color: var(--text4); margin-top: .5rem; }
.vp-arrow { color: var(--text4); font-size: 1.2rem; padding: 0 .5rem; display: flex; align-items: center; }
.vp-arrow-sm { color: var(--text4); font-size: .9rem; padding: 0 .3rem; }

.vp-contrast-row { display: flex; align-items: stretch; gap: 0; }
.vp-contrast-box { flex: 1; padding: 1rem .75rem; border: 2px solid var(--border); border-radius: var(--radius-sm); text-align: center; }
.vp-contrast-sample { font-size: 1.15rem; font-weight: 600; margin-bottom: .2rem; }
.vp-contrast-meta { font-size: 10px; font-family: var(--mono); opacity: .8; }

.vp-color-row { display: flex; align-items: center; gap: 0; }
.vp-color-swatch { width: 42px; height: 42px; border-radius: var(--radius-sm); border: 2px solid var(--border); flex-shrink: 0; }
.vp-color-label { font-size: 12px; color: var(--text2); margin-top: .35rem; }
.vp-color-sug { font-size: 11px; color: var(--pass); margin-top: .15rem; }

.vp-spacing-list { display: flex; flex-direction: column; gap: .5rem; }
.vp-spacing-row { display: flex; align-items: center; gap: 1rem; padding: .55rem .75rem; background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius-sm); }
.vp-spacing-bars { flex: 1; }
.vp-spacing-pair { display: flex; align-items: center; gap: .5rem; margin-bottom: .3rem; }
.vp-spacing-pair:last-child { margin-bottom: 0; }
.vp-spacing-bar { height: 16px; border-radius: 3px; display: flex; align-items: center; padding: 0 6px; font-size: 10px; font-family: var(--mono); color: #fff; min-width: 20px; }
.vp-bar-before { background: var(--fail); opacity: .85; }
.vp-bar-after  { background: var(--pass); opacity: .9; }
.vp-spacing-cls { font-size: 12px; color: var(--text3); }

.vp-typo-list { display: flex; flex-direction: column; gap: .5rem; }
.vp-typo-row { display: flex; align-items: center; gap: 1rem; padding: .65rem .75rem; background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius-sm); }
.vp-typo-pair { flex: 1; }
.vp-typo-sample { margin-bottom: .35rem; line-height: 1.2; display: flex; align-items: baseline; gap: .5rem; color: var(--text); }
.vp-typo-sample:last-child { margin-bottom: 0; }

.vp-dark-row { display: flex; gap: .5rem; }
.vp-dark-panel { flex: 1; border-radius: var(--radius-sm); padding: .65rem; text-align: center; border: 1px solid var(--border); }
.vp-dark-elem { padding: .5rem; border-radius: var(--radius-sm); font-size: 13px; font-weight: 500; }
.vp-dark-mode-label { font-size: 10px; margin-top: .35rem; color: var(--text3); }

.vp-states-row { display: flex; gap: .75rem; margin: .5rem 0; justify-content: center; }
.vp-state-box { text-align: center; }
.vp-state-elem { border-radius: var(--radius-sm); font-size: 12px; }
.vp-state-btn { background: var(--primary); color: #fff; padding: .4rem .8rem; cursor: default; }
.vp-state-input { background: var(--bg3); border: 1px solid var(--border2); padding: .35rem .6rem; width: 80px; height: 28px; border-radius: 5px; }
.vp-state-missing { opacity: .4; position: relative; }
.vp-state-missing::after { content: '?'; position: absolute; top: -4px; right: -4px; background: var(--fail); color: #fff; width: 14px; height: 14px; border-radius: 50%; font-size: 9px; display: flex; align-items: center; justify-content: center; }
.vp-state-label { font-size: 10px; margin-top: .25rem; color: var(--text3); }

.vp-consistency-row { display: flex; align-items: center; gap: 0; justify-content: center; }
.vp-consistency-box { text-align: center; padding: .5rem; }
.vp-radius-demo { width: 48px; height: 48px; background: var(--primary); margin: 0 auto .35rem; }

.vp-responsive-row { display: flex; gap: .75rem; margin: .5rem 0; }
.vp-viewport { border: 1px solid var(--border2); border-radius: 6px; padding: .5rem; overflow: hidden; position: relative; }
.vp-vp-desktop { flex: 2; height: 50px; }
.vp-vp-mobile { flex: 1; height: 50px; max-width: 80px; }
.vp-vp-elem { background: var(--primary); opacity: .55; height: 30px; border-radius: 3px; }
.vp-vp-overflow { background: var(--fail); opacity: .55; }
.vp-vp-label { font-size: 9px; text-align: center; color: var(--text3); margin-top: .25rem; }

.footer { border-top: 1px solid var(--border); padding: 1.25rem 2rem; color: var(--text3); font-size: 12px; text-align: center; }
.footer a { color: var(--primary); }

@media (max-width: 900px) {
  .topbar { padding: .7rem 1rem; }
  .topnav { display: none; }
  .topbar-meta { font-size: 11px; }
  main { padding: 1rem 1rem 2rem; }
  .hero { grid-template-columns: 1fr; gap: 1rem; padding: 1.25rem; }
  .grade-ring { margin: 0 auto; width: 150px; height: 150px; }
  .cat-grid { grid-template-columns: repeat(2, 1fr); }
}

@media print {
  html, body { background: #fff !important; }
  .topbar { position: static; background: #fff; backdrop-filter: none; -webkit-backdrop-filter: none; }
  .topnav, .topbar-meta { display: none; }
  .btn, .v-filters, .more-btn { display: none !important; }
  .hero, .tbl, .hotspots, .v-list, .trend-box, .vp-card, .cat-card { box-shadow: none; }
  section, .section, .hero, .tbl, .hotspots, .vp-card, .cat-card { break-inside: avoid; }
  a[href^="http"]::after { content: " (" attr(href) ")"; font-size: 10px; color: #666; }
}
`;
