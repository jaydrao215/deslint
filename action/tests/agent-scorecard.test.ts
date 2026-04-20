import { describe, it, expect } from 'vitest';
import {
  buildAgentScorecard,
  formatAgentScorecardSection,
  parseBlamePorcelain,
  type BlameEntry,
} from '../src/agent-scorecard.js';
import type { InlineViolation } from '../src/scan.js';

function violation(
  filePath: string,
  line: number,
  ruleId = 'deslint/no-arbitrary-spacing',
): InlineViolation {
  return {
    filePath,
    line,
    column: 1,
    ruleId,
    message: 'nope',
    severity: 'warning',
  };
}

const CLAUDE_SHA = 'a'.repeat(40);
const HUMAN_SHA = 'b'.repeat(40);
const OLD_SHA = 'c'.repeat(40);

const CLAUDE_ENTRY: BlameEntry = {
  sha: CLAUDE_SHA,
  authorName: 'Jane Dev',
  authorEmail: 'jane@example.com',
  message: 'feat: add button\n\nCo-Authored-By: Claude <noreply@anthropic.com>',
};

const HUMAN_ENTRY: BlameEntry = {
  sha: HUMAN_SHA,
  authorName: 'Jane Dev',
  authorEmail: 'jane@example.com',
  message: 'fix: tweak spacing',
};

const OLD_ENTRY: BlameEntry = {
  sha: OLD_SHA,
  authorName: 'Old Dev',
  authorEmail: 'old@example.com',
  message: 'initial commit',
};

describe('buildAgentScorecard', () => {
  it('returns no-pr-violations when there are no inline violations', () => {
    const r = buildAgentScorecard({
      workingDirectory: '.',
      violations: [],
      prCommitShas: new Set([CLAUDE_SHA]),
    });
    expect(r.status).toBe('no-pr-violations');
    expect(r.entries).toEqual([]);
  });

  it('emits shallow-checkout hint when shallow', () => {
    const r = buildAgentScorecard(
      {
        workingDirectory: '.',
        violations: [violation('a.tsx', 1)],
        prCommitShas: new Set([CLAUDE_SHA]),
      },
      { isShallow: () => true },
    );
    expect(r.status).toBe('shallow-checkout');
    expect(r.message).toMatch(/fetch-depth: 0/);
    expect(r.entries).toEqual([]);
  });

  it('excludes violations whose originating commit is not in the PR', () => {
    const r = buildAgentScorecard(
      {
        workingDirectory: '.',
        violations: [violation('a.tsx', 1)],
        prCommitShas: new Set([CLAUDE_SHA]),
      },
      {
        isShallow: () => false,
        blame: () => OLD_ENTRY,
      },
    );
    expect(r.status).toBe('no-pr-violations');
    expect(r.entries).toEqual([]);
  });

  it('attributes a Claude co-author to Claude', () => {
    const r = buildAgentScorecard(
      {
        workingDirectory: '.',
        violations: [violation('a.tsx', 1), violation('a.tsx', 2)],
        prCommitShas: new Set([CLAUDE_SHA]),
      },
      {
        isShallow: () => false,
        blame: () => CLAUDE_ENTRY,
      },
    );
    expect(r.status).toBe('ok');
    expect(r.entries).toHaveLength(1);
    expect(r.entries[0].agent.kind).toBe('claude');
    expect(r.entries[0].violations).toBe(2);
    expect(r.entries[0].files).toBe(1);
  });

  it('sorts entries by violation count descending', () => {
    // Three violations: 2 Claude, 1 human.
    const blameSeq: BlameEntry[] = [CLAUDE_ENTRY, HUMAN_ENTRY, CLAUDE_ENTRY];
    let i = 0;
    const r = buildAgentScorecard(
      {
        workingDirectory: '.',
        violations: [
          violation('a.tsx', 1),
          violation('b.tsx', 1),
          violation('c.tsx', 1),
        ],
        prCommitShas: new Set([CLAUDE_SHA, HUMAN_SHA]),
      },
      {
        isShallow: () => false,
        blame: () => blameSeq[i++],
      },
    );
    expect(r.status).toBe('ok');
    expect(r.entries.map((e) => e.agent.kind)).toEqual(['claude', 'human']);
    expect(r.entries[0].violations).toBe(2);
    expect(r.entries[1].violations).toBe(1);
  });

  it('counts distinct files per agent', () => {
    let call = 0;
    const r = buildAgentScorecard(
      {
        workingDirectory: '.',
        violations: [
          violation('a.tsx', 1),
          violation('a.tsx', 2),
          violation('b.tsx', 9),
        ],
        prCommitShas: new Set([CLAUDE_SHA]),
      },
      {
        isShallow: () => false,
        blame: () => {
          call++;
          return CLAUDE_ENTRY;
        },
      },
    );
    expect(r.entries).toHaveLength(1);
    expect(r.entries[0].violations).toBe(3);
    expect(r.entries[0].files).toBe(2);
    expect(call).toBe(3);
  });

  it('aggregates rule-level counts into byRule', () => {
    const r = buildAgentScorecard(
      {
        workingDirectory: '.',
        violations: [
          violation('a.tsx', 1, 'deslint/no-arbitrary-spacing'),
          violation('a.tsx', 2, 'deslint/no-arbitrary-colors'),
          violation('b.tsx', 1, 'deslint/no-arbitrary-spacing'),
        ],
        prCommitShas: new Set([CLAUDE_SHA]),
      },
      { isShallow: () => false, blame: () => CLAUDE_ENTRY },
    );
    expect(r.entries[0].byRule).toEqual({
      'deslint/no-arbitrary-spacing': 2,
      'deslint/no-arbitrary-colors': 1,
    });
  });

  it('reports blame-unavailable when every blame call fails', () => {
    const r = buildAgentScorecard(
      {
        workingDirectory: '.',
        violations: [violation('a.tsx', 1), violation('b.tsx', 1)],
        prCommitShas: new Set([CLAUDE_SHA]),
      },
      {
        isShallow: () => false,
        blame: () => null,
      },
    );
    expect(r.status).toBe('blame-unavailable');
    expect(r.entries).toEqual([]);
    expect(r.message).toMatch(/fetch-depth: 0/);
  });
});

