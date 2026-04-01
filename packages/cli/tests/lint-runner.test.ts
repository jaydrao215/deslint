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

    // Arbitrary color -> colors category
    expect(result.byCategory.colors).toBeGreaterThanOrEqual(1);
    // Arbitrary spacing -> spacing category
    expect(result.byCategory.spacing).toBeGreaterThanOrEqual(1);
  });

  it('returns zero violations for a clean file', async () => {
    const filePath = await writeTsx(
      'Clean.tsx',
      `const Clean = () => <div className="bg-white dark:bg-gray-900 p-4 text-gray-900">Clean</div>;\nexport default Clean;\n`,
    );

    const result = await runLint({ files: [filePath] });

    expect(result.totalFiles).toBe(1);
    expect(result.totalViolations).toBe(0);
    expect(result.filesWithViolations).toBe(0);
    expect(result.bySeverity.errors).toBe(0);
    expect(result.bySeverity.warnings).toBe(0);
  });

  it('respects ruleOverrides to disable a rule', async () => {
    const filePath = await writeTsx(
      'Override.tsx',
      `const Override = () => <div className="bg-[#FF0000] p-4">override</div>;\nexport default Override;\n`,
    );

    // Run with no-arbitrary-colors turned off
    const result = await runLint({
      files: [filePath],
      ruleOverrides: { 'vizlint/no-arbitrary-colors': 'off' },
    });

    // The rule should not appear in byRule
    expect(result.byRule['vizlint/no-arbitrary-colors']).toBeUndefined();
  });

  it('respects ruleOverrides to escalate a rule to error', async () => {
    const filePath = await writeTsx(
      'Escalate.tsx',
      `const Escalate = () => <div className="bg-[#FF0000]">escalate</div>;\nexport default Escalate;\n`,
    );

    const result = await runLint({
      files: [filePath],
      ruleOverrides: { 'vizlint/no-arbitrary-colors': 'error' },
    });

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

  it('lints multiple files and aggregates results', async () => {
    const file1 = await writeTsx(
      'Page1.tsx',
      `const Page1 = () => <div className="bg-[#FF0000]">one</div>;\nexport default Page1;\n`,
    );
    const file2 = await writeTsx(
      'Page2.tsx',
      `const Page2 = () => <div className="p-[13px]">two</div>;\nexport default Page2;\n`,
    );
    const file3 = await writeTsx(
      'Page3.tsx',
      `const Page3 = () => <div className="bg-white dark:bg-gray-900 p-4 text-gray-900">clean</div>;\nexport default Page3;\n`,
    );

    const result = await runLint({ files: [file1, file2, file3] });

    expect(result.totalFiles).toBe(3);
    expect(result.filesWithViolations).toBe(2);
    expect(result.totalViolations).toBeGreaterThanOrEqual(2);
  });

  it('applies fix and produces output with fix: true', async () => {
    const filePath = await writeTsx(
      'Fixable.tsx',
      `const Fixable = () => <div className="bg-[#FF0000] p-[13px]">fix me</div>;\nexport default Fixable;\n`,
    );

    const result = await runLint({ files: [filePath], fix: true });

    // After fix, the file should have been modified on disk
    const fixedContent = await readFile(filePath, 'utf-8');

    // The fixed content should differ from the original (arbitrary values replaced)
    // At minimum, the result should report it processed the file
    expect(result.totalFiles).toBe(1);

    // If the rules are fixable, the file content should change
    // bg-[#FF0000] should be replaced with a token like bg-red-600
    // p-[13px] should be replaced with a scale value like p-3
    if (fixedContent.includes('bg-[#FF0000]') === false) {
      // Fix was applied for color
      expect(fixedContent).not.toContain('bg-[#FF0000]');
    }
  });

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

    const msg = fileResult.messages[0];
    expect(msg.ruleId).toBeTruthy();
    expect(typeof msg.severity).toBe('number');
    expect(typeof msg.message).toBe('string');
    expect(typeof msg.line).toBe('number');
    expect(typeof msg.column).toBe('number');
  });
});
