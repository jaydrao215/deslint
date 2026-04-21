/**
 * Per-agent scorecard: attribute the PR's inline violations to the
 * agent that authored each offending line, group by agent, and render
 * a table sorted by violation count descending.
 *
 * Attribution uses `git blame --line-porcelain` against the working
 * tree. Only commits that belong to this PR count — pre-existing
 * violations introduced before the PR base are excluded so a PR is
 * not punished for debt it merely touched.
 *
 * Shallow checkouts break blame. Rather than failing the job we surface
 * a one-line hint and omit the section. Add `fetch-depth: 0` to the
 * `actions/checkout` step to enable attribution.
 */
import { execFileSync } from 'node:child_process';
import * as path from 'node:path';
import type { InlineViolation } from './scan.js';
import { detectAgent, agentKey, type AgentId } from './agents.js';

export interface AgentScorecardEntry {
  agent: AgentId;
  violations: number;
  files: number;
  /** Violation counts broken down by rule. Used for tie-break display
   *  and downstream dashboards. */
  byRule: Record<string, number>;
}

export type AgentScorecardStatus =
  | 'ok'
  | 'no-pr-violations'
  | 'shallow-checkout'
  | 'blame-unavailable'
  | 'skipped';

export interface AgentScorecard {
  status: AgentScorecardStatus;
  entries: AgentScorecardEntry[];
  message?: string;
}

export interface BuildAgentScorecardInput {
  /** Working tree root (absolute or relative path). */
  workingDirectory: string;
  /** Inline violations from the Action scan — only these are blamed. */
  violations: InlineViolation[];
  /** SHAs of commits that belong to this PR. A blame hit counts only
   *  when the line's originating commit is in this set. */
  prCommitShas: Set<string>;
}

export interface BlameEntry {
  /** Commit SHA that introduced this line. */
  sha: string;
  authorName: string;
  authorEmail: string;
  /** Raw commit message — used to parse Co-Authored-By trailers. */
  message: string;
}

export interface ScorecardDeps {
  /** Run `git blame` for a single line. Returns `null` when blame
   *  fails (e.g. file outside repo, shallow boundary, binary file).
   *  Callers should treat `null` as "not attributable" rather than
   *  fatal. */
  blame?: (args: {
    workingDirectory: string;
    filePath: string;
    line: number;
  }) => BlameEntry | null;
  /** Shallow-checkout probe. When `true`, `git blame` cannot see the
   *  PR's commits and attribution is skipped with a hint. */
  isShallow?: (workingDirectory: string) => boolean;
}

export function buildAgentScorecard(
  input: BuildAgentScorecardInput,
  deps: ScorecardDeps = {},
): AgentScorecard {
  if (input.violations.length === 0) {
    return {
      status: 'no-pr-violations',
      entries: [],
      message: 'No violations to attribute.',
    };
  }

  const shallow = (deps.isShallow ?? defaultIsShallow)(input.workingDirectory);
  if (shallow) {
    return {
      status: 'shallow-checkout',
      entries: [],
      message:
        'Per-agent scorecard needs full git history. Add `fetch-depth: 0` to ' +
        'the `actions/checkout` step to enable attribution.',
    };
  }

  const blameFn = deps.blame ?? defaultBlame;
  const buckets = new Map<string, AgentScorecardEntry & { fileSet: Set<string> }>();
  let attributed = 0;
  let blameFailures = 0;

  for (const v of input.violations) {
    const entry = blameFn({
      workingDirectory: input.workingDirectory,
      filePath: v.filePath,
      line: v.line,
    });
    if (!entry) {
      blameFailures++;
      continue;
    }
    if (!input.prCommitShas.has(entry.sha)) {
      // Pre-existing violation — not this PR's fault.
      continue;
    }
    const agent = detectAgent({
      authorName: entry.authorName,
      authorEmail: entry.authorEmail,
      message: entry.message,
    });
    const key = agentKey(agent);
    const bucket = buckets.get(key) ?? {
      agent,
      violations: 0,
      files: 0,
      byRule: {},
      fileSet: new Set<string>(),
    };
    bucket.violations += 1;
    bucket.fileSet.add(v.filePath);
    bucket.byRule[v.ruleId] = (bucket.byRule[v.ruleId] ?? 0) + 1;
    buckets.set(key, bucket);
    attributed += 1;
  }

  if (attributed === 0 && blameFailures === input.violations.length) {
    return {
      status: 'blame-unavailable',
      entries: [],
      message:
        '`git blame` could not attribute any lines in this PR. This usually ' +
        'means a shallow checkout — add `fetch-depth: 0` to `actions/checkout`.',
    };
  }

  if (attributed === 0) {
    return {
      status: 'no-pr-violations',
      entries: [],
      message: 'All violations predate this PR — nothing to attribute.',
    };
  }

  const entries: AgentScorecardEntry[] = [...buckets.values()]
    .map((b) => ({
      agent: b.agent,
      violations: b.violations,
      files: b.fileSet.size,
      byRule: b.byRule,
    }))
    .sort((a, b) => b.violations - a.violations || a.agent.label.localeCompare(b.agent.label));

  return { status: 'ok', entries };
}

