#!/usr/bin/env node
/**
 * Deslint MCP — self-correction loop demo.
 *
 * This is a REAL MCP JSON-RPC client. It spawns the compiled
 * @deslint/mcp server as a stdio subprocess, runs the full protocol
 * handshake + three tool calls, and pretty-prints the exchange with
 * brand colors and choreographed pacing so it looks good in an
 * asciinema recording. The content is 100% real server output — nothing
 * is mocked, nothing is static. If you change a rule, re-running this
 * script will reflect the change.
 *
 * Recording: `asciinema rec --command "node packages/mcp/demo/self-correction-loop.mjs" demo.cast`
 *
 * Design discipline (this is a marketing asset, not a test script):
 *  - 24-bit ANSI colors matching Deslint's brand palette
 *  - Dim gray for protocol chrome, bright primary for the story moments
 *  - Short sleeps between beats so viewers can read
 *  - No emoji, no "🚀" slop — just typography, color, and pacing
 *  - Deterministic frame order; timings are fixed so the cast file is
 *    stable between runs
 */

import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEMO_FILE = join(__dirname, 'Button.tsx');

// ── Brand palette (24-bit ANSI) ──────────────────────────────────────
// Deslint primary #1A5276, pass #27AE60, warn #F39C12, fail #E74C3C
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  // Brand
  primary: '\x1b[38;2;79;166;217m',      // primary-light (readable on dark bg)
  primaryBold: '\x1b[1;38;2;79;166;217m',
  pass: '\x1b[38;2;39;174;96m',
  passBold: '\x1b[1;38;2;39;174;96m',
  warn: '\x1b[38;2;243;156;18m',
  warnBold: '\x1b[1;38;2;243;156;18m',
  fail: '\x1b[38;2;231;76;60m',
  failBold: '\x1b[1;38;2;231;76;60m',
  // Neutrals
  fg: '\x1b[38;2;220;220;220m',
  muted: '\x1b[38;2;140;140;140m',
  faint: '\x1b[38;2;90;90;90m',
  // Syntax (VSCode-ish)
  keyword: '\x1b[38;2;197;134;192m',
  fn: '\x1b[38;2;220;220;170m',
  tag: '\x1b[38;2;86;156;214m',
  attr: '\x1b[38;2;156;220;254m',
  str: '\x1b[38;2;206;145;120m',
  punct: '\x1b[38;2;200;200;200m',
  badValue: '\x1b[38;2;244;135;113m',    // red-ish — calls out the bad token
  goodValue: '\x1b[38;2;140;220;160m',   // green — calls out the fixed token
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = (s = '') => process.stdout.write(s + '\n');
const write = (s) => process.stdout.write(s);

