/**
 * Git-diff scoping helpers for `deslint scan --diff <ref>`.
 *
 * Design notes:
 *  - We shell out to `git diff --unified=0 --no-color --find-renames <ref>`
 *    via `execFileSync` (never `exec`) so the ref argument cannot inject
 *    shell metacharacters.
 *  - We parse only the `diff --git` / `+++` / `@@` lines we need; we do not
 *    try to be a general-purpose diff parser.
 *  - "Added lines" are what we care about: a violation introduced by the
 *    PR lives on a line that appears in the new file. Context lines and
 *    deleted lines are irrelevant for scope.
 *  - When a ref is unresolvable, git is missing, or the repo is shallow
 *    to the point of lacking `<ref>`, we throw with a clear message. We
 *    do NOT silently fall back to file-scope — the user asked for diff
 *    mode and silent widening would hide bugs.
 *  - Renames are treated as a new file: a violation in the new path
 *    counts whether or not the line existed under the old name.
 */

import { execFileSync } from 'node:child_process';
import { resolve, isAbsolute } from 'node:path';
import { aggregateResults } from './lint-runner.js';
import type { LintResult, LintFileResult } from './lint-runner.js';

/** A contiguous range of added line numbers `[start, end]` (inclusive, 1-based). */
export type AddedRange = [number, number];

/**
 * Result of parsing `git diff` for scoping.
 * - `files` maps absolute file paths to the set of added line ranges.
 * - A file in `files` with an empty range array means "file changed but
 *   no lines were added" (pure deletion); scan should still visit it so
 *   rules that read imports/structure can report file-level issues, but
 *   line-based filtering will drop everything.
 */
export interface DiffScope {
  files: Map<string, AddedRange[]>;
}

/**
 * Run `git diff` against `baseRef` and return the set of added line
 * ranges per file, relative to `cwd`.
 *
 * Throws with a clear message if git is not available, the ref does not
 * exist, or the working directory is not a git checkout.
 */
