/**
 * Post-install onboarding for `npx @deslint/mcp install`.
 *
 * The wiring step (writing the MCP server entry to Claude / Cursor /
 * etc. config) gives users *access* to Deslint tools. It does not give
 * them *value* — the agent only calls our tools when prompted, and
 * without a `.deslintrc.json` our suggestions stay generic. A user who
 * installs and never sees a violation silently assumes the tool does
 * nothing and churns.
 *
 * This module closes the first-run gap with three opt-in prompts:
 *
 *   1. **Scan now.** Discover + lint the current directory, print a
 *      compact Design Health Score + top violations. Proves the tool
 *      does something concrete.
 *   2. **Pull Tailwind tokens into `.deslintrc.json`.** When a
 *      `tailwind.config.{js,ts}` or v4 `@theme` block is present, seed
 *      a config file so future suggestions reference real tokens
 *      (`bg-primary`) rather than the generic "use the color scale."
 *   3. **Append a nudge to the agent rules file.** For each agent
 *      whose MCP config we just wrote (Claude / Cursor / Codex /
 *      Windsurf), append a short line to the matching project-level
 *      rules file (`CLAUDE.md`, `.cursorrules`, `AGENTS.md`,
 *      `.windsurfrules`) so the agent proactively calls Deslint after
 *      UI edits instead of waiting to be asked.
 *
 * All three prompts are independent (declining one does not skip the
 * others) and all writes are behind explicit `Y/n` consent. Non-TTY
 * environments (CI, Docker builds, piped installs) skip the entire
 * onboarding silently and keep the install behaviour identical to
 * what `0.7.0` shipped.
 */
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { resolve, join, relative, isAbsolute } from 'node:path';
import { writeJsonFile } from './install.js';

export type AgentKind = 'claude' | 'cursor' | 'codex' | 'windsurf';

export interface ProjectContext {
  /** Absolute working directory we'd scan / write files into. */
  cwd: string;
  /** `true` when the CWD has a package.json AND at least one frontend
   *  source file within 3 levels. Everything else — installing from
   *  the home directory, running in an empty scratch dir, a backend-
   *  only repo — short-circuits the onboarding. */
  isProject: boolean;
  /** `true` when a `tailwind.config.{js,ts}` or v4 `@theme {}` block
   *  is detected. Gate for prompt 2. */
  hasTailwind: boolean;
  /** `true` when a `.deslintrc.json` already exists. Suppresses
   *  prompt 2 (we never overwrite an existing config). */
  hasDeslintrc: boolean;
  /** Which agent wirings we just wrote — derived from the install
   *  step, not from filesystem probing. Drives which rules file(s)
   *  prompt 3 offers to append to. */
  agents: AgentKind[];
}

/** Minimal summary we print after the scan — tight enough to fit on a
 *  terminal screen without scrolling. */
export interface ScanSummary {
  /** `null` when the scan had no applicable input (CSS-in-JS-only
   *  project, no class/style attributes). Mirrors the CLI contract. */
  score: number | null;
  grade: string;
  totalFiles: number;
  filesWithViolations: number;
  totalViolations: number;
  errors: number;
  warnings: number;
  parseErrors: number;
  /** Top 3 rules by hit count, for the one-line preview. */
  topRules: Array<{ ruleId: string; count: number }>;
}

/** Injected dependencies so tests can stub out prompts + disk writes
 *  without spinning up a real TTY. */
export interface OnboardingDeps {
  /** `true` => run the three prompts. `false` => skip everything
   *  silently (non-TTY, CI, piped install). */
  isTTY: boolean;
  /** Async `Y/n` prompt. Real impl uses @clack/prompts. Tests stub. */
  confirm: (message: string) => Promise<boolean>;
  /** Executes the scan. Injected so tests don't pull in the full
   *  CLI + ESLint stack. */
  runScan: (cwd: string) => Promise<ScanSummary>;
  /** Pulls Tailwind tokens → DesignSystem shape. Injected so tests
   *  don't need a real Tailwind config. */
  importTokens: (cwd: string) => Promise<Record<string, unknown> | null>;
  /** Stream we write all user-facing output to. `console.log` in
   *  prod, a buffer in tests. */
  log: (line: string) => void;
}

/** Probe the directory for "looks like a project we can scan." Keeps
 *  the bar low — we just need a `package.json` and at least one file
 *  with a frontend extension so a scan has something to chew on. */
export function detectProjectContext(
  cwd: string,
  agents: AgentKind[],
): ProjectContext {
  const absCwd = resolve(cwd);
  const hasPkg = existsSync(join(absCwd, 'package.json'));
  const frontendFound = hasPkg ? hasFrontendFileNearby(absCwd) : false;
  const hasTailwind = hasPkg ? detectTailwindSync(absCwd) : false;
  const hasDeslintrc = existsSync(join(absCwd, '.deslintrc.json'));
  return {
    cwd: absCwd,
    isProject: hasPkg && frontendFound,
    hasTailwind,
    hasDeslintrc,
    agents,
  };
}

