import type { ScoreResult, HistoryEntry } from '../score.js';
import type { DebtResult } from '../debt.js';

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

export const RULE_CATEGORIES: Record<string, string> = {
  'deslint/no-arbitrary-colors': 'Colors',
  'deslint/a11y-color-contrast': 'Colors',
  'deslint/dark-mode-coverage': 'Colors',
  'deslint/no-arbitrary-spacing': 'Spacing',
  'deslint/no-magic-numbers-layout': 'Spacing',
  'deslint/no-arbitrary-typography': 'Typography',
  'deslint/responsive-required': 'Responsive',
  'deslint/consistent-component-spacing': 'Consistency',
  'deslint/consistent-border-radius': 'Consistency',
  'deslint/no-arbitrary-zindex': 'Consistency',
  'deslint/no-inline-styles': 'Consistency',
  'deslint/max-component-lines': 'Consistency',
  'deslint/missing-states': 'Responsive',
  'deslint/image-alt-text': 'Responsive',
};

export const FIXABLE_RULES = new Set([
  'deslint/no-arbitrary-colors',
  'deslint/no-arbitrary-spacing',
  'deslint/no-arbitrary-typography',
  'deslint/dark-mode-coverage',
  'deslint/no-arbitrary-zindex',
  'deslint/no-magic-numbers-layout',
]);

export function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