export function formatAgentScorecardSection(scorecard: AgentScorecard): string {
  if (scorecard.status === 'skipped') return '';

  const header = ['', '### Per-agent scorecard', ''];

  if (scorecard.status === 'shallow-checkout' || scorecard.status === 'blame-unavailable') {
    return [...header, `\u2139\ufe0f ${scorecard.message ?? ''}`, ''].join('\n');
  }

  if (scorecard.status === 'no-pr-violations' || scorecard.entries.length === 0) {
    return '';
  }

  const total = scorecard.entries.reduce((n, e) => n + e.violations, 0);
  const rows = scorecard.entries.map((e) => {
    const topRule = pickTopRule(e.byRule);
    const topLabel = topRule ? `\`${topRule.ruleId.replace('deslint/', '')}\` \u00d7${topRule.count}` : '—';
    return `| ${e.agent.label} | ${e.violations} | ${e.files} | ${topLabel} |`;
  });

  return [
    ...header,
    `Attributed ${total} violation${total === 1 ? '' : 's'} in this PR to their authoring agents:`,
    '',
    '| Agent | Violations | Files | Top rule |',
    '|-------|-----------:|------:|----------|',
    ...rows,
    '',
  ].join('\n');
}

function pickTopRule(byRule: Record<string, number>): { ruleId: string; count: number } | undefined {
  let top: { ruleId: string; count: number } | undefined;
  for (const [ruleId, count] of Object.entries(byRule)) {
    if (!top || count > top.count) top = { ruleId, count };
  }
  return top;
}

function defaultBlame(args: {
  workingDirectory: string;
  filePath: string;
  line: number;
}): BlameEntry | null {
  const cwd = path.resolve(args.workingDirectory);
  try {
    const raw = execFileSync(
      'git',
      [
        'blame',
        '--line-porcelain',
        '-L',
        `${args.line},${args.line}`,
        '--',
        args.filePath,
      ],
      { cwd, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] },
    );
    return parseBlamePorcelain(raw, cwd);
  } catch {
    return null;
  }
}

export function parseBlamePorcelain(raw: string, cwd: string): BlameEntry | null {
  const lines = raw.split('\n');
  if (lines.length === 0) return null;
  const header = lines[0].split(' ');
  const sha = header[0];
  if (!/^[0-9a-f]{40}$/.test(sha)) return null;

  let authorName = '';
  let authorEmail = '';
  for (const line of lines) {
    if (line.startsWith('author ')) authorName = line.slice('author '.length).trim();
    else if (line.startsWith('author-mail ')) {
      const raw = line.slice('author-mail '.length).trim();
      authorEmail = raw.replace(/^<|>$/g, '');
    }
  }

  const message = readCommitMessage(sha, cwd);
  return { sha, authorName, authorEmail, message };
}

function readCommitMessage(sha: string, cwd: string): string {
  try {
    return execFileSync('git', ['log', '-1', '--format=%B', sha], {
      cwd,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return '';
  }
}

function defaultIsShallow(workingDirectory: string): boolean {
  try {
    const out = execFileSync(
      'git',
      ['rev-parse', '--is-shallow-repository'],
      {
        cwd: path.resolve(workingDirectory),
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'ignore'],
      },
    );
    return out.trim() === 'true';
  } catch {
    return false;
  }
}
