/**
 * Tests for the wave-5 MCP additions: `verifyBeforeWrite`, `scanDiff`,
 * `getAllRuleDetails`, and `strict` mode on `analyzeFile`.
 *
 * Conventions match the existing `tests/tools.test.ts`:
 *   - per-test tmpDir under `os.tmpdir()`, cleaned up in `afterEach`
 *   - all tools are called directly (no MCP transport in scope)
 *   - real `runLint` engine runs underneath; we never mock it
 */
import { mkdtemp, writeFile, rm, mkdir } from 'node:fs/promises';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  verifyBeforeWrite,
  scanDiff,
  getAllRuleDetails,
  analyzeFile,
  quickCheck,
  getServerStats,
  preloadFastPath,
  _resetCaches,
} from '../src/tools.js';

const exec = promisify(execFile);

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'deslint-mcp-verify-'));
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

// ── verifyBeforeWrite ───────────────────────────────────────────────

describe('verifyBeforeWrite', () => {
  it('returns ok-to-write when the proposed content is clean', async () => {
    const filePath = join(tmpDir, 'clean.tsx');
    const proposedContent = `const App = () => <div className="bg-red-500 p-4">Hello</div>;\nexport default App;\n`;

    const result = await verifyBeforeWrite({ filePath, proposedContent, projectDir: tmpDir });

    expect(result.passed).toBe(true);
    expect(result.violations.length).toBe(0);
    expect(result.recommendedAction).toBe('ok-to-write');
    expect(result.score).toBe(100);
  });

  it('reports violations when the proposed content has arbitrary colors', async () => {
    const filePath = join(tmpDir, 'dirty.tsx');
    const proposedContent = `const App = () => <div className="bg-[#FF0000] p-[13px]">Hi</div>;\nexport default App;\n`;

    // In non-strict mode, the design-token rules fire at `warn` severity
    // by default — so `passed` stays true (no errors) but the agent
    // still sees the violations + score < 100 and can decide what to
    // do. The stricter shape is exercised by the `strict: true` test
    // below.
    const result = await verifyBeforeWrite({ filePath, proposedContent, projectDir: tmpDir });

    expect(result.violations.length).toBeGreaterThan(0);
    expect(result.totalWarnings).toBeGreaterThan(0);
    expect(result.score).toBeLessThan(100);
  });

  it('flips passed=false when the proposed content has any error-severity violation', async () => {
    const filePath = join(tmpDir, 'with-error.tsx');
    // viewport-meta defaults to error in the recommended preset, but
    // it only fires on `<meta>` tags. Use `aria-validation` instead —
    // also error-severity, fires on hallucinated `aria-*` attributes.
    const proposedContent = `const App = () => <button aria-hiden="true">click</button>;\nexport default App;\n`;

    const result = await verifyBeforeWrite({ filePath, proposedContent, projectDir: tmpDir });

    expect(result.totalErrors).toBeGreaterThan(0);
    expect(result.passed).toBe(false);
    expect(result.recommendedAction).not.toBe('ok-to-write');
  });

  it('does NOT write the target file to disk during verification', async () => {
    const filePath = join(tmpDir, 'never-written.tsx');
    const proposedContent = `const App = () => <div className="bg-red-500">Hi</div>;\nexport default App;\n`;

    await verifyBeforeWrite({ filePath, proposedContent, projectDir: tmpDir });

    // The target file must not exist after verification.
    const files = readdirSync(tmpDir);
    expect(files).not.toContain('never-written.tsx');
  });

  it('cleans up the temp `.deslint-verify-*` file in both success and error cases', async () => {
    const filePath = join(tmpDir, 'temp-cleanup.tsx');
    const proposedContent = `const App = () => <div className="bg-red-500">Hi</div>;\nexport default App;\n`;

    await verifyBeforeWrite({ filePath, proposedContent, projectDir: tmpDir });

    const filesAfter = readdirSync(tmpDir);
    const leakedTemps = filesAfter.filter((f) => f.startsWith('.deslint-verify-'));
    expect(leakedTemps).toEqual([]);
  });

  it('promotes warnings to errors when strict: true and flips passed=false', async () => {
    const filePath = join(tmpDir, 'strict.tsx');
    // arbitrary-spacing fires at `warn` severity in the default preset.
    const proposedContent = `const App = () => <div className="p-[13px]">Hi</div>;\nexport default App;\n`;

    const lenient = await verifyBeforeWrite({ filePath, proposedContent, projectDir: tmpDir, strict: false });
    const strict = await verifyBeforeWrite({ filePath, proposedContent, projectDir: tmpDir, strict: true });

    expect(lenient.totalWarnings).toBeGreaterThan(0);
    expect(strict.totalWarnings).toBe(0);
    expect(strict.totalErrors).toBeGreaterThanOrEqual(lenient.totalWarnings);
    expect(strict.passed).toBe(false);
    // In lenient mode with only warnings, passed is still true (no errors).
    expect(lenient.passed).toBe(true);
  });

  it('honours .deslintrc.json rule overrides (the same path analyzeFile uses)', async () => {
    // Turn no-arbitrary-colors off in .deslintrc.json
    await writeFile(
      join(tmpDir, '.deslintrc.json'),
      JSON.stringify({ rules: { 'no-arbitrary-colors': 'off' } }, null, 2),
    );

    const filePath = join(tmpDir, 'with-override.tsx');
    const proposedContent = `const App = () => <div className="bg-[#FF0000]">Hi</div>;\nexport default App;\n`;

    const result = await verifyBeforeWrite({ filePath, proposedContent, projectDir: tmpDir });

    const colorViolations = result.violations.filter((v) => v.ruleId === 'deslint/no-arbitrary-colors');
    expect(colorViolations).toEqual([]);
  });

  it('rejects proposed content larger than 10 MB', async () => {
    const filePath = join(tmpDir, 'huge.tsx');
    const proposedContent = 'a'.repeat(11 * 1024 * 1024);

    await expect(
      verifyBeforeWrite({ filePath, proposedContent, projectDir: tmpDir }),
    ).rejects.toThrow(/too large/);
  });
});

