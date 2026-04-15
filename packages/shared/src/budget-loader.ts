import { readFileSync, existsSync } from 'node:fs';
import { resolve, extname, join } from 'node:path';
import type { Budget } from './budget-schema.js';
import { parseBudget, normalizeBudgetRuleKeys } from './budget-schema.js';

export interface LoadedBudget {
  budget: Budget;
  path: string;
}

export const DEFAULT_BUDGET_CANDIDATES = [
  '.deslint/budget.yml',
  '.deslint/budget.yaml',
  '.deslint/budget.json',
];

export function findBudgetFile(cwd: string = process.cwd()): string | undefined {
  for (const rel of DEFAULT_BUDGET_CANDIDATES) {
    const abs = resolve(cwd, rel);
    if (existsSync(abs)) return abs;
  }
  return undefined;
}

export async function loadBudgetFromPath(
  path: string,
  cwd: string = process.cwd(),
): Promise<LoadedBudget> {
  const abs = resolve(cwd, path);
  if (!existsSync(abs)) {
    throw new Error(`Budget file not found: ${abs}`);
  }
  const raw = readFileSync(abs, 'utf-8');
  const ext = extname(abs).toLowerCase();

  let parsed: unknown;
  if (ext === '.yml' || ext === '.yaml') {
    // Lazy import so JSON-only budgets don't pay the parse cost.
    const yaml = await import('js-yaml');
    parsed = yaml.load(raw);
  } else if (ext === '.json') {
    parsed = JSON.parse(raw);
  } else {
    throw new Error(
      `Unsupported budget file extension "${ext}". Use .yml, .yaml, or .json.`,
    );
  }

  const budget = normalizeBudgetRuleKeys(parseBudget(parsed));
  return { budget, path: abs };
}

export async function loadBudget(
  options: { explicitPath?: string; cwd?: string } = {},
): Promise<LoadedBudget | undefined> {
  const cwd = options.cwd ?? process.cwd();
  if (options.explicitPath) {
    return loadBudgetFromPath(options.explicitPath, cwd);
  }
  const found = findBudgetFile(cwd);
  if (!found) return undefined;
  return loadBudgetFromPath(found, cwd);
}

export function budgetPathFrom(cwd: string, rel: string): string {
  return join(cwd, rel);
}