/** Walk up to 3 levels deep looking for a single `.tsx` / `.jsx` /
 *  `.ts` / `.vue` / `.svelte` / `.html` file. Bailing on the first
 *  match keeps this O(files-to-first-match) — typical projects hit
 *  it inside the first dozen directories. */
function hasFrontendFileNearby(root: string): boolean {
  const EXTS = new Set(['.tsx', '.jsx', '.ts', '.js', '.vue', '.svelte', '.html']);
  const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', '.next', '.nuxt', '.git', 'coverage', '.turbo']);
  const MAX_DEPTH = 3;
  const stack: Array<{ dir: string; depth: number }> = [{ dir: root, depth: 0 }];
  while (stack.length > 0) {
    const { dir, depth } = stack.pop()!;
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      continue;
    }
    for (const name of entries) {
      const full = join(dir, name);
      const st = tryStat(full);
      if (!st) continue;
      if (st.isFile()) {
        const dot = name.lastIndexOf('.');
        if (dot >= 0 && EXTS.has(name.slice(dot))) return true;
      } else if (st.isDirectory() && depth < MAX_DEPTH && !SKIP_DIRS.has(name)) {
        stack.push({ dir: full, depth: depth + 1 });
      }
    }
  }
  return false;
}

function tryStat(path: string): ReturnType<typeof statSync> | null {
  try {
    return statSync(path);
  } catch {
    return null;
  }
}

/** Tailwind detection — v3 config file OR v4 `@theme {}` block in a
 *  top-level CSS entry. Synchronous + cheap so we can do it eagerly
 *  during context detection without an `await`. */
function detectTailwindSync(root: string): boolean {
  const V3_NAMES = ['tailwind.config.js', 'tailwind.config.ts', 'tailwind.config.mjs', 'tailwind.config.cjs'];
  for (const name of V3_NAMES) {
    if (existsSync(join(root, name))) return true;
  }
  // v4 @theme block — peek at common entry CSS locations.
  const CSS_CANDIDATES = [
    'src/app/globals.css',
    'app/globals.css',
    'src/globals.css',
    'src/styles/globals.css',
    'styles/globals.css',
    'src/index.css',
    'index.css',
  ];
  for (const rel of CSS_CANDIDATES) {
    const full = join(root, rel);
    if (!existsSync(full)) continue;
    try {
      const stat = statSync(full);
      if (!stat.isFile() || stat.size > 1024 * 1024) continue;
      const css = readFileSync(full, 'utf-8');
      if (/@theme\b/.test(css)) return true;
    } catch {
      /* unreadable — skip */
    }
  }
  return false;
}

/** Run the three post-install prompts. Each prompt is independent;
 *  declining one does not skip the others. */
export async function runOnboarding(
  ctx: ProjectContext,
  deps: OnboardingDeps,
): Promise<void> {
  if (!deps.isTTY) return; // Silent no-op in CI / piped / Docker builds.
  if (!ctx.isProject) return; // Nothing to scan or configure.

  deps.log('');
  deps.log('  ──────────────────────────────────────────────────────────────');

  // Prompt 1 — see what Deslint catches right now.
  const runScan = await deps.confirm(
    "Want to see what Deslint catches here? (local scan — no code leaves your machine)",
  );
  if (runScan) {
    try {
      const summary = await deps.runScan(ctx.cwd);
      renderScanSummary(summary, deps.log);
    } catch (err) {
      deps.log(`  Scan failed: ${errMsg(err)}`);
      deps.log('  (continuing with the rest of setup)');
    }
  }

  // Prompt 2 — seed .deslintrc.json from Tailwind tokens, so fixes
  // suggest `bg-primary` rather than "use the color scale." Skipped
  // when a config already exists (we never overwrite).
  if (ctx.hasTailwind && !ctx.hasDeslintrc) {
    const seed = await deps.confirm(
      'Detected Tailwind. Pull your tokens into .deslintrc.json so fixes suggest your real token names?',
    );
    if (seed) {
      try {
        const tokens = await deps.importTokens(ctx.cwd);
        if (tokens && Object.keys(tokens).length > 0) {
          const rcPath = join(ctx.cwd, '.deslintrc.json');
          writeJsonFile(rcPath, { designSystem: tokens });
          deps.log(`  ✓ Wrote ${relative(ctx.cwd, rcPath) || '.deslintrc.json'}`);
        } else {
          deps.log('  Tailwind config found but no tokens extracted — skipping.');
        }
      } catch (err) {
        deps.log(`  Couldn't write .deslintrc.json: ${errMsg(err)}`);
      }
    }
  } else if (ctx.hasDeslintrc) {
    deps.log('  .deslintrc.json already present — leaving it as is.');
  }

  // Prompt 3 — nudge the agent to actually call Deslint after UI
  // edits. Without this, MCP tools are "available" but idle until the
  // user asks for them explicitly.
  if (ctx.agents.length > 0) {
    const addNudge = await deps.confirm(
      'Add a one-line nudge to your agent rules so it runs Deslint after UI edits?',
    );
    if (addNudge) {
      const written: string[] = [];
      for (const agent of ctx.agents) {
        try {
          const result = appendAgentNudge(ctx.cwd, agent);
          if (result) written.push(result.relPath);
        } catch (err) {
          deps.log(`  ${agent}: ${errMsg(err)}`);
        }
      }
      for (const path of written) {
        deps.log(`  ✓ Appended Deslint nudge to ${path}`);
      }
    }
  }

  deps.log('  ──────────────────────────────────────────────────────────────');
}

