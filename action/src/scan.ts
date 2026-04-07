/**
 * Run vizlint scan on the given files and compute the Design Health Score.
 */

import { ESLint } from 'eslint';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { effortForRule, safeParseConfig } from '@vizlint/shared';
import type { QualityGate } from '@vizlint/shared';

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
  /** Quality gate config loaded from .vizlintrc.json (undefined if not configured). */
  qualityGate?: QualityGate;
}

/** Map rule IDs → score category */
const RULE_CATEGORY_MAP: Record<string, string> = {
  'vizlint/no-arbitrary-colors': 'colors',
  'vizlint/a11y-color-contrast': 'colors',
  'vizlint/dark-mode-coverage': 'colors',
  'vizlint/no-arbitrary-spacing': 'spacing',
  'vizlint/consistent-component-spacing': 'spacing',
  'vizlint/no-magic-numbers-layout': 'spacing',
  'vizlint/no-arbitrary-typography': 'typography',
  'vizlint/responsive-required': 'responsive',
  'vizlint/image-alt-text': 'responsive',
  'vizlint/no-arbitrary-zindex': 'consistency',
  'vizlint/no-inline-styles': 'consistency',
  'vizlint/consistent-border-radius': 'consistency',
  'vizlint/max-component-lines': 'consistency',
  'vizlint/missing-states': 'consistency',
};

const CATEGORY_NAMES = ['colors', 'spacing', 'typography', 'responsive', 'consistency'];
const CATEGORY_WEIGHT = 100 / CATEGORY_NAMES.length; // 20% each

/**
 * Run ESLint with vizlint plugin on the specified files.
 */
export async function runScan(
  files: string[],
  workingDirectory: string,
  configPath?: string,
): Promise<ScanResult> {
  // Load vizlint plugin
  const vizlintPlugin = await import('@vizlint/eslint-plugin');
  const plugin = vizlintPlugin.default ?? vizlintPlugin;

  // Load user config overrides
  let ruleOverrides: Record<string, unknown> = {};
  let qualityGate: QualityGate | undefined;
  // Resolve config: explicit configPath, otherwise try ./.vizlintrc.json
  const resolvedConfigPath = configPath
    ? path.resolve(workingDirectory, configPath)
    : path.resolve(workingDirectory, '.vizlintrc.json');
  if (fs.existsSync(resolvedConfigPath)) {
    try {
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
    'vizlint/no-arbitrary-colors': 'warn',
    'vizlint/no-arbitrary-spacing': 'warn',
    'vizlint/no-arbitrary-typography': 'warn',
    'vizlint/responsive-required': 'warn',
    'vizlint/consistent-component-spacing': 'warn',
    'vizlint/a11y-color-contrast': 'warn',
    'vizlint/max-component-lines': 'warn',
    'vizlint/missing-states': 'warn',
    'vizlint/dark-mode-coverage': 'warn',
    'vizlint/no-arbitrary-zindex': 'warn',
    'vizlint/no-inline-styles': 'warn',
    'vizlint/consistent-border-radius': 'warn',
    'vizlint/image-alt-text': 'warn',
    'vizlint/no-magic-numbers-layout': 'warn',
  };

  // Apply overrides
  for (const [rule, config] of Object.entries(ruleOverrides)) {
    const ruleId = rule.startsWith('vizlint/') ? rule : `vizlint/${rule}`;
    rules[ruleId] = config;
  }

  const cwd = path.resolve(workingDirectory);
  const eslint = new ESLint({
    overrideConfigFile: true,
    cwd,
    overrideConfig: {
      files: ['**/*.tsx', '**/*.jsx', '**/*.vue', '**/*.svelte', '**/*.html', '**/*.js', '**/*.ts'],
      plugins: { vizlint: plugin } as any,
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

  const aggregated = aggregateResults(results);
  return { ...aggregated, qualityGate };
}

function aggregateResults(results: ESLint.LintResult[]): ScanResult {
  let totalViolations = 0;
  let errors = 0;
  let warnings = 0;
  let filesWithViolations = 0;
  let debtMinutes = 0;

  const byRule = new Map<string, { count: number; severity: number }>();
  const byCategory = new Map<string, number>();

  for (const cat of CATEGORY_NAMES) {
    byCategory.set(cat, 0);
  }

  for (const result of results) {
    if (result.messages.length > 0) filesWithViolations++;

    for (const msg of result.messages) {
      totalViolations++;
      if (msg.severity === 2) errors++;
      else warnings++;

      const ruleId = msg.ruleId ?? 'unknown';
      const existing = byRule.get(ruleId) ?? { count: 0, severity: msg.severity };
      existing.count++;
      byRule.set(ruleId, existing);

      if (ruleId.startsWith('vizlint/')) {
        debtMinutes += effortForRule(ruleId);
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
  };
}
