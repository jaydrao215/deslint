import { computeTrailer, parseTrailer, TRAILER_LABEL } from '@deslint/shared';

/** Action re-runs and judges the commit trailer. Mismatch is surfaced
 *  in the PR comment regardless of strict-trailer; strict promotes a
 *  mismatch to a failing check. */
export type TrailerStatus = 'verified' | 'missing' | 'mismatched' | 'malformed';

export interface TrailerVerification {
  status: TrailerStatus;
  claimed?: {
    rulesetHash: string;
    score: number;
    fileCount: number;
  };
  actual: {
    rulesetHash: string;
    score: number;
    fileCount: number;
  };
  message: string;
}

export interface VerifyTrailerInput {
  commitMessage: string;
  rules: Record<string, unknown>;
  score: number;
  fileCount: number;
}

export function verifyTrailer(input: VerifyTrailerInput): TrailerVerification {
  const expected = computeTrailer({
    rules: input.rules,
    score: input.score,
    fileCount: input.fileCount,
  });
  const [expectedHash, expectedScore, expectedFiles] = expected.split('.');
  const actual = {
    rulesetHash: expectedHash,
    score: Number.parseInt(expectedScore, 10),
    fileCount: Number.parseInt(expectedFiles, 10),
  };

  const trailerRegex = new RegExp(`${TRAILER_LABEL}\\s*:`);
  if (!trailerRegex.test(input.commitMessage)) {
    return {
      status: 'missing',
      actual,
      message: `No \`${TRAILER_LABEL}:\` trailer found on the head commit.`,
    };
  }

  const parsed = parseTrailer(input.commitMessage);
  if (!parsed) {
    return {
      status: 'malformed',
      actual,
      message:
        `Found a \`${TRAILER_LABEL}:\` line but could not parse it ` +
        `(expected \`<sha16>.<score>.<fileCount>\`).`,
    };
  }

  if (
    parsed.rulesetHash === actual.rulesetHash &&
    parsed.score === actual.score &&
    parsed.fileCount === actual.fileCount
  ) {
    return {
      status: 'verified',
      claimed: parsed,
      actual,
      message:
        `Agent-loop verification: trailer matched the server-side re-scan ` +
        `(score ${actual.score}, files ${actual.fileCount}).`,
    };
  }

  const parts: string[] = [];
  if (parsed.rulesetHash !== actual.rulesetHash) {
    parts.push(
      `ruleset changed (claimed ${parsed.rulesetHash}, actual ${actual.rulesetHash})`,
    );
  }
  if (parsed.score !== actual.score) {
    parts.push(`score drifted (claimed ${parsed.score}, actual ${actual.score})`);
  }
  if (parsed.fileCount !== actual.fileCount) {
    parts.push(
      `file-count drifted (claimed ${parsed.fileCount}, actual ${actual.fileCount})`,
    );
  }
  return {
    status: 'mismatched',
    claimed: parsed,
    actual,
    message:
      `Trailer did not match server-side re-scan: ${parts.join('; ')}. ` +
      `The agent's compliance claim is not trustworthy.`,
  };
}

export function formatTrailerSection(v: TrailerVerification): string {
  const prefix =
    v.status === 'verified'
      ? '\u2705'
      : v.status === 'missing'
        ? '\u2139\ufe0f'
        : v.status === 'malformed'
          ? '\u26a0\ufe0f'
          : '\u274c';
  return [
    '',
    '### Agent-loop verification',
    '',
    `${prefix} ${v.message}`,
    '',
  ].join('\n');
}
