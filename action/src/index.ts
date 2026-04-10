/**
 * Deslint GitHub Action: PR Design Review
 *
 * Runs deslint scan on changed files in a PR and posts a comment
 * with the Design Health Score, violations, and suggestions.
 */

import * as core from '@actions/core';
import * as github from '@actions/github';
import { evaluateQualityGate, formatGateResult } from '@deslint/shared';
import { getChangedFiles } from './changed-files.js';
import { runScan } from './scan.js';
import { formatComment } from './comment.js';
import { postInlineReview } from './review.js';

const COMMENT_MARKER = '<!-- deslint-design-review -->';

async function run(): Promise<void> {
  try {
    const token = core.getInput('github-token', { required: true });
    const minScore = parseInt(core.getInput('min-score') || '0', 10);
    const configPath = core.getInput('config-path') || undefined;
    const workingDirectory = core.getInput('working-directory') || '.';
    const filePatterns = core.getInput('file-patterns')
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);

    const octokit = github.getOctokit(token);
    const { context } = github;

    // This action only works on pull_request events
    if (!context.payload.pull_request) {
      core.info('Not a pull request event — skipping Deslint design review.');
      return;
    }

    const prNumber = context.payload.pull_request.number;
    const owner = context.repo.owner;
    const repo = context.repo.repo;

    // 1. Get changed files in the PR
    core.info('Fetching changed files...');
    const changedFiles = await getChangedFiles(octokit, owner, repo, prNumber, filePatterns);

    if (changedFiles.length === 0) {
      core.info('No frontend files changed in this PR. Skipping scan.');
      await upsertComment(octokit, owner, repo, prNumber, formatNoFilesComment());
      core.setOutput('score', '100');
      core.setOutput('total-violations', '0');
      core.setOutput('passed', 'true');
      return;
    }

    core.info(`Scanning ${changedFiles.length} changed file(s)...`);

    // 2. Run deslint scan
    const result = await runScan(changedFiles, workingDirectory, configPath);

    // 3. Evaluate quality gate (opt-in via .deslintrc.json `qualityGate`).
    const gateResult = evaluateQualityGate(result.qualityGate, {
      overall: result.score,
      categories: {
        colors: result.categories.find((c) => c.name === 'colors')?.score ?? 100,
        spacing: result.categories.find((c) => c.name === 'spacing')?.score ?? 100,
        typography: result.categories.find((c) => c.name === 'typography')?.score ?? 100,
        responsive: result.categories.find((c) => c.name === 'responsive')?.score ?? 100,
        consistency: result.categories.find((c) => c.name === 'consistency')?.score ?? 100,
      },
      totalViolations: result.totalViolations,
      debtMinutes: result.debtMinutes,
    });

    if (gateResult.conditionsChecked > 0) {
      core.info(formatGateResult(gateResult));
    }

    // 4. Format and post summary comment
    const commentBody = formatComment(result, minScore, gateResult);
    await upsertComment(octokit, owner, repo, prNumber, commentBody);

    // 4b. Post inline review comments on changed lines
    const inlineReview = core.getInput('inline-review') !== 'false';
    const maxInlineComments = parseInt(core.getInput('max-inline-comments') || '25', 10);
    if (inlineReview && result.inlineViolations.length > 0) {
      await postInlineReview(
        octokit as any,
        owner,
        repo,
        prNumber,
        result.inlineViolations,
        result.score,
        maxInlineComments,
      );
    }

    // 5. Set outputs
    core.setOutput('score', String(result.score));
    core.setOutput('total-violations', String(result.totalViolations));
    core.setOutput('debt-minutes', String(result.debtMinutes));
    core.setOutput('quality-gate-passed', String(gateResult.passed));
    core.setOutput('passed', String(result.score >= minScore && gateResult.passed));

    // 6. Fail check if below `min-score` input threshold (legacy behavior).
    if (minScore > 0 && result.score < minScore) {
      core.setFailed(
        `Design Health Score ${result.score} is below the minimum threshold of ${minScore}.`,
      );
      return;
    }

    // 7. Fail check if quality gate is enforced AND failed (opt-in).
    if (gateResult.enforced && !gateResult.passed) {
      core.setFailed(
        `Quality gate failed: ${gateResult.failures.map((f) => f.condition).join(', ')}`,
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    core.setFailed(`Deslint action failed: ${message}`);
  }
}

/**
 * Find and update existing Deslint comment, or create a new one.
 * Prevents duplicate comments on subsequent pushes.
 */
async function upsertComment(
  octokit: ReturnType<typeof github.getOctokit>,
  owner: string,
  repo: string,
  prNumber: number,
  body: string,
): Promise<void> {
  const fullBody = `${COMMENT_MARKER}\n${body}`;

  // Search for existing comment
  const { data: comments } = await octokit.rest.issues.listComments({
    owner,
    repo,
    issue_number: prNumber,
    per_page: 100,
  });

  const existing = comments.find(
    (c) => c.body?.includes(COMMENT_MARKER),
  );

  if (existing) {
    core.info('Updating existing Deslint comment...');
    await octokit.rest.issues.updateComment({
      owner,
      repo,
      comment_id: existing.id,
      body: fullBody,
    });
  } else {
    core.info('Creating new Deslint comment...');
    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body: fullBody,
    });
  }
}

function formatNoFilesComment(): string {
  return [
    '## Deslint Design Review',
    '',
    'No frontend files were changed in this PR. Design review skipped.',
    '',
    '---',
    '*Powered by [Deslint](https://deslint.com)*',
  ].join('\n');
}

run();
