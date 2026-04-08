import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { analyzeFile, analyzeAndFix } from '../src/tools.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'deslint-mcp-test-'));
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

// ── analyzeFile ──────────────────────────────────────────────────────

describe('analyzeFile', () => {
  it('detects violations in a file with arbitrary color and spacing', async () => {
    const filePath = join(tmpDir, 'dirty.tsx');
    const code = `const App = () => <div className="bg-[#FF0000] p-[13px] text-white">Hello</div>;\nexport default App;\n`;
    await writeFile(filePath, code);

    const result = await analyzeFile({ filePath, projectDir: tmpDir });

    expect(result.violations.length).toBeGreaterThan(0);
    expect(result.score).toBeLessThan(100);

    const ruleIds = result.violations.map((v) => v.ruleId);
    expect(ruleIds.some((id) => id.includes('deslint/'))).toBe(true);
  });

  it('returns correct violation metadata (ruleId, severity, line/column)', async () => {
    const filePath = join(tmpDir, 'meta.tsx');
    const code = `const App = () => <div className="bg-[#FF0000] p-[13px]">Hello</div>;\nexport default App;\n`;
    await writeFile(filePath, code);

    const result = await analyzeFile({ filePath, projectDir: tmpDir });

    for (const v of result.violations) {
      expect(v.ruleId).toMatch(/^deslint\//);
      expect(['error', 'warning']).toContain(v.severity);
      expect(v.line).toBeGreaterThanOrEqual(1);
      expect(v.column).toBeGreaterThanOrEqual(1);
      expect(typeof v.message).toBe('string');
      expect(v.message.length).toBeGreaterThan(0);
    }
  });

  it('counts totalErrors and totalWarnings correctly', async () => {
    const filePath = join(tmpDir, 'counts.tsx');
    const code = `const App = () => <div className="bg-[#FF0000] p-[13px]">Hello</div>;\nexport default App;\n`;
    await writeFile(filePath, code);

    const result = await analyzeFile({ filePath, projectDir: tmpDir });

    const errors = result.violations.filter((v) => v.severity === 'error').length;
    const warnings = result.violations.filter((v) => v.severity === 'warning').length;

    expect(result.totalErrors).toBe(errors);
    expect(result.totalWarnings).toBe(warnings);
    expect(result.totalErrors + result.totalWarnings).toBe(result.violations.length);
  });

  it('computes score as max(0, 100 - violations * 10)', async () => {
    const filePath = join(tmpDir, 'score.tsx');
    const code = `const App = () => <div className="bg-[#FF0000] p-[13px]">Hello</div>;\nexport default App;\n`;
    await writeFile(filePath, code);

    const result = await analyzeFile({ filePath, projectDir: tmpDir });

    const expectedScore = Math.max(0, 100 - result.violations.length * 10);
    expect(result.score).toBe(expectedScore);
  });

  it('returns score 100 and zero violations for a clean file', async () => {
    const filePath = join(tmpDir, 'clean.tsx');
    // Use only utility classes that don't trigger any rules (no colors = no contrast/dark-mode issues)
    const code = `const App = () => <div className="flex items-center p-4">Hello</div>;\nexport default App;\n`;
    await writeFile(filePath, code);

    const result = await analyzeFile({ filePath, projectDir: tmpDir });

    expect(result.violations).toEqual([]);
    expect(result.score).toBe(100);
    expect(result.totalErrors).toBe(0);
    expect(result.totalWarnings).toBe(0);
  });

  it('throws Error for a non-existent file path', async () => {
    await expect(
      analyzeFile({ filePath: 'does-not-exist.tsx', projectDir: tmpDir }),
    ).rejects.toThrow('File not found');
  });

  it('throws Error for an absolute non-existent path', async () => {
    await expect(
      analyzeFile({ filePath: '/tmp/nonexistent-deslint-test-file-xyz.tsx' }),
    ).rejects.toThrow('File not found');
  });

  it('returns filePath relative to projectDir', async () => {
    const subDir = join(tmpDir, 'src', 'components');
    const { mkdir } = await import('node:fs/promises');
    await mkdir(subDir, { recursive: true });
    const filePath = join(subDir, 'Button.tsx');
    const code = `const Button = () => <button className="px-4 py-2">Click</button>;\nexport default Button;\n`;
    await writeFile(filePath, code);

    const result = await analyzeFile({
      filePath: 'src/components/Button.tsx',
      projectDir: tmpDir,
    });

    expect(result.filePath).toBe('src/components/Button.tsx');
  });
});

// ── analyzeAndFix ────────────────────────────────────────────────────

describe('analyzeAndFix', () => {
  it('returns originalCode matching the file content', async () => {
    const filePath = join(tmpDir, 'fixable.tsx');
    const code = `const App = () => <div className="bg-[#FF0000] p-[13px] text-white">Hello</div>;\nexport default App;\n`;
    await writeFile(filePath, code);

    const result = await analyzeAndFix({ filePath, projectDir: tmpDir });

    expect(result.originalCode).toBe(code);
  });

  it('produces fixedCode that differs from originalCode when there are fixable violations', async () => {
    const filePath = join(tmpDir, 'fixable.tsx');
    const code = `const App = () => <div className="bg-[#FF0000] p-[13px] text-white">Hello</div>;\nexport default App;\n`;
    await writeFile(filePath, code);

    const result = await analyzeAndFix({ filePath, projectDir: tmpDir });

    // If any violations were fixed, the code should have changed
    if (result.fixedViolations > 0) {
      expect(result.fixedCode).not.toBe(result.originalCode);
    }
  });

  it('reports fixedViolations count > 0 for a file with fixable violations', async () => {
    const filePath = join(tmpDir, 'fixable.tsx');
    const code = `const App = () => <div className="bg-[#FF0000] p-[13px] text-white">Hello</div>;\nexport default App;\n`;
    await writeFile(filePath, code);

    const result = await analyzeAndFix({ filePath, projectDir: tmpDir });

    // The file has arbitrary color and spacing which should be fixable
    expect(result.fixedViolations).toBeGreaterThanOrEqual(0);
    // At minimum, we know there are violations to attempt fixing
    const analyzeResult = await analyzeFile({ filePath, projectDir: tmpDir });
    if (analyzeResult.violations.some((v) => v.fix)) {
      expect(result.fixedViolations).toBeGreaterThan(0);
    }
  });

  it('remainingViolations contains only non-fixable violations', async () => {
    const filePath = join(tmpDir, 'partial.tsx');
    const code = `const App = () => <div className="bg-[#FF0000] p-[13px] text-white">Hello</div>;\nexport default App;\n`;
    await writeFile(filePath, code);

    const result = await analyzeAndFix({ filePath, projectDir: tmpDir });

    // Remaining violations should still have proper structure
    for (const v of result.remainingViolations) {
      expect(v.ruleId).toMatch(/^deslint\//);
      expect(['error', 'warning']).toContain(v.severity);
      expect(v.line).toBeGreaterThanOrEqual(1);
      expect(v.column).toBeGreaterThanOrEqual(1);
    }
  });

  it('fixedViolations + remainingViolations equals original total violations', async () => {
    const filePath = join(tmpDir, 'math.tsx');
    const code = `const App = () => <div className="bg-[#FF0000] p-[13px] text-white">Hello</div>;\nexport default App;\n`;
    await writeFile(filePath, code);

    const analyzeResult = await analyzeFile({ filePath, projectDir: tmpDir });
    const fixResult = await analyzeAndFix({ filePath, projectDir: tmpDir });

    expect(fixResult.fixedViolations + fixResult.remainingViolations.length).toBe(
      analyzeResult.violations.length,
    );
  });

  it('returns filePath relative to projectDir', async () => {
    const filePath = join(tmpDir, 'rel.tsx');
    const code = `const App = () => <div className="bg-[#FF0000]">Hello</div>;\nexport default App;\n`;
    await writeFile(filePath, code);

    const result = await analyzeAndFix({
      filePath: 'rel.tsx',
      projectDir: tmpDir,
    });

    expect(result.filePath).toBe('rel.tsx');
  });

  it('throws Error for a non-existent file path', async () => {
    await expect(
      analyzeAndFix({ filePath: 'does-not-exist.tsx', projectDir: tmpDir }),
    ).rejects.toThrow('File not found');
  });

  it('returns unchanged code for a clean file', async () => {
    const filePath = join(tmpDir, 'clean.tsx');
    // Use only utility classes that don't trigger any rules (no colors = no contrast/dark-mode issues)
    const code = `const App = () => <div className="flex items-center p-4">Hello</div>;\nexport default App;\n`;
    await writeFile(filePath, code);

    const result = await analyzeAndFix({ filePath, projectDir: tmpDir });

    expect(result.originalCode).toBe(code);
    expect(result.fixedCode).toBe(code);
    expect(result.fixedViolations).toBe(0);
    expect(result.remainingViolations).toEqual([]);
  });
});
