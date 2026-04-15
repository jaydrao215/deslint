import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  loadBudget,
  loadBudgetFromPath,
  findBudgetFile,
  DEFAULT_BUDGET_CANDIDATES,
} from '../src/budget-loader.js';

describe('budget-loader', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'deslint-budget-'));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('returns undefined when no budget exists and no explicit path', async () => {
    const result = await loadBudget({ cwd: tmp });
    expect(result).toBeUndefined();
  });

  it('loads .deslint/budget.json by default', async () => {
    mkdirSync(join(tmp, '.deslint'));
    writeFileSync(
      join(tmp, '.deslint/budget.json'),
      JSON.stringify({ maxViolations: 42 }),
    );
    const result = await loadBudget({ cwd: tmp });
    expect(result?.budget.maxViolations).toBe(42);
    expect(result?.path).toContain('budget.json');
  });

  it('loads .deslint/budget.yml by default and parses YAML', async () => {
    mkdirSync(join(tmp, '.deslint'));
    writeFileSync(
      join(tmp, '.deslint/budget.yml'),
      'enforce: true\nmaxViolations: 7\nmaxRuleViolations:\n  no-arbitrary-colors: 2\n',
    );
    const result = await loadBudget({ cwd: tmp });
    expect(result?.budget.enforce).toBe(true);
    expect(result?.budget.maxViolations).toBe(7);
    expect(result?.budget.maxRuleViolations).toEqual({
      'deslint/no-arbitrary-colors': 2,
    });
  });

  it('prefers .yml over .yaml over .json when multiple exist', async () => {
    mkdirSync(join(tmp, '.deslint'));
    writeFileSync(join(tmp, '.deslint/budget.yml'), 'maxViolations: 1');
    writeFileSync(join(tmp, '.deslint/budget.yaml'), 'maxViolations: 2');
    writeFileSync(join(tmp, '.deslint/budget.json'), '{"maxViolations":3}');
    const result = await loadBudget({ cwd: tmp });
    expect(result?.budget.maxViolations).toBe(1);
  });

  it('loads from an explicit path', async () => {
    const p = join(tmp, 'custom-budget.json');
    writeFileSync(p, JSON.stringify({ maxViolations: 99 }));
    const result = await loadBudget({ explicitPath: p, cwd: tmp });
    expect(result?.budget.maxViolations).toBe(99);
  });

  it('throws when explicit path is missing', async () => {
    await expect(
      loadBudgetFromPath(join(tmp, 'missing.yml'), tmp),
    ).rejects.toThrow(/not found/);
  });

  it('throws on unsupported extension', async () => {
    const p = join(tmp, 'budget.toml');
    writeFileSync(p, 'maxViolations = 1');
    await expect(loadBudgetFromPath(p, tmp)).rejects.toThrow(/Unsupported/);
  });

  it('throws on invalid budget content', async () => {
    const p = join(tmp, 'bad.json');
    writeFileSync(p, JSON.stringify({ unknownField: 1 }));
    await expect(loadBudgetFromPath(p, tmp)).rejects.toThrow();
  });

  it('findBudgetFile returns undefined when no candidate exists', () => {
    expect(findBudgetFile(tmp)).toBeUndefined();
  });

  it('findBudgetFile returns an existing candidate', () => {
    mkdirSync(join(tmp, '.deslint'));
    writeFileSync(join(tmp, '.deslint/budget.json'), '{}');
    const found = findBudgetFile(tmp);
    expect(found).toContain('budget.json');
  });

  it('exposes the default candidate list in the documented order', () => {
    expect(DEFAULT_BUDGET_CANDIDATES).toEqual([
      '.deslint/budget.yml',
      '.deslint/budget.yaml',
      '.deslint/budget.json',
    ]);
  });
});
