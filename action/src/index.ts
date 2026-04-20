import * as core from '@actions/core';
import * as github from '@actions/github';
import { evaluateQualityGate, formatGateResult } from '@deslint/shared';
import { getChangedFiles } from './changed-files.js';
import { runProjectScan, runScan } from './scan.js';
import { formatComment } from './comment.js';
import { postInlineReview } from './review.js';
import { verifyTrailer, formatTrailerSection } from './trailer.js';
import { verifySignature, formatSignatureSection } from './verify-signature.js';
import { buildAgentScorecard, formatAgentScorecardSection } from './agent-scorecard.js';
import { computeTokenDrift, formatTokenDriftSection } from './token-drift.js';

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

    // When the scan had no applicable input (score === null), the gate
    // evaluator still needs a numeric floor; pass 100 so rule-count
    // conditions are the only thing that can fail the gate. The action
    // output below surfaces the N/A state separately so reviewers see
    // the real picture.
    const gateOverall = result.score ?? 100;
    const gateResult = evaluateQualityGate(result.qualityGate, {
      overall: gateOverall,
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
        // Trailer compares a committed numeric claim; use 100 as the
        // floor when the scan wasn't applicable so a N/A scan doesn't
        // implode the verifier. The trailer section still surfaces the
        // mismatch if the commit claimed a non-100 score.
        score: projectScan.score ?? 100,
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

    // Per-agent scorecard: attribute inline violations to authoring
    // agents (Claude / Cursor / Codex / Copilot / Windsurf / humans)
    // via `git blame`. Skipped when shallow checkout — we emit a hint
    // so the user knows to set `fetch-depth: 0`.
    const agentScorecardEnabled = core.getInput('agent-scorecard') !== 'false';
    let scorecardSection = '';
    let scorecardEntries: Array<Record<string, unknown>> = [];
    if (agentScorecardEnabled && result.inlineViolations.length > 0) {
      const prCommitShas = await fetchPrCommitShas(octokit, owner, repo, prNumber);
      const scorecard = buildAgentScorecard({
        workingDirectory,
        violations: result.inlineViolations,
        prCommitShas,
      });
      scorecardSection = formatAgentScorecardSection(scorecard);
      scorecardEntries = scorecard.entries.map((e) => ({
        agent: e.agent.label,
        kind: e.agent.kind,
        violations: e.violations,
        files: e.files,
        byRule: e.byRule,
      }));
      core.info(`Agent scorecard: ${scorecard.status} (${scorecard.entries.length} agents).`);
    }

    // Token drift: diff `designSystem` tokens between base and head so
    // a silent color rename doesn't sneak through review. Skipped when
    // the PR makes no config change or the base ref isn't available
    // (shallow checkout surfaces a hint rather than failing the job).
    const tokenDriftEnabled = core.getInput('token-drift') !== 'false';
    let tokenDriftSection = '';
    let tokenDriftSummary: Record<string, unknown> = {
      added: 0,
      removed: 0,
      changed: 0,
      status: 'skipped',
    };
    if (tokenDriftEnabled) {
      const baseSha = context.payload.pull_request.base?.sha ?? '';
      if (baseSha) {
        const drift = computeTokenDrift({ workingDirectory, baseRef: baseSha });
        tokenDriftSection = formatTokenDriftSection(drift);
        tokenDriftSummary = {
          status: drift.status,
          added: drift.drift.added.length,
          removed: drift.drift.removed.length,
          changed: drift.drift.changed.length,
          added_paths: drift.drift.added.map((e) => e.path),
          removed_paths: drift.drift.removed.map((e) => e.path),
          changed_paths: drift.drift.changed.map((c) => c.path),
        };
        core.info(
          `Token drift: ${drift.status} ` +
            `(+${drift.drift.added.length} / -${drift.drift.removed.length} / ~${drift.drift.changed.length}).`,
        );
      }
    }

    const commentBody =
      formatComment(result, minScore, gateResult) +
      trailerSection +
      signatureSection +
      scorecardSection +
      tokenDriftSection;
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
        result.score ?? 100,
        maxInlineComments,
      );
    }

    // Score output: emit "N/A" literally when the scan wasn't
    // applicable so downstream workflow steps can branch on it cleanly
    // rather than parsing a misleading number.
    core.setOutput('score', result.score === null ? 'N/A' : String(result.score));
    core.setOutput('applicable', String(result.score !== null));
    core.setOutput('total-violations', String(result.totalViolations));
    core.setOutput('debt-minutes', String(result.debtMinutes));
    core.setOutput('quality-gate-passed', String(gateResult.passed));
    core.setOutput('trailer-verified', String(trailerVerified));
    core.setOutput('trailer-status', trailerStatus);
    core.setOutput('signature-verified', String(signatureVerified));
    core.setOutput('signature-status', signature.status);
    core.setOutput('agent-breakdown', JSON.stringify(scorecardEntries));
    core.setOutput('token-drift', JSON.stringify(tokenDriftSummary));
    // `passed` stays true for N/A scans — we can't fail on a score we
    // don't have. min-score gate below mirrors this by skipping rather
    // than failing when the score is null.
    const minScorePassed = result.score === null || result.score >= minScore;
    core.setOutput('passed', String(minScorePassed && gateResult.passed));

    if (result.score === null) {
      core.info(
        'Design Health Score is N/A — no class or style attributes detected ' +
          'in the changed files. Skipping min-score gate.',
      );
    } else if (minScore > 0 && result.score < minScore) {
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

async function fetchPrCommitShas(
  octokit: ReturnType<typeof github.getOctokit>,
  owner: string,
  repo: string,
  prNumber: number,
): Promise<Set<string>> {
  const shas = new Set<string>();
  let page = 1;
  const perPage = 100;
  while (true) {
    const { data } = await octokit.rest.pulls.listCommits({
      owner,
      repo,
      pull_number: prNumber,
      per_page: perPage,
      page,
    });
    for (const c of data) shas.add(c.sha);
    if (data.length < perPage) break;
    page++;
  }
  return shas;
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
