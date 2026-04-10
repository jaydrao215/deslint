/**
 * Run deslint scan on the given files and compute the Design Health Score.
 */

import { ESLint } from 'eslint';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { effortForRule, safeParseConfig } from '@deslint/shared';
import type { QualityGate } from '@deslint/shared';

export interface ViolationSummary {
  ruleId: string;
  count: number;
  severity: 'error' | 'warning';
}

export interface CategoryScore {
  name: string;
  violations: number;
  score: number;
}

export interface InlineViolation {
  filePath: string;
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
  ruleId: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ScanResult {
  /** Overall Design Health Score (0–100) */
  score: number;
  /** Total violations found */
  totalViolations: number;
  /** Violations by severity */
  errors: number;
  warnings: number;
  /** Top violations grouped by rule */
  topViolations: ViolationSummary[];
  /** Score breakdown by category */
  categories: CategoryScore[];
  /** Number of files scanned */
  filesScanned: number;
  /** Number of files with violations */
  filesWithViolations: number;
  /** Estimated remediation effort, in minutes (Design Debt). */
  debtMinutes: number;
  /** Quality gate config loaded from .deslintrc.json (undefined if not configured). */
  qualityGate?: QualityGate;
  /** Per-file, per-line violations for inline review comments. */
  inlineViolations: InlineViolation[];
}

/** Map rule IDs → score category */
const RULE_CATEGORY_MAP: Record<string, string> = {
  'deslint/no-arbitrary-colors': 'colors',
  'deslint/a11y-color-contrast': 'colors',
  'deslint/dark-mode-coverage': 'colors',
  'deslint/consistent-color-palette': 'colors',
  'deslint/no-arbitrary-spacing': 'spacing',
  'deslint/consistent-component-spacing': 'spacing',
  'deslint/no-magic-numbers-layout': 'spacing',
  'deslint/no-arbitrary-typography': 'typography',
  'deslint/heading-hierarchy': 'typography',
  'deslint/responsive-required': 'responsive',
  'deslint/image-alt-text': 'responsive',
  'deslint/touch-target-size': 'responsive',
  'deslint/no-arbitrary-zindex': 'consistency',
  'deslint/no-inline-styles': 'consistency',
  'deslint/consistent-border-radius': 'consistency',
  'deslint/max-component-lines': 'consistency',
  'deslint/missing-states': 'consistency',
  'deslint/no-conflicting-classes': 'consistency',
  'deslint/no-duplicate-class-strings': 'consistency',
  'deslint/max-tailwind-classes': 'consistency',
  'deslint/prefer-semantic-html': 'responsive',
  'deslint/lang-attribute': 'responsive',
  'deslint/viewport-meta': 'responsive',
  'deslint/link-text': 'responsive',
  'deslint/form-labels': 'responsive',
  'deslint/aria-validation': 'responsive',
  'deslint/focus-visible-style': 'responsive',
  'deslint/autocomplete-attribute': 'responsive',
  'deslint/prefers-reduced-motion': 'responsive',
  'deslint/icon-accessibility': 'consistency',
  'deslint/focus-trap-patterns': 'consistency',
  'deslint/responsive-image-optimization': 'responsive',
  'deslint/spacing-rhythm-consistency': 'spacing',
};

const CATEGORY_NAMES = ['colors', 'spacing', 'typography', 'responsive', 'consistency'];
const CATEGORY_WEIGHT = 100 / CATEGORY_NAMES.length; // 20% each

/**
 * Run ESLint with deslint plugin on the specified files.
 */
export async function runScan(
  files: string[],
  workingDirectory: string,
  configPath?: string,
): Promise<ScanResult> {
  // Load deslint plugin
  const deslintPlugin = await import('@deslint/eslint-plugin');
  const plugin = deslintPlugin.default ?? deslintPlugin;

  // Load user config overrides
  let ruleOverrides: Record<string, unknown> = {};
  let qualityGate: QualityGate | undefined;
  // Resolve config: explicit configPath, otherwise try ./.deslintrc.json
  // Security: normalize to prevent path traversal via configPath input
  const resolvedConfigPath = configPath
    ? path.normalize(path.resolve(workingDirectory, configPath))
    : path.resolve(workingDirectory, '.deslintrc.json');
  const resolvedCwd = path.resolve(workingDirectory);
  if (
    !resolvedConfigPath.startsWith(resolvedCwd + path.sep) &&
    resolvedConfigPath !== resolvedCwd
  ) {
    // Config path escapes the working directory — ignore it silently
  } else if (fs.existsSync(resolvedConfigPath)) {
    try {
      // Security: limit config file size to 1 MB to prevent memory exhaustion
      const configStat = fs.statSync(resolvedConfigPath);
      if (configStat.size > 1024 * 1024) {
        throw new Error('Config file exceeds 1MB size limit');
      }
      const raw = JSON.parse(fs.readFileSync(resolvedConfigPath, 'utf-8'));
      const parsed = safeParseConfig(raw);
      if (parsed.success) {
        ruleOverrides = (parsed.data.rules ?? {}) as Record<string, unknown>;
        qualityGate = parsed.data.qualityGate;
      } else {
        // Fall back to permissive parse so an unrecognized field doesn't
        // break legacy users' configs.
        ruleOverrides = (raw.rules ?? {}) as Record<string, unknown>;
      }
    } catch {
      /* ignore — leave defaults */
    }
  }

  // Build rule config — all rules on by default
  const rules: Record<string, any> = {
    'deslint/no-arbitrary-colors': 'warn',
    'deslint/no-arbitrary-spacing': 'warn',
    'deslint/no-arbitrary-typography': 'warn',
    'deslint/responsive-required': 'warn',
    'deslint/consistent-component-spacing': 'warn',
    'deslint/a11y-color-contrast': 'warn',
    'deslint/max-component-lines': 'warn',
    'deslint/missing-states': 'warn',
    'deslint/dark-mode-coverage': 'warn',
    'deslint/no-arbitrary-zindex': 'warn',
    'deslint/no-inline-styles': 'warn',
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
    'deslint/no-conflicting-classes': 'warn',
    'deslint/no-duplicate-class-strings': 'off',
    'deslint/prefer-semantic-html': 'warn',
    'deslint/consistent-color-palette': 'off',
    'deslint/max-tailwind-classes': 'off',
  };

  // Apply overrides
  for (const [rule, config] of Object.entries(ruleOverrides)) {
    const ruleId = rule.startsWith('deslint/') ? rule : `deslint/${rule}`;
    rules[ruleId] = config;
  }

  const cwd = path.resolve(workingDirectory);
  const eslint = new ESLint({
    overrideConfigFile: true,
    cwd,
    overrideConfig: {
      files: ['**/*.tsx', '**/*.jsx', '**/*.vue', '**/*.svelte', '**/*.html', '**/*.js', '**/*.ts'],
      plugins: { deslint: plugin } as any,
      rules,
      languageOptions: {
        parserOptions: {
          ecmaFeatures: { jsx: true },
        },
      },
    },
  });

  const absoluteFiles = files.map((f) => path.resolve(cwd, f));
  const results = await eslint.lintFiles(absoluteFiles);

  const aggregated = aggregateResults(results, cwd);
  return { ...aggregated, qualityGate };
}

function aggregateResults(results: ESLint.LintResult[], cwd: string): ScanResult {
  let totalViolations = 0;
  let errors = 0;
  let warnings = 0;
  let filesWithViolations = 0;
  let debtMinutes = 0;
  const inlineViolations: InlineViolation[] = [];

  const byRule = new Map<string, { count: number; severity: number }>();
  const byCategory = new Map<string, number>();

  for (const cat of CATEGORY_NAMES) {
    byCategory.set(cat, 0);
  }

  for (const result of results) {
    if (result.messages.length > 0) filesWithViolations++;

    // Compute relative path for inline review comments
    const relPath = path.relative(cwd, result.filePath);

    for (const msg of result.messages) {
      totalViolations++;
      if (msg.severity === 2) errors++;
      else warnings++;

      const ruleId = msg.ruleId ?? 'unknown';
      const existing = byRule.get(ruleId) ?? { count: 0, severity: msg.severity };
      existing.count++;
      byRule.set(ruleId, existing);

      if (ruleId.startsWith('deslint/')) {
        debtMinutes += effortForRule(ruleId);

        inlineViolations.push({
          filePath: relPath,
          line: msg.line,
          column: msg.column,
          endLine: msg.endLine,
          endColumn: msg.endColumn,
          ruleId,
          message: msg.message,
          severity: msg.severity === 2 ? 'error' : 'warning',
        });
      }

      const category = RULE_CATEGORY_MAP[ruleId];
      if (category) {
        byCategory.set(category, (byCategory.get(category) ?? 0) + 1);
      }
    }
  }

  // Compute score: each category starts at 20, loses points per violation
  // Each violation costs 2 points within its category, minimum 0 per category
  const categories: CategoryScore[] = CATEGORY_NAMES.map((name) => {
    const violations = byCategory.get(name) ?? 0;
    const categoryScore = Math.max(0, CATEGORY_WEIGHT - violations * 2);
    return { name, violations, score: categoryScore };
  });

  const score = Math.round(categories.reduce((sum, c) => sum + c.score, 0));

  // Top violations sorted by count
  const topViolations: ViolationSummary[] = [...byRule.entries()]
    .map(([ruleId, data]) => ({
      ruleId,
      count: data.count,
      severity: data.severity === 2 ? 'error' as const : 'warning' as const,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    score,
    totalViolations,
    errors,
    warnings,
    topViolations,
    categories,
    filesScanned: results.length,
    filesWithViolations,
    debtMinutes,
    inlineViolations,
  };
}
