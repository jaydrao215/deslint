/**
 * Tests that fixAll forwards its `cwd` option to runLint. The symptom of the
 * regression: Next.js route-group paths (e.g. `app/(auth)/page.tsx`) contain
 * glob-special parentheses, so the old code — which dropped cwd and let
 * runLint fall back to `dirname(options.files[0])` — produced empty results
 * or "no such file" errors under ESLint's internal micromatch.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, writeFile, rm, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fixAll } from '../src/fix.js';

describe('fixAll — cwd propagation for route-group paths', () => {
  let tmpDir: string;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'deslint-fix-cwd-'));
    // Silence fixAll's chalk output during tests
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(async () => {
    consoleSpy.mockRestore();
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('lints a file under an `app/(auth)/` route-group path', async () => {
    // Recreate the common Next.js layout: `app/(auth)/page.tsx`. Parens are the
    // glob-special characters that tripped up the pre-fix runLint fallback.
    const authDir = join(tmpDir, 'app', '(auth)');
    await mkdir(authDir, { recursive: true });
    const filePath = join(authDir, 'page.tsx');
    await writeFile(
      filePath,
      `export default function Page() { return <div className="bg-[#FF0000] p-4" />; }\n`,
      'utf-8',
    );

    const result = await fixAll({
      files: [filePath],
      cwd: tmpDir,
      dryRun: true, // don't actually touch the file
    });

    // We don't care about the specific rule — we care that the linter ran and
    // returned structured results for this file. Before the fix, the parens
    // caused ESLint to silently skip the file and return nothing.
    expect(result.totalFiles).toBeGreaterThanOrEqual(1);
    expect(
      result.results.some((r) => r.filePath.includes('(auth)')),
    ).toBe(true);
  });

  it('lints a file whose path contains no special characters (control)', async () => {
    const filePath = join(tmpDir, 'simple.tsx');
    await writeFile(
      filePath,
      `export default function Page() { return <div className="bg-[#FF0000]" />; }\n`,
      'utf-8',
    );

    const result = await fixAll({
      files: [filePath],
      cwd: tmpDir,
      dryRun: true,
    });

    expect(result.totalFiles).toBeGreaterThanOrEqual(1);
  });
});
