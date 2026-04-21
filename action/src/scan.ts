import { ESLint } from 'eslint';
import { glob } from 'glob';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { effortForRule, safeParseConfig } from '@deslint/shared';
import type { QualityGate } from '@deslint/shared';

export interface ViolationSummary {
  ruleId: string;
  count: number;
  severity: 'error' | 'warning';
}

export interface CategoryScore {
  name: RuleCategory;
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
  /** ESLint autofix payload when the rule provides one. Consumers
   *  (the Action's PR-review renderer) classify this for visual
   *  safety before promoting it to a one-click suggestion block. */
  fix?: { range: [number, number]; text: string };
}

export interface ApplicabilityInfo {
  filesScanned: number;
  tailwindFiles: number;
  styleFiles: number;
  applicable: boolean;
  reason?: string;
}

export interface ScanResult {
  /** `null` when the scan had no applicable input — no class or style
   *  attributes were found in any file so the class-based rules had
   *  nothing to evaluate. Consumers must render "N/A" rather than a
   *  fabricated 100. See VALIDATION-0.7.md for the bug this guards. */
  score: number | null;
  totalViolations: number;
  errors: number;
  warnings: number;
  topViolations: ViolationSummary[];
  categories: CategoryScore[];
  filesScanned: number;
  filesWithViolations: number;
  debtMinutes: number;
  /** Parser failures (ESLint messages with `ruleId: null`, severity 2).
   *  Not counted in `totalViolations` / `errors` / `warnings` / `byRule`
   *  — they don't tell us anything about design quality and leaking
   *  them into those metrics produced the "13 errors, score 99,
   *  rule=unknown" PR comment tracked in VALIDATION-0.7.md. */
  parseErrors: number;
  /** Distinct files that failed to parse. Surfaced separately from
   *  `filesWithViolations` so the banner can say "N files couldn't
   *  be analyzed" rather than conflating them with rule hits. */
  filesWithParseErrors: number;
  qualityGate?: QualityGate;
  inlineViolations: InlineViolation[];
  effectiveRules: Record<string, unknown>;
  /** User-declared overrides from .deslintrc.json (or {} when absent).
   *  Trailer hashes user-only overrides so the hash survives default
   *  drift between CLI and Action. */
  userRules: Record<string, unknown>;
  /** Populated post-scan so the PR comment can explain why a N/A
   *  score appeared rather than leaving the reviewer guessing. */
  applicability?: ApplicabilityInfo;
  /** Subset of `.deslintrc.json` forwarded to the PR-review renderer
   *  so it can verify a token-based autofix is byte-identical to the
   *  arbitrary value it replaces. */
  designSystem?: { colors?: Record<string, string> };
}

type RuleCategory =
  | 'colors'
  | 'spacing'
  | 'typography'
  | 'responsive'
  | 'consistency';

interface LintMessage {
  ruleId: string | null;
  severity: number;
  message: string;
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
  fix?: { range: [number, number]; text: string };
}

interface LintFileResult {
  filePath: string;
  messages: LintMessage[];
}

interface LintResult {
  results: LintFileResult[];
  totalFiles: number;
  totalViolations: number;
  bySeverity: { errors: number; warnings: number };
  byRule: Record<string, number>;
  byCategory: Record<RuleCategory, number>;
  filesWithViolations: number;
  /** Parser failures (null-ruleId severity-2 messages). Tracked
   *  separately so they never leak into the Design Health Score. */
  parseErrors: number;
  filesWithParseErrors: number;
  effectiveRules: Record<string, unknown>;
}

interface LoadedScanConfig {
  ignorePatterns?: string[];
  qualityGate?: QualityGate;
  userRules: Record<string, unknown>;
  /** Raw `designSystem` block from `.deslintrc.json`, forwarded to
   *  the PR-review renderer so it can prove a token-based autofix is
   *  byte-identical to the arbitrary value being replaced. */
  designSystem?: { colors?: Record<string, string> };
}

