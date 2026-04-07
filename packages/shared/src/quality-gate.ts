import type { QualityGate } from './config-schema.js';

/** Score categories used by the gate (must mirror cli RuleCategory). */
export type GateCategory = 'colors' | 'spacing' | 'typography' | 'responsive' | 'consistency';

/** Snapshot of a single scan's results, in the shape the gate needs. */
export interface GateScanSnapshot {
  overall: number;
  categories: Record<GateCategory, number>;
  totalViolations: number;
  debtMinutes: number;
}

/** A single failed gate condition. */
export interface GateFailure {
  /** Stable identifier of the failing condition (for outputs/automation). */
  condition:
    | 'minOverallScore'
    | 'minCategoryScore'
    | 'maxViolations'
    | 'maxDebtMinutes'
    | 'maxScoreRegression';
  /** Human-readable explanation. */
  message: string;
  /** Threshold value from the gate config. */
  threshold: number;
  /** Actual measured value. */
  actual: number;
  /** Optional category, for per-category failures. */
  category?: GateCategory;
}

export interface GateResult {
  /** True if all configured conditions pass. */
  passed: boolean;
  /** True only when the gate is configured AND `enforce: true`. */
  enforced: boolean;
  /** All failed conditions. Empty when `passed` is true. */
  failures: GateFailure[];
  /** Conditions that were checked (regardless of pass/fail). */
  conditionsChecked: number;
}

/**
 * Evaluate a quality gate against a scan snapshot.
 *
 * Pure function: takes config + numbers, returns pass/fail.
 * Does NOT exit, log, or touch the filesystem.
 *
 * Default behavior (no config): passes silently. Quality gates are opt-in.
 */
export function evaluateQualityGate(
  gate: QualityGate | undefined,
  current: GateScanSnapshot,
  previous?: GateScanSnapshot,
): GateResult {
  const failures: GateFailure[] = [];
  let conditionsChecked = 0;

  if (!gate) {
    return { passed: true, enforced: false, failures, conditionsChecked: 0 };
  }

  if (typeof gate.minOverallScore === 'number') {
    conditionsChecked++;
    if (current.overall < gate.minOverallScore) {
      failures.push({
        condition: 'minOverallScore',
        message: `Overall score ${current.overall} is below minimum ${gate.minOverallScore}.`,
        threshold: gate.minOverallScore,
        actual: current.overall,
      });
    }
  }

  if (gate.minCategoryScores) {
    for (const [cat, threshold] of Object.entries(gate.minCategoryScores)) {
      if (typeof threshold !== 'number') continue;
      conditionsChecked++;
      const actual = current.categories[cat as GateCategory];
      if (actual < threshold) {
        failures.push({
          condition: 'minCategoryScore',
          category: cat as GateCategory,
          message: `${cat} score ${actual} is below minimum ${threshold}.`,
          threshold,
          actual,
        });
      }
    }
  }

  if (typeof gate.maxViolations === 'number') {
    conditionsChecked++;
    if (current.totalViolations > gate.maxViolations) {
      failures.push({
        condition: 'maxViolations',
        message: `Total violations ${current.totalViolations} exceeds maximum ${gate.maxViolations}.`,
        threshold: gate.maxViolations,
        actual: current.totalViolations,
      });
    }
  }

  if (typeof gate.maxDebtMinutes === 'number') {
    conditionsChecked++;
    if (current.debtMinutes > gate.maxDebtMinutes) {
      failures.push({
        condition: 'maxDebtMinutes',
        message: `Design debt ${current.debtMinutes}m exceeds maximum ${gate.maxDebtMinutes}m.`,
        threshold: gate.maxDebtMinutes,
        actual: current.debtMinutes,
      });
    }
  }

  if (typeof gate.maxScoreRegression === 'number' && previous) {
    conditionsChecked++;
    const regression = previous.overall - current.overall;
    if (regression > gate.maxScoreRegression) {
      failures.push({
        condition: 'maxScoreRegression',
        message: `Score dropped by ${regression} points (previous ${previous.overall} → current ${current.overall}); maximum allowed regression is ${gate.maxScoreRegression}.`,
        threshold: gate.maxScoreRegression,
        actual: regression,
      });
    }
  }

  return {
    passed: failures.length === 0,
    enforced: gate.enforce === true,
    failures,
    conditionsChecked,
  };
}

/**
 * Format a gate result as a multi-line string for console / PR comment output.
 */
export function formatGateResult(result: GateResult): string {
  if (result.conditionsChecked === 0) {
    return 'Quality gate: not configured';
  }
  if (result.passed) {
    return `Quality gate: PASSED (${result.conditionsChecked} condition${result.conditionsChecked === 1 ? '' : 's'} checked)`;
  }
  const lines: string[] = [];
  lines.push(`Quality gate: FAILED (${result.failures.length} of ${result.conditionsChecked} conditions failed)`);
  for (const f of result.failures) {
    lines.push(`  - ${f.message}`);
  }
  if (!result.enforced) {
    lines.push('  (gate is in warn-only mode; set "qualityGate.enforce": true in .vizlintrc.json to fail builds)');
  }
  return lines.join('\n');
}
