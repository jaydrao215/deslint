/**
 * Token-drift diff: compare the `designSystem` block of the PR's base
 * `.deslintrc.json` against the head version, and render a per-PR
 * drift table (added / removed / changed tokens).
 *
 * Reviewers routinely miss silent token renames — a single color
 * token shifting from `#1A5276` to `#2C3E50` rolls out everywhere the
 * token is referenced without any code change. Surfacing the drift at
 * the PR gate turns those silent ripples into a reviewable diff.
 *
 * Pipeline:
 *   1. `git show <baseSha>:.deslintrc.json` → base config (or null when
 *      the PR introduces the config for the first time).
 *   2. Read the head `.deslintrc.json` from the working tree.
 *   3. Parse both through `safeParseConfig` so a malformed config
 *      degrades gracefully rather than crashing the job.
 *   4. Flatten nested `designSystem` records to `{ path, value }`
 *      pairs and diff them.
 *
 * Dependency-injected: tests pass a stub `readRef` / `readFile` so the
 * suite runs without invoking git or the filesystem.
 */
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { safeParseConfig, type DesignSystem } from '@deslint/shared';

export interface TokenEntry {
  /** Dotted path, e.g. `colors.primary` or `typography.fontSize.body`. */
  path: string;
  /** Stringified value (numbers stringified for uniform compare). */
  value: string;
}

export interface TokenChange {
  path: string;
  from: string;
  to: string;
}

export interface TokenDrift {
  added: TokenEntry[];
  removed: TokenEntry[];
  changed: TokenChange[];
}

export type TokenDriftStatus =
  | 'ok'
  | 'unchanged'
  | 'no-base-config'
  | 'no-head-config'
  | 'base-ref-unavailable'
  | 'config-malformed'
  | 'skipped';

export interface TokenDriftResult {
  status: TokenDriftStatus;
  drift: TokenDrift;
  /** Short human-readable one-liner, surfaced in logs + PR comment
   *  when the diff can't run normally. */
  message?: string;
}

export interface ComputeTokenDriftInput {
  workingDirectory: string;
  /** Relative to `workingDirectory`. Defaults to `.deslintrc.json`. */
  configPath?: string;
  /** Base SHA or ref for the PR (e.g. `context.payload.pull_request.base.sha`). */
  baseRef: string;
}

export interface TokenDriftDeps {
  /** Read a path at a git ref. Return `null` when the path does not
   *  exist at that ref. Throw for genuine I/O failures (e.g. repo
   *  corruption) — caller converts to `base-ref-unavailable`. */
  readRef?: (args: { cwd: string; ref: string; relPath: string }) => string | null;
  /** Read a path from the working tree. Return `null` when the file
   *  does not exist. Throw for I/O failures. */
  readFile?: (absPath: string) => string | null;
}

const DEFAULT_CONFIG = '.deslintrc.json';

const EMPTY_DRIFT: TokenDrift = { added: [], removed: [], changed: [] };

export function flattenDesignSystem(ds: DesignSystem | undefined): TokenEntry[] {
  if (!ds) return [];
  const out: TokenEntry[] = [];
  const push = (p: string, v: unknown): void => {
    if (v === undefined || v === null) return;
    out.push({ path: p, value: String(v) });
  };
  const walkRecord = (prefix: string, rec: Record<string, unknown> | undefined): void => {
    if (!rec) return;
    for (const [k, v] of Object.entries(rec)) push(`${prefix}.${k}`, v);
  };

  walkRecord('colors', ds.colors as Record<string, unknown> | undefined);
  walkRecord('spacing', ds.spacing as Record<string, unknown> | undefined);
  walkRecord('borderRadius', ds.borderRadius as Record<string, unknown> | undefined);
  walkRecord('fonts', ds.fonts as Record<string, unknown> | undefined);
  if (ds.typography) {
    walkRecord('typography.fontSize', ds.typography.fontSize as Record<string, unknown> | undefined);
    walkRecord('typography.fontWeight', ds.typography.fontWeight as Record<string, unknown> | undefined);
    walkRecord('typography.leading', ds.typography.leading as Record<string, unknown> | undefined);
    walkRecord('typography.tracking', ds.typography.tracking as Record<string, unknown> | undefined);
  }
  return out.sort((a, b) => a.path.localeCompare(b.path));
}