const RULE_CATEGORY_MAP: Record<string, RuleCategory> = {
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
};

const DEFAULT_RULES: Record<string, unknown> = {
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
};

const CATEGORY_NAMES: RuleCategory[] = [
  'colors',
  'spacing',
  'typography',
  'responsive',
  'consistency',
];

const DEFAULT_WEIGHTS: Record<RuleCategory, number> = {
  colors: 20,
  spacing: 20,
  typography: 20,
  responsive: 20,
  consistency: 20,
};

const DEFAULT_EXTENSIONS = ['tsx', 'jsx', 'vue', 'svelte', 'html'];
const DEFAULT_IGNORE = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/.next/**',
  '**/.nuxt/**',
  '**/coverage/**',
  '**/*.min.*',
];

export async function runScan(
  files: string[],
  workingDirectory: string,
  configPath?: string,
): Promise<ScanResult> {
  const scanConfig = loadScanConfig(workingDirectory, configPath);
  return scanFiles(files, workingDirectory, scanConfig);
}

export async function runProjectScan(
  workingDirectory: string,
  configPath?: string,
): Promise<ScanResult> {
  const scanConfig = loadScanConfig(workingDirectory, configPath);
  const cwd = path.resolve(workingDirectory);
  const files = await discoverProjectFiles(cwd, scanConfig.ignorePatterns);
  return scanFiles(files, workingDirectory, scanConfig);
}

function loadScanConfig(
  workingDirectory: string,
  configPath?: string,
): LoadedScanConfig {
  const resolvedConfigPath = configPath
    ? path.normalize(path.resolve(workingDirectory, configPath))
    : path.resolve(workingDirectory, '.deslintrc.json');
  const resolvedCwd = path.resolve(workingDirectory);

  if (
    !resolvedConfigPath.startsWith(resolvedCwd + path.sep) &&
    resolvedConfigPath !== resolvedCwd
  ) {
    return { userRules: {} };
  }

  if (!fs.existsSync(resolvedConfigPath)) {
    return { userRules: {} };
  }

  try {
    const configStat = fs.statSync(resolvedConfigPath);
    if (configStat.size > 1024 * 1024) {
      throw new Error('Config file exceeds 1MB size limit');
    }
    const raw = JSON.parse(fs.readFileSync(resolvedConfigPath, 'utf-8'));
    const parsed = safeParseConfig(raw);
    const designSystem = extractDesignSystemColors(raw);
    if (parsed.success) {
      return {
        ignorePatterns: parsed.data.ignore,
        qualityGate: parsed.data.qualityGate,
        userRules: (parsed.data.rules ?? {}) as Record<string, unknown>,
        designSystem,
      };
    }
    return {
      userRules: (raw?.rules ?? {}) as Record<string, unknown>,
      designSystem,
    };
  } catch {
    return { userRules: {} };
  }
}

/**
 * Pluck `.designSystem.colors` off an arbitrary parsed config blob.
 * Returns `undefined` when the subtree is missing or the wrong shape
 * so a malformed config can't crash fix classification.
 */
function extractDesignSystemColors(
  raw: unknown,
): { colors?: Record<string, string> } | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const ds = (raw as { designSystem?: unknown }).designSystem;
  if (!ds || typeof ds !== 'object') return undefined;
  const rawColors = (ds as { colors?: unknown }).colors;
  if (!rawColors || typeof rawColors !== 'object') return { colors: {} };
  const colors: Record<string, string> = {};
  for (const [k, v] of Object.entries(rawColors as Record<string, unknown>)) {
    if (typeof v === 'string') colors[k] = v;
  }
  return { colors };
}

async function discoverProjectFiles(
  cwd: string,
  ignorePatterns?: string[],
): Promise<string[]> {
  const extGlob = `**/*.{${DEFAULT_EXTENSIONS.join(',')}}`;
  const ignore = [...DEFAULT_IGNORE];
  if (ignorePatterns) {
    ignore.push(...ignorePatterns);
  }
  const ignorePath = path.resolve(cwd, '.deslintignore');
  if (fs.existsSync(ignorePath)) {
    const lines = fs.readFileSync(ignorePath, 'utf-8')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'));
    ignore.push(...lines);
  }
  const files = await glob(extGlob, {
    cwd,
    absolute: true,
    ignore,
  });
  return files.sort();
}

