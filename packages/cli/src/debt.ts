import type { LintResult, RuleCategory } from './lint-runner.js';
import { RULE_CATEGORY_MAP } from './lint-runner.js';

/**
 * Estimated remediation effort per violation, in minutes.
 *
 * Calibration source: vizlint auto-fix data across the 7 validated projects
 * (4,061 files, 3,395 violations). Trivial class renames are ~2 minutes
 * (1m to read, 1m to verify). Cross-file consistency decisions take longer
 * because they require choosing the canonical token. Responsive layout work
 * and a11y contrast fixes are the most expensive: they require redesign,
 * not just substitution.
 *
 * These numbers intentionally err on the conservative side — better to
 * under-promise than to inflate debt for marketing.
 */
export const RULE_EFFORT_MINUTES: Record<string, number> = {
  // Trivial — class rename, fully auto-fixable
  'vizlint/no-arbitrary-spacing': 2,
  'vizlint/no-arbitrary-colors': 2,
  'vizlint/no-arbitrary-typography': 2,
  'vizlint/no-arbitrary-zindex': 2,

  // Small — needs minor decision but auto-fixable
  'vizlint/no-magic-numbers-layout': 3,
  'vizlint/consistent-border-radius': 3,
  'vizlint/dark-mode-coverage': 3,
  'vizlint/image-alt-text': 3,

  // Medium — refactor required, not pure substitution
  'vizlint/no-inline-styles': 5,
  'vizlint/missing-states': 5,
  'vizlint/consistent-component-spacing': 5,

  // Large — design work or cross-cutting change
  'vizlint/responsive-required': 10,
  'vizlint/a11y-color-contrast': 10,
  'vizlint/max-component-lines': 30,
};

/** Default effort for any rule not in the table (e.g. user-defined). */
const DEFAULT_EFFORT_MINUTES = 3;

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
    const minutesPerViolation = RULE_EFFORT_MINUTES[ruleId] ?? DEFAULT_EFFORT_MINUTES;
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
