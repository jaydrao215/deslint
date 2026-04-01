import { describe, it, expect } from 'vitest';
import { relativeLuminance, contrastRatio, contrastRatioHex, meetsWcagAA } from '../../src/utils/contrast.js';

describe('relativeLuminance', () => {
  it('returns 0 for black', () => {
    expect(relativeLuminance([0, 0, 0])).toBeCloseTo(0, 5);
  });

  it('returns 1 for white', () => {
    expect(relativeLuminance([255, 255, 255])).toBeCloseTo(1, 5);
  });

  it('returns ~0.2126 for pure red', () => {
    expect(relativeLuminance([255, 0, 0])).toBeCloseTo(0.2126, 3);
  });
});

describe('contrastRatio', () => {
  it('returns 21:1 for black on white', () => {
    const ratio = contrastRatio([0, 0, 0], [255, 255, 255]);
    expect(ratio).toBeCloseTo(21, 0);
  });

  it('returns 1:1 for same color', () => {
    const ratio = contrastRatio([128, 128, 128], [128, 128, 128]);
    expect(ratio).toBeCloseTo(1, 5);
  });

  it('is symmetric (order does not matter)', () => {
    const r1 = contrastRatio([255, 0, 0], [255, 255, 255]);
    const r2 = contrastRatio([255, 255, 255], [255, 0, 0]);
    expect(r1).toBeCloseTo(r2, 5);
  });
});

describe('contrastRatioHex', () => {
  it('works with hex strings', () => {
    const ratio = contrastRatioHex('#000000', '#ffffff');
    expect(ratio).toBeCloseTo(21, 0);
  });

  it('handles shorthand hex', () => {
    const ratio = contrastRatioHex('#000', '#fff');
    expect(ratio).toBeCloseTo(21, 0);
  });
});

describe('meetsWcagAA', () => {
  it('passes normal text at 4.5:1', () => {
    expect(meetsWcagAA(4.5, false)).toBe(true);
  });

  it('fails normal text at 4.4:1', () => {
    expect(meetsWcagAA(4.4, false)).toBe(false);
  });

  it('passes large text at 3.0:1', () => {
    expect(meetsWcagAA(3.0, true)).toBe(true);
  });

  it('fails large text at 2.9:1', () => {
    expect(meetsWcagAA(2.9, true)).toBe(false);
  });
});
