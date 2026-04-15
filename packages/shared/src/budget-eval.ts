import type { Budget } from './budget-schema.js';
import type { GateCategory, GateScanSnapshot } from './quality-gate.js';
import { evaluateQualityGate } from './quality-gate.js';

export interface BudgetScanSnapshot extends GateScanSnapshot {
  byRule: Record<string, number>;
}

export type BudgetCondition =
  | 'minOverallScore'
  | 'minCategoryScore'
  | 'maxViolations'
  | 'maxDebtMinutes'
  | 'maxScoreRegression'
  | 'maxRuleViolations'
  | 'maxNewRuleViolations'
  | 'maxCategoryRegression';

export interface BudgetBreach {
  condition: BudgetCondition;
  message: string;
  threshold: number;
  actual: number;
  category?: GateCategory;
  ruleId?: string;
}

export interface BudgetResult {
  passed: boolean;
  enforced: boolean;
  breaches: BudgetBreach[];
  conditionsChecked: number;
}

/** Single source of truth for budget pass/fail. Consumed by CLI scan,
 *  Action post-scan gate, and MCP enforce_budget tool. Pure function. */
export function evaluateBudget(
  budget: Budget | undefined,
  current: BudgetScanSnapshot,
  previous?: BudgetScanSnapshot,
): BudgetResult {
  if (!budget) {
    return { passed: true, enforced: false, breaches: [], conditionsChecked: 0 };
  }

  const breaches: BudgetBreach[] = [];
  let conditionsChecked = 0;

  // Reuse QualityGate for overlapping fields (identical semantics).
  const gateResult = evaluateQualityGate(
    {
      enforce: budget.enforce ?? false,
      minOverallScore: budget.minOverallScore,
      minCategoryScores: budget.minCategoryScores,
      maxViolations: budget.maxViolations,
      maxDebtMinutes: budget.maxDebtMinutes,
      maxScoreRegression: budget.maxScoreRegression,
    },
    current,
    previous,
  );

  conditionsChecked += gateResult.conditionsChecked;
  for (const f of gateResult.failures) {
    breaches.push({
      condition: f.condition,
      message: f.message,
      threshold: f.threshold,
      actual: f.actual,
      category: f.category,
    });
  }

  if (budget.maxRuleViolations) {
    for (const [ruleId, threshold] of Object.entries(budget.maxRuleViolations)) {
      conditionsChecked++;
      const actual = current.byRule[ruleId] ?? 0;
      if (actual > threshold) {
        breaches.push({
          condition: 'maxRuleViolations',
          ruleId,
          message: `Rule ${ruleId} has ${actual} violation${actual === 1 ? '' : 's'}, exceeds cap of ${threshold}.`,
          threshold,
          actual,
        });
      }
    }
  }

  if (budget.maxNewRuleViolations && previous) {
    for (const [ruleId, threshold] of Object.entries(budget.maxNewRuleViolations)) {
      conditionsChecked++;
      const currentCount = current.byRule[ruleId] ?? 0;
      const previousCount = previous.byRule[ruleId] ?? 0;
      const added = Math.max(0, currentCount - previousCount);
      if (added > threshold) {
        breaches.push({
          condition: 'maxNewRuleViolations',
          ruleId,
          message: `Rule ${ruleId} added ${added} new violation${added === 1 ? '' : 's'} vs. previous run; cap is ${threshold}.`,
          threshold,
          actual: added,
        });
      }
    }
  }

  if (budget.maxCategoryRegression && previous) {
    for (const [cat, threshold] of Object.entries(budget.maxCategoryRegression)) {
      if (typeof threshold !== 'number') continue;
      conditionsChecked++;
      const c = cat as GateCategory;
      const prev = previous.categories[c];
      const curr = current.categories[c];
      const drop = prev - curr;
      if (drop > threshold) {
        breaches.push({
          condition: 'maxCategoryRegression',
          category: c,
          message: `${cat} score dropped by ${drop} points (previous ${prev} → current ${curr}); maximum allowed regression is ${threshold}.`,
          threshold,
          actual: drop,
        });
      }
    }
  }

  return {
    passed: breaches.length === 0,
    enforced: budget.enforce === true,
    breaches,
    conditionsChecked,
  };
}

export function formatBudgetResult(result: BudgetResult): string {
  if (result.conditionsChecked === 0) {
    return 'Budget: not configured';
  }
  if (result.passed) {
    return `Budget: PASSED (${result.conditionsChecked} condition${result.conditionsChecked === 1 ? '' : 's'} checked)`;
  }
  const lines: string[] = [];
  lines.push(
    `Budget: FAILED (${result.breaches.length} of ${result.conditionsChecked} conditions breached)`,
  );
  for (const b of result.breaches) {
    lines.push(`  - ${b.message}`);
  }
  if (!result.enforced) {
    lines.push(
      '  (budget is in warn-only mode; set "enforce: true" in .deslint/budget.yml to fail builds)',
    );
  }
  return lines.join('\n');
}