async function scanFiles(
  files: string[],
  workingDirectory: string,
  scanConfig: LoadedScanConfig,
): Promise<ScanResult> {
  const cwd = path.resolve(workingDirectory);
  const absoluteFiles = files.map((filePath) => path.resolve(cwd, filePath));
  if (absoluteFiles.length === 0) {
    return {
      score: 100,
      totalViolations: 0,
      errors: 0,
      warnings: 0,
      topViolations: [],
      categories: CATEGORY_NAMES.map((name) => ({
        name,
        score: 100,
        violations: 0,
      })),
      filesScanned: 0,
      filesWithViolations: 0,
      debtMinutes: 0,
      parseErrors: 0,
      filesWithParseErrors: 0,
      qualityGate: scanConfig.qualityGate,
      inlineViolations: [],
      effectiveRules: { ...DEFAULT_RULES, ...normalizeRuleOverrides(scanConfig.userRules) },
      userRules: scanConfig.userRules,
      designSystem: scanConfig.designSystem,
    };
  }

  const lintResult = await runLint({
    files: absoluteFiles,
    cwd,
    ruleOverrides: scanConfig.userRules,
  });

  const applicability = computeApplicability(absoluteFiles);
  const scanPart = toScanResult(lintResult, cwd);

  // Gate the score to `null` when the scan had no applicable input AND
  // found no violations. Mirrors the CLI behaviour so a CSS-in-JS
  // project can't silently score 100 off our class-based rules. A real
  // finding proves the rules had SOMETHING to look at — respect that.
  if (!applicability.applicable && lintResult.totalViolations === 0) {
    return {
      ...scanPart,
      score: null,
      qualityGate: scanConfig.qualityGate,
      effectiveRules: lintResult.effectiveRules,
      userRules: scanConfig.userRules,
      applicability,
      designSystem: scanConfig.designSystem,
    };
  }

  return {
    ...scanPart,
    qualityGate: scanConfig.qualityGate,
    effectiveRules: lintResult.effectiveRules,
    userRules: scanConfig.userRules,
    applicability,
    designSystem: scanConfig.designSystem,
  };
}

/** Cheap file-content probe: count files that contain class / style
 *  attributes. Mirrors the CLI's computeApplicability to keep bug #4
 *  behaviour consistent until bug #6 merges the two. */
