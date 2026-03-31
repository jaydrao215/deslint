import { describe, it, expect } from 'vitest';
import { VERSION } from '../src/index.js';

describe('@vizlint/cli', () => {
  it('exports version', () => {
    expect(VERSION).toBe('0.1.0');
  });
});
