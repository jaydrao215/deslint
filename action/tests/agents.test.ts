import { describe, it, expect } from 'vitest';
import { detectAgent, parseCoAuthors, agentKey } from '../src/agents.js';

describe('parseCoAuthors', () => {
  it('returns an empty array when there are no trailers', () => {
    expect(parseCoAuthors('chore: nothing interesting\n')).toEqual([]);
  });

  it('parses a single Co-Authored-By trailer', () => {
    const msg = [
      'feat: add thing',
      '',
      'Co-Authored-By: Claude <noreply@anthropic.com>',
    ].join('\n');
    expect(parseCoAuthors(msg)).toEqual([
      { name: 'Claude', email: 'noreply@anthropic.com' },
    ]);
  });

  it('parses multiple trailers and preserves order', () => {
    const msg = [
      'feat: add thing',
      '',
      'Co-Authored-By: Alice <alice@example.com>',
      'Co-Authored-By: Claude <noreply@anthropic.com>',
    ].join('\n');
    expect(parseCoAuthors(msg)).toEqual([
      { name: 'Alice', email: 'alice@example.com' },
      { name: 'Claude', email: 'noreply@anthropic.com' },
    ]);
  });

  it('is case-insensitive on the trailer label', () => {
    const msg = 'feat\n\nco-authored-by: Claude <x@y>';
    expect(parseCoAuthors(msg)).toEqual([{ name: 'Claude', email: 'x@y' }]);
  });
});

describe('detectAgent — AI via Co-Authored-By', () => {
  it('detects Claude from a Claude co-author', () => {
    const id = detectAgent({
      authorName: 'Alice',
      authorEmail: 'alice@example.com',
      authorLogin: 'alice',
      message: 'feat\n\nCo-Authored-By: Claude <noreply@anthropic.com>',
    });
    expect(id).toEqual({ kind: 'claude', label: 'Claude' });
  });

  it('detects Cursor from a Cursor co-author email', () => {
    const id = detectAgent({
      authorName: 'Bob',
      authorEmail: 'bob@example.com',
      message: 'fix\n\nCo-Authored-By: Cursor <bot@cursor.sh>',
    });
    expect(id.kind).toBe('cursor');
  });

  it('detects Codex via "openai" email', () => {
    const id = detectAgent({
      authorName: 'User',
      authorEmail: 'user@example.com',
      message: 'ai\n\nCo-Authored-By: ChatGPT Codex <bot@openai.com>',
    });
    expect(id.kind).toBe('codex');
  });

  it('detects Copilot from a Copilot co-author', () => {
    const id = detectAgent({
      authorName: 'User',
      authorEmail: 'u@x',
      message: 'ai\n\nCo-Authored-By: Copilot <copilot@github.com>',
    });
    expect(id.kind).toBe('copilot');
  });

  it('detects Windsurf via codeium signal', () => {
    const id = detectAgent({
      authorName: 'User',
      authorEmail: 'u@x',
      message: 'ai\n\nCo-Authored-By: Windsurf <noreply@codeium.com>',
    });
    expect(id.kind).toBe('windsurf');
  });

  it('AI co-author takes precedence over a human primary author', () => {
    const id = detectAgent({
      authorName: 'Jane Dev',
      authorEmail: 'jane@example.com',
      authorLogin: 'janedev',
      message: 'feat\n\nCo-Authored-By: Claude <noreply@anthropic.com>',
    });
    expect(id).toEqual({ kind: 'claude', label: 'Claude' });
  });

  it('first AI co-author wins when multiple AIs co-sign', () => {
    const id = detectAgent({
      authorName: 'Jane',
      authorEmail: 'j@x',
      message: [
        'feat',
        '',
        'Co-Authored-By: Cursor <bot@cursor.sh>',
        'Co-Authored-By: Claude <noreply@anthropic.com>',
      ].join('\n'),
    });
    expect(id.kind).toBe('cursor');
  });
});

describe('detectAgent — AI via primary author', () => {
  it('detects Claude from the primary author email', () => {
    const id = detectAgent({
      authorName: 'Claude',
      authorEmail: 'noreply@anthropic.com',
      message: 'ai commit\n',
    });
    expect(id.kind).toBe('claude');
  });

  it('detects Copilot from a copilot login', () => {
    const id = detectAgent({
      authorName: 'GitHub Copilot',
      authorEmail: 'copilot@users.noreply.github.com',
      message: 'fix\n',
    });
    expect(id.kind).toBe('copilot');
  });
});

describe('detectAgent — human fallback', () => {
  it('returns human with @login when a login is known', () => {
    const id = detectAgent({
      authorName: 'Jane Dev',
      authorEmail: 'jane@example.com',
      authorLogin: 'janedev',
      message: 'fix: bug\n',
    });
    expect(id).toEqual({ kind: 'human', label: '@janedev' });
  });

  it('falls back to author name when no login is available', () => {
    const id = detectAgent({
      authorName: 'Jane Dev',
      authorEmail: 'jane@example.com',
      message: 'fix: bug\n',
    });
    expect(id).toEqual({ kind: 'human', label: 'Jane Dev' });
  });

  it('returns "unknown" only when name and login are both empty', () => {
    const id = detectAgent({
      authorName: '',
      authorEmail: '',
      message: '',
    });
    expect(id).toEqual({ kind: 'human', label: 'unknown' });
  });
});

describe('agentKey', () => {
  it('uses the kind as the key for AI agents', () => {
    expect(agentKey({ kind: 'claude', label: 'Claude' })).toBe('claude');
  });

  it('keys humans by their label so two humans on one PR stay distinct', () => {
    expect(agentKey({ kind: 'human', label: '@alice' })).toBe('human:@alice');
    expect(agentKey({ kind: 'human', label: '@bob' })).toBe('human:@bob');
  });
});
