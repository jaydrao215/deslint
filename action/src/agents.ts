/**
 * Detect the agent that authored a commit.
 *
 * Signals, in priority order:
 *   1. `Co-Authored-By:` trailers (first AI match wins — AI co-authors
 *      take precedence over a human primary author because that is how
 *      most agent-assisted commits land today).
 *   2. The primary author's name/email/login.
 *
 * Known AI agents fall through a first-match regex table. Everything
 * else is bucketed as a human, labelled with `@login` when we have one
 * and the bare name otherwise.
 */
export type AgentKind =
  | 'claude'
  | 'cursor'
  | 'codex'
  | 'windsurf'
  | 'copilot'
  | 'human';

export interface AgentId {
  kind: AgentKind;
  /** Display label: e.g. `Claude`, `Cursor`, or `@octocat` for humans. */
  label: string;
}

export interface DetectAgentInput {
  authorName: string;
  authorEmail: string;
  /** GitHub login if the Action resolved one; falls back to name. */
  authorLogin?: string;
  /** Raw commit message — trailers are parsed from here. */
  message: string;
}

interface CoAuthor {
  name: string;
  email: string;
}

const COAUTHOR_REGEX = /^Co-Authored-By:\s*(.+?)\s*<([^>]+)>\s*$/gim;

interface AgentPattern {
  kind: Exclude<AgentKind, 'human'>;
  label: string;
  pattern: RegExp;
}

const AGENT_PATTERNS: AgentPattern[] = [
  { kind: 'claude', label: 'Claude', pattern: /claude|anthropic/i },
  { kind: 'cursor', label: 'Cursor', pattern: /\bcursor\b/i },
  { kind: 'codex', label: 'Codex', pattern: /codex|openai/i },
  { kind: 'windsurf', label: 'Windsurf', pattern: /windsurf|codeium/i },
  { kind: 'copilot', label: 'GitHub Copilot', pattern: /copilot/i },
];

export function parseCoAuthors(message: string): CoAuthor[] {
  const out: CoAuthor[] = [];
  COAUTHOR_REGEX.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = COAUTHOR_REGEX.exec(message)) !== null) {
    out.push({ name: m[1], email: m[2] });
  }
  return out;
}

function matchAgent(signal: string): AgentPattern | undefined {
  return AGENT_PATTERNS.find((p) => p.pattern.test(signal));
}

export function detectAgent(input: DetectAgentInput): AgentId {
  for (const co of parseCoAuthors(input.message)) {
    const hit = matchAgent(`${co.name} ${co.email}`);
    if (hit) return { kind: hit.kind, label: hit.label };
  }

  const primarySignal = [input.authorName, input.authorEmail, input.authorLogin ?? '']
    .join(' ');
  const primaryHit = matchAgent(primarySignal);
  if (primaryHit) return { kind: primaryHit.kind, label: primaryHit.label };

  const login = input.authorLogin?.trim();
  return {
    kind: 'human',
    label: login ? `@${login}` : input.authorName || 'unknown',
  };
}

/** Stable key for grouping commits by agent in the scorecard. */
export function agentKey(id: AgentId): string {
  return id.kind === 'human' ? `human:${id.label}` : id.kind;
}
