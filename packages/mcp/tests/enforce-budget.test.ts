import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { enforceBudget } from '../src/tools.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'deslint-enforce-budget-'));
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

const DIRTY_TSX =
  `const App = () => <div className="bg-[#FF0000] p-[13px] text-white">Hi</div>;\nexport default App;\n`;

describe('enforceBudget', () => {
  it('returns allowed: true when no budget is configured', async () => {
    const file = join(tmpDir, 'dirty.tsx');
    await writeFile(file, DIRTY_TSX);

    const result = await enforceBudget({ projectDir: tmpDir });

    expect(result.allowed).toBe(true);
    expect(result.enforced).toBe(false);
    expect(result.reasons).toEqual([]);
    expect(result.budgetPath).toBeUndefined();
  });

  it('returns allowed: false when the budget caps are breached', async () => {
    const file = join(tmpDir, 'dirty.tsx');
    await writeFile(file, DIRTY_TSX);

    await mkdir(join(tmpDir, '.deslint'), { recursive: true });
    await writeFile(
      join(tmpDir, '.deslint/budget.json'),
      JSON.stringify({ enforce: true, maxViolations: 0 }),
    );

    const result = await enforceBudget({ projectDir: tmpDir });

    expect(result.allowed).toBe(false);
    expect(result.enforced).toBe(true);
    expect(result.reasons.length).toBeGreaterThan(0);
    expect(result.reasons[0].condition).toBe('maxViolations');
    expect(result.budgetPath).toContain('budget.json');
  });

  it('honors an explicit budget path', async () => {
    const file = join(tmpDir, 'dirty.tsx');
    await writeFile(file, DIRTY_TSX);
    const budgetPath = join(tmpDir, 'custom.yml');
    await writeFile(budgetPath, 'enforce: false\nmaxViolations: 0\n');

    const result = await enforceBudget({ projectDir: tmpDir, budgetPath });

    expect(result.allowed).toBe(false);
    expect(result.enforced).toBe(false);
    expect(result.budgetPath).toBe(budgetPath);
  });

  it('narrows scan to `files` when provided', async () => {
    const dirty = join(tmpDir, 'dirty.tsx');
    await writeFile(dirty, DIRTY_TSX);
    const clean = join(tmpDir, 'clean.tsx');
    await writeFile(
      clean,
      `const A = () => <div className="flex p-4">Hi</div>;\nexport default A;\n`,
    );

    const all = await enforceBudget({ projectDir: tmpDir });
    const scoped = await enforceBudget({ projectDir: tmpDir, files: [clean] });

    expect(scoped.filesScanned).toBe(1);
    expect(scoped.score.totalViolations).toBeLessThanOrEqual(all.score.totalViolations);
  });

  it('rejects files outside the project directory', async () => {
    const outside = join(tmpDir, '..', 'outside.tsx');
    await writeFile(outside, DIRTY_TSX).catch(() => {});
    await expect(
      enforceBudget({ projectDir: tmpDir, files: [outside] }),
    ).rejects.toThrow(/outside project/);
    await rm(outside, { force: true });
  });

  it('includes suggestedEdits driven by the breach rules first', async () => {
    const file = join(tmpDir, 'dirty.tsx');
    await writeFile(file, DIRTY_TSX);

    await mkdir(join(tmpDir, '.deslint'), { recursive: true });
    await writeFile(
      join(tmpDir, '.deslint/budget.json'),
      JSON.stringify({
        enforce: true,
        maxRuleViolations: { 'no-arbitrary-colors': 0 },
      }),
    );

    const result = await enforceBudget({ projectDir: tmpDir });

    expect(result.allowed).toBe(false);
    expect(result.suggestedEdits.length).toBeGreaterThan(0);
    expect(result.suggestedEdits[0].ruleId).toBe('deslint/no-arbitrary-colors');
  });

  it('is idempotent \u2014 same inputs produce the same output', async () => {
    const file = join(tmpDir, 'dirty.tsx');
    await writeFile(file, DIRTY_TSX);
    await mkdir(join(tmpDir, '.deslint'), { recursive: true });
    await writeFile(
      join(tmpDir, '.deslint/budget.json'),
      JSON.stringify({ enforce: false, maxViolations: 0 }),
    );

    const a = await enforceBudget({ projectDir: tmpDir });
    const b = await enforceBudget({ projectDir: tmpDir });
    expect(a).toEqual(b);
  });

  it('returns allowed: true for an empty project', async () => {
    const result = await enforceBudget({ projectDir: tmpDir });
    expect(result.allowed).toBe(true);
    expect(result.filesScanned).toBe(0);
    expect(result.score.overall).toBe(100);
  });

  it('propagates budget parse errors', async () => {
    await mkdir(join(tmpDir, '.deslint'), { recursive: true });
    await writeFile(
      join(tmpDir, '.deslint/budget.json'),
      JSON.stringify({ unknownField: 1 }),
    );
    await expect(enforceBudget({ projectDir: tmpDir })).rejects.toThrow();
  });
});
