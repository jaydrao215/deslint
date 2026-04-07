import type { LintResult, RuleCategory } from './lint-runner.js';
import { RULE_CATEGORY_MAP } from './lint-runner.js';
import { RULE_EFFORT_MINUTES, effortForRule } from '@vizlint/shared';

// Re-export the calibration table for backwards compat with debt.test.ts
// and any external tooling that imported from this module first.
export { RULE_EFFORT_MINUTES };

export interface DebtBreakdownEntry {
  /** Rule id, e.g. 'vizlint/no-arbitrary-spacing' */
  ruleId: string;
  /** Number of violations of this rule */
  violations: number;
  /** Minutes per violation used for the estimate */
  minutesPerViolation: number;
  /** Total minutes contributed by this rule */
  totalMinutes: number;
}

export interface DebtResult {
  /** Total estimated remediation effort, in minutes */
  totalMinutes: number;
  /** Total estimated remediation effort, in hours (rounded to 1 decimal) */
  totalHours: number;
  /** Debt grouped by score category */
  byCategory: Record<RuleCategory, number>;
  /** Per-rule debt breakdown, sorted by totalMinutes desc */
  breakdown: DebtBreakdownEntry[];
}

/**
 * Calculate Design Debt — estimated remediation effort for all violations.
 *
 * This is the SonarQube-style "technical debt" metric, applied to design
 * quality. Translates raw violation counts into a number that engineering
 * managers can plan around: "Your project has 47 hours of design debt."
 */
export function calculateDebt(lintResult: LintResult): DebtResult {
  const byCategory: Record<RuleCategory, number> = {
    colors: 0,
    spacing: 0,
    typography: 0,
    responsive: 0,
    consistency: 0,
  };

  const breakdown: DebtBreakdownEntry[] = [];
  let totalMinutes = 0;

  for (const [ruleId, violations] of Object.entries(lintResult.byRule)) {
    if (violations <= 0) continue;
    const minutesPerViolation = effortForRule(ruleId);
    const ruleMinutes = violations * minutesPerViolation;

    breakdown.push({
      ruleId,
      violations,
      minutesPerViolation,
      totalMinutes: ruleMinutes,
    });

    totalMinutes += ruleMinutes;

    const category = RULE_CATEGORY_MAP[ruleId];
    if (category) {
      byCategory[category] += ruleMinutes;
    }
  }

  breakdown.sort((a, b) => b.totalMinutes - a.totalMinutes);

  const totalHours = Math.round((totalMinutes / 60) * 10) / 10;

  return {
    totalMinutes,
    totalHours,
    byCategory,
    breakdown,
  };
}

/**
 * Format a minutes value as a human-readable duration.
 * Examples: 45 → "45m", 90 → "1h 30m", 480 → "8h", 2400 → "5d (40h)"
 */
export function formatDebt(minutes: number): string {
  if (minutes <= 0) return '0m';
  if (minutes < 60) return `${minutes}m`;

  const hours = minutes / 60;
  if (hours < 8) {
    const h = Math.floor(hours);
    const m = minutes - h * 60;
    return m === 0 ? `${h}h` : `${h}h ${m}m`;
  }

  // 1 working day = 8 hours
  const days = Math.round((hours / 8) * 10) / 10;
  const roundedHours = Math.round(hours * 10) / 10;
  return `${days}d (${roundedHours}h)`;
}
