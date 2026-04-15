import { describe, it, expect } from 'vitest';
import { formatTrailerLine } from '@deslint/shared';
import { verifyTrailer, formatTrailerSection } from '../src/trailer.js';

describe('verifyTrailer', () => {
  it('returns status: missing when no trailer is present', () => {
    const v = verifyTrailer({
      commitMessage: 'feat: add button',
      rules: {},
      score: 90,
      fileCount: 5,
    });
    expect(v.status).toBe('missing');
    expect(v.message).toMatch(/No.*trailer found/);
  });

  it('returns status: verified on an exact match', () => {
    const rules = { 'deslint/no-arbitrary-colors': 'warn' };
    const line = formatTrailerLine({ rules, score: 90, fileCount: 5 });
    const msg = ['feat: x', '', line].join('\n');

    const v = verifyTrailer({ commitMessage: msg, rules, score: 90, fileCount: 5 });
    expect(v.status).toBe('verified');
    expect(v.claimed?.score).toBe(90);
    expect(v.claimed?.fileCount).toBe(5);
  });

  it('returns status: mismatched when score drifted', () => {
    const rules = {};
    const line = formatTrailerLine({ rules, score: 85, fileCount: 5 });
    const msg = ['feat: x', '', line].join('\n');

    const v = verifyTrailer({ commitMessage: msg, rules, score: 90, fileCount: 5 });
    expect(v.status).toBe('mismatched');
    expect(v.message).toMatch(/score drifted/);
  });

  it('returns status: mismatched when file count drifted', () => {
    const rules = {};
    const line = formatTrailerLine({ rules, score: 90, fileCount: 3 });
    const msg = ['feat: x', '', line].join('\n');

    const v = verifyTrailer({ commitMessage: msg, rules, score: 90, fileCount: 5 });
    expect(v.status).toBe('mismatched');
    expect(v.message).toMatch(/file-count drifted/);
  });

  it('returns status: mismatched when ruleset hash changed', () => {
    const claimedRules = {};
    const actualRules = { 'deslint/no-arbitrary-colors': 'error' };
    const line = formatTrailerLine({ rules: claimedRules, score: 90, fileCount: 5 });
    const msg = ['feat: x', '', line].join('\n');

    const v = verifyTrailer({
      commitMessage: msg,
      rules: actualRules,
      score: 90,
      fileCount: 5,
    });
    expect(v.status).toBe('mismatched');
    expect(v.message).toMatch(/ruleset changed/);
  });

  it('returns status: malformed when the trailer value does not parse', () => {
    const msg = 'feat: x\n\nDeslint-Compliance: totally-bogus';
    const v = verifyTrailer({
      commitMessage: msg,
      rules: {},
      score: 100,
      fileCount: 0,
    });
    expect(v.status).toBe('malformed');
  });

  it('compares against user-only rules (ignores default drift)', () => {
    const rules = {};
    const line = formatTrailerLine({ rules, score: 100, fileCount: 0 });
    const msg = ['feat: x', '', line].join('\n');

    const v = verifyTrailer({ commitMessage: msg, rules, score: 100, fileCount: 0 });
    expect(v.status).toBe('verified');
  });

  it('is idempotent', () => {
    const rules = { a: 'warn' };
    const line = formatTrailerLine({ rules, score: 80, fileCount: 3 });
    const msg = ['x', '', line].join('\n');
    const a = verifyTrailer({ commitMessage: msg, rules, score: 80, fileCount: 3 });
    const b = verifyTrailer({ commitMessage: msg, rules, score: 80, fileCount: 3 });
    expect(a).toEqual(b);
  });
});

describe('formatTrailerSection', () => {
  it('includes an Agent-loop verification header', () => {
    const rules = {};
    const line = formatTrailerLine({ rules, score: 100, fileCount: 0 });
    const msg = ['x', '', line].join('\n');
    const v = verifyTrailer({ commitMessage: msg, rules, score: 100, fileCount: 0 });
    const section = formatTrailerSection(v);
    expect(section).toMatch(/Agent-loop verification/);
    expect(section).toMatch(/\u2705/);
  });

  it('uses \u274c for mismatched', () => {
    const rules = {};
    const line = formatTrailerLine({ rules, score: 80, fileCount: 5 });
    const msg = ['x', '', line].join('\n');
    const v = verifyTrailer({ commitMessage: msg, rules, score: 90, fileCount: 5 });
    const section = formatTrailerSection(v);
    expect(section).toMatch(/\u274c/);
  });

  it('uses \u2139\ufe0f for missing', () => {
    const v = verifyTrailer({ commitMessage: 'feat: x', rules: {}, score: 100, fileCount: 0 });
    const section = formatTrailerSection(v);
    expect(section).toMatch(/\u2139\ufe0f/);
  });
});