export function diffTokens(base: TokenEntry[], head: TokenEntry[]): TokenDrift {
  const baseMap = new Map(base.map((e) => [e.path, e.value]));
  const headMap = new Map(head.map((e) => [e.path, e.value]));
  const added: TokenEntry[] = [];
  const removed: TokenEntry[] = [];
  const changed: TokenChange[] = [];

  for (const [p, v] of headMap) {
    const prior = baseMap.get(p);
    if (prior === undefined) added.push({ path: p, value: v });
    else if (prior !== v) changed.push({ path: p, from: prior, to: v });
  }
  for (const [p, v] of baseMap) {
    if (!headMap.has(p)) removed.push({ path: p, value: v });
  }

  const byPath = (a: { path: string }, b: { path: string }): number =>
    a.path.localeCompare(b.path);
  return { added: added.sort(byPath), removed: removed.sort(byPath), changed: changed.sort(byPath) };
}

export function computeTokenDrift(
  input: ComputeTokenDriftInput,
  deps: TokenDriftDeps = {},
): TokenDriftResult {
  const cwd = path.resolve(input.workingDirectory);
  const relPath = input.configPath ?? DEFAULT_CONFIG;
  const absPath = path.resolve(cwd, relPath);

  const readRef = deps.readRef ?? defaultReadRef;
  const readFile = deps.readFile ?? defaultReadFile;

  let baseRaw: string | null;
  try {
    baseRaw = readRef({ cwd, ref: input.baseRef, relPath });
  } catch (err) {
    return {
      status: 'base-ref-unavailable',
      drift: EMPTY_DRIFT,
      message:
        `Token drift: base ref \`${input.baseRef}\` is not available in the ` +
        `runner's git history (${errMsg(err)}). Add \`fetch-depth: 0\` to ` +
        `\`actions/checkout\` to enable the diff.`,
    };
  }

  const headRaw = readFile(absPath);

  if (headRaw === null && baseRaw === null) {
    return {
      status: 'skipped',
      drift: EMPTY_DRIFT,
      message: `No \`${relPath}\` on either side — nothing to diff.`,
    };
  }

  if (headRaw === null) {
    return {
      status: 'no-head-config',
      drift: EMPTY_DRIFT,
      message:
        `\`${relPath}\` was removed on this PR. Token drift will not be ` +
        `computed; if this is intentional, set \`token-drift: false\` in the ` +
        `Action inputs.`,
    };
  }

  const head = parseDesignSystem(headRaw);
  if (head.error) {
    return {
      status: 'config-malformed',
      drift: EMPTY_DRIFT,
      message: `\`${relPath}\` on the head commit is malformed: ${head.error}.`,
    };
  }

  if (baseRaw === null) {
    // New config — everything is "added" relative to a clean base.
    const added = flattenDesignSystem(head.designSystem);
    return {
      status: added.length > 0 ? 'ok' : 'unchanged',
      drift: { added, removed: [], changed: [] },
      message:
        added.length > 0
          ? `\`${relPath}\` is new on this PR.`
          : `\`${relPath}\` is new but has no \`designSystem\` tokens.`,
    };
  }

  const base = parseDesignSystem(baseRaw);
  if (base.error) {
    // Base-side parse failure: treat the PR as a fresh add rather than
    // fail the job. Reviewer still sees the head snapshot.
    const added = flattenDesignSystem(head.designSystem);
    return {
      status: 'ok',
      drift: { added, removed: [], changed: [] },
      message: `Base \`${relPath}\` at \`${input.baseRef}\` was malformed; diffing against an empty baseline.`,
    };
  }

  const drift = diffTokens(
    flattenDesignSystem(base.designSystem),
    flattenDesignSystem(head.designSystem),
  );
  const hasDrift = drift.added.length + drift.removed.length + drift.changed.length > 0;
  return hasDrift ? { status: 'ok', drift } : { status: 'unchanged', drift };
}

