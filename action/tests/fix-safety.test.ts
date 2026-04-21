/**
 * Tests for the fix-safety classifier. The contract this suite locks
 * in: a fix is 'identical' only when the replacement is byte-provably
 * equivalent to the original CSS; 'additive-safe' only when the fix
 * adds a media-query wrap (currently motion-safe:) without otherwise
 * modifying the token; everything else is 'heuristic' and must NOT
 * ship as a one-click GitHub suggestion.
 */

import { describe, it, expect } from 'vitest';
import {
  classifyFixSafety,
  extractArbitraryHex,
  extractTokenName,
  normalizeHex,
} from '../src/fix-safety.js';

describe('classifyFixSafety — identical (color token matches arbitrary hex)', () => {
  it('returns identical when the replacement token resolves to the same hex', () => {
    expect(
      classifyFixSafety({
        ruleId: 'deslint/no-arbitrary-colors',
        originalText: 'bg-[#1A5276]',
        replacementText: 'bg-primary',
        designSystem: { colors: { primary: '#1A5276' } },
      }),
    ).toBe('identical');
  });

  it('tolerates case differences on the hex', () => {
    expect(
      classifyFixSafety({
        ruleId: 'deslint/no-arbitrary-colors',
        originalText: 'bg-[#ABCDEF]',
        replacementText: 'bg-accent',
        designSystem: { colors: { accent: '#abcdef' } },
      }),
    ).toBe('identical');
  });

  it('expands 3-digit shorthand before comparing', () => {
    expect(
      classifyFixSafety({
        ruleId: 'deslint/no-arbitrary-colors',
        originalText: 'text-[#fff]',
        replacementText: 'text-white',
        designSystem: { colors: { white: '#ffffff' } },
      }),
    ).toBe('identical');
  });

  it('returns heuristic when the token exists but has a different value', () => {
    expect(
      classifyFixSafety({
        ruleId: 'deslint/no-arbitrary-colors',
        originalText: 'bg-[#1A5276]',
        replacementText: 'bg-primary',
        designSystem: { colors: { primary: '#2C3E50' } },
      }),
    ).toBe('heuristic');
  });

  it('returns heuristic when no design system is provided', () => {
    expect(
      classifyFixSafety({
        ruleId: 'deslint/no-arbitrary-colors',
        originalText: 'bg-[#1A5276]',
        replacementText: 'bg-primary',
      }),
    ).toBe('heuristic');
  });

  it('returns heuristic when the replacement token is not in the design system', () => {
    expect(
      classifyFixSafety({
        ruleId: 'deslint/no-arbitrary-colors',
        originalText: 'bg-[#1A5276]',
        replacementText: 'bg-brand',
        designSystem: { colors: { primary: '#1A5276' } },
      }),
    ).toBe('heuristic');
  });

  it('returns heuristic for non-color rules even with matching tokens', () => {
    expect(
      classifyFixSafety({
        ruleId: 'deslint/no-arbitrary-spacing',
        originalText: 'p-[16px]',
        replacementText: 'p-4',
        designSystem: { colors: {} },
      }),
    ).toBe('heuristic');
  });
});

describe('classifyFixSafety — additive-safe (motion-safe wrap)', () => {
  it('returns additive-safe when prefers-reduced-motion only adds motion-safe:', () => {
    expect(
      classifyFixSafety({
        ruleId: 'deslint/prefers-reduced-motion',
        originalText: 'transition-all duration-300',
        replacementText: 'motion-safe:transition-all motion-safe:duration-300',
      }),
    ).toBe('additive-safe');
  });

  it('returns heuristic when the fix also removes a token', () => {
    // e.g. the fix dropped `transition-all` entirely rather than wrapping it
    expect(
      classifyFixSafety({
        ruleId: 'deslint/prefers-reduced-motion',
        originalText: 'transition-all duration-300',
        replacementText: 'motion-safe:duration-300',
      }),
    ).toBe('heuristic');
  });

  it('returns heuristic when the rule is not prefers-reduced-motion', () => {
    expect(
      classifyFixSafety({
        ruleId: 'deslint/no-arbitrary-colors',
        originalText: 'transition-all',
        replacementText: 'motion-safe:transition-all',
      }),
    ).toBe('heuristic');
  });

  it('returns heuristic when motion-safe: was already present', () => {
    expect(
      classifyFixSafety({
        ruleId: 'deslint/prefers-reduced-motion',
        originalText: 'motion-safe:transition-all',
        replacementText: 'motion-safe:transition-all',
      }),
    ).toBe('heuristic');
  });
});

describe('classifyFixSafety — heuristic fallback', () => {
  it('returns heuristic for any unknown rule', () => {
    expect(
      classifyFixSafety({
        ruleId: 'deslint/some-future-rule',
        originalText: 'anything',
        replacementText: 'anything-else',
      }),
    ).toBe('heuristic');
  });

  it('returns heuristic when no fix can be classified safely', () => {
    expect(
      classifyFixSafety({
        ruleId: 'deslint/no-arbitrary-colors',
        originalText: 'bg-[#1A5276]',
        replacementText: 'bg-slate-700',
        designSystem: { colors: {} },
      }),
    ).toBe('heuristic');
  });
});

describe('helpers', () => {
  it('extractArbitraryHex pulls the hex from a bracket color', () => {
    expect(extractArbitraryHex('bg-[#1A5276]')).toBe('#1A5276');
    expect(extractArbitraryHex('text-[#fff]')).toBe('#fff');
    expect(extractArbitraryHex('border-[#ABCD]')).toBe('#ABCD');
    expect(extractArbitraryHex('p-4')).toBeNull();
  });

  it('extractTokenName recognises common class prefixes', () => {
    expect(extractTokenName('bg-primary')).toBe('primary');
    expect(extractTokenName('text-accent-500')).toBe('accent-500');
    expect(extractTokenName('border-neutral')).toBe('neutral');
    expect(extractTokenName('p-4')).toBeNull();
  });

  it('normalizeHex canonicalises shorthand + case', () => {
    expect(normalizeHex('#fff')).toBe('ffffff');
    expect(normalizeHex('#FFFFFF')).toBe('ffffff');
    expect(normalizeHex('#1A5276')).toBe('1a5276');
    expect(normalizeHex('1a5276')).toBe('1a5276');
  });
});
