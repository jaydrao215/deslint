import { ESLint } from 'eslint';

/** Rule categories used for Design Health Score sub-scores */
export type RuleCategory = 'colors' | 'spacing' | 'typography' | 'responsive' | 'consistency';

/** Map Vizlint rule IDs to their score category */
export const RULE_CATEGORY_MAP: Record<string, RuleCategory> = {
  'vizlint/no-arbitrary-colors': 'colors',
  'vizlint/no-arbitrary-spacing': 'spacing',
  'vizlint/no-arbitrary-typography': 'typography',
  'vizlint/responsive-required': 'responsive',
  'vizlint/consistent-component-spacing': 'consistency',
};

export interface LintMessage {
  ruleId: string | null;
  severity: number;
  message: string;
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
  fix?: { range: [number, number]; text: string };
}

export interface LintFileResult {
  filePath: string;
  messages: LintMessage[];
  output?: string;
  fixableErrorCount?: number;
  fixableWarningCount?: number;
}

export interface LintResult {
  /** ESLint results per file */
  results: LintFileResult[];
  /** Total files scanned */
  totalFiles: number;
  /** Total violations */
  totalViolations: number;
  /** Violations grouped by severity */
  bySeverity: { errors: number; warnings: number };
  /** Violations grouped by rule */
  byRule: Record<string, number>;
  /** Violations grouped by category (for scoring) */
  byCategory: Record<RuleCategory, number>;
  /** Files with violations */
  filesWithViolations: number;
}

export interface LintRunnerOptions {
  /** Files to lint */
  files: string[];
  /** Rule overrides from .vizlintrc.json */
  ruleOverrides?: Record<string, any>;
  /** Whether to apply fixes */
  fix?: boolean;
}

/**
 * Run Vizlint ESLint rules on a set of files.
 * Returns structured results for scoring and reporting.
 */
export async function runLint(options: LintRunnerOptions): Promise<LintResult> {
  // Dynamic import to get the plugin — it's an ESM workspace package
  const vizlintPlugin = await import('eslint-plugin-vizlint');
  const plugin = vizlintPlugin.default ?? vizlintPlugin;

  const rules: Record<string, any> = {
    'vizlint/no-arbitrary-colors': 'warn',
    'vizlint/no-arbitrary-spacing': 'warn',
    'vizlint/no-arbitrary-typography': 'warn',
    'vizlint/responsive-required': 'warn',
    'vizlint/consistent-component-spacing': 'warn',
  };

  // Apply user overrides
  if (options.ruleOverrides) {
    for (const [rule, config] of Object.entries(options.ruleOverrides)) {
      const ruleId = rule.startsWith('vizlint/') ? rule : `vizlint/${rule}`;
      rules[ruleId] = config;
    }
  }

  const eslint = new ESLint({
    overrideConfigFile: true,
    overrideConfig: {
      plugins: { vizlint: plugin } as any,
      rules,
      languageOptions: {
        parserOptions: {
          ecmaFeatures: { jsx: true },
        },
      },
    },
    fix: options.fix ?? false,
  });

  const results = await eslint.lintFiles(options.files);

  // If fixing, write the fixed files
  if (options.fix) {
    await ESLint.outputFixes(results);
  }

  return aggregateResults(results as unknown as LintFileResult[]);
}

/**
 * Aggregate ESLint results into structured summary.
 */
function aggregateResults(results: LintFileResult[]): LintResult {
  let totalViolations = 0;
  let errors = 0;
  let warnings = 0;
  let filesWithViolations = 0;
  const byRule: Record<string, number> = {};
  const byCategory: Record<RuleCategory, number> = {
    colors: 0,
    spacing: 0,
    typography: 0,
    responsive: 0,
    consistency: 0,
  };

  for (const result of results) {
    if (result.messages.length > 0) {
      filesWithViolations++;
    }

    for (const msg of result.messages) {
      totalViolations++;

      if (msg.severity === 2) {
        errors++;
      } else {
        warnings++;
      }

      const ruleId = msg.ruleId ?? 'unknown';
      byRule[ruleId] = (byRule[ruleId] ?? 0) + 1;

      const category = RULE_CATEGORY_MAP[ruleId];
      if (category) {
        byCategory[category]++;
      }
    }
  }

  return {
    results,
    totalFiles: results.length,
    totalViolations,
    bySeverity: { errors, warnings },
    byRule,
    byCategory,
    filesWithViolations,
  };
}