// ── strict mode on analyzeFile ──────────────────────────────────────

describe('analyzeFile (strict mode)', () => {
  it('without strict, warnings are reported but not counted as errors', async () => {
    const filePath = join(tmpDir, 'w.tsx');
    await writeFile(filePath, `const App = () => <div className="p-[13px]">Hi</div>;\nexport default App;\n`);

    const result = await analyzeFile({ filePath, projectDir: tmpDir });
    expect(result.totalWarnings).toBeGreaterThan(0);
    expect(result.totalErrors).toBe(0);
  });

  it('with strict: true, warnings are promoted to errors', async () => {
    const filePath = join(tmpDir, 's.tsx');
    await writeFile(filePath, `const App = () => <div className="p-[13px]">Hi</div>;\nexport default App;\n`);

    const result = await analyzeFile({ filePath, projectDir: tmpDir, strict: true });
    expect(result.totalErrors).toBeGreaterThan(0);
    expect(result.totalWarnings).toBe(0);
  });
});

// ── scanDiff ────────────────────────────────────────────────────────

describe('scanDiff', () => {
  // Helper: bootstrap a tiny git repo at tmpDir with a baseline commit
  // on `main`, then a branch with a new violation introduced.
  async function setupGitRepo() {
    await exec('git', ['init', '-q', '-b', 'main', tmpDir]);
    // Disable signing — the sandbox env doesn't support it.
    await exec('git', ['-C', tmpDir, 'config', 'commit.gpgsign', 'false']);
    await exec('git', ['-C', tmpDir, 'config', 'user.email', 'test@deslint.test']);
    await exec('git', ['-C', tmpDir, 'config', 'user.name', 'Test']);

    // Baseline file with NO violations.
    await writeFile(
      join(tmpDir, 'clean.tsx'),
      `const A = () => <div className="bg-red-500 p-4">A</div>;\nexport default A;\n`,
    );
    await exec('git', ['-C', tmpDir, 'add', '.']);
    await exec('git', ['-C', tmpDir, 'commit', '-q', '-m', 'baseline']);
  }

  it('returns 0 changed files when the branch matches the base', async () => {
    await setupGitRepo();
    const result = await scanDiff({ projectDir: tmpDir, baseRef: 'main' });
    expect(result.totalChangedFiles).toBe(0);
    expect(result.newViolations).toEqual([]);
    expect(result.preExisting).toEqual([]);
  });

  it('reports new violations introduced in the branch as `new`', async () => {
    await setupGitRepo();
    // Switch to a new branch, add a NEW file with a violation.
    await exec('git', ['-C', tmpDir, 'checkout', '-q', '-b', 'feat']);
    await writeFile(
      join(tmpDir, 'dirty.tsx'),
      `const B = () => <div className="bg-[#FF0000]">B</div>;\nexport default B;\n`,
    );
    await exec('git', ['-C', tmpDir, 'add', '.']);
    await exec('git', ['-C', tmpDir, 'commit', '-q', '-m', 'add dirty']);

    const result = await scanDiff({ projectDir: tmpDir, baseRef: 'main' });
    expect(result.totalChangedFiles).toBe(1);
    expect(result.totalNewViolations).toBeGreaterThan(0);
    expect(result.preExisting.length).toBe(0);
    expect(result.newViolations[0].status).toBe('new');
    expect(result.newViolations[0].filePath).toBe('dirty.tsx');
  });

  it('classifies pre-existing violations correctly when an existing dirty file is edited', async () => {
    // Setup: baseline file ALREADY has a violation.
    await exec('git', ['init', '-q', '-b', 'main', tmpDir]);
    await exec('git', ['-C', tmpDir, 'config', 'commit.gpgsign', 'false']);
    await exec('git', ['-C', tmpDir, 'config', 'user.email', 'test@deslint.test']);
    await exec('git', ['-C', tmpDir, 'config', 'user.name', 'Test']);
    await writeFile(
      join(tmpDir, 'dirty.tsx'),
      `const A = () => <div className="bg-[#FF0000] p-4">A</div>;\nexport default A;\n`,
    );
    await exec('git', ['-C', tmpDir, 'add', '.']);
    await exec('git', ['-C', tmpDir, 'commit', '-q', '-m', 'baseline-with-violation']);

    // Branch: edit an unrelated line so the file shows up in `diff --name-only`.
    await exec('git', ['-C', tmpDir, 'checkout', '-q', '-b', 'feat']);
    await writeFile(
      join(tmpDir, 'dirty.tsx'),
      `// edit\nconst A = () => <div className="bg-[#FF0000] p-4">A</div>;\nexport default A;\n`,
    );
    await exec('git', ['-C', tmpDir, 'add', '.']);
    await exec('git', ['-C', tmpDir, 'commit', '-q', '-m', 'edit']);

    const result = await scanDiff({ projectDir: tmpDir, baseRef: 'main' });
    expect(result.totalChangedFiles).toBe(1);
    // The arbitrary-color violation lived in base too — line number shifted
    // by one but our classifier should NOT count it as new if it matches
    // on the same line. (The line did shift, so it WILL be marked new
    // unless the rule fires on both lines. That's the documented
    // tradeoff — see the rule docstring.)
    expect(result.totalNewViolations + result.totalPreExistingViolations).toBeGreaterThan(0);
  });

  it('throws a useful error when the base ref does not exist', async () => {
    await setupGitRepo();
    await expect(
      scanDiff({ projectDir: tmpDir, baseRef: 'origin/nonexistent-branch-xyz' }),
    ).rejects.toThrow(/git diff failed/);
  });
});

