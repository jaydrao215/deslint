import { z } from 'zod';

const CategoryScoresSchema = z
  .object({
    colors: z.number().min(0).max(100).optional(),
    spacing: z.number().min(0).max(100).optional(),
    typography: z.number().min(0).max(100).optional(),
    responsive: z.number().min(0).max(100).optional(),
    consistency: z.number().min(0).max(100).optional(),
  })
  .strict();

export const BudgetSchema = z
  .object({
    enforce: z.boolean().optional().default(false),
    maxViolations: z.number().int().min(0).optional(),
    maxRuleViolations: z.record(z.number().int().min(0)).optional(),
    maxDebtMinutes: z.number().int().min(0).optional(),
    minOverallScore: z.number().min(0).max(100).optional(),
    minCategoryScores: CategoryScoresSchema.optional(),
    maxScoreRegression: z.number().min(0).max(100).optional(),
    maxCategoryRegression: CategoryScoresSchema.optional(),
    maxNewRuleViolations: z.record(z.number().int().min(0)).optional(),
  })
  .strict();

export type Budget = z.infer<typeof BudgetSchema>;

export function parseBudget(raw: unknown): Budget {
  return BudgetSchema.parse(raw);
}

export function safeParseBudget(raw: unknown) {
  return BudgetSchema.safeParse(raw);
}

/** Normalize rule-id keys so short-form ("no-arbitrary-colors") is treated
 *  the same as fully-qualified ("deslint/no-arbitrary-colors"). */
export function normalizeBudgetRuleKeys(budget: Budget): Budget {
  const normRecord = (
    record: Record<string, number> | undefined,
  ): Record<string, number> | undefined => {
    if (!record) return record;
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(record)) {
      const key = k.startsWith('deslint/') ? k : `deslint/${k}`;
      out[key] = v;
    }
    return out;
  };

  return {
    ...budget,
    maxRuleViolations: normRecord(budget.maxRuleViolations),
    maxNewRuleViolations: normRecord(budget.maxNewRuleViolations),
  };
}
