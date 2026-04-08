/**
 * WCAG 2.2 compliance mapping and conformance evaluation.
 *
 * Maps Deslint rules to WCAG 2.2 Success Criteria so scan results
 * can be converted into an audit-ready conformance report. Only a
 * subset of Deslint rules map cleanly to WCAG — the rest are
 * "design quality" concerns and are reported separately.
 *
 * Source: https://www.w3.org/TR/WCAG22/
 *
 * This module is pure — no I/O. Callers pass in a scan snapshot and
 * receive a structured report that can be rendered as HTML, JSON,
 * or fed into a legal/compliance workflow.
 */

/** WCAG conformance level. */
export type WcagLevel = 'A' | 'AA' | 'AAA';

/** A single WCAG 2.2 Success Criterion we evaluate. */
export interface WcagCriterion {
  /** e.g. "1.4.3" */
  id: string;
  /** Human-readable title, e.g. "Contrast (Minimum)" */
  title: string;
  /** Conformance level. */
  level: WcagLevel;
  /** Short plain-English description. */
  description: string;
  /** Deslint rule IDs that contribute evidence to this criterion. */
  rules: string[];
  /** Link into the WCAG spec. */
  url: string;
}

/**
 * WCAG 2.2 criteria mapped to Deslint rules.
 *
 * We deliberately keep this list small and defensible. A rule appears
 * here only when failing it is clear evidence the criterion is not
 * met. Things like "spacing is inconsistent" are design quality
 * issues, not WCAG violations, and are excluded.
 */
export const WCAG_CRITERIA: WcagCriterion[] = [
  {
    id: '1.1.1',
    title: 'Non-text Content',
    level: 'A',
    description: 'All non-text content has a text alternative that serves the equivalent purpose.',
    rules: ['deslint/image-alt-text'],
    url: 'https://www.w3.org/TR/WCAG22/#non-text-content',
  },
  {
    id: '1.4.3',
    title: 'Contrast (Minimum)',
    level: 'AA',
    description: 'Text and images of text have a contrast ratio of at least 4.5:1 (3:1 for large text).',
    rules: ['deslint/a11y-color-contrast'],
    url: 'https://www.w3.org/TR/WCAG22/#contrast-minimum',
  },
  {
    id: '1.4.10',
    title: 'Reflow',
    level: 'AA',
    description: 'Content can be presented without loss at 320 CSS pixels wide without horizontal scroll.',
    rules: ['deslint/responsive-required'],
    url: 'https://www.w3.org/TR/WCAG22/#reflow',
  },
  {
    id: '1.4.11',
    title: 'Non-text Contrast',
    level: 'AA',
    description: 'UI components and graphical objects have a contrast ratio of at least 3:1 against adjacent colors.',
    rules: ['deslint/a11y-color-contrast'],
    url: 'https://www.w3.org/TR/WCAG22/#non-text-contrast',
  },
  {
    id: '1.4.12',
    title: 'Text Spacing',
    level: 'AA',
    description: 'No loss of content or functionality when users override line height, paragraph spacing, letter spacing, or word spacing.',
    rules: ['deslint/no-inline-styles'],
    url: 'https://www.w3.org/TR/WCAG22/#text-spacing',
  },
  {
    id: '2.4.7',
    title: 'Focus Visible',
    level: 'AA',
    description: 'Any keyboard-operable user interface has a visible focus indicator.',
    rules: ['deslint/missing-states'],
    url: 'https://www.w3.org/TR/WCAG22/#focus-visible',
  },
  {
    id: '3.1.1',
    title: 'Language of Page',
    level: 'A',
    description: 'The default human language of each page can be programmatically determined.',
    rules: ['deslint/lang-attribute'],
    url: 'https://www.w3.org/TR/WCAG22/#language-of-page',
  },
  {
    id: '1.4.4',
    title: 'Resize Text',
    level: 'AA',
    description: 'Text can be resized up to 200% without loss of content or functionality. Disabling user scaling on the viewport meta tag is failure technique F77.',
    rules: ['deslint/viewport-meta'],
    url: 'https://www.w3.org/TR/WCAG22/#resize-text',
  },
];

/** Per-criterion evaluation result. */
export interface CriterionResult {
  criterion: WcagCriterion;
  /** 'pass' = no violations, 'fail' = at least one violation, 'not-evaluated' = no rule covering this criterion was enabled. */
  status: 'pass' | 'fail' | 'not-evaluated';
  /** Number of violations from the mapped rules. */
  violations: number;
  /** Files affected by violations. */
  filesAffected: number;
}

