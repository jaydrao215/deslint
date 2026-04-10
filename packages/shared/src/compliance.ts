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

/**
 * IDs of criteria that ALSO exist unchanged in WCAG 2.1. Used to
 * compute the 2.1 AA equivalence reported alongside the 2.2 result.
 *
 * WCAG 2.1 is the legal floor for ADA Title II. WCAG 2.2 is mostly a
 * superset — it added criteria but also REMOVED 4.1.1 Parsing. We
 * list them explicitly so the set is auditable when we add criteria.
 *
 * Note: 2.5.8 (Target Size Minimum) is NEW in WCAG 2.2 and is NOT
 * included here. 1.3.5 (Identify Input Purpose) was added in WCAG 2.1.
 */
export const WCAG_21_CRITERIA_IDS: ReadonlySet<string> = new Set([
  '1.1.1',
  '1.3.1',
  '1.3.5',
  '1.4.3',
  '1.4.4',
  '1.4.10',
  '1.4.11',
  '1.4.12',
  '2.4.4',
  '2.4.6',
  '2.4.7',
  // 2.5.8 is WCAG 2.2 only — intentionally excluded
  '3.1.1',
  '3.3.2',
  '4.1.2',
]);

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
    rules: ['deslint/missing-states', 'deslint/focus-visible-style'],
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
  {
    id: '1.3.1',
    title: 'Info and Relationships',
    level: 'A',
    description: 'Information, structure, and relationships conveyed through presentation can be programmatically determined. Skipped heading levels break the implied document outline; unlabeled form controls break the form-control-to-label relationship.',
    rules: ['deslint/heading-hierarchy', 'deslint/form-labels'],
    url: 'https://www.w3.org/TR/WCAG22/#info-and-relationships',
  },
  {
    id: '2.4.6',
    title: 'Headings and Labels',
    level: 'AA',
    description: 'Headings and labels describe topic or purpose. Multiple top-level h1 elements break the single-main-heading expectation screen readers rely on.',
    rules: ['deslint/heading-hierarchy'],
    url: 'https://www.w3.org/TR/WCAG22/#headings-and-labels',
  },
  {
    id: '2.4.4',
    title: 'Link Purpose (In Context)',
    level: 'A',
    description: 'The purpose of each link can be determined from the link text alone, or from the link text together with its programmatically determined link context. Empty anchors and generic phrases like "click here" or "read more" violate this criterion.',
    rules: ['deslint/link-text'],
    url: 'https://www.w3.org/TR/WCAG22/#link-purpose-in-context',
  },
  {
    id: '3.3.2',
    title: 'Labels or Instructions',
    level: 'A',
    description: 'Labels or instructions are provided when content requires user input. Every form control needs an associated label so users know what to enter.',
    rules: ['deslint/form-labels'],
    url: 'https://www.w3.org/TR/WCAG22/#labels-or-instructions',
  },
  {
    id: '4.1.2',
    title: 'Name, Role, Value',
    level: 'A',
    description: 'For all UI components, the name, role, state, and value can be programmatically determined. Invalid ARIA roles and unknown aria-* attributes are silently ignored by assistive tech, leaving the component without a usable accessible name or role.',
    rules: ['deslint/aria-validation'],
    url: 'https://www.w3.org/TR/WCAG22/#name-role-value',
  },
  {
    id: '1.3.5',
    title: 'Identify Input Purpose',
    level: 'AA',
    description: 'The purpose of each input field collecting information about the user can be programmatically determined when the input field serves a purpose identified in the Input Purposes for User Interface Components section. The autocomplete attribute enables browsers and assistive technology to auto-fill identity and payment fields.',
    rules: ['deslint/autocomplete-attribute'],
    url: 'https://www.w3.org/TR/WCAG22/#identify-input-purpose',
  },
  {
    id: '2.5.8',
    title: 'Target Size (Minimum)',
    level: 'AA',
    description: 'The size of the target for pointer inputs is at least 24 by 24 CSS pixels. Small touch targets are especially problematic for users with motor impairments and on mobile devices.',
    rules: ['deslint/touch-target-size'],
    url: 'https://www.w3.org/TR/WCAG22/#target-size-minimum',
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

/** Per-level rollup used by the HTML report's "Level A" / "Level AA" sections. */
export interface LevelSummary {
  level: WcagLevel;
  /** Total mapped criteria at this exact level. */
  total: number;
  /** Criteria evaluated (i.e. at least one mapped rule was enabled). */
  evaluated: number;
  /** Evaluated criteria that passed. */
  passed: number;
  /** Evaluated criteria that failed. */
  failed: number;
  /** Criteria not evaluated (no mapped rule enabled). */
  notEvaluated: number;
  /**
   * True when conformance to this level is claimable — matches the
   * `levelReached` rule: every evaluated criterion at this level AND
   * every level below passes, AND at least one criterion at this
   * exact level was evaluated.
   */
  conformant: boolean;
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
  /** Per-level breakdown — one entry per level that has at least one mapped criterion. */
  byLevel: LevelSummary[];
  /**
   * WCAG 2.1 AA equivalence. 2.1 is the ADA Title II legal floor;
   * every criterion we currently map also exists in 2.1 (see
   * `WCAG_21_CRITERIA_IDS`), so the same evaluation gives us a 2.1
   * conformance statement "for free".
   */
  wcag21: {
    /**
     * Total criteria in our map that are also in WCAG 2.1 at Level A or AA.
     * If we ever add a criterion unique to 2.2, it would be excluded here.
     */
    totalMapped: number;
    /** Criteria in the 2.1 subset that were evaluated. */
    evaluated: number;
    /** Criteria in the 2.1 subset that passed. */
    passed: number;
    /** Criteria in the 2.1 subset that failed. */
    failed: number;
    /**
     * The 2.1 level reached, computed the same way as `levelReached`
     * but over the WCAG 2.1 subset of criteria only.
     */
    levelReached: WcagLevel | 'none';
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
  const computeLevelReached = (pool: CriterionResult[]): WcagLevel | 'none' => {
    let reached: WcagLevel | 'none' = 'none';
    for (const level of levelOrder) {
      const atOrBelow = pool.filter(
        (c) => levelOrder.indexOf(c.criterion.level) <= levelOrder.indexOf(level),
      );
      const atExactLevel = pool.filter((c) => c.criterion.level === level);
      const allPass = atOrBelow.every((c) => c.status === 'pass');
      const hasExactLevelEvaluated = atExactLevel.some((c) => c.status !== 'not-evaluated');
      if (allPass && hasExactLevelEvaluated) {
        reached = level;
      } else if (!allPass) {
        break;
      }
    }
    return reached;
  };
  const levelReached = computeLevelReached(criteria);

  // Per-level breakdown — one entry per level that actually has mapped
  // criteria, in A → AA → AAA order. `conformant` uses the same
  // at-or-below rule as `levelReached` so the HTML report's per-level
  // sections never contradict the overall headline.
  const levelsWithCriteria = levelOrder.filter((lvl) =>
    criteria.some((c) => c.criterion.level === lvl),
  );
  const byLevel: LevelSummary[] = levelsWithCriteria.map((level) => {
    const atLevel = criteria.filter((c) => c.criterion.level === level);
    const atOrBelow = criteria.filter(
      (c) => levelOrder.indexOf(c.criterion.level) <= levelOrder.indexOf(level),
    );
    const atLevelEvaluated = atLevel.filter((c) => c.status !== 'not-evaluated');
    const conformant =
      atLevelEvaluated.length > 0 && atOrBelow.every((c) => c.status === 'pass');
    return {
      level,
      total: atLevel.length,
      evaluated: atLevelEvaluated.length,
      passed: atLevel.filter((c) => c.status === 'pass').length,
      failed: atLevel.filter((c) => c.status === 'fail').length,
      notEvaluated: atLevel.filter((c) => c.status === 'not-evaluated').length,
      conformant,
    };
  });

  // WCAG 2.1 equivalence — same criteria, filtered to the ones that
  // also exist in WCAG 2.1 (which is currently all of them, but this
  // will protect the report if we ever add a criterion unique to 2.2).
  const wcag21Criteria = criteria.filter((c) => WCAG_21_CRITERIA_IDS.has(c.criterion.id));
  const wcag21 = {
    totalMapped: wcag21Criteria.length,
    evaluated: wcag21Criteria.filter((c) => c.status !== 'not-evaluated').length,
    passed: wcag21Criteria.filter((c) => c.status === 'pass').length,
    failed: wcag21Criteria.filter((c) => c.status === 'fail').length,
    levelReached: computeLevelReached(wcag21Criteria),
  };

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
    byLevel,
    wcag21,
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
