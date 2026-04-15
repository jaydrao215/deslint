import { createHash } from 'node:crypto';

/** Commit-trailer label. Format:
 *    Deslint-Compliance: <16-hex rulesetHash>.<score 0-100>.<fileCount>
 *  The trailer is the agent's CLAIM; the Action re-scans as JUDGE. */
export const TRAILER_LABEL = 'Deslint-Compliance';

export interface ParsedTrailer {
  rulesetHash: string;
  score: number;
  fileCount: number;
}

export interface TrailerInput {
  /** User-declared rule overrides from .deslintrc.json (or {} when absent).
   *  We hash user overrides only so CLI/MCP/Action don't need byte-identical
   *  default rule maps. User overrides are what genuinely invalidate claims. */
  rules: Record<string, unknown>;
  score: number;
  fileCount: number;
}

export function computeRulesetHash(rules: Record<string, unknown>): string {
  const normalized: Record<string, string> = {};
  for (const [k, v] of Object.entries(rules)) {
    const key = k.startsWith('deslint/') ? k : `deslint/${k}`;
    normalized[key] = String(v);
  }
  const keys = Object.keys(normalized).sort();
  const canonical: Array<[string, string]> = keys.map((k) => [k, normalized[k]]);
  const serialized = JSON.stringify(canonical);
  return createHash('sha256').update(serialized).digest('hex');
}

export function computeTrailer(input: TrailerInput): string {
  const fullHash = computeRulesetHash(input.rules);
  const shortHash = fullHash.slice(0, 16);
  const score = clampScore(input.score);
  const fileCount = Math.max(0, Math.floor(input.fileCount));
  return `${shortHash}.${score}.${fileCount}`;
}

export function formatTrailerLine(input: TrailerInput): string {
  return `${TRAILER_LABEL}: ${computeTrailer(input)}`;
}

export function parseTrailer(commitMessage: string): ParsedTrailer | undefined {
  const lines = commitMessage.split(/\r?\n/);
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (!line) continue;
    if (!line.startsWith(TRAILER_LABEL + ':')) continue;
    const value = line.slice(TRAILER_LABEL.length + 1).trim();
    const match = /^([0-9a-f]{16})\.(\d{1,3})\.(\d+)$/.exec(value);
    if (!match) return undefined;
    const score = Number.parseInt(match[2], 10);
    if (score < 0 || score > 100) return undefined;
    return {
      rulesetHash: match[1],
      score,
      fileCount: Number.parseInt(match[3], 10),
    };
  }
  return undefined;
}

function clampScore(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}