describe('formatAgentScorecardSection', () => {
  it('returns "" when no violations were attributed', () => {
    const out = formatAgentScorecardSection({
      status: 'no-pr-violations',
      entries: [],
    });
    expect(out).toBe('');
  });

  it('returns "" when skipped entirely', () => {
    const out = formatAgentScorecardSection({ status: 'skipped', entries: [] });
    expect(out).toBe('');
  });

  it('renders a markdown table sorted by violation count', () => {
    const section = formatAgentScorecardSection({
      status: 'ok',
      entries: [
        {
          agent: { kind: 'claude', label: 'Claude' },
          violations: 3,
          files: 2,
          byRule: { 'deslint/no-arbitrary-spacing': 3 },
        },
        {
          agent: { kind: 'human', label: '@alice' },
          violations: 1,
          files: 1,
          byRule: { 'deslint/no-arbitrary-colors': 1 },
        },
      ],
    });
    expect(section).toMatch(/Per-agent scorecard/);
    expect(section).toMatch(/\| Agent \| Violations \| Files \| Top rule \|/);
    expect(section).toMatch(/Claude \| 3 \| 2/);
    expect(section).toMatch(/@alice \| 1 \| 1/);
    // Claude row must appear before @alice in the output.
    expect(section.indexOf('Claude')).toBeLessThan(section.indexOf('@alice'));
  });

  it('renders a hint for shallow-checkout', () => {
    const section = formatAgentScorecardSection({
      status: 'shallow-checkout',
      entries: [],
      message: 'Per-agent scorecard needs full git history. Add `fetch-depth: 0`.',
    });
    expect(section).toMatch(/\u2139\ufe0f/);
    expect(section).toMatch(/fetch-depth: 0/);
  });

  it('renders a hint for blame-unavailable', () => {
    const section = formatAgentScorecardSection({
      status: 'blame-unavailable',
      entries: [],
      message: '`git blame` could not attribute any lines in this PR.',
    });
    expect(section).toMatch(/\u2139\ufe0f/);
    expect(section).toMatch(/git blame/);
  });
});

describe('parseBlamePorcelain', () => {
  it('parses a well-formed porcelain blame block', () => {
    const raw = [
      `${CLAUDE_SHA} 1 1 1`,
      'author Jane Dev',
      'author-mail <jane@example.com>',
      'author-time 1700000000',
      'author-tz +0000',
      'committer Jane Dev',
      'committer-mail <jane@example.com>',
      'summary feat: add button',
      'filename src/a.tsx',
      '\tconst foo = 1;',
    ].join('\n');
    const entry = parseBlamePorcelain(raw, '.');
    expect(entry?.sha).toBe(CLAUDE_SHA);
    expect(entry?.authorName).toBe('Jane Dev');
    expect(entry?.authorEmail).toBe('jane@example.com');
  });

  it('returns null when the first line is not a SHA', () => {
    expect(parseBlamePorcelain('garbage\n', '.')).toBeNull();
  });
});
