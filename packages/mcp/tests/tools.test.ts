import { describe, it, expect } from 'vitest';
import { analyzeFile, analyzeAndFix } from '../src/tools.js';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';

const TEST_DIR = resolve(tmpdir(), 'vizlint-mcp-test-' + Date.now());

function setup() {
  mkdirSync(TEST_DIR, { recursive: true });
}

function teardown() {
  rmSync(TEST_DIR, { recursive: true, force: true });
}

describe('analyzeFile', () => {
  it('returns empty violations for a clean file', async () => {
    setup();
    try {
      const filePath = resolve(TEST_DIR, 'clean.tsx');
      writeFileSync(filePath, `const Card = () => <div className="flex items-center">Hello</div>;`);

      const result = await analyzeFile({ filePath, projectDir: TEST_DIR });

      expect(result.filePath).toBe('clean.tsx');
      expect(result.score).toBe(100);
      expect(result.totalErrors).toBe(0);
      expect(result.totalWarnings).toBe(0);
    } finally {
      teardown();
    }
  });

  it('detects violations in a file with arbitrary values', async () => {
    setup();
    try {
      const filePath = resolve(TEST_DIR, 'dirty.tsx');
      writeFileSync(filePath, `const Card = () => <div className="bg-[#FF0000] p-[13px]">Bad</div>;`);

      const result = await analyzeFile({ filePath, projectDir: TEST_DIR });

      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.score).toBeLessThan(100);
      expect(result.violations[0].ruleId).toContain('vizlint/');
    } finally {
      teardown();
    }
  });

  it('returns score 100 for non-existent file', async () => {
    const result = await analyzeFile({ filePath: '/nonexistent/file.tsx' });
    expect(result.score).toBe(100);
    expect(result.violations).toEqual([]);
  });
});

describe('analyzeAndFix', () => {
  it('returns fixed code for a file with fixable violations', async () => {
    setup();
    try {
      const filePath = resolve(TEST_DIR, 'fixable.tsx');
      const original = `const Card = () => <div className="bg-[#FF0000] p-[13px]">Fix me</div>;`;
      writeFileSync(filePath, original);

      const result = await analyzeAndFix({ filePath, projectDir: TEST_DIR });

      expect(result.filePath).toBe('fixable.tsx');
      expect(result.originalCode).toBe(original);
      // The fix should have changed something (arbitrary values auto-fixed)
      if (result.fixedViolations > 0) {
        expect(result.fixedCode).not.toBe(original);
      }
    } finally {
      teardown();
    }
  });

  it('returns empty result for non-existent file', async () => {
    const result = await analyzeAndFix({ filePath: '/nonexistent/file.tsx' });
    expect(result.fixedCode).toBe('');
    expect(result.fixedViolations).toBe(0);
  });
});
