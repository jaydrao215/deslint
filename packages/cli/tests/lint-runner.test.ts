import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, rm, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { runLint, RULE_CATEGORY_MAP } from '../src/lint-runner.js';

// ── RULE_CATEGORY_MAP unit tests ───────────────────────────────

describe('RULE_CATEGORY_MAP', () => {
  it('maps all known Deslint rules to categories', () => {
    expect(RULE_CATEGORY_MAP['deslint/no-arbitrary-colors']).toBe('colors');
    expect(RULE_CATEGORY_MAP['deslint/no-arbitrary-spacing']).toBe('spacing');
    expect(RULE_CATEGORY_MAP['deslint/no-arbitrary-typography']).toBe('typography');
    expect(RULE_CATEGORY_MAP['deslint/responsive-required']).toBe('responsive');
    expect(RULE_CATEGORY_MAP['deslint/consistent-component-spacing']).toBe('consistency');
    expect(RULE_CATEGORY_MAP['deslint/a11y-color-contrast']).toBe('colors');
    expect(RULE_CATEGORY_MAP['deslint/dark-mode-coverage']).toBe('colors');
    expect(RULE_CATEGORY_MAP['deslint/no-arbitrary-zindex']).toBe('consistency');
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

// ── runLint functional tests ──────────────────────────────────

describe('runLint', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'deslint-test-'));
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
    expect(result.byRule['deslint/no-arbitrary-colors']).toBeGreaterThanOrEqual(1);
    // Should detect arbitrary spacing (p-[13px])
    expect(result.byRule['deslint/no-arbitrary-spacing']).toBeGreaterThanOrEqual(1);
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
      ruleOverrides: { 'deslint/no-arbitrary-colors': 'off' },
    });

    // The disabled rule should not appear in byRule
    expect(result.byRule['deslint/no-arbitrary-colors']).toBeUndefined();
  });

  it('respects ruleOverrides to escalate a rule to error', async () => {
    const filePath = await writeTsx(
      'Escalate.tsx',
      `const Escalate = () => <div className="bg-[#FF0000] bg-blue-500">escalate</div>;\nexport default Escalate;\n`,
    );

    const result = await runLint({
      files: [filePath],
      ruleOverrides: { 'deslint/no-arbitrary-colors': 'error' },
    });

    // no-arbitrary-colors should now be reported as an error (severity 2)
    expect(result.bySeverity.errors).toBeGreaterThanOrEqual(1);
  });

  it('handles ruleOverrides without deslint/ prefix', async () => {
    const filePath = await writeTsx(
      'ShortPrefix.tsx',
      `const ShortPrefix = () => <div className="bg-[#FF0000]">test</div>;\nexport default ShortPrefix;\n`,
    );

    const result = await runLint({
      files: [filePath],
      ruleOverrides: { 'no-arbitrary-colors': 'off' },
    });

    expect(result.byRule['deslint/no-arbitrary-colors']).toBeUndefined();
  });

  it('disabling multiple rules removes all their violations', async () => {
    const filePath = await writeTsx(
      'MultiOff.tsx',
      `const MultiOff = () => <div className="bg-[#FF0000] p-[13px]">multi</div>;\nexport default MultiOff;\n`,
    );

    const result = await runLint({
      files: [filePath],
      ruleOverrides: {
        'deslint/no-arbitrary-colors': 'off',
        'deslint/no-arbitrary-spacing': 'off',
        'deslint/dark-mode-coverage': 'off',
      },
    });

    expect(result.byRule['deslint/no-arbitrary-colors']).toBeUndefined();
    expect(result.byRule['deslint/no-arbitrary-spacing']).toBeUndefined();
    expect(result.byRule['deslint/dark-mode-coverage']).toBeUndefined();
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
    expect(result.byRule['deslint/no-arbitrary-colors']).toBeGreaterThanOrEqual(1);
  });

  it('handles a single-violation file with only spacing issues', async () => {
    const filePath = await writeTsx(
      'SpacingOnly.tsx',
      `const SpacingOnly = () => <div className="p-[13px]">spacing only</div>;\nexport default SpacingOnly;\n`,
    );

    const result = await runLint({ files: [filePath] });

    expect(result.byRule['deslint/no-arbitrary-spacing']).toBeGreaterThanOrEqual(1);
    // No color rules should fire (no bg or text color classes)
    expect(result.byRule['deslint/no-arbitrary-colors']).toBeUndefined();
    expect(result.byCategory.spacing).toBeGreaterThanOrEqual(1);
  });

  // ── Plain HTML parser (S2) ────────────────────────────────────
  //
  // These tests exercise the FULL stack: file on disk → runLint → dynamic
  // parser resolution → flat config block routing → @html-eslint/parser →
  // visitor dispatch → rule execution → aggregated report. If any step in
  // that chain breaks for a user installing @deslint/eslint-plugin + the
  // optional @html-eslint/parser peer dep, these tests catch it.
  describe('plain HTML support', () => {
    async function writeFile_(filename: string, content: string): Promise<string> {
      const filePath = join(tmpDir, filename);
      await writeFile(filePath, content);
      return filePath;
    }

    it('lints a plain HTML file and flags arbitrary colors via class attribute', async () => {
      const filePath = await writeFile_(
        'index.html',
        `<!DOCTYPE html><html lang="en"><body><div class="bg-[#FF0000] p-4">hi</div></body></html>\n`,
      );

      const result = await runLint({ files: [filePath] });

      expect(result.totalFiles).toBe(1);
      expect(result.byRule['deslint/no-arbitrary-colors']).toBeGreaterThanOrEqual(1);
    });

    it('flags a missing alt on <img> in plain HTML (image-alt-text)', async () => {
      const filePath = await writeFile_(
        'page.html',
        `<!DOCTYPE html><html lang="en"><body><img src="x.png"></body></html>\n`,
      );

      const result = await runLint({ files: [filePath] });

      expect(result.byRule['deslint/image-alt-text']).toBeGreaterThanOrEqual(1);
    });

    it('flags missing lang on <html> (lang-attribute, WCAG 3.1.1)', async () => {
      const filePath = await writeFile_(
        'no-lang.html',
        `<!DOCTYPE html><html><body><p>hi</p></body></html>\n`,
      );

      const result = await runLint({ files: [filePath] });

      expect(result.byRule['deslint/lang-attribute']).toBeGreaterThanOrEqual(1);
    });

    it('flags viewport meta with user-scalable=no (viewport-meta, WCAG 1.4.4)', async () => {
      const filePath = await writeFile_(
        'zoom-blocked.html',
        `<!DOCTYPE html><html lang="en"><head><meta name="viewport" content="width=device-width, user-scalable=no"></head><body></body></html>\n`,
      );

      const result = await runLint({ files: [filePath] });

      expect(result.byRule['deslint/viewport-meta']).toBeGreaterThanOrEqual(1);
    });

    it('flags skipped heading levels in plain HTML (heading-hierarchy)', async () => {
      const filePath = await writeFile_(
        'skipped-heading.html',
        `<!DOCTYPE html><html lang="en"><body><h1>Title</h1><h3>Skips h2</h3></body></html>\n`,
      );

      const result = await runLint({ files: [filePath] });

      expect(result.byRule['deslint/heading-hierarchy']).toBeGreaterThanOrEqual(1);
    });

    it('flags generic "click here" link text in plain HTML (link-text, WCAG 2.4.4)', async () => {
      const filePath = await writeFile_(
        'click-here.html',
        `<!DOCTYPE html><html lang="en"><body><a href="/foo">click here</a></body></html>\n`,
      );

      const result = await runLint({ files: [filePath] });

      expect(result.byRule['deslint/link-text']).toBeGreaterThanOrEqual(1);
    });

    it('flags unlabeled form control in plain HTML (form-labels)', async () => {
      const filePath = await writeFile_(
        'unlabeled-form.html',
        `<!DOCTYPE html><html lang="en"><body><form><input type="text"></form></body></html>\n`,
      );

      const result = await runLint({ files: [filePath] });

      expect(result.byRule['deslint/form-labels']).toBeGreaterThanOrEqual(1);
    });

    it('flags aria-labelby typo in plain HTML (aria-validation)', async () => {
      const filePath = await writeFile_(
        'aria-typo.html',
        `<!DOCTYPE html><html lang="en"><body><button aria-labelby="x">click</button></body></html>\n`,
      );

      const result = await runLint({ files: [filePath] });

      expect(result.byRule['deslint/aria-validation']).toBeGreaterThanOrEqual(1);
    });

    it('passes a clean plain HTML file with zero violations', async () => {
      const filePath = await writeFile_(
        'clean.html',
        `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Clean</title>
  </head>
  <body>
    <h1>Welcome</h1>
    <p>This page is accessible.</p>
    <img src="photo.jpg" alt="A golden retriever playing fetch" loading="lazy" width="800" height="600" srcset="photo-400.jpg 400w, photo-800.jpg 800w">
    <form>
      <label for="email">Email</label>
      <input id="email" type="email" autocomplete="email" aria-invalid="false">
      <button type="submit">Subscribe to the newsletter</button>
    </form>
  </body>
</html>
`,
      );

      const result = await runLint({ files: [filePath] });

      expect(result.totalFiles).toBe(1);
      // The goal: a hand-audited clean file produces zero deslint violations.
      // This is the single best smoke test that nothing in S2's plumbing is
      // over-firing against real HTML.
      expect(result.totalViolations).toBe(0);
    });

    it('aggregates violations across multiple HTML files correctly', async () => {
      const good = await writeFile_(
        'good.html',
        `<!DOCTYPE html><html lang="en"><body><h1>Good</h1><img src="x.png" alt="descriptive alt text" loading="lazy" width="400" height="300" srcset="x-200.png 200w, x-400.png 400w"></body></html>\n`,
      );
      const bad = await writeFile_(
        'bad.html',
        `<!DOCTYPE html><html><body><img src="y.png"></body></html>\n`,
      );

      const result = await runLint({ files: [good, bad] });

      expect(result.totalFiles).toBe(2);
      expect(result.filesWithViolations).toBe(1);
      // bad.html should have BOTH lang-attribute AND image-alt-text violations
      expect(result.byRule['deslint/lang-attribute']).toBeGreaterThanOrEqual(1);
      expect(result.byRule['deslint/image-alt-text']).toBeGreaterThanOrEqual(1);
    });

    it('handles malformed HTML without crashing the linter', async () => {
      const filePath = await writeFile_(
        'malformed.html',
        `<div><p>unclosed<span>oops\n`,
      );

      // Linter must not throw. It's fine for the parser to emit syntax
      // messages; we only require that the runner returns a structured
      // result and does not crash.
      const result = await runLint({ files: [filePath] });
      expect(result.totalFiles).toBe(1);
    });
  });
});
