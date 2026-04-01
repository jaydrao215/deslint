/**
 * Vizlint GitHub Action: PR Design Review
 *
 * Runs vizlint scan on changed files in a PR and posts a comment
 * with the Design Health Score, violations, and suggestions.
 */

import * as core from '@actions/core';
import * as github from '@actions/github';
import { getChangedFiles } from './changed-files.js';
import { runScan } from './scan.js';
import { formatComment } from './comment.js';

const COMMENT_MARKER = '<!-- vizlint-design-review -->';

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
      core.info('Not a pull request event — skipping Vizlint design review.');
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

    // 2. Run vizlint scan
    const result = await runScan(changedFiles, workingDirectory, configPath);

    // 3. Format and post comment
    const commentBody = formatComment(result, minScore);
    await upsertComment(octokit, owner, repo, prNumber, commentBody);

    // 4. Set outputs
    core.setOutput('score', String(result.score));
    core.setOutput('total-violations', String(result.totalViolations));
    core.setOutput('passed', String(result.score >= minScore));

    // 5. Fail check if below threshold
    if (minScore > 0 && result.score < minScore) {
      core.setFailed(
        `Design Health Score ${result.score} is below the minimum threshold of ${minScore}.`,
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    core.setFailed(`Vizlint action failed: ${message}`);
  }
}

/**
 * Find and update existing Vizlint comment, or create a new one.
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
    core.info('Updating existing Vizlint comment...');
    await octokit.rest.issues.updateComment({
      owner,
      repo,
      comment_id: existing.id,
      body: fullBody,
    });
  } else {
    core.info('Creating new Vizlint comment...');
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
    '## Vizlint Design Review',
    '',
    'No frontend files were changed in this PR. Design review skipped.',
    '',
    '---',
    '*Powered by [Vizlint](https://vizlint.dev)*',
  ].join('\n');
}

run();
