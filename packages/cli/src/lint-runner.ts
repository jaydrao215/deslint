import { ESLint } from 'eslint';
import { dirname } from 'node:path';
import { readFileSync, statSync } from 'node:fs';

export type RuleCategory = 'colors' | 'spacing' | 'typography' | 'responsive' | 'consistency';

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
  'deslint/no-arbitrary-border-radius': 'consistency',
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
  'deslint/no-conflicting-classes': 'consistency',
  'deslint/no-duplicate-class-strings': 'consistency',
  'deslint/prefer-semantic-html': 'responsive',
  'deslint/consistent-color-palette': 'colors',
  'deslint/max-tailwind-classes': 'consistency',
  'deslint/prefers-reduced-motion': 'responsive',
  'deslint/icon-accessibility': 'consistency',
  'deslint/focus-trap-patterns': 'consistency',
  'deslint/responsive-image-optimization': 'responsive',
  'deslint/spacing-rhythm-consistency': 'spacing',
  'deslint/no-dangerous-html': 'consistency',
  'deslint/safe-external-links': 'consistency',
  'deslint/iframe-sandbox': 'consistency',
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
  results: LintFileResult[];
  totalFiles: number;
  totalViolations: number;
  bySeverity: { errors: number; warnings: number };
  byRule: Record<string, number>;
  byCategory: Record<RuleCategory, number>;
  filesWithViolations: number;
  parseErrors: number;
  /** Effective rule map used for the scan. Used by trailer computation. */
  effectiveRules?: Record<string, unknown>;
  /** Which scanned files contained class attributes / inline styles —
   *  inputs the rules actually had something to say about. Used to
   *  gate the Design Health Score to `null` on codebases where none of
   *  our class-based rules apply (e.g. a CSS-in-JS project). */
  applicability?: ApplicabilityInfo;
}

export interface ApplicabilityInfo {
  filesScanned: number;
  /** Files containing a `class=` or `className=` attribute (Tailwind /
   *  plain HTML / JSX — anything the class-visitor can reach). */
  tailwindFiles: number;
  /** Files containing a `style=` attribute or `styled`/`css` import
   *  (CSS-in-JS surfaces that element-based rules can still reach). */
  styleFiles: number;
  /** True when at least one scanned file had something for the rules
   *  to inspect. False means none of the class/element rules had
   *  applicable input. */
  applicable: boolean;
  /** Short hint surfaced in output when !applicable. */
  reason?: string;
}

export interface LintRunnerOptions {
  files: string[];
  ruleOverrides?: Record<string, any>;
  fix?: boolean;
  /** Defaults to the value of `fix`. Pass `false` with `fix: true` for a
   *  true dry-run (proposed fixes in `output` without touching disk). */
  writeFixes?: boolean;
  cwd?: string;
}

/**
 * Build the flat-config array (rules + per-extension parser dispatch)
 * deslint passes to ESLint. Extracted out of `runLint` so the MCP
 * server can build configs once and reuse them across many calls
 * (each call to `runLint` was previously re-doing all the parser
 * imports, which dominated cold-start time on the MCP path).
 *
 * The returned array is the SAME shape ESLint v9+ flat config
 * accepts via `overrideConfig` (for `ESLint`) or as the second arg
 * to `Linter.verify` — agents in the MCP fast path use the latter
 * to avoid spinning up the full engine.
 */
export async function buildLintConfigs(options: {
  ruleOverrides?: Record<string, any>;
}): Promise<any[]> {
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
    'deslint/no-arbitrary-border-radius': 'warn',
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
    'deslint/no-conflicting-classes': 'warn',
    'deslint/no-duplicate-class-strings': 'off',
    'deslint/prefer-semantic-html': 'warn',
    'deslint/consistent-color-palette': 'off',
    'deslint/max-tailwind-classes': 'off',
    'deslint/prefers-reduced-motion': 'warn',
    'deslint/icon-accessibility': 'warn',
    'deslint/focus-trap-patterns': 'warn',
    'deslint/responsive-image-optimization': 'warn',
    'deslint/spacing-rhythm-consistency': 'off',
    'deslint/no-dangerous-html': 'warn',
    'deslint/safe-external-links': 'warn',
    'deslint/iframe-sandbox': 'warn',
  };

  if (options.ruleOverrides) {
    for (const [rule, config] of Object.entries(options.ruleOverrides)) {
      const ruleId = rule.startsWith('deslint/') ? rule : `deslint/${rule}`;
      rules[ruleId] = config;
    }
  }

  let typescriptParser: any;
  try { typescriptParser = await import('@typescript-eslint/parser'); } catch {}

  let angularTemplateParser: any;
  try { angularTemplateParser = await import('@angular-eslint/template-parser'); } catch {}

  let vueParser: any;
  try { vueParser = await import('vue-eslint-parser'); } catch {}

  let svelteParser: any;
  try { svelteParser = await import('svelte-eslint-parser'); } catch {}

  let htmlParser: any;
  try { htmlParser = await import('@html-eslint/parser'); } catch {}

  let astroParser: any;
  try { astroParser = await import('astro-eslint-parser'); } catch {}

  const baseConfig = {
    plugins: { deslint: plugin } as any,
    rules,
    linterOptions: { reportUnusedDisableDirectives: false },
  };

  const configs: any[] = [];

  if (typescriptParser) {
    configs.push({
      ...baseConfig,
      files: ['**/*.tsx', '**/*.ts'],
      languageOptions: {
        parser: typescriptParser,
        parserOptions: { ecmaFeatures: { jsx: true }, project: false },
      },
    });
  }

  configs.push({
    ...baseConfig,
    files: typescriptParser
      ? ['**/*.jsx', '**/*.js', '**/*.mjs', '**/*.cjs']
      : ['**/*.tsx', '**/*.jsx', '**/*.js', '**/*.ts', '**/*.mjs', '**/*.cjs'],
    languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
  });

  if (htmlParser) {
    configs.push({
      ...baseConfig,
      files: ['**/*.html'],
      languageOptions: { parser: htmlParser },
    });
  }

  if (angularTemplateParser) {
    configs.push({
      ...baseConfig,
      files: htmlParser ? ['**/*.component.html'] : ['**/*.html'],
      languageOptions: { parser: angularTemplateParser },
    });
  }

  if (vueParser) {
    configs.push({
      ...baseConfig,
      files: ['**/*.vue'],
      languageOptions: {
        parser: vueParser,
        parserOptions: {
          parser: typescriptParser ?? undefined,
          ecmaFeatures: { jsx: true },
        },
      },
    });
  }

  if (svelteParser) {
    configs.push({
      ...baseConfig,
      files: ['**/*.svelte'],
      languageOptions: { parser: svelteParser },
    });
  }

  if (astroParser) {
    configs.push({
      ...baseConfig,
      files: ['**/*.astro'],
      languageOptions: { parser: astroParser },
    });
  }

  return configs;
}

