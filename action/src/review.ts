/**
 * Post inline PR review comments on specific lines with violations.
 *
 * Uses the GitHub "pull request review" API to batch all inline comments
 * into a single review, preventing notification spam. Each comment shows
 * the rule ID, a human-readable message, WCAG mapping (if applicable),
 * and the suggested fix (if auto-fixable).
 */

import * as core from '@actions/core';
import { WCAG_RULE_MAP } from './wcag-map.js';

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
 * Format an inline review comment body for a violation.
 */
function formatInlineComment(violation: FileViolation): string {
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
): Promise<number> {
  if (violations.length === 0) return 0;

  // Get diff lines to filter comments to only changed lines
  const diffLines = await getDiffLines(octokit, owner, repo, prNumber);

  // Build review comments, filtering to lines in the diff
  const comments: ReviewComment[] = [];
  const seen = new Set<string>(); // Deduplicate: same file+line+rule

  for (const v of violations) {
    if (comments.length >= maxComments) break;

    const dedupeKey = `${v.filePath}:${v.line}:${v.ruleId}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const fileLines = diffLines.get(v.filePath);
    if (!fileLines || !fileLines.has(v.line)) continue;

    comments.push({
      path: v.filePath,
      line: v.line,
      body: formatInlineComment(v),
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
