/**
 * Post inline PR review comments on specific lines with violations.
 *
 * Uses the GitHub "pull request review" API to batch all inline comments
 * into a single review, preventing notification spam. Each comment shows
 * the rule ID, a human-readable message, WCAG mapping (if applicable),
 * and an autofix — rendered as a one-click GitHub `suggestion` block
 * when we can prove the fix is visually lossless (see fix-safety.ts),
 * or as a read-only code block for opinionated/heuristic fixes.
 */

import * as core from '@actions/core';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { WCAG_RULE_MAP } from './wcag-map.js';
import { classifyFixSafety, type FixSafety } from './fix-safety.js';

export interface FileViolation {
  filePath: string;
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
  ruleId: string;
  message: string;
  severity: 'error' | 'warning';
  fix?: { range: [number, number]; text: string };
}

export interface ReviewOptions {
  /** When false, skip suggestion blocks entirely and post a plain
   *  violation comment. Default true. */
  suggestFixes?: boolean;
  /** Design-system tokens, used by the fix-safety classifier to prove
   *  a token-based replacement is byte-identical to the arbitrary
   *  value being replaced. */
  designSystem?: { colors?: Record<string, string> };
  /** Working directory — used to resolve violation `filePath` values
   *  when we read source files to compute the fixed line. */
  workingDirectory?: string;
}

interface ReviewComment {
  path: string;
  line: number;
  body: string;
}

type Octokit = {
  rest: {
    pulls: {
      createReview: (params: {
        owner: string;
        repo: string;
        pull_number: number;
        event: string;
        body: string;
        comments: ReviewComment[];
      }) => Promise<unknown>;
      listFiles: (params: {
        owner: string;
        repo: string;
        pull_number: number;
        per_page: number;
        page: number;
      }) => Promise<{
        data: Array<{
          filename: string;
          patch?: string;
        }>;
      }>;
    };
  };
};

/**
 * Get the set of lines that are part of the PR diff (additions only).
 * GitHub only allows review comments on lines visible in the diff.
 */
async function getDiffLines(
  octokit: Octokit,
  owner: string,
  repo: string,
  prNumber: number,
): Promise<Map<string, Set<number>>> {
  const diffLines = new Map<string, Set<number>>();
  let page = 1;

  while (true) {
    const { data } = await octokit.rest.pulls.listFiles({
      owner,
      repo,
      pull_number: prNumber,
      per_page: 100,
      page,
    });

    if (data.length === 0) break;

    for (const file of data) {
      if (!file.patch) continue;

      const lines = new Set<number>();
      let currentLine = 0;

      for (const patchLine of file.patch.split('\n')) {
        // Parse @@ hunk headers: @@ -a,b +c,d @@
        const hunkMatch = patchLine.match(/^@@ -\d+(?:,\d+)? \+(\d+)/);
        if (hunkMatch) {
          currentLine = parseInt(hunkMatch[1], 10);
          continue;
        }

        if (patchLine.startsWith('+')) {
          lines.add(currentLine);
          currentLine++;
        } else if (patchLine.startsWith('-')) {
          // Deleted line — don't increment
        } else {
          // Context line
          currentLine++;
        }
      }

      diffLines.set(file.filename, lines);
    }

    if (data.length < 100) break;
    page++;
  }

  return diffLines;
}

/**
 * Apply an ESLint autofix to a file and return the full line(s) of
 * replacement source. GitHub `suggestion` blocks require the complete
 * line content to replace, not a character-range patch — so we splice
 * the fix into the file in memory and return the resulting line(s).
 *
 * Returns `null` when the file is unreadable, the range is out of
 * bounds, or the fix would span a line count that differs from the
 * violation's reported line range (we refuse to synthesize multi-line
 * suggestions from a rule that only reported one line).
 */
export function buildFixedLines(
  absolutePath: string,
  violation: FileViolation,
): string | null {
  if (!violation.fix) return null;
  let source: string;
  try {
    source = fs.readFileSync(absolutePath, 'utf-8');
  } catch {
    return null;
  }
  const [start, end] = violation.fix.range;
  if (start < 0 || end > source.length || start > end) return null;

  const patched = source.slice(0, start) + violation.fix.text + source.slice(end);
  const startLine = violation.line;
  const endLine = violation.endLine ?? violation.line;
  const lines = patched.split(/\r?\n/);
  if (startLine < 1 || endLine > lines.length) return null;
  return lines.slice(startLine - 1, endLine).join('\n');
}

/**
 * Format an inline review comment body for a violation.
 *
 * Safety tiers emitted by classifyFixSafety decide how the fix is
 * rendered:
 *   - 'identical' / 'additive-safe' → GitHub `suggestion` block so the
 *      reviewer can commit the fix in one click.
 *   - 'heuristic' → plain code block with a "run `deslint fix` locally
 *      to apply" nudge. No magic button for opinionated replacements.
 *
 * When `suggestFixes` is false, the fix is not rendered at all.
 */