/** Overall compliance evaluation result. */
export interface ComplianceResult {
  /** Per-criterion breakdown. */
  criteria: CriterionResult[];
  /** Conformance level reached (highest level at which ALL criteria pass). */
  levelReached: WcagLevel | 'none';
  /** Coverage % — (evaluated criteria / total mapped criteria) * 100. */
  coveragePercent: number;
  /** Pass rate % — (passed / evaluated) * 100. */
  passRatePercent: number;
  /** Total violations counted against WCAG criteria. */
  totalViolations: number;
  /** Snapshot of summary numbers for report headers. */
  summary: {
    evaluated: number;
    passed: number;
    failed: number;
    notEvaluated: number;
  };
}

/** Minimal shape the evaluator needs from a scan run. */
export interface ComplianceScanSnapshot {
  /** Violation counts by full rule id (e.g. 'deslint/a11y-color-contrast'). */
  byRule: Record<string, number>;
  /** Optional per-rule file counts. */
  filesByRule?: Record<string, number>;
  /** Rules the user has explicitly enabled (optional — if omitted we assume all mapped rules are on). */
  enabledRules?: Set<string>;
}

/**
 * Evaluate WCAG conformance from a scan snapshot.
 *
 * Pure function — no I/O, safe to call from tests, CLI, GitHub
 * Action, or an embedded platform integration.
 */
export function evaluateCompliance(scan: ComplianceScanSnapshot): ComplianceResult {
  const criteria: CriterionResult[] = WCAG_CRITERIA.map((criterion) => {
    const mappedRuleViolations = criterion.rules.reduce(
      (sum, rule) => sum + (scan.byRule[rule] ?? 0),
      0,
    );
    const filesAffected = criterion.rules.reduce(
      (sum, rule) => sum + (scan.filesByRule?.[rule] ?? 0),
      0,
    );

    // If the caller told us which rules are enabled and NONE of the
    // rules covering this criterion are on, we can't speak to it.
    const anyRuleEnabled = scan.enabledRules
      ? criterion.rules.some((r) => scan.enabledRules!.has(r))
      : true;

    let status: CriterionResult['status'];
    if (!anyRuleEnabled) {
      status = 'not-evaluated';
    } else if (mappedRuleViolations === 0) {
      status = 'pass';
    } else {
      status = 'fail';
    }

    return {
      criterion,
      status,
      violations: mappedRuleViolations,
      filesAffected,
    };
  });

  const evaluated = criteria.filter((c) => c.status !== 'not-evaluated').length;
  const passed = criteria.filter((c) => c.status === 'pass').length;
  const failed = criteria.filter((c) => c.status === 'fail').length;
  const notEvaluated = criteria.filter((c) => c.status === 'not-evaluated').length;

  // Level reached: highest level at which (a) every evaluated criterion
  // at or below that level passes AND (b) at least one criterion at
  // that exact level was evaluated. Requirement (b) prevents us from
  // claiming AAA conformance when we have no AAA coverage at all.
  const levelOrder: WcagLevel[] = ['A', 'AA', 'AAA'];
  let levelReached: WcagLevel | 'none' = 'none';
  for (const level of levelOrder) {
    const criteriaAtOrBelow = criteria.filter(
      (c) => levelOrder.indexOf(c.criterion.level) <= levelOrder.indexOf(level),
    );
    const criteriaAtExactLevel = criteria.filter((c) => c.criterion.level === level);
    const allPass = criteriaAtOrBelow.every((c) => c.status === 'pass');
    const hasExactLevelEvaluated = criteriaAtExactLevel.some((c) => c.status !== 'not-evaluated');
    if (allPass && hasExactLevelEvaluated) {
      levelReached = level;
    } else if (!allPass) {
      break;
    }
  }

  // Sum violations by unique mapped rule so a rule covering two
  // criteria (e.g. a11y-color-contrast → 1.4.3 + 1.4.11) isn't counted
  // twice in the headline number.
  const mappedRules = new Set(WCAG_CRITERIA.flatMap((c) => c.rules));
  const totalViolations = [...mappedRules].reduce(
    (sum, rule) => sum + (scan.byRule[rule] ?? 0),
    0,
  );

  return {
    criteria,
    levelReached,
    coveragePercent: WCAG_CRITERIA.length > 0
      ? Math.round((evaluated / WCAG_CRITERIA.length) * 100)
      : 0,
    passRatePercent: evaluated > 0
      ? Math.round((passed / evaluated) * 100)
      : 0,
    totalViolations,
    summary: { evaluated, passed, failed, notEvaluated },
  };
}

/** Short plain-text summary, useful for CLI output and PR comments. */
export function formatComplianceSummary(result: ComplianceResult): string {
  const lines: string[] = [];
  lines.push(`WCAG 2.2 Conformance: ${result.levelReached === 'none' ? 'Not Met' : `Level ${result.levelReached}`}`);
  lines.push(`  Criteria evaluated: ${result.summary.evaluated}/${result.criteria.length}`);
  lines.push(`  Passing: ${result.summary.passed}   Failing: ${result.summary.failed}`);
  if (result.totalViolations > 0) {
    lines.push(`  Total violations: ${result.totalViolations}`);
  }
  return lines.join('\n');
}