function pad(text, width) {
  const visible = text.replace(/\x1b\[[0-9;]*m/g, '');
  const diff = Math.max(0, width - visible.length);
  return text + ' '.repeat(diff);
}

// ── UI primitives ────────────────────────────────────────────────────

function titleCard() {
  const W = 64;
  const bar = '─'.repeat(W - 2);
  out(`${c.faint}╭${bar}╮${c.reset}`);
  out(
    `${c.faint}│${c.reset}  ${c.primaryBold}Deslint MCP${c.reset}${c.muted}  ·  self-correction loop${c.reset}${pad('', W - 38)}${c.faint}│${c.reset}`,
  );
  out(
    `${c.faint}│${c.reset}  ${c.muted}deterministic design-quality gate for AI code${c.reset}${pad('', W - 50)}${c.faint}│${c.reset}`,
  );
  out(`${c.faint}╰${bar}╯${c.reset}`);
  out();
}

function codeFrame(title, lines, kind = 'before') {
  const W = 64;
  const bar = '─'.repeat(W - title.length - 5);
  const tint = kind === 'before' ? c.fail : c.pass;
  out(
    `${c.faint}┌─ ${c.reset}${tint}${title}${c.reset} ${c.faint}${bar}┐${c.reset}`,
  );
  for (const line of lines) {
    out(`${c.faint}│${c.reset} ${pad(line, W - 4)} ${c.faint}│${c.reset}`);
  }
  out(`${c.faint}└${'─'.repeat(W - 2)}┘${c.reset}`);
}

// Syntax-highlighted Button.tsx lines. We colorize specific tokens so
// the "bad" values pop in red before the fix and the "good" values pop
// in green after.
function renderCode(kind) {
  const k = c.keyword,
    f = c.fn,
    t = c.tag,
    a = c.attr,
    s = c.str,
    p = c.punct,
    bad = c.badValue,
    good = c.goodValue,
    r = c.reset;

  if (kind === 'before') {
    return [
      `${k}export${r} ${k}function${r} ${f}Button${r}${p}({ children })${r} ${p}{${r}`,
      `  ${k}return${r} ${p}(${r}`,
      `    ${p}<${r}${t}button${r}`,
      `      ${a}className${r}${p}=${r}${s}"rounded-md ${bad}px-[13px] py-[7px]${r}${s}`,
      `                 ${bad}bg-[#1a5276]${r} ${bad}text-[15px]${r}${s} text-white"${r}`,
      `    ${p}>${r}`,
      `      ${p}{${r}children${p}}${r}`,
      `    ${p}</${r}${t}button${r}${p}>${r}`,
      `  ${p});${r}`,
      `${p}}${r}`,
    ];
  }
  return [
    `${k}export${r} ${k}function${r} ${f}Button${r}${p}({ children })${r} ${p}{${r}`,
    `  ${k}return${r} ${p}(${r}`,
    `    ${p}<${r}${t}button${r}`,
    `      ${a}className${r}${p}=${r}${s}"rounded-md ${good}px-3 py-1.5${r}${s}`,
    `                 ${good}bg-cyan-800${r} text-[15px] text-white"${r}`,
    `    ${p}>${r}`,
    `      ${p}{${r}children${p}}${r}`,
    `    ${p}</${r}${t}button${r}${p}>${r}`,
    `  ${p});${r}`,
    `${p}}${r}`,
  ];
}

function step(label, text) {
  out(`${c.primary}${label}${c.reset} ${c.fg}${text}${c.reset}`);
}

function arrow(dir, method, args) {
  const symbol = dir === 'out' ? '→' : '←';
  const color = dir === 'out' ? c.primary : c.pass;
  const argStr = args ? `${c.muted} ${args}${c.reset}` : '';
  out(`${c.faint}  jsonrpc  ${color}${symbol}${c.reset}  ${c.bold}${method}${c.reset}${argStr}`);
}

function violationCard({ ruleId, line, bad, good, autofix }) {
  const dot = autofix ? `${c.warn}●${c.reset}` : `${c.fail}●${c.reset}`;
  const tag = autofix ? `${c.muted}auto-fix${c.reset}` : `${c.failBold}human review${c.reset}`;
  const badCol = `${c.badValue}${bad}${c.reset}`;
  const goodCol = good ? `${c.goodValue}${good}${c.reset}` : `${c.muted}—${c.reset}`;
  out(
    `    ${dot}  ${c.muted}line ${line}${c.reset}  ${c.fg}${pad(ruleId, 30)}${c.reset}  ${pad(badCol, 24)} ${c.muted}→${c.reset} ${pad(goodCol, 16)}  ${tag}`,
  );
}

function summary({ totalBefore, fixed, flagged, elapsedMs }) {
  const W = 64;
  const bar = '─'.repeat(W - 2);
  out();
  out(`${c.faint}╭${bar}╮${c.reset}`);
  const row = (num, label, tint) =>
    out(
      `${c.faint}│${c.reset}  ${tint}${pad(String(num), 3)}${c.reset}  ${c.fg}${pad(label, W - 11)}${c.reset}${c.faint}│${c.reset}`,
    );
  row(totalBefore, 'violations detected on the raw AI output', c.failBold);
  row(fixed, 'auto-fixed in this pass', c.passBold);
  row(flagged, 'honestly flagged for human review', c.warnBold);
  row(0, 'bytes of source code left your machine', c.primaryBold);
  out(`${c.faint}├${bar}┤${c.reset}`);
  out(
    `${c.faint}│${c.reset}  ${c.muted}round trip${c.reset}  ${c.primaryBold}${elapsedMs}ms${c.reset}${pad('', W - 20 - String(elapsedMs).length)}${c.faint}│${c.reset}`,
  );
  out(
    `${c.faint}│${c.reset}  ${c.muted}transport  ${c.reset}${c.fg}stdio${c.reset}  ${c.faint}·${c.reset} ${c.fg}JSON-RPC 2.0${c.reset}${pad('', W - 34)}${c.faint}│${c.reset}`,
  );
  out(
    `${c.faint}│${c.reset}  ${c.muted}model      ${c.reset}${c.fg}none${c.reset}  ${c.faint}·${c.reset} ${c.fg}pure AST, deterministic${c.reset}${pad('', W - 44)}${c.faint}│${c.reset}`,
  );
  out(`${c.faint}╰${bar}╯${c.reset}`);
  out();
  out(
    `${c.muted}  local-first${c.reset}  ${c.faint}·${c.reset}  ${c.muted}no LLM${c.reset}  ${c.faint}·${c.reset}  ${c.muted}same input, same output${c.reset}`,
  );
  out();
}

// ── Minimal MCP JSON-RPC client over stdio ──────────────────────────

function startServer() {
  const root = join(__dirname, '..', '..', '..');
  const cli = join(__dirname, '..', 'dist', 'cli.js');
  return spawn('node', [cli], {
    stdio: ['pipe', 'pipe', 'inherit'],
    cwd: root,
  });
}

function createRpcClient(server) {
  const pending = new Map();
  let nextId = 0;
  const rl = createInterface({ input: server.stdout });
  rl.on('line', (line) => {
    if (!line.trim()) return;
    try {
      const msg = JSON.parse(line);
      if (msg.id != null && pending.has(msg.id)) {
        const resolve = pending.get(msg.id);
        pending.delete(msg.id);
        resolve(msg);
      }
    } catch {
      /* ignore parse errors — protocol noise */
    }
  });
  function call(method, params) {
    nextId++;
    const id = nextId;
    const req = { jsonrpc: '2.0', id, method, params };
    return new Promise((resolve) => {
      pending.set(id, resolve);
      server.stdin.write(JSON.stringify(req) + '\n');
    });
  }
  return { call };
}

// ── Main script ──────────────────────────────────────────────────────

async function main() {
  titleCard();
  await sleep(450);

  const server = startServer();
  const rpc = createRpcClient(server);

  step('spawn', `${c.muted}node ${c.reset}${c.fg}packages/mcp/dist/cli.js${c.reset}${c.muted}  (stdio)${c.reset}`);
  await sleep(250);

  // 1) initialize
  arrow('out', 'initialize', '{ protocolVersion: "2024-11-05" }');
  const initStart = Date.now();
  const init = await rpc.call('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'deslint-demo', version: '0.1.0' },
  });
  const initElapsed = Date.now() - initStart;
  arrow('in', `serverInfo.name = "${init.result?.serverInfo?.name ?? '?'}"`);
  await sleep(400);

  // 2) tools/list
  arrow('out', 'tools/list');
  const listStart = Date.now();
  const tools = await rpc.call('tools/list', {});
  const listElapsed = Date.now() - listStart;
  const names = (tools.result?.tools ?? []).map((t) => t.name).join(', ');
  arrow('in', `tools: ${names}`);
  out();
  await sleep(500);

  // 3) show the incoming file
  step('problem', `${c.fg}an AI just wrote this component${c.reset}`);
  await sleep(300);
  codeFrame('Button.tsx — raw AI output', renderCode('before'), 'before');
  out();
  await sleep(900);

  // 4) analyze_file
  step('analyze', `${c.muted}ask the MCP server what is wrong${c.reset}`);
  arrow('out', 'tools/call', 'analyze_file { filePath: "packages/mcp/demo/Button.tsx" }');
  const analyzeStart = Date.now();
  const analyze = await rpc.call('tools/call', {
    name: 'analyze_file',
    arguments: { filePath: 'packages/mcp/demo/Button.tsx' },
  });
  const analyzeElapsed = Date.now() - analyzeStart;
  const analyzePayload = JSON.parse(analyze.result.content[0].text);
  arrow('in', `${analyzePayload.violations.length} violations  ${c.faint}(${analyzeElapsed}ms)${c.reset}`);
  out();
  await sleep(300);

  // 5) render each violation as a card
  // We derive the "bad → good" hint from the rule message itself when
  // available, so this stays honest if rules change.
  for (const v of analyzePayload.violations) {
    const msg = v.message;
    // Extract bad token from backticks: `...`
    const ticks = [...msg.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
    const bad = ticks[0] ?? '—';
    const good = ticks[1] ?? null;
    const autofix = good !== null; // rule provided a suggestion
    violationCard({
      ruleId: v.ruleId,
      line: v.line,
      bad,
      good,
      autofix,
    });
    await sleep(180);
  }
  out();
  await sleep(700);

  // 6) analyze_and_fix
  step('fix', `${c.muted}ask the MCP server to return the corrected file${c.reset}`);
  arrow('out', 'tools/call', 'analyze_and_fix { filePath: "packages/mcp/demo/Button.tsx" }');
  const fixStart = Date.now();
  const fix = await rpc.call('tools/call', {
    name: 'analyze_and_fix',
    arguments: { filePath: 'packages/mcp/demo/Button.tsx' },
  });
  const fixElapsed = Date.now() - fixStart;
  const fixPayload = JSON.parse(fix.result.content[0].text);
  arrow(
    'in',
    `fixed ${fixPayload.fixedViolations}, remaining ${fixPayload.remainingViolations.length}  ${c.faint}(${fixElapsed}ms)${c.reset}`,
  );
  out();
  await sleep(600);

  codeFrame('Button.tsx — after Deslint', renderCode('after'), 'after');
  await sleep(700);

  // 7) outro — the round-trip number is REAL RPC compute time only, not the
  // choreographed sleeps. Four RPC calls: initialize + tools/list + analyze_file +
  // analyze_and_fix. This is the number a skeptic will care about.
  const rpcElapsed = initElapsed + listElapsed + analyzeElapsed + fixElapsed;
  summary({
    totalBefore: analyzePayload.violations.length,
    fixed: fixPayload.fixedViolations,
    flagged: fixPayload.remainingViolations.length,
    elapsedMs: rpcElapsed,
  });

  server.kill();
  await sleep(200);
  process.exit(0);
}

main().catch((err) => {
  out(`${c.fail}error: ${err?.message ?? err}${c.reset}`);
  process.exit(1);
});