/**
 * Internal helper used by `runLint` to derive the effective rules
 * map. Returned alongside the lint result so consumers (the trailer
 * computation, the score breakdown) can see the merged severities.
 */
function deriveEffectiveRules(configs: any[]): Record<string, any> {
  const first = configs[0];
  return (first?.rules ?? {}) as Record<string, any>;
}

export async function runLint(options: LintRunnerOptions): Promise<LintResult> {
  const cwd = options.cwd ?? (options.files.length > 0 ? dirname(options.files[0]) : process.cwd());
  const configs = await buildLintConfigs({ ruleOverrides: options.ruleOverrides });

  const eslint = new ESLint({
    overrideConfigFile: true,
    cwd,
    overrideConfig: configs,
    fix: options.fix ?? false,
  });

  const results = await eslint.lintFiles(options.files);

  const shouldWrite = options.writeFixes ?? options.fix ?? false;
  if (shouldWrite) {
    await ESLint.outputFixes(results);
  }

  const aggregated = aggregateResults(results as unknown as LintFileResult[]);
  const applicability = computeApplicability(options.files);
  return { ...aggregated, effectiveRules: deriveEffectiveRules(configs), applicability };
}

/** Cheap file-content probe: count files that contain class / style
 *  attributes. Runs AFTER the lint pass so it doesn't slow the hot
 *  path. Reads each file once with a byte cap (256 KB) — enough to
 *  reach any attribute in a realistic component file. */
export function computeApplicability(files: string[]): ApplicabilityInfo {
  const CLASS_RE = /\b(?:className|class)\s*=|\bclass(?:Names?|sx|va|x|nx)?\s*\(/;
  const STYLE_RE = /\bstyle\s*=|from\s+['"]styled-components['"]|from\s+['"]@emotion\/[\w-]+['"]/;
  const BYTE_CAP = 256 * 1024;

  let tailwindFiles = 0;
  let styleFiles = 0;
  let filesScanned = 0;

  for (const file of files) {
    try {
      const stat = statSync(file);
      if (!stat.isFile()) continue;
      filesScanned++;
      const size = Math.min(stat.size, BYTE_CAP);
      if (size === 0) continue;
      // For files larger than the cap, readFileSync still works but we
      // slice the returned string — cheaper than a fd-seek dance.
      let content = readFileSync(file, 'utf-8');
      if (content.length > BYTE_CAP) content = content.slice(0, BYTE_CAP);
      if (CLASS_RE.test(content)) tailwindFiles++;
      if (STYLE_RE.test(content)) styleFiles++;
    } catch {
      // Unreadable file — skip silently; ESLint already surfaced any
      // real failures via parseErrors.
    }
  }

  const applicable = tailwindFiles > 0 || styleFiles > 0;
  return {
    filesScanned,
    tailwindFiles,
    styleFiles,
    applicable,
    reason: applicable
      ? undefined
      : 'No class or style attributes detected — class-based rules had no applicable input.',
  };
}

/** Aggregate results into a LintResult. Exported so diff-scoping can
 *  re-run after filtering messages to changed hunks. */
export function aggregateResults(results: LintFileResult[]): LintResult {
  let totalViolations = 0;
  let errors = 0;
  let warnings = 0;
  let filesWithViolations = 0;
  let parseErrors = 0;
  const byRule: Record<string, number> = {};
  const byCategory: Record<RuleCategory, number> = {
    colors: 0,
    spacing: 0,
    typography: 0,
    responsive: 0,
    consistency: 0,
  };

  for (const result of results) {
    const deslintMessages = result.messages.filter(
      (msg) => msg.ruleId === null || msg.ruleId.startsWith('deslint/'),
    );

    if (deslintMessages.length > 0) filesWithViolations++;

    for (const msg of deslintMessages) {
      totalViolations++;
      if (msg.severity === 2) errors++;
      else warnings++;

      if (msg.ruleId === null) {
        parseErrors++;
      } else {
        const category = RULE_CATEGORY_MAP[msg.ruleId];
        if (category) byCategory[category]++;
      }

      const ruleId = msg.ruleId ?? 'unknown';
      byRule[ruleId] = (byRule[ruleId] ?? 0) + 1;
    }
  }

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
    parseErrors,
  };
}
