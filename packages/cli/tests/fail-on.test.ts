/**
 * Unit tests for the `--fail-on` exit-code policy helpers.
 *
 * The full exit-code matrix is the CI contract for `deslint scan`:
 *
 *   failOn   errors=0, warn=0 | errors=0, warn>0 | errors>0, warn=0
 *   never            false            false              false
 *   error            false            false              true
 *   warning          false            true               true
 *   any              false            true               true
 *
 * These helpers live in index.ts but are exported so we can lock the
 * matrix down without spawning a subprocess per case.
 */

import { describe, it, expect } from 'vitest';
import { parseFailOn, shouldFailOnViolations } from '../src/index.js';

describe('parseFailOn', () => {
  it('defaults to "error" when no value is provided', () => {
    expect(parseFailOn(undefined)).toBe('error');
  });

  it('accepts a custom fallback', () => {
    expect(parseFailOn(undefined, 'never')).toBe('never');
  });

  it('accepts all four valid levels, case-insensitive', () => {
    expect(parseFailOn('error')).toBe('error');
    expect(parseFailOn('WARNING')).toBe('warning');
    expect(parseFailOn('Any')).toBe('any');
    expect(parseFailOn('Never')).toBe('never');
  });

  it('throws on an unknown value with a helpful hint', () => {
    expect(() => parseFailOn('bogus')).toThrow(/Invalid --fail-on/);
    expect(() => parseFailOn('bogus')).toThrow(/error, warning, any, never/);
  });
});

describe('shouldFailOnViolations', () => {
  it('"never" always returns false', () => {
    expect(shouldFailOnViolations('never', 0, 0)).toBe(false);
    expect(shouldFailOnViolations('never', 5, 0)).toBe(false);
    expect(shouldFailOnViolations('never', 0, 5)).toBe(false);
    expect(shouldFailOnViolations('never', 3, 7)).toBe(false);
  });

  it('"error" fails only when errors > 0', () => {
    expect(shouldFailOnViolations('error', 0, 0)).toBe(false);
    expect(shouldFailOnViolations('error', 0, 5)).toBe(false);
    expect(shouldFailOnViolations('error', 1, 0)).toBe(true);
    expect(shouldFailOnViolations('error', 2, 3)).toBe(true);
  });

  it('"warning" fails on any violation', () => {
    expect(shouldFailOnViolations('warning', 0, 0)).toBe(false);
    expect(shouldFailOnViolations('warning', 0, 1)).toBe(true);
    expect(shouldFailOnViolations('warning', 1, 0)).toBe(true);
    expect(shouldFailOnViolations('warning', 2, 3)).toBe(true);
  });

  it('"any" behaves identically to "warning"', () => {
    expect(shouldFailOnViolations('any', 0, 0)).toBe(false);
    expect(shouldFailOnViolations('any', 0, 1)).toBe(true);
    expect(shouldFailOnViolations('any', 1, 0)).toBe(true);
  });
});
