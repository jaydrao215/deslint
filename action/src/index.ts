import * as core from '@actions/core';
import * as github from '@actions/github';
import { evaluateQualityGate, formatGateResult } from '@deslint/shared';
import { getChangedFiles } from './changed-files.js';
import { runProjectScan, runScan } from './scan.js';
import { formatComment } from './comment.js';
import { postInlineReview } from './review.js';
import { verifyTrailer, formatTrailerSection } from './trailer.js';
import { verifySignature, formatSignatureSection } from './verify-signature.js';

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

    if (!context.payload.pull_request) {
      core.info('Not a pull request event \u2014 skipping Deslint design review.');
      return;
    }

    const prNumber = context.payload.pull_request.number;
    const owner = context.repo.owner;
    const repo = context.repo.repo;

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

    const result = await runScan(changedFiles, workingDirectory, configPath);

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

    // Trailer verification: agent's claim vs Action's re-scan. Always runs so
    // a lying trailer is surfaced regardless of strict-trailer.
    const strictTrailer = core.getInput('strict-trailer') === 'true';
    let trailerSection = '';
    let trailerVerified = false;
    let trailerStatus: string = 'skipped';
    try {
      const headSha = context.payload.pull_request.head.sha;
      const { data: headCommit } = await octokit.rest.repos.getCommit({
        owner,
        repo,
        ref: headSha,
      });
      const commitMessage = headCommit.commit.message ?? '';
      const projectScan = await runProjectScan(workingDirectory, configPath);
      const verification = verifyTrailer({
        commitMessage,
        rules: projectScan.userRules,
        score: projectScan.score,
        fileCount: projectScan.filesScanned,
      });
      trailerSection = formatTrailerSection(verification);
      trailerVerified = verification.status === 'verified';
      trailerStatus = verification.status;
      core.info(`Trailer verification: ${verification.status} \u2014 ${verification.message}`);
    } catch (trailerErr) {
      const msg = trailerErr instanceof Error ? trailerErr.message : String(trailerErr);
      core.warning(`Trailer verification could not run: ${msg}`);
    }

    // Signature verification: gate a merge on a valid Sigstore bundle
    // signed over `.deslint/attestation.json`. Always runs so a missing
    // sidecar is surfaced; `require-signed` promotes missing/invalid to
    // a failing check.
    const requireSigned = core.getInput('require-signed') === 'true';
    const signature = await verifySignature({ workingDirectory });
    const signatureSection = formatSignatureSection(signature);
    const signatureVerified = signature.status === 'verified';
    core.info(`Signature verification: ${signature.status} \u2014 ${signature.message}`);

    const commentBody =
      formatComment(result, minScore, gateResult) + trailerSection + signatureSection;
    await upsertComment(octokit, owner, repo, prNumber, commentBody);

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

    core.setOutput('score', String(result.score));
    core.setOutput('total-violations', String(result.totalViolations));
    core.setOutput('debt-minutes', String(result.debtMinutes));
    core.setOutput('quality-gate-passed', String(gateResult.passed));
    core.setOutput('trailer-verified', String(trailerVerified));
    core.setOutput('trailer-status', trailerStatus);
    core.setOutput('signature-verified', String(signatureVerified));
    core.setOutput('signature-status', signature.status);
    core.setOutput('passed', String(result.score >= minScore && gateResult.passed));

    if (minScore > 0 && result.score < minScore) {
      core.setFailed(
        `Design Health Score ${result.score} is below the minimum threshold of ${minScore}.`,
      );
      return;
    }

    if (gateResult.enforced && !gateResult.passed) {
      core.setFailed(
        `Quality gate failed: ${gateResult.failures.map((f) => f.condition).join(', ')}`,
      );
    }

    if (strictTrailer && !trailerVerified) {
      core.setFailed(
        `Trailer verification failed (status: ${trailerStatus}). ` +
          `Re-run compliance_check / enforce_budget and commit with an ` +
          `up-to-date \`Deslint-Compliance:\` trailer.`,
      );
    }

    if (requireSigned && !signatureVerified) {
      core.setFailed(
        `Signature verification failed (status: ${signature.status}). ` +
          `Re-run \`deslint attest\` with \`DESLINT_ATTEST_SIGNER=sigstore\` and ` +
          `commit the updated \`.deslint/attestation.json\` + \`.sigstore\` ` +
          `sidecar, or set \`require-signed: false\` to skip this gate.`,
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    core.setFailed(`Deslint action failed: ${message}`);
  }
}

async function upsertComment(
  octokit: ReturnType<typeof github.getOctokit>,
  owner: string,
  repo: string,
  prNumber: number,
  body: string,
): Promise<void> {
  const fullBody = `${COMMENT_MARKER}\n${body}`;

  const { data: comments } = await octokit.rest.issues.listComments({
    owner,
    repo,
    issue_number: prNumber,
    per_page: 100,
  });

  const existing = comments.find((c) => c.body?.includes(COMMENT_MARKER));

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
