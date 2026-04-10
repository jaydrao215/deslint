import { ESLint } from 'eslint';
import { dirname } from 'node:path';

/** Rule categories used for Design Health Score sub-scores */
export type RuleCategory = 'colors' | 'spacing' | 'typography' | 'responsive' | 'consistency';

/** Map Deslint rule IDs to their score category */
export const RULE_CATEGORY_MAP: Record<string, RuleCategory> = {
  'deslint/no-arbitrary-colors': 'colors',
  'deslint/no-arbitrary-spacing': 'spacing',
  'deslint/no-arbitrary-typography': 'typography',
  'deslint/responsive-required': 'responsive',
  'deslint/consistent-component-spacing': 'consistency',
  'deslint/a11y-color-contrast': 'colors',
  'deslint/dark-mode-coverage': 'colors',
  'deslint/no-arbitrary-zindex': 'consistency',
  'deslint/no-inline-styles': 'consistency',
  'deslint/consistent-border-radius': 'consistency',
  'deslint/image-alt-text': 'responsive',
  'deslint/no-magic-numbers-layout': 'spacing',
  'deslint/lang-attribute': 'consistency',
  'deslint/viewport-meta': 'consistency',
  'deslint/heading-hierarchy': 'consistency',
  'deslint/link-text': 'consistency',
  'deslint/form-labels': 'consistency',
  'deslint/aria-validation': 'consistency',
  'deslint/focus-visible-style': 'responsive',
  'deslint/touch-target-size': 'responsive',
  'deslint/autocomplete-attribute': 'consistency',
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
  /** Rule overrides from .deslintrc.json */
  ruleOverrides?: Record<string, any>;
  /** Whether to apply fixes */
  fix?: boolean;
  /** Working directory (base path for ESLint). Defaults to process.cwd(). */
  cwd?: string;
}

/**
 * Run Deslint ESLint rules on a set of files.
 * Returns structured results for scoring and reporting.
 */
export async function runLint(options: LintRunnerOptions): Promise<LintResult> {
  // Dynamic import to get the plugin — it's an ESM workspace package
  const deslintPlugin = await import('@deslint/eslint-plugin');
  const plugin = deslintPlugin.default ?? deslintPlugin;

  const rules: Record<string, any> = {
    'deslint/no-arbitrary-colors': 'warn',
    'deslint/no-arbitrary-spacing': 'warn',
    'deslint/no-arbitrary-typography': 'warn',
    'deslint/responsive-required': 'warn',
    'deslint/consistent-component-spacing': 'warn',
    'deslint/a11y-color-contrast': 'warn',
    'deslint/max-component-lines': 'off',
    'deslint/missing-states': 'off',
    'deslint/dark-mode-coverage': 'off',
    'deslint/no-arbitrary-zindex': 'warn',
    'deslint/no-inline-styles': 'off',
    'deslint/consistent-border-radius': 'warn',
    'deslint/image-alt-text': 'warn',
    'deslint/no-magic-numbers-layout': 'warn',
    'deslint/lang-attribute': 'warn',
    'deslint/viewport-meta': 'error',
    'deslint/heading-hierarchy': 'warn',
    'deslint/link-text': 'warn',
    'deslint/form-labels': 'warn',
    'deslint/aria-validation': 'error',
    'deslint/focus-visible-style': 'warn',
    'deslint/touch-target-size': 'warn',
    'deslint/autocomplete-attribute': 'warn',
  };

  // Apply user overrides
  if (options.ruleOverrides) {
    for (const [rule, config] of Object.entries(options.ruleOverrides)) {
      const ruleId = rule.startsWith('deslint/') ? rule : `deslint/${rule}`;
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

  // Load framework-specific parsers (optional peer deps of @deslint/eslint-plugin)
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

  // Plain HTML parser. When present, it takes precedence over Angular for
  // vanilla `.html` files; Angular then only claims `.component.html` (the
  // standard Angular convention). When absent, Angular parser still handles
  // `.html` so existing Angular users keep working.
  let htmlParser: any;
  try {
    htmlParser = await import('@html-eslint/parser');
  } catch {
    // Not installed — plain HTML files will fall back to Angular parser
    // (if available) or be skipped entirely.
  }

  const baseConfig = {
    plugins: { deslint: plugin } as any,
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

  // Plain HTML files — use @html-eslint/parser when available.
  // Comes FIRST so that if both html-eslint and Angular parsers are installed,
  // plain `.html` gets html-eslint by default. Angular still owns
  // `**/*.component.html` below (added after — later config wins in ESLint
  // flat config merge order).
  if (htmlParser) {
    configs.push({
      ...baseConfig,
      files: ['**/*.html'],
      languageOptions: {
        parser: htmlParser,
      },
    });
  }

  // Angular HTML templates
  if (angularTemplateParser) {
    configs.push({
      ...baseConfig,
      // When html-eslint is also installed, narrow Angular's claim to the
      // `.component.html` convention so plain `.html` files don't get routed
      // to the Angular template parser. When html-eslint is NOT installed,
      // Angular parser keeps its historical `**/*.html` claim so existing
      // Angular users don't regress.
      files: htmlParser ? ['**/*.component.html'] : ['**/*.html'],
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
    // Filter to only deslint/* violations and parse errors (ruleId null = parse error)
    // This prevents third-party eslint-disable comments from leaking into our results
    const deslintMessages = result.messages.filter(
      (msg) => msg.ruleId === null || msg.ruleId.startsWith('deslint/'),
    );

    if (deslintMessages.length > 0) {
      filesWithViolations++;
    }

    for (const msg of deslintMessages) {
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

  // Return results with non-deslint messages stripped for clean output
  const filteredResults = results.map((r) => ({
    ...r,
    messages: r.messages.filter(
      (msg) => msg.ruleId === null || msg.ruleId.startsWith('deslint/'),
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