/** Append our nudge to the project-level rules file an agent reads.
 *  Picks the first existing file from the agent's preferred list so
 *  we respect what the user already uses; falls back to the
 *  canonical name when nothing's there yet. Idempotent — a second
 *  install skips the append if our marker is already present. */
export function appendAgentNudge(
  cwd: string,
  agent: AgentKind,
): { relPath: string; mode: 'appended' | 'created' | 'already-present' } | null {
  const rulesFile = pickRulesFile(cwd, agent);
  if (!rulesFile) return null;
  const { absPath, wasExisting } = rulesFile;
  const existing = wasExisting ? safeRead(absPath) : '';
  if (existing.includes(DESLINT_NUDGE_MARKER)) {
    return { relPath: relPathOrAbs(cwd, absPath), mode: 'already-present' };
  }
  const payload = buildNudgeSection();
  const separator = existing && !existing.endsWith('\n\n') ? (existing.endsWith('\n') ? '\n' : '\n\n') : '';
  const next = existing + separator + payload;
  writeFileSync(absPath, next, 'utf-8');
  return {
    relPath: relPathOrAbs(cwd, absPath),
    mode: wasExisting ? 'appended' : 'created',
  };
}

const DESLINT_NUDGE_MARKER = '<!-- deslint-mcp:nudge -->';

function buildNudgeSection(): string {
  return [
    '## Deslint design-quality checks',
    DESLINT_NUDGE_MARKER,
    '',
    'Before claiming a UI change is done, call `mcp__deslint__analyze_file`',
    'on any `.tsx` / `.jsx` / `.vue` / `.svelte` file you edited. If the result',
    'includes violations, call `mcp__deslint__analyze_and_fix` to preview the',
    'autofixed source, then apply the diff.',
    '',
    'Deslint runs locally, uses zero LLM inference, and your code never leaves',
    'your machine.',
    '',
  ].join('\n');
}

/** Per-agent preferred rules files, in priority order. First existing
 *  file wins; if none exist, the first entry is created. */
const AGENT_RULES_FILES: Record<AgentKind, string[]> = {
  // Claude Code reads both; CLAUDE.md is the older convention and
  // most repos have one already.
  claude: ['CLAUDE.md', 'AGENTS.md'],
  cursor: ['.cursorrules', 'AGENTS.md'],
  codex: ['AGENTS.md', 'codex.md'],
  windsurf: ['.windsurfrules', 'AGENTS.md'],
};

function pickRulesFile(
  cwd: string,
  agent: AgentKind,
): { absPath: string; wasExisting: boolean } | null {
  const candidates = AGENT_RULES_FILES[agent];
  for (const name of candidates) {
    const full = join(cwd, name);
    if (existsSync(full)) return { absPath: full, wasExisting: true };
  }
  // Nothing existing — create the first (primary) choice.
  return { absPath: join(cwd, candidates[0]!), wasExisting: false };
}

function renderScanSummary(s: ScanSummary, log: (line: string) => void): void {
  log('');
  if (s.score === null) {
    log('  Design Health Score: N/A');
    log('  (no class/style attributes found — Deslint class-based rules don\'t apply here)');
    return;
  }
  log(`  Design Health Score: ${s.score}/100 (grade: ${s.grade})`);
  const parts: string[] = [
    `${s.totalFiles} files`,
    `${s.warnings} warnings`,
    `${s.errors} errors`,
  ];
  if (s.parseErrors > 0) parts.push(`${s.parseErrors} parse errors`);
  log(`  ${parts.join(' · ')}`);
  if (s.topRules.length > 0) {
    log('');
    log('  Top issues:');
    for (const r of s.topRules) {
      const label = r.ruleId.replace(/^deslint\//, '');
      log(`    ${String(r.count).padStart(4)}×  ${label}`);
    }
  }
  log('');
  log('  Full report:  npx deslint scan');
}

function safeRead(path: string): string {
  try {
    return readFileSync(path, 'utf-8');
  } catch {
    return '';
  }
}

function relPathOrAbs(cwd: string, absPath: string): string {
  const rel = relative(cwd, absPath);
  return rel && !rel.startsWith('..') && !isAbsolute(rel) ? rel : absPath;
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
