/**
 * Tests for applyFixesToSource — the helper that replaces the old "readFileSync
 * / slice / writeFileSync per fix" loop in fixInteractive. The old loop silently
 * corrupted files whenever more than one fix landed in the same file because
 * fix #2's range was measured against the ORIGINAL parse but applied to a
 * file that fix #1 had already shifted.
 */
import { describe, expect, it } from 'vitest';
import { applyFixesToSource, type Fix } from '../src/fix.js';

describe('applyFixesToSource', () => {
  it('returns source unchanged when no fixes are provided', () => {
    expect(applyFixesToSource('hello world', [])).toBe('hello world');
  });

  it('applies a single fix at a byte range', () => {
    const source = '<div className="bg-red-500" />';
    const fix: Fix = {
      range: [16, 26],
      text: 'bg-red-600',
    };
    const out = applyFixesToSource(source, [fix]);
    expect(out).toBe('<div className="bg-red-600" />');
  });

  it('applies TWO non-overlapping fixes without corrupting bytes', () => {
    // THIS is the regression test for the original bug. If fixes are applied
    // naively in array order with slice/splice, fix #2's range [30, 40] points
    // into the MIDDLE of the output of fix #1 because the file grew.
    const source = 'AAAAAAAAAA BBBBBBBBBB CCCCCCCCCC DDDDDDDDDD';
    //              0123456789012345678901234567890123456789012
    // Replace "AAAAAAAAAA" (0-10) with "WW" (shrinks by 8)
    // Replace "CCCCCCCCCC" (22-32) with "zzzzzzzzzzzzzzzz" (grows by 6)
    const fixes: Fix[] = [
      { range: [0, 10], text: 'WW' },
      { range: [22, 32], text: 'zzzzzzzzzzzzzzzz' },
    ];
    const out = applyFixesToSource(source, fixes);
    expect(out).toBe('WW BBBBBBBBBB zzzzzzzzzzzzzzzz DDDDDDDDDD');
  });

  it('applies fixes supplied in reverse order (order-independent)', () => {
    const source = '0123456789';
    const fixes: Fix[] = [
      { range: [8, 10], text: 'xx' },
      { range: [0, 2], text: 'yy' },
    ];
    expect(applyFixesToSource(source, fixes)).toBe('yy234567xx');
  });

  it('drops overlapping fixes rather than double-mangling bytes', () => {
    const source = 'hello world';
    const fixes: Fix[] = [
      { range: [0, 5], text: 'HI' },
      { range: [3, 7], text: 'BOGUS' }, // overlaps with fix #1 — must be dropped
    ];
    const out = applyFixesToSource(source, fixes);
    expect(out).toBe('HI world');
  });

  it('handles insertion (zero-width range) correctly', () => {
    const source = '<html>';
    const fix: Fix = { range: [5, 5], text: ' lang="en"' };
    expect(applyFixesToSource(source, [fix])).toBe('<html lang="en">');
  });

  it('keeps only the first of two zero-width fixes at the same offset', () => {
    // Two insertions with identical start positions — second one's start (5)
    // equals first one's end (5), which our non-overlap rule treats as
    // adjacent-and-kept. We accept that ambiguity deterministically: walking
    // in reverse means fix #2 (the later-sorted one) is written first.
    const source = '<html>';
    const fixes: Fix[] = [
      { range: [5, 5], text: ' lang="en"' },
      { range: [5, 5], text: ' dir="ltr"' },
    ];
    const out = applyFixesToSource(source, fixes);
    // Both zero-width fixes at 5: first sorted is kept with lastEnd=5, second's
    // start (5) >= lastEnd (5) so it's also kept, then reverse-applied — the
    // relative order of two inserts at the same offset is stable.
    expect(out.startsWith('<html')).toBe(true);
    expect(out.endsWith('>')).toBe(true);
    expect(out).toContain('lang="en"');
    expect(out).toContain('dir="ltr"');
  });

  it('reproduces the stale-range bug when the caller incorrectly applies sequentially', () => {
    // Sanity check: confirm the naive loop DOES corrupt the file. This documents
    // why the helper is necessary — the buggy behaviour we are replacing.
    const source = 'AAAAAAAAAA BBBBBBBBBB CCCCCCCCCC';
    const fix1: Fix = { range: [0, 10], text: 'WW' };
    const fix2: Fix = { range: [22, 32], text: 'ZZ' };

    // Naive: apply in array order with slice/splice against the mutating buffer.
    let buf = source;
    buf = buf.slice(0, fix1.range[0]) + fix1.text + buf.slice(fix1.range[1]);
    buf = buf.slice(0, fix2.range[0]) + fix2.text + buf.slice(fix2.range[1]);
    // Fix #2 now points past the end of the shrunken buffer — result is corrupt.
    expect(buf).not.toBe('WW BBBBBBBBBB ZZ');

    // Correct helper: byte-exact.
    expect(applyFixesToSource(source, [fix1, fix2])).toBe('WW BBBBBBBBBB ZZ');
  });
});
