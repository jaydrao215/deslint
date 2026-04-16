import type { ScoreResult, HistoryEntry } from '../score.js';
import type { DebtResult } from '../debt.js';
import { RULE_CATEGORY_MAP, type RuleCategory } from '../lint-runner.js';

export interface ViolationEntry {
  file: string;
  line: number;
  column: number;
  severity: string;
  ruleId: string;
  message: string;
}

export interface RuleSummary {
  ruleId: string;
  shortName: string;
  count: number;
  category: string;
  fixable: boolean;
  files: Set<string>;
}

export interface VisualPattern {
  key: string;
  ruleId: string;
  count: number;
  files: Set<string>;
  data: Record<string, string>;
}

export interface ReportData {
  version: string;
  timestamp: string;
  projectName: string;
  score: ScoreResult;
  debt: DebtResult;
  summary: {
    totalFiles: number;
    filesWithViolations: number;
    totalViolations: number;
    errors: number;
    warnings: number;
  };
  ruleSummaries: RuleSummary[];
  fileHotspots: [string, number][];
  violations: ViolationEntry[];
  arbitraryColors: { hex: string; suggestion: string; count: number }[];
  contrastViolations: ViolationEntry[];
  history: HistoryEntry[];
}

const CATEGORY_LABEL: Record<RuleCategory, string> = {
  colors: 'Colors',
  spacing: 'Spacing',
  typography: 'Typography',
  responsive: 'Responsive',
  consistency: 'Consistency',
};

// Derive the display map from lint-runner's authoritative rule → category
// table so new rules stay correctly categorised without a second source to
// keep in sync.
export const RULE_CATEGORIES: Record<string, string> = Object.fromEntries(
  Object.entries(RULE_CATEGORY_MAP).map(([rule, cat]) => [rule, CATEGORY_LABEL[cat]]),
);

export function categoryLabel(cat: RuleCategory): string {
  return CATEGORY_LABEL[cat];
}

export function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
