import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, rm, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { runLint, RULE_CATEGORY_MAP } from '../src/lint-runner.js';

// ── RULE_CATEGORY_MAP unit tests ────────────────────────────────────

describe('RULE_CATEGORY_MAP', () => {
  it('maps all known Vizlint rules to categories', () => {
    expect(RULE_CATEGORY_MAP['vizlint/no-arbitrary-colors']).toBe('colors');
    expect(RULE_CATEGORY_MAP['vizlint/no-arbitrary-spacing']).toBe('spacing');
    expect(RULE_CATEGORY_MAP['vizlint/no-arbitrary-typography']).toBe('typography');
    expect(RULE_CATEGORY_MAP['vizlint/responsive-required']).toBe('responsive');
    expect(RULE_CATEGORY_MAP['vizlint/consistent-component-spacing']).toBe('consistency');
    expect(RULE_CATEGORY_MAP['vizlint/a11y-color-contrast']).toBe('colors');
    expect(RULE_CATEGORY_MAP['vizlint/dark-mode-coverage']).toBe('colors');
    expect(RULE_CATEGORY_MAP['vizlint/no-arbitrary-zindex']).toBe('consistency');
  });

  it('covers all 5 score categories', () => {
    const categories = new Set(Object.values(RULE_CATEGORY_MAP));
    expect(categories.size).toBe(5);
    expect(categories.has('colors')).toBe(true);
    expect(categories.has('spacing')).toBe(true);
    expect(categories.has('typography')).toBe(true);
    expect(categories.has('responsive')).toBe(true);
    expect(categories.has('consistency')).toBe(true);
  });
});

// ── runLint functional tests ────────────────────────────────────────