export function formatTokenDriftSection(r: TokenDriftResult): string {
  if (r.status === 'skipped' || r.status === 'unchanged') return '';

  const header = ['', '### Token drift', ''];

  if (r.status === 'no-head-config' || r.status === 'no-base-config') {
    return [...header, `\u2139\ufe0f ${r.message ?? ''}`, ''].join('\n');
  }

  if (r.status === 'config-malformed' || r.status === 'base-ref-unavailable') {
    return [...header, `\u26a0\ufe0f ${r.message ?? ''}`, ''].join('\n');
  }

  const total = r.drift.added.length + r.drift.removed.length + r.drift.changed.length;
  if (total === 0) return '';

  const lines: string[] = [
    ...header,
    r.message
      ? `${r.message}  \u2003Tokens changed on this PR: **${total}** (` +
        `+${r.drift.added.length} / -${r.drift.removed.length} / ~${r.drift.changed.length}).`
      : `Tokens changed on this PR: **${total}** (` +
        `+${r.drift.added.length} / -${r.drift.removed.length} / ~${r.drift.changed.length}).`,
    '',
  ];

  if (r.drift.changed.length > 0) {
    lines.push('| Token | Before | After |');
    lines.push('|-------|--------|-------|');
    for (const c of r.drift.changed) {
      lines.push(`| \`${c.path}\` | \`${c.from}\` | \`${c.to}\` |`);
    }
    lines.push('');
  }

  if (r.drift.added.length > 0) {
    lines.push('**Added**');
    lines.push('');
    for (const a of r.drift.added) {
      lines.push(`- \`${a.path}\` → \`${a.value}\``);
    }
    lines.push('');
  }

  if (r.drift.removed.length > 0) {
    lines.push('**Removed**');
    lines.push('');
    for (const rm of r.drift.removed) {
      lines.push(`- \`${rm.path}\` (was \`${rm.value}\`)`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

interface ParseOutcome {
  designSystem?: DesignSystem;
  error?: string;
}

function parseDesignSystem(raw: string): ParseOutcome {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (err) {
    return { error: `invalid JSON (${errMsg(err)})` };
  }
  const parsed = safeParseConfig(json);
  if (!parsed.success) {
    // Be lenient: if the root config is mangled but there's an object
    // at `.designSystem`, try to salvage the token snapshot from that
    // subtree directly. This keeps a malformed rule set from hiding a
    // legitimate token change.
    const root = json as { designSystem?: unknown };
    if (root && typeof root === 'object' && typeof root.designSystem === 'object') {
      return { designSystem: root.designSystem as DesignSystem };
    }
    return { error: parsed.error.issues.map((i) => i.message).join('; ') };
  }
  return { designSystem: parsed.data.designSystem };
}

function defaultReadRef(args: { cwd: string; ref: string; relPath: string }): string | null {
  try {
    return execFileSync('git', ['show', `${args.ref}:${args.relPath}`], {
      cwd: args.cwd,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch (err) {
    // `git show` exits 128 when the path doesn't exist at the ref.
    // We treat that as "no base config" rather than a fatal error.
    if (isMissingPath(err)) return null;
    throw err;
  }
}

function defaultReadFile(absPath: string): string | null {
  if (!fs.existsSync(absPath)) return null;
  return fs.readFileSync(absPath, 'utf-8');
}

function isMissingPath(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { status?: number; stderr?: Buffer | string };
  if (e.status === 128) return true;
  const stderr = e.stderr ? String(e.stderr) : '';
  return /exists on disk, but not in|does not exist|unknown revision|bad revision/i.test(stderr);
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