export function formatInlineComment(
  violation: FileViolation,
  options: {
    fixedLines?: string | null;
    safety?: FixSafety;
    suggestFixes?: boolean;
  } = {},
): string {
  const ruleName = violation.ruleId.replace('deslint/', '');
  const severityIcon = violation.severity === 'error' ? ':red_circle:' : ':yellow_circle:';
  const wcag = WCAG_RULE_MAP[violation.ruleId];

  const lines: string[] = [
    `${severityIcon} **deslint/${ruleName}**`,
    '',
    violation.message,
  ];

  if (wcag) {
    lines.push('');
    lines.push(`> WCAG ${wcag.criterion} — ${wcag.title} (Level ${wcag.level})`);
  }

  if (options.suggestFixes !== false && options.fixedLines != null) {
    lines.push('');
    if (options.safety === 'identical' || options.safety === 'additive-safe') {
      const rationale =
        options.safety === 'identical'
          ? '**Byte-identical autofix** — this token resolves to the same CSS value as the arbitrary one. Commit with one click.'
          : '**Additive autofix** — only adds a media-query modifier; no visual change for users in the default state.';
      lines.push(rationale);
      lines.push('');
      lines.push('```suggestion');
      lines.push(options.fixedLines);
      lines.push('```');
    } else {
      lines.push(
        'Proposed autofix (opinionated — run `deslint fix` locally to review before applying):',
      );
      lines.push('');
      lines.push('```');
      lines.push(options.fixedLines);
      lines.push('```');
    }
  }

  return lines.join('\n');
}

/**
 * Post inline review comments for all violations that fall on changed lines.
 * Returns the number of comments posted.
 */
export async function postInlineReview(
  octokit: Octokit,
  owner: string,
  repo: string,
  prNumber: number,
  violations: FileViolation[],
  score: number,
  maxComments: number = 25,
  reviewOptions: ReviewOptions = {},
): Promise<number> {
  if (violations.length === 0) return 0;

  // Get diff lines to filter comments to only changed lines
  const diffLines = await getDiffLines(octokit, owner, repo, prNumber);

  // Build review comments, filtering to lines in the diff
  const comments: ReviewComment[] = [];
  const seen = new Set<string>(); // Deduplicate: same file+line+rule
  const cwd = reviewOptions.workingDirectory ?? process.cwd();
  const suggestFixes = reviewOptions.suggestFixes !== false;

  for (const v of violations) {
    if (comments.length >= maxComments) break;

    const dedupeKey = `${v.filePath}:${v.line}:${v.ruleId}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const fileLines = diffLines.get(v.filePath);
    if (!fileLines || !fileLines.has(v.line)) continue;

    let fixedLines: string | null = null;
    let safety: FixSafety | undefined;
    if (suggestFixes && v.fix) {
      const absolutePath = path.resolve(cwd, v.filePath);
      fixedLines = buildFixedLines(absolutePath, v);
      if (fixedLines !== null) {
        const originalText = readOriginalRange(absolutePath, v.fix.range);
        safety = classifyFixSafety({
          ruleId: v.ruleId,
          originalText: originalText ?? '',
          replacementText: v.fix.text,
          designSystem: reviewOptions.designSystem,
        });
      }
    }

    comments.push({
      path: v.filePath,
      line: v.line,
      body: formatInlineComment(v, { fixedLines, safety, suggestFixes }),
    });
  }

  if (comments.length === 0) {
    core.info('No violations on changed lines — skipping inline review.');
    return 0;
  }

  // Build review summary
  const scoreBadge = score >= 90 ? ':white_check_mark:' : score >= 70 ? ':large_orange_diamond:' : ':red_circle:';
  const reviewBody = [
    `## ${scoreBadge} Deslint Inline Review`,
    '',
    `Found **${violations.length}** violation${violations.length === 1 ? '' : 's'} total.`,
    comments.length < violations.length
      ? `Showing ${comments.length} on changed lines (${violations.length - comments.length} on unchanged lines omitted).`
      : '',
    '',
    `Design Health Score: **${score}/100**`,
  ].filter(Boolean).join('\n');

  try {
    await octokit.rest.pulls.createReview({
      owner,
      repo,
      pull_number: prNumber,
      event: 'COMMENT',
      body: reviewBody,
      comments,
    });

    core.info(`Posted inline review with ${comments.length} comment(s).`);
    return comments.length;
  } catch (err) {
    // Don't fail the action if review posting fails — the summary comment is enough
    core.warning(`Failed to post inline review: ${err instanceof Error ? err.message : String(err)}`);
    return 0;
  }
}

function readOriginalRange(
  absolutePath: string,
  range: [number, number],
): string | null {
  try {
    const source = fs.readFileSync(absolutePath, 'utf-8');
    const [start, end] = range;
    if (start < 0 || end > source.length || start > end) return null;
    return source.slice(start, end);
  } catch {
    return null;
  }
}