describe('runLint', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'vizlint-test-'));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  async function writeTsx(filename: string, content: string): Promise<string> {
    const filePath = join(tmpDir, filename);
    await writeFile(filePath, content);
    return filePath;
  }

  // ── Violation detection ──

  it('finds violations in a file with arbitrary colors and spacing', async () => {
    const filePath = await writeTsx(
      'App.tsx',
      `const App = () => <div className="bg-[#FF0000] p-[13px] text-white">Hello</div>;\nexport default App;\n`,
    );

    const result = await runLint({ files: [filePath] });

    expect(result.totalFiles).toBe(1);
    expect(result.totalViolations).toBeGreaterThan(0);
    expect(result.filesWithViolations).toBe(1);

    // Should detect arbitrary color (bg-[#FF0000])
    expect(result.byRule['vizlint/no-arbitrary-colors']).toBeGreaterThanOrEqual(1);
    // Should detect arbitrary spacing (p-[13px])
    expect(result.byRule['vizlint/no-arbitrary-spacing']).toBeGreaterThanOrEqual(1);
    // dark-mode-coverage skips arbitrary bg-[...] values (they're not standard color patterns)
  });

  it('returns correct bySeverity counts', async () => {
    const filePath = await writeTsx(
      'Bad.tsx',
      `const Bad = () => <div className="bg-[#FF0000] p-[13px]">bad</div>;\nexport default Bad;\n`,
    );

    const result = await runLint({ files: [filePath] });

    // Default config sets all rules to 'warn' (severity 1)
    expect(result.bySeverity.warnings).toBeGreaterThan(0);
    // warnings + errors should equal totalViolations
    expect(result.bySeverity.warnings + result.bySeverity.errors).toBe(result.totalViolations);
  });

  it('populates byCategory from detected violations', async () => {
    const filePath = await writeTsx(
      'Mixed.tsx',
      `const Mixed = () => <div className="bg-[#FF0000] p-[13px]">mixed</div>;\nexport default Mixed;\n`,
    );

    const result = await runLint({ files: [filePath] });

    // Arbitrary color + dark-mode-coverage -> colors category
    expect(result.byCategory.colors).toBeGreaterThanOrEqual(1);
    // Arbitrary spacing -> spacing category
    expect(result.byCategory.spacing).toBeGreaterThanOrEqual(1);
  });

  // ── Clean files ──

  it('returns zero violations for a file with only layout utilities', async () => {
    const filePath = await writeTsx(
      'Clean.tsx',
      `const Clean = () => <div className="flex items-center justify-center">Clean</div>;\nexport default Clean;\n`,
    );

    const result = await runLint({ files: [filePath] });

    expect(result.totalFiles).toBe(1);
    expect(result.totalViolations).toBe(0);
    expect(result.filesWithViolations).toBe(0);
    expect(result.bySeverity.errors).toBe(0);
    expect(result.bySeverity.warnings).toBe(0);
  });

  it('returns zero violations for a file with proper dark mode coverage', async () => {
    const filePath = await writeTsx(
      'DarkClean.tsx',
      `const DarkClean = () => <div className="bg-white dark:bg-gray-900 p-4 text-gray-900">Clean</div>;\nexport default DarkClean;\n`,
    );

    const result = await runLint({ files: [filePath] });

    expect(result.totalViolations).toBe(0);
    expect(result.filesWithViolations).toBe(0);
  });

  // ── Rule overrides ──

  it('respects ruleOverrides to disable a rule', async () => {
    const filePath = await writeTsx(
      'Override.tsx',
      `const Override = () => <div className="bg-[#FF0000] p-4">override</div>;\nexport default Override;\n`,
    );

    const result = await runLint({
      files: [filePath],
      ruleOverrides: { 'vizlint/no-arbitrary-colors': 'off' },
    });

    // The disabled rule should not appear in byRule
    expect(result.byRule['vizlint/no-arbitrary-colors']).toBeUndefined();
  });

  it('respects ruleOverrides to escalate a rule to error', async () => {
    const filePath = await writeTsx(
      'Escalate.tsx',
      `const Escalate = () => <div className="bg-[#FF0000] bg-blue-500">escalate</div>;\nexport default Escalate;\n`,
    );

    const result = await runLint({
      files: [filePath],
      ruleOverrides: { 'vizlint/no-arbitrary-colors': 'error' },
    });

    // no-arbitrary-colors should now be reported as an error (severity 2)
    expect(result.bySeverity.errors).toBeGreaterThanOrEqual(1);
  });

  it('handles ruleOverrides without vizlint/ prefix', async () => {
    const filePath = await writeTsx(
      'ShortPrefix.tsx',
      `const ShortPrefix = () => <div className="bg-[#FF0000]">test</div>;\nexport default ShortPrefix;\n`,
    );

    const result = await runLint({
      files: [filePath],
      ruleOverrides: { 'no-arbitrary-colors': 'off' },
    });

    expect(result.byRule['vizlint/no-arbitrary-colors']).toBeUndefined();
  });

  it('disabling multiple rules removes all their violations', async () => {
    const filePath = await writeTsx(
      'MultiOff.tsx',
      `const MultiOff = () => <div className="bg-[#FF0000] p-[13px]">multi</div>;\nexport default MultiOff;\n`,
    );

    const result = await runLint({
      files: [filePath],
      ruleOverrides: {
        'vizlint/no-arbitrary-colors': 'off',
        'vizlint/no-arbitrary-spacing': 'off',
        'vizlint/dark-mode-coverage': 'off',
      },
    });

    expect(result.byRule['vizlint/no-arbitrary-colors']).toBeUndefined();
    expect(result.byRule['vizlint/no-arbitrary-spacing']).toBeUndefined();
    expect(result.byRule['vizlint/dark-mode-coverage']).toBeUndefined();
  });

  // ── Multi-file aggregation ──

  it('lints multiple files and aggregates results correctly', async () => {
    const file1 = await writeTsx(
      'Page1.tsx',
      `const Page1 = () => <div className="bg-[#FF0000]">one</div>;\nexport default Page1;\n`,
    );
    const file2 = await writeTsx(
      'Page2.tsx',
      `const Page2 = () => <div className="p-[13px]">two</div>;\nexport default Page2;\n`,
    );
    // Page3 is fully clean: only layout utilities, no bg colors
    const file3 = await writeTsx(
      'Page3.tsx',
      `const Page3 = () => <div className="flex items-center">clean</div>;\nexport default Page3;\n`,
    );

    const result = await runLint({ files: [file1, file2, file3] });

    expect(result.totalFiles).toBe(3);
    // Only Page1 and Page2 have violations
    expect(result.filesWithViolations).toBe(2);
    expect(result.totalViolations).toBeGreaterThanOrEqual(2);
  });

  // ── Auto-fix ──

  it('applies fix and writes corrected file to disk', async () => {
    const filePath = await writeTsx(
      'Fixable.tsx',
      `const Fixable = () => <div className="bg-[#FF0000] p-[13px]">fix me</div>;\nexport default Fixable;\n`,
    );

    const result = await runLint({ files: [filePath], fix: true });

    const fixedContent = await readFile(filePath, 'utf-8');

    expect(result.totalFiles).toBe(1);
    // p-[13px] should be replaced with the nearest scale value (p-3)
    expect(fixedContent).not.toContain('p-[13px]');
    expect(fixedContent).toContain('p-3');
  });

  // ── Result structure ──

  it('returns results with correct LintFileResult structure', async () => {
    const filePath = await writeTsx(
      'Structure.tsx',
      `const Structure = () => <div className="bg-[#FF0000]">structure</div>;\nexport default Structure;\n`,
    );

    const result = await runLint({ files: [filePath] });

    expect(result.results).toHaveLength(1);
    const fileResult = result.results[0];
    expect(fileResult.filePath).toBe(filePath);
    expect(Array.isArray(fileResult.messages)).toBe(true);
    expect(fileResult.messages.length).toBeGreaterThan(0);

    // Every message should have a non-null ruleId (real violations, not file-ignored)
    for (const msg of fileResult.messages) {
      expect(msg.ruleId).toBeTruthy();
      expect(typeof msg.severity).toBe('number');
      expect(typeof msg.message).toBe('string');
      expect(typeof msg.line).toBe('number');
      expect(typeof msg.column).toBe('number');
    }
  });

  it('supports explicit cwd option', async () => {
    const filePath = await writeTsx(
      'CwdTest.tsx',
      `const CwdTest = () => <div className="bg-[#FF0000]">cwd test</div>;\nexport default CwdTest;\n`,
    );

    const result = await runLint({ files: [filePath], cwd: tmpDir });

    expect(result.totalFiles).toBe(1);
    expect(result.totalViolations).toBeGreaterThan(0);
    expect(result.byRule['vizlint/no-arbitrary-colors']).toBeGreaterThanOrEqual(1);
  });

  it('handles a single-violation file with only spacing issues', async () => {
    const filePath = await writeTsx(
      'SpacingOnly.tsx',
      `const SpacingOnly = () => <div className="p-[13px]">spacing only</div>;\nexport default SpacingOnly;\n`,
    );

    const result = await runLint({ files: [filePath] });

    expect(result.byRule['vizlint/no-arbitrary-spacing']).toBeGreaterThanOrEqual(1);
    // No color rules should fire (no bg or text color classes)
    expect(result.byRule['vizlint/no-arbitrary-colors']).toBeUndefined();
    expect(result.byCategory.spacing).toBeGreaterThanOrEqual(1);
  });
});