export function computeApplicability(files: string[]): ApplicabilityInfo {
  const CLASS_RE = /\b(?:className|class)\s*=|\bclass(?:Names?|sx|va|x|nx)?\s*\(/;
  const STYLE_RE = /\bstyle\s*=|from\s+['"]styled-components['"]|from\s+['"]@emotion\/[\w-]+['"]/;
  const BYTE_CAP = 256 * 1024;

  let tailwindFiles = 0;
  let styleFiles = 0;
  let filesScanned = 0;

  for (const file of files) {
    try {
      const stat = fs.statSync(file);
      if (!stat.isFile()) continue;
      filesScanned++;
      const size = Math.min(stat.size, BYTE_CAP);
      if (size === 0) continue;
      let content = fs.readFileSync(file, 'utf-8');
      if (content.length > BYTE_CAP) content = content.slice(0, BYTE_CAP);
      if (CLASS_RE.test(content)) tailwindFiles++;
      if (STYLE_RE.test(content)) styleFiles++;
    } catch {
      /* unreadable — skip */
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

async function runLint(options: {
  files: string[];
  cwd: string;
  ruleOverrides: Record<string, unknown>;
}): Promise<LintResult> {
  const deslintPlugin = await import('@deslint/eslint-plugin');
  const plugin = deslintPlugin.default ?? deslintPlugin;

  const rules = {
    ...DEFAULT_RULES,
    ...normalizeRuleOverrides(options.ruleOverrides),
  };

  const typescriptParser = await importOptional('@typescript-eslint/parser');
  const angularTemplateParser = await importOptional('@angular-eslint/template-parser');
  const vueParser = await importOptional('vue-eslint-parser');
  const svelteParser = await importOptional('svelte-eslint-parser');
  const htmlParser = await importOptional('@html-eslint/parser');

  const baseConfig = {
    plugins: { deslint: plugin } as Record<string, unknown>,
    rules,
    linterOptions: { reportUnusedDisableDirectives: false },
  };

  const configs: Record<string, unknown>[] = [];

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

  const eslint = new ESLint({
    overrideConfigFile: true,
    cwd: options.cwd,
    overrideConfig: configs,
  });

  const results = await eslint.lintFiles(options.files);
  const aggregated = aggregateResults(results as unknown as LintFileResult[]);
  return { ...aggregated, effectiveRules: rules };
}

function normalizeRuleOverrides(
  ruleOverrides: Record<string, unknown>,
): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};
  for (const [rule, config] of Object.entries(ruleOverrides)) {
    const ruleId = rule.startsWith('deslint/') ? rule : `deslint/${rule}`;
    normalized[ruleId] = config;
  }
  return normalized;
}

function aggregateResults(results: LintFileResult[]): Omit<LintResult, 'effectiveRules'> {
  let totalViolations = 0;
  let errors = 0;
  let warnings = 0;
  let filesWithViolations = 0;
  let parseErrors = 0;
  let filesWithParseErrors = 0;
  const byRule: Record<string, number> = {};
  const byCategory: Record<RuleCategory, number> = {
    colors: 0,
    spacing: 0,
    typography: 0,
    responsive: 0,
    consistency: 0,
  };

  // Keep both parse errors and deslint rule messages through to
  // downstream consumers — parse errors render as a distinct banner,
  // deslint hits feed the score. Drop everything else (non-plugin
  // eslint noise) so `unknown` never shows up in Top Violations.
  const filteredResults = results.map((result) => ({
    ...result,
    messages: result.messages.filter(
      (msg) => msg.ruleId === null || msg.ruleId.startsWith('deslint/'),
    ),
  }));

  for (const result of filteredResults) {
    let fileHasRuleHit = false;
    let fileHasParseError = false;

    for (const msg of result.messages) {
      if (msg.ruleId === null) {
        // Parser failure. Segregated from the score + rule metrics so
        // it surfaces in its own banner rather than inflating `errors`
        // or producing an `unknown` Top Violations row.
        parseErrors++;
        fileHasParseError = true;
        continue;
      }

      totalViolations++;
      if (msg.severity === 2) errors++;
      else warnings++;

      byRule[msg.ruleId] = (byRule[msg.ruleId] ?? 0) + 1;
      const category = RULE_CATEGORY_MAP[msg.ruleId];
      if (category) byCategory[category]++;
      fileHasRuleHit = true;
    }

    if (fileHasRuleHit) filesWithViolations++;
    if (fileHasParseError) filesWithParseErrors++;
  }

  return {
    results: filteredResults,
    totalFiles: filteredResults.length,
    totalViolations,
    bySeverity: { errors, warnings },
    byRule,
    byCategory,
    filesWithViolations,
    parseErrors,
    filesWithParseErrors,
  };
}

function toScanResult(
  lintResult: LintResult,
  cwd: string,
): Omit<ScanResult, 'qualityGate' | 'effectiveRules' | 'userRules'> {
  const categories = calculateCategoryScores(lintResult);
  return {
    score: calculateOverallScore(categories),
    totalViolations: lintResult.totalViolations,
    errors: lintResult.bySeverity.errors,
    warnings: lintResult.bySeverity.warnings,
    topViolations: buildTopViolations(lintResult.results),
    categories,
    filesScanned: lintResult.totalFiles,
    filesWithViolations: lintResult.filesWithViolations,
    debtMinutes: computeDebtMinutes(lintResult.byRule),
    parseErrors: lintResult.parseErrors,
    filesWithParseErrors: lintResult.filesWithParseErrors,
    inlineViolations: buildInlineViolations(lintResult.results, cwd),
  };
}

function calculateCategoryScores(lintResult: LintResult): CategoryScore[] {
  const fileCount = Math.max(lintResult.totalFiles, 1);

  return CATEGORY_NAMES.map((name) => {
    const violations = lintResult.byCategory[name] ?? 0;
    const violationRate = violations / fileCount;
    return {
      name,
      violations,
      score: Math.round(Math.max(0, Math.min(100, 100 - violationRate * 50))),
    };
  }).map((category) => ({
    ...category,
    // Keep the same value shape as CLI score output: category scores are
    // absolute 0-100, not weight-scaled.
    score: category.score,
    violations: category.violations,
  }));
}

function calculateOverallScore(categories: CategoryScore[]): number {
  const totalWeight = Object.values(DEFAULT_WEIGHTS).reduce((sum, weight) => sum + weight, 0);
  const normalizedWeights: Record<RuleCategory, number> = {
    colors: (DEFAULT_WEIGHTS.colors / totalWeight) * 100,
    spacing: (DEFAULT_WEIGHTS.spacing / totalWeight) * 100,
    typography: (DEFAULT_WEIGHTS.typography / totalWeight) * 100,
    responsive: (DEFAULT_WEIGHTS.responsive / totalWeight) * 100,
    consistency: (DEFAULT_WEIGHTS.consistency / totalWeight) * 100,
  };

  let overall = 0;
  for (const category of categories) {
    overall += category.score * (normalizedWeights[category.name] / 100);
  }
  return Math.round(overall);
}

function buildTopViolations(results: LintFileResult[]): ViolationSummary[] {
  const byRule = new Map<string, { count: number; severity: number }>();
  for (const result of results) {
    for (const msg of result.messages) {
      // Parser failures (null ruleId) render in their own banner; they
      // never belong in Top Violations as `unknown`.
      if (msg.ruleId === null) continue;
      const current = byRule.get(msg.ruleId) ?? { count: 0, severity: msg.severity };
      current.count++;
      current.severity = Math.max(current.severity, msg.severity);
      byRule.set(msg.ruleId, current);
    }
  }

  return [...byRule.entries()]
    .map(([ruleId, data]) => ({
      ruleId,
      count: data.count,
      severity: data.severity === 2 ? 'error' as const : 'warning' as const,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

function computeDebtMinutes(byRule: Record<string, number>): number {
  let total = 0;
  for (const [ruleId, count] of Object.entries(byRule)) {
    total += effortForRule(ruleId) * count;
  }
  return total;
}

function buildInlineViolations(
  results: LintFileResult[],
  cwd: string,
): InlineViolation[] {
  const inlineViolations: InlineViolation[] = [];
  for (const result of results) {
    const relPath = path.relative(cwd, result.filePath);
    for (const msg of result.messages) {
      if (!isInlineRuleMessage(msg)) continue;
      inlineViolations.push({
        filePath: relPath,
        line: msg.line,
        column: msg.column,
        endLine: msg.endLine,
        endColumn: msg.endColumn,
        ruleId: msg.ruleId,
        message: msg.message,
        severity: msg.severity === 2 ? 'error' : 'warning',
        fix: msg.fix,
      });
    }
  }
  return inlineViolations;
}

function isInlineRuleMessage(msg: LintMessage): msg is LintMessage & { ruleId: string } {
  return typeof msg.ruleId === 'string' && msg.ruleId.startsWith('deslint/');
}

async function importOptional(specifier: string): Promise<unknown> {
  try {
    const dynamicImport = new Function(
      's',
      'return import(s)',
    ) as (name: string) => Promise<unknown>;
    return await dynamicImport(specifier);
  } catch {
    return undefined;
  }
}
