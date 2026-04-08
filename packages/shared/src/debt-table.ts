/**
 * Per-rule remediation effort estimates, in minutes.
 *
 * Calibrated from real auto-fix data across the 7 validated projects
 * (4,061 files, 3,395 violations). Trivial class renames are ~2 minutes,
 * refactors ~5 minutes, design and accessibility decisions ~10 minutes,
 * large component splits ~30 minutes.
 *
 * Lives in @deslint/shared so the CLI, GitHub Action, and any future
 * embedding (Lovable/Bolt/v0) all use the same calibration.
 */
export const RULE_EFFORT_MINUTES: Record<string, number> = {
  // Trivial — class rename, fully auto-fixable
  'deslint/no-arbitrary-spacing': 2,
  'deslint/no-arbitrary-colors': 2,
  'deslint/no-arbitrary-typography': 2,
  'deslint/no-arbitrary-zindex': 2,

  // Small — minor decision, auto-fixable
  'deslint/no-magic-numbers-layout': 3,
  'deslint/consistent-border-radius': 3,
  'deslint/dark-mode-coverage': 3,
  'deslint/image-alt-text': 3,
  'deslint/lang-attribute': 2,
  'deslint/viewport-meta': 2,
  'deslint/heading-hierarchy': 5,

  // Medium — refactor required
  'deslint/no-inline-styles': 5,
  'deslint/missing-states': 5,
  'deslint/consistent-component-spacing': 5,

  // Large — design work or cross-cutting change
  'deslint/responsive-required': 10,
  'deslint/a11y-color-contrast': 10,
  'deslint/max-component-lines': 30,
};

/** Default effort for any rule not in the table (e.g. user-defined). */
export const DEFAULT_RULE_EFFORT_MINUTES = 3;

/** Look up effort for a rule, falling back to the default. */
export function effortForRule(ruleId: string): number {
  return RULE_EFFORT_MINUTES[ruleId] ?? DEFAULT_RULE_EFFORT_MINUTES;
}
