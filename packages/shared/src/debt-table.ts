/**
 * Per-rule remediation effort estimates, in minutes.
 *
 * Calibrated from real auto-fix data across the 7 validated projects
 * (4,061 files, 3,395 violations). Trivial class renames are ~2 minutes,
 * refactors ~5 minutes, design and accessibility decisions ~10 minutes,
 * large component splits ~30 minutes.
 *
 * Lives in @vizlint/shared so the CLI, GitHub Action, and any future
 * embedding (Lovable/Bolt/v0) all use the same calibration.
 */
export const RULE_EFFORT_MINUTES: Record<string, number> = {
  // Trivial — class rename, fully auto-fixable
  'vizlint/no-arbitrary-spacing': 2,
  'vizlint/no-arbitrary-colors': 2,
  'vizlint/no-arbitrary-typography': 2,
  'vizlint/no-arbitrary-zindex': 2,

  // Small — minor decision, auto-fixable
  'vizlint/no-magic-numbers-layout': 3,
  'vizlint/consistent-border-radius': 3,
  'vizlint/dark-mode-coverage': 3,
  'vizlint/image-alt-text': 3,

  // Medium — refactor required
  'vizlint/no-inline-styles': 5,
  'vizlint/missing-states': 5,
  'vizlint/consistent-component-spacing': 5,

  // Large — design work or cross-cutting change
  'vizlint/responsive-required': 10,
  'vizlint/a11y-color-contrast': 10,
  'vizlint/max-component-lines': 30,
};

/** Default effort for any rule not in the table (e.g. user-defined). */
export const DEFAULT_RULE_EFFORT_MINUTES = 3;

/** Look up effort for a rule, falling back to the default. */
export function effortForRule(ruleId: string): number {
  return RULE_EFFORT_MINUTES[ruleId] ?? DEFAULT_RULE_EFFORT_MINUTES;
}