export function gitDiffAddedRanges(
  baseRef: string,
  cwd: string = process.cwd(),
): DiffScope {
  // Guard: refuse suspiciously shaped refs. Git itself would reject most
  // shell-metacharacter refs, but we enforce a belt-and-braces rule here:
  // refs may not start with `-` (to block option injection even through
  // execFile) and must not be empty. Real refs (branch names, tags,
  // SHAs, `HEAD~1`, `origin/main`, etc.) all satisfy this.
  if (!baseRef || baseRef.startsWith('-')) {
    throw new Error(
      `Invalid git ref "${baseRef}". Use a branch name, tag, SHA, or HEAD~N.`,
    );
  }

  let raw: string;
  try {
    raw = execFileSync(
      'git',
      ['diff', '--unified=0', '--no-color', '--find-renames', baseRef],
      { cwd, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Probe whether git itself is the problem vs. the ref.
    try {
      execFileSync('git', ['--version'], { cwd, stdio: 'ignore' });
    } catch {
      throw new Error(
        'git is not available on PATH. `deslint scan --diff` requires git; install it or drop the flag.',
      );
    }
    throw new Error(
      `git diff ${baseRef} failed. Is the ref reachable in this checkout? (Shallow clones often do not contain older refs.) Original error: ${msg}`,
    );
  }

  return parseUnifiedDiff(raw, cwd);
}

/**
 * Parse a unified-diff string (output of `git diff --unified=0 --no-color`)
 * into a DiffScope. Exported for unit tests so we can feed synthetic diffs
 * without touching git.
 */
export function parseUnifiedDiff(raw: string, cwd: string): DiffScope {
  const files = new Map<string, AddedRange[]>();

  // Per-file state
  let currentFile: string | undefined;

  const lines = raw.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // `diff --git a/... b/...` starts a new file. We rely on the later
    // `+++` line for the new path (handles renames correctly because
    // `diff --git` may show the old path in its "a/" half).
    if (line.startsWith('diff --git ')) {
      currentFile = undefined;
      continue;
    }

    // `+++ b/<path>` or `+++ /dev/null` (deletion).
    if (line.startsWith('+++ ')) {
      const path = line.slice(4);
      if (path === '/dev/null') {
        currentFile = undefined;
        continue;
      }
      // Strip the leading `b/` that git uses for the "after" side. Real
      // paths that start with `b/` are preserved when `-b/` prefix is
      // disabled via `--no-prefix`, but we always invoke git without
      // `--no-prefix`, so stripping is safe here.
      const cleaned = path.startsWith('b/') ? path.slice(2) : path;
      const abs = isAbsolute(cleaned) ? cleaned : resolve(cwd, cleaned);
      currentFile = abs;
      if (!files.has(abs)) files.set(abs, []);
      continue;
    }

    // `@@ -<old>,<count> +<new>,<count> @@` hunk header.
    // With --unified=0, the new-side tuple tells us exactly which lines
    // were added. A count of 0 means a pure deletion at that point; we
    // skip those because they introduce no new content to lint.
    if (currentFile && line.startsWith('@@ ')) {
      const match = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/.exec(line);
      if (!match) continue;
      const startRaw = match[1];
      const countRaw = match[2];
      const start = Number.parseInt(startRaw, 10);
      // When the count is omitted, it defaults to 1.
      const count = countRaw === undefined ? 1 : Number.parseInt(countRaw, 10);
      if (!Number.isFinite(start) || !Number.isFinite(count) || count <= 0) continue;
      const end = start + count - 1;
      const ranges = files.get(currentFile)!;
      ranges.push([start, end]);
      continue;
    }
  }

  return { files };
}

/**
 * Does `line` (1-based) fall within any of the given ranges?
 */
export function lineInRanges(line: number, ranges: AddedRange[]): boolean {
  for (const [start, end] of ranges) {
    if (line >= start && line <= end) return true;
  }
  return false;
}

/**
 * Does the message's range `[line..endLine]` intersect any added range?
 * A violation's reported location is typically a single line, but some
 * rules report spans (e.g. an entire JSX element). We count the violation
 * as "in scope" if any line of its span was added.
 */
export function messageInScope(
  msg: { line: number; endLine?: number },
  ranges: AddedRange[],
): boolean {
  const start = msg.line;
  const end = msg.endLine ?? msg.line;
  for (const [rStart, rEnd] of ranges) {
    // Interval intersection
    if (start <= rEnd && end >= rStart) return true;
  }
  return false;
}

/**
 * Narrow a LintResult to only violations that fall inside added hunks
 * and re-aggregate totals so downstream scoring stays consistent.
 *
 * Files absent from `scope.files` are removed entirely; files present
 * but with zero overlapping violations are retained so callers can see
 * "N files touched, 0 new violations" rather than appearing to scan
 * nothing. Totals (`totalViolations`, `byRule`, `byCategory`,
 * `bySeverity`, `filesWithViolations`, `parseErrors`) are recomputed
 * from the filtered messages via `aggregateResults`.
 *
 * Note on the plan's "JSX spans a hunk boundary" edge case: we use
 * inclusive interval intersection in `messageInScope`, so a violation
 * whose reported span starts *before* the hunk and ends *inside* it
 * survives. That is the widening the plan prescribes — documented here
 * so future readers don't "optimize" it to strict containment.
 */
export function filterLintResultByHunks(
  lintResult: LintResult,
  scope: DiffScope,
): LintResult {
  const filteredResults: LintFileResult[] = [];
  for (const r of lintResult.results) {
    const ranges = scope.files.get(r.filePath);
    if (!ranges) continue; // file not in diff
    const messages = r.messages.filter((m) => messageInScope(m, ranges));
    filteredResults.push({ ...r, messages });
  }
  return aggregateResults(filteredResults);
}
