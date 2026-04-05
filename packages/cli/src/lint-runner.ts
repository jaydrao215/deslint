import { ESLint } from 'eslint';
import { dirname } from 'node:path';

/** Rule categories used for Design Health Score sub-scores */
export type RuleCategory = 'colors' | 'spacing' | 'typography' | 'responsive' | 'consistency';

/** Map Vizlint rule IDs to their score category */
export const RULE_CATEGORY_MAP: Record<string, RuleCategory> = {
  'vizlint/no-arbitrary-colors': 'colors',
  'vizlint/no-arbitrary-spacing': 'spacing',
  'vizlint/no-arbitrary-typography': 'typography',
  'vizlint/responsive-required': 'responsive',
  'vizlint/consistent-component-spacing': 'consistency',
  'vizlint/a11y-color-contrast': 'colors',
  'vizlint/dark-mode-coverage': 'colors',
  'vizlint/no-arbitrary-zindex': 'consistency',
  'vizlint/no-inline-styles': 'consistency',
  'vizlint/consistent-border-radius': 'consistency',
  'vizlint/image-alt-text': 'responsive',
  'vizlint/no-magic-numbers-layout': 'spacing',
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
  /** Working directory (base path for ESLint). Defaults to process.cwd(). */
  cwd?: string;
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
    'vizlint/a11y-color-contrast': 'warn',
    'vizlint/max-component-lines': 'off',
    'vizlint/missing-states': 'off',
    'vizlint/dark-mode-coverage': 'off',
    'vizlint/no-arbitrary-zindex': 'warn',
    'vizlint/no-inline-styles': 'off',
    'vizlint/consistent-border-radius': 'warn',
    'vizlint/image-alt-text': 'warn',
    'vizlint/no-magic-numbers-layout': 'warn',
  };

  // Apply user overrides
  if (options.ruleOverrides) {
    for (const [rule, config] of Object.entries(options.ruleOverrides)) {
      const ruleId = rule.startsWith('vizlint/') ? rule : `vizlint/${rule}`;
      rules[ruleId] = config;
    }
  }

  // Determine cwd so ESLint treats all target files as within its base path.
  // If not provided, derive from the first file's directory.
  const cwd = options.cwd ?? (options.files.length > 0 ? dirname(options.files[0]) : process.cwd());

  // Load TypeScript parser (required for .tsx/.ts files with type annotations)
  let typescriptParser: any;
  try {
    typescriptParser = await import('@typescript-eslint/parser');
  } catch {
    // Not installed — TypeScript files may fail to parse
  }

  // Load framework-specific parsers (optional peer deps of eslint-plugin-vizlint)
  let angularTemplateParser: any;
  try {
    angularTemplateParser = await import('@angular-eslint/template-parser');
  } catch {
    // Not installed — Angular template files will be skipped
  }

  let vueParser: any;
  try {
    vueParser = await import('vue-eslint-parser');
  } catch {
    // Not installed — Vue files will use default parser
  }

  let svelteParser: any;
  try {
    svelteParser = await import('svelte-eslint-parser');
  } catch {
    // Not installed — Svelte files will use default parser
  }

  const baseConfig = {
    plugins: { vizlint: plugin } as any,
    rules,
    // Don't report eslint-disable comments for rules not in our config
    linterOptions: {
      reportUnusedDisableDirectives: false,
    },
  };

  const configs: any[] = [];

  // TypeScript/TSX files — use @typescript-eslint/parser if available (handles TS syntax + JSX)
  if (typescriptParser) {
    configs.push({
      ...baseConfig,
      files: ['**/*.tsx', '**/*.ts'],
      languageOptions: {
        parser: typescriptParser,
        parserOptions: {
          ecmaFeatures: { jsx: true },
          // No project needed — we only do AST pattern matching, no type info
          project: false,
        },
      },
    });
  }

  // JSX/JS files — default Espree parser with JSX enabled (no TS syntax)
  configs.push({
    ...baseConfig,
    files: typescriptParser
      ? ['**/*.jsx', '**/*.js', '**/*.mjs', '**/*.cjs']
      : ['**/*.tsx', '**/*.jsx', '**/*.js', '**/*.ts', '**/*.mjs', '**/*.cjs'],
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
  });

  // Angular HTML templates
  if (angularTemplateParser) {
    configs.push({
      ...baseConfig,
      files: ['**/*.html'],
      languageOptions: {
        parser: angularTemplateParser,
      },
    });
  }

  // Vue SFC files
  if (vueParser) {
    configs.push({
      ...baseConfig,
      files: ['**/*.vue'],
      languageOptions: {
        parser: vueParser,
        parserOptions: {
          // vue-eslint-parser needs a sub-parser for <script> blocks
          parser: typescriptParser ?? undefined,
          ecmaFeatures: { jsx: true },
        },
      },
    });
  }

  // Svelte files
  if (svelteParser) {
    configs.push({
      ...baseConfig,
      files: ['**/*.svelte'],
      languageOptions: {
        parser: svelteParser,
      },
    });
  }

  const eslint = new ESLint({
    overrideConfigFile: true,
    cwd,
    overrideConfig: configs,
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
    // Filter to only vizlint/* violations and parse errors (ruleId null = parse error)
    // This prevents third-party eslint-disable comments from leaking into our results
    const vizlintMessages = result.messages.filter(
      (msg) => msg.ruleId === null || msg.ruleId.startsWith('vizlint/'),
    );

    if (vizlintMessages.length > 0) {
      filesWithViolations++;
    }

    for (const msg of vizlintMessages) {
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

  // Return results with non-vizlint messages stripped for clean output
  const filteredResults = results.map((r) => ({
    ...r,
    messages: r.messages.filter(
      (msg) => msg.ruleId === null || msg.ruleId.startsWith('vizlint/'),
    ),
  }));

  return {
    results: filteredResults as LintFileResult[],
    totalFiles: results.length,
    totalViolations,
    bySeverity: { errors, warnings },
    byRule,
    byCategory,
    filesWithViolations,
  };
}
