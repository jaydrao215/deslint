/**
 * Tests for the inline-review comment formatter + fixed-line builder.
 *
 * The contract this suite locks in: one-click `suggestion` blocks are
 * ONLY emitted for visually-lossless fixes ('identical' or
 * 'additive-safe'). Opinionated ('heuristic') fixes render as
 * read-only code blocks so a reviewer can't ship a pixel change they
 * never saw.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildFixedLines, formatInlineComment } from '../src/review.js';
import type { FileViolation } from '../src/review.js';

function makeViolation(overrides: Partial<FileViolation> = {}): FileViolation {
  return {
    filePath: 'src/App.tsx',
    line: 1,
    column: 1,
    ruleId: 'deslint/no-arbitrary-colors',
    message: 'Avoid hardcoded hex; use a design token.',
    severity: 'warning',
    ...overrides,
  };
}

describe('buildFixedLines', () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await mkdtemp(join(tmpdir(), 'deslint-review-'));
  });
  afterEach(async () => {
    await rm(tmp, { recursive: true, force: true });
  });

  it('applies the fix range and returns the full replacement line', async () => {
    const filePath = join(tmp, 'App.tsx');
    const source = 'const x = <div className="bg-[#1A5276] p-4" />;\n';
    await writeFile(filePath, source);
    // Range that replaces `bg-[#1A5276]` with `bg-primary`.
    const start = source.indexOf('bg-[#1A5276]');
    const end = start + 'bg-[#1A5276]'.length;
    const fixed = buildFixedLines(filePath, {
      filePath: 'App.tsx',
      line: 1,
      column: 1,
      ruleId: 'deslint/no-arbitrary-colors',
      message: '',
      severity: 'warning',
      fix: { range: [start, end], text: 'bg-primary' },
    });
    expect(fixed).toBe('const x = <div className="bg-primary p-4" />;');
  });

  it('returns null when the range is out of bounds', async () => {
    const filePath = join(tmp, 'App.tsx');
    await writeFile(filePath, 'short');
    const fixed = buildFixedLines(filePath, {
      filePath: 'App.tsx',
      line: 1,
      column: 1,
      ruleId: 'deslint/x',
      message: '',
      severity: 'warning',
      fix: { range: [0, 9999], text: '' },
    });
    expect(fixed).toBeNull();
  });

  it('returns null when the file is unreadable', () => {
    const fixed = buildFixedLines('/nonexistent/deslint-review-test/file.tsx', {
      filePath: 'file.tsx',
      line: 1,
      column: 1,
      ruleId: 'deslint/x',
      message: '',
      severity: 'warning',
      fix: { range: [0, 0], text: '' },
    });
    expect(fixed).toBeNull();
  });

  it('returns null when the violation has no fix', () => {
    const fixed = buildFixedLines('unused', makeViolation());
    expect(fixed).toBeNull();
  });
});

describe('formatInlineComment — one-click suggestion for safe fixes', () => {
  it('emits a ```suggestion block for an identical color replacement', () => {
    const body = formatInlineComment(
      makeViolation({
        fix: { range: [0, 12], text: 'bg-primary' },
      }),
      {
        fixedLines: '<div className="bg-primary p-4" />',
        safety: 'identical',
        suggestFixes: true,
      },
    );
    expect(body).toContain('```suggestion');
    expect(body).toContain('<div className="bg-primary p-4" />');
    expect(body).toContain('Byte-identical autofix');
  });

  it('emits a ```suggestion block for additive-safe motion-safe wraps', () => {
    const body = formatInlineComment(
      makeViolation({ ruleId: 'deslint/prefers-reduced-motion' }),
      {
        fixedLines: '<div className="motion-safe:transition-all" />',
        safety: 'additive-safe',
        suggestFixes: true,
      },
    );
    expect(body).toContain('```suggestion');
    expect(body).toContain('motion-safe:');
    expect(body).toContain('Additive autofix');
  });
});

describe('formatInlineComment — no one-click for heuristic fixes', () => {
  it('renders a plain code block (NOT ```suggestion) for closest-match replacements', () => {
    const body = formatInlineComment(makeViolation(), {
      fixedLines: '<div className="max-w-3xl" />',
      safety: 'heuristic',
      suggestFixes: true,
    });
    expect(body).not.toContain('```suggestion');
    expect(body).toContain('```');
    expect(body).toContain('opinionated');
    expect(body).toContain('deslint fix');
  });
});

describe('formatInlineComment — suggest-fixes=false suppresses autofix rendering', () => {
  it('omits the fix block entirely when suggestFixes is false', () => {
    const body = formatInlineComment(makeViolation(), {
      fixedLines: '<div className="bg-primary" />',
      safety: 'identical',
      suggestFixes: false,
    });
    expect(body).not.toContain('```suggestion');
    expect(body).not.toContain('```');
  });

  it('omits the fix block when no fixedLines are available', () => {
    const body = formatInlineComment(makeViolation(), {
      fixedLines: null,
      suggestFixes: true,
    });
    expect(body).not.toContain('```suggestion');
    expect(body).not.toContain('Byte-identical');
  });
});

describe('formatInlineComment — always-on elements', () => {
  it('includes the rule name, severity icon, and message', () => {
    const body = formatInlineComment(makeViolation({ severity: 'error' }));
    expect(body).toContain('**deslint/no-arbitrary-colors**');
    expect(body).toContain(':red_circle:');
    expect(body).toContain('design token');
  });

  it('includes the WCAG line when the rule maps to a criterion', () => {
    const body = formatInlineComment(
      makeViolation({ ruleId: 'deslint/a11y-color-contrast' }),
    );
    expect(body).toMatch(/WCAG/);
  });
});
