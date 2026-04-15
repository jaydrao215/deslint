import { describe, it, expect } from 'vitest';
import {
  TRAILER_LABEL,
  computeRulesetHash,
  computeTrailer,
  formatTrailerLine,
  parseTrailer,
} from '../src/trailer.js';

describe('computeRulesetHash', () => {
  it('is deterministic for the same input', () => {
    const a = computeRulesetHash({ 'deslint/no-arbitrary-colors': 'warn' });
    const b = computeRulesetHash({ 'deslint/no-arbitrary-colors': 'warn' });
    expect(a).toBe(b);
  });

  it('is key-order independent', () => {
    const a = computeRulesetHash({ a: 1, b: 2, c: 3 });
    const b = computeRulesetHash({ c: 3, a: 1, b: 2 });
    expect(a).toBe(b);
  });

  it('normalizes short-form rule ids to fully-qualified form', () => {
    const short = computeRulesetHash({ 'no-arbitrary-colors': 'warn' });
    const long = computeRulesetHash({ 'deslint/no-arbitrary-colors': 'warn' });
    expect(short).toBe(long);
  });

  it('hashes empty object consistently', () => {
    const a = computeRulesetHash({});
    const b = computeRulesetHash({});
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
  });

  it('changes when a severity changes', () => {
    const a = computeRulesetHash({ 'deslint/no-arbitrary-colors': 'warn' });
    const b = computeRulesetHash({ 'deslint/no-arbitrary-colors': 'error' });
    expect(a).not.toBe(b);
  });

  it('treats numeric and string severities equivalently when stringified', () => {
    const a = computeRulesetHash({ 'deslint/x': 1 });
    const b = computeRulesetHash({ 'deslint/x': '1' });
    expect(a).toBe(b);
  });
});

describe('computeTrailer', () => {
  it('returns `<sha16>.<score>.<fileCount>`', () => {
    const trailer = computeTrailer({ rules: {}, score: 85, fileCount: 12 });
    expect(trailer).toMatch(/^[0-9a-f]{16}\.85\.12$/);
  });

  it('clamps score into 0..100', () => {
    expect(computeTrailer({ rules: {}, score: 150, fileCount: 0 })).toMatch(/\.100\./);
    expect(computeTrailer({ rules: {}, score: -10, fileCount: 0 })).toMatch(/\.0\./);
  });

  it('rounds fractional scores', () => {
    expect(computeTrailer({ rules: {}, score: 85.7, fileCount: 5 })).toMatch(/\.86\.5$/);
  });

  it('floors fileCount to non-negative integer', () => {
    expect(computeTrailer({ rules: {}, score: 90, fileCount: -3 })).toMatch(/\.0$/);
    expect(computeTrailer({ rules: {}, score: 90, fileCount: 3.9 })).toMatch(/\.3$/);
  });

  it('is idempotent', () => {
    const input = { rules: { a: 'warn' }, score: 90, fileCount: 5 };
    expect(computeTrailer(input)).toBe(computeTrailer(input));
  });
});

describe('formatTrailerLine', () => {
  it('prepends the label', () => {
    const line = formatTrailerLine({ rules: {}, score: 90, fileCount: 3 });
    expect(line.startsWith(`${TRAILER_LABEL}: `)).toBe(true);
  });
});

describe('parseTrailer', () => {
  it('parses a valid trailer from a commit message', () => {
    const line = formatTrailerLine({ rules: {}, score: 90, fileCount: 3 });
    const msg = ['Subject', '', 'Body paragraph.', '', line].join('\n');
    const parsed = parseTrailer(msg);
    expect(parsed).toBeDefined();
    expect(parsed?.score).toBe(90);
    expect(parsed?.fileCount).toBe(3);
    expect(parsed?.rulesetHash).toMatch(/^[0-9a-f]{16}$/);
  });

  it('returns undefined when no trailer is present', () => {
    expect(parseTrailer('feat: new thing')).toBeUndefined();
  });

  it('returns undefined for a mangled trailer', () => {
    const msg = 'Subject\n\nDeslint-Compliance: not-a-valid-trailer';
    expect(parseTrailer(msg)).toBeUndefined();
  });

  it('handles CRLF line endings', () => {
    const line = formatTrailerLine({ rules: {}, score: 100, fileCount: 0 });
    const msg = ['Subject', '', line].join('\r\n');
    expect(parseTrailer(msg)).toBeDefined();
  });

  it('picks the last trailer when the message contains multiple', () => {
    const old = formatTrailerLine({ rules: { a: 'warn' }, score: 50, fileCount: 1 });
    const neu = formatTrailerLine({ rules: {}, score: 100, fileCount: 2 });
    const msg = ['Subject', '', old, neu].join('\n');
    const parsed = parseTrailer(msg);
    expect(parsed?.score).toBe(100);
    expect(parsed?.fileCount).toBe(2);
  });

  it('rejects scores outside 0..100', () => {
    const msg = `Subject\n\n${TRAILER_LABEL}: 0123456789abcdef.200.5`;
    expect(parseTrailer(msg)).toBeUndefined();
  });
});

describe('integration: round-trip via parseTrailer', () => {
  it('re-parses what formatTrailerLine produced', () => {
    const input = { rules: { 'deslint/no-arbitrary-colors': 'warn' }, score: 77, fileCount: 42 };
    const line = formatTrailerLine(input);
    const parsed = parseTrailer(`Subject\n\n${line}`);
    expect(parsed).toBeDefined();
    expect(parsed?.score).toBe(77);
    expect(parsed?.fileCount).toBe(42);
    expect(parsed?.rulesetHash).toBe(computeTrailer(input).split('.')[0]);
  });
});