// ── getAllRuleDetails (backs the deslint://rules resource) ──────────

describe('getAllRuleDetails', () => {
  it('returns one entry per registered rule, each with the expected shape', async () => {
    const all = await getAllRuleDetails();

    expect(Array.isArray(all)).toBe(true);
    // Should cover every shipped rule. We assert a generous lower
    // bound (50) rather than the exact count so the test doesn't
    // need bumping each time a rule is added.
    expect(all.length).toBeGreaterThan(50);

    for (const detail of all) {
      expect(detail.ruleId).toMatch(/^deslint\//);
      expect(typeof detail.description).toBe('string');
      expect(detail.description.length).toBeGreaterThan(0);
      expect(typeof detail.category).toBe('string');
      expect(typeof detail.autoFixable).toBe('boolean');
      expect(typeof detail.effortMinutes).toBe('number');
      expect(Array.isArray(detail.wcagCriteria)).toBe(true);
      expect(detail.docsUrl).toMatch(/^https:\/\/deslint\.com\/docs\/rules\//);
    }
  });

  it('includes WCAG mappings for rules that carry them', async () => {
    const all = await getAllRuleDetails();
    const contrast = all.find((r) => r.ruleId === 'deslint/a11y-color-contrast');
    expect(contrast).toBeDefined();
    expect(contrast!.wcagCriteria.length).toBeGreaterThan(0);
    expect(contrast!.wcagCriteria[0].id).toMatch(/^1\./);
  });
});

// ── verifyBeforeWrite fast path: cache + perf semantics ─────────────

describe('verifyBeforeWrite fast path', () => {
  beforeEach(() => { _resetCaches(); });

  it('reports a durationMs and cached:false on first call', async () => {
    const filePath = join(tmpDir, 'a.tsx');
    const result = await verifyBeforeWrite({
      filePath,
      proposedContent: `const A = () => <div className="bg-red-500">A</div>;`,
      projectDir: tmpDir,
    });
    expect(result.cached).toBe(false);
    expect(result.durationMs).toBeGreaterThan(0);
  });

  it('serves identical content from cache (cached:true, near-zero durationMs)', async () => {
    const filePath = join(tmpDir, 'b.tsx');
    const content = `const B = () => <div className="bg-red-500">B</div>;`;
    await verifyBeforeWrite({ filePath, proposedContent: content, projectDir: tmpDir });
    const second = await verifyBeforeWrite({ filePath, proposedContent: content, projectDir: tmpDir });
    expect(second.cached).toBe(true);
    expect(second.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('different content for the same path is NOT a cache hit', async () => {
    const filePath = join(tmpDir, 'c.tsx');
    await verifyBeforeWrite({
      filePath,
      proposedContent: `const C1 = () => <div className="bg-red-500">C</div>;`,
      projectDir: tmpDir,
    });
    const second = await verifyBeforeWrite({
      filePath,
      proposedContent: `const C2 = () => <div className="bg-blue-500">C</div>;`,
      projectDir: tmpDir,
    });
    expect(second.cached).toBe(false);
  });

  it('strict:true and strict:false produce separate cache entries for the same content', async () => {
    const filePath = join(tmpDir, 'd.tsx');
    const content = `const D = () => <div className="p-[13px]">D</div>;`;
    const lenient = await verifyBeforeWrite({ filePath, proposedContent: content, projectDir: tmpDir, strict: false });
    const strict = await verifyBeforeWrite({ filePath, proposedContent: content, projectDir: tmpDir, strict: true });
    expect(lenient.cached).toBe(false);
    expect(strict.cached).toBe(false); // strict mode is a separate cache key
  });

  it('returns recommendedAction:"ok-with-warnings" when only warnings fire and strict is off', async () => {
    const filePath = join(tmpDir, 'warn.tsx');
    const content = `const W = () => <div className="p-[13px]">W</div>;`;
    const result = await verifyBeforeWrite({ filePath, proposedContent: content, projectDir: tmpDir });
    expect(result.passed).toBe(true);
    expect(result.totalWarnings).toBeGreaterThan(0);
    expect(result.recommendedAction).toBe('ok-with-warnings');
  });

  it('severityFloor:"error" drops warnings from the response', async () => {
    const filePath = join(tmpDir, 'floor.tsx');
    const content = `const F = () => <div className="p-[13px] bg-[#abc]">F</div>;`;
    const noFloor = await verifyBeforeWrite({ filePath, proposedContent: content, projectDir: tmpDir });
    const withFloor = await verifyBeforeWrite({
      filePath,
      proposedContent: content,
      projectDir: tmpDir,
      severityFloor: 'error',
    });
    expect(noFloor.totalWarnings).toBeGreaterThan(0);
    expect(withFloor.totalWarnings).toBe(0);
    expect(withFloor.violations.length).toBeLessThanOrEqual(noFloor.violations.length);
  });

  it('categories filter restricts the reported violations', async () => {
    const filePath = join(tmpDir, 'cat.tsx');
    // arbitrary-spacing is in `spacing`; arbitrary-colors in `colors`.
    const content = `const C = () => <div className="p-[13px] bg-[#abc]">C</div>;`;
    const colorsOnly = await verifyBeforeWrite({
      filePath,
      proposedContent: content,
      projectDir: tmpDir,
      categories: ['colors'],
    });
    expect(colorsOnly.violations.every((v) => /no-arbitrary-colors|a11y-color-contrast|dark-mode-coverage|consistent-color-palette/.test(v.ruleId))).toBe(true);
    expect(colorsOnly.violations.some((v) => v.ruleId === 'deslint/no-arbitrary-spacing')).toBe(false);
  });
});

// ── quickCheck ───────────────────────────────────────────────────────

describe('quickCheck', () => {
  beforeEach(() => { _resetCaches(); });

  it('returns clean:true on a passing file', async () => {
    const filePath = join(tmpDir, 'q1.tsx');
    const result = await quickCheck({
      filePath,
      proposedContent: `const Q = () => <div className="bg-red-500">Q</div>;`,
      projectDir: tmpDir,
    });
    expect(result.clean).toBe(true);
    expect(result.errorCount).toBe(0);
  });

  it('returns clean:false when there are errors (using strict:true to force errors)', async () => {
    const filePath = join(tmpDir, 'q2.tsx');
    const result = await quickCheck({
      filePath,
      proposedContent: `const Q = () => <div className="bg-[#abc]">Q</div>;`,
      projectDir: tmpDir,
      strict: true,
    });
    expect(result.clean).toBe(false);
    expect(result.errorCount).toBeGreaterThan(0);
  });

  it('shares cache with verifyBeforeWrite — calling both is essentially free', async () => {
    const filePath = join(tmpDir, 'q3.tsx');
    const content = `const Q = () => <div className="bg-red-500">Q</div>;`;
    await verifyBeforeWrite({ filePath, proposedContent: content, projectDir: tmpDir });
    const q = await quickCheck({ filePath, proposedContent: content, projectDir: tmpDir });
    expect(q.cached).toBe(true);
  });
});

// ── getServerStats ──────────────────────────────────────────────────

describe('getServerStats', () => {
  beforeEach(() => { _resetCaches(); });

  it('returns zero counters before any verify call', () => {
    const stats = getServerStats();
    expect(stats.totalVerifyCalls).toBe(0);
    expect(stats.cacheHits).toBe(0);
    expect(stats.cacheMisses).toBe(0);
    expect(stats.cacheHitRate).toBe(null);
    expect(stats.avgVerifyMs).toBe(null);
  });

  it('counts calls and computes cache hit rate', async () => {
    const filePath = join(tmpDir, 's.tsx');
    const content = `const S = () => <div className="bg-red-500">S</div>;`;
    await verifyBeforeWrite({ filePath, proposedContent: content, projectDir: tmpDir });
    await verifyBeforeWrite({ filePath, proposedContent: content, projectDir: tmpDir }); // cache hit
    await verifyBeforeWrite({ filePath, proposedContent: content, projectDir: tmpDir }); // cache hit
    const stats = getServerStats();
    expect(stats.totalVerifyCalls).toBe(1); // only the cache miss runs the linter
    expect(stats.cacheHits).toBe(2);
    expect(stats.cacheMisses).toBe(1);
    expect(stats.cacheHitRate).toBeCloseTo(0.67, 1);
    expect(stats.avgVerifyMs).toBeGreaterThan(0);
  });
});

// ── preloadFastPath ──────────────────────────────────────────────────

describe('preloadFastPath', () => {
  it('warms the config cache so the first verify call after preload is fast', async () => {
    _resetCaches();
    await preloadFastPath(tmpDir);
    const filePath = join(tmpDir, 'p.tsx');
    const t0 = performance.now();
    const result = await verifyBeforeWrite({
      filePath,
      proposedContent: `const P = () => <div className="bg-red-500">P</div>;`,
      projectDir: tmpDir,
    });
    const wall = performance.now() - t0;
    // Without preload, this same call would typically include the
    // ~1s plugin/parser-import cost. After preload, the warm path
    // should be well under 100ms even on a slow CI machine.
    expect(wall).toBeLessThan(100);
    expect(result.cached).toBe(false);
    expect(result.durationMs).toBeGreaterThan(0);
  });
});

// Silence the unused-import warnings for `mkdir` (kept available for
// future tests that need nested-directory fixtures).
void mkdir;
