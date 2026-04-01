/**
 * MCP Tool implementations for Vizlint.
 *
 * These functions are pure (no MCP SDK dependency) — they accept
 * parameters, run ESLint programmatically, and return structured results.
 * The MCP server layer (server.ts) wires them to the transport.
 */

import { resolve, relative } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { ESLint } from 'eslint';

// ── Types ─────────────────────────────────────────────────────────────

export interface Violation {
  ruleId: string;
  message: string;
  severity: 'error' | 'warning';
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
  fix?: {
    range: [number, number];
    text: string;
  };
}

export interface AnalyzeFileResult {
  filePath: string;
  violations: Violation[];
  score: number;
  totalErrors: number;
  totalWarnings: number;
}

export interface AnalyzeProjectResult {
  projectDir: string;
  overallScore: number;
  grade: string;
  totalFiles: number;
  filesWithIssues: number;
  totalViolations: number;
  categories: Record<string, { score: number; violations: number }>;
  topViolations: Violation[];
}

export interface AnalyzeAndFixResult {
  filePath: string;
  originalCode: string;
  fixedCode: string;
  fixedViolations: number;
  remainingViolations: Violation[];
}

// ── ESLint config builder ────────────────────────────────────────────

let _pluginCache: any = null;

async function loadPlugin(): Promise<any> {
  if (_pluginCache) return _pluginCache;
  const mod = await import('eslint-plugin-vizlint');
  _pluginCache = mod.default ?? mod;
  return _pluginCache;
}

async function createEslintInstance(cwd: string, fix = false): Promise<ESLint> {
  const plugin = await loadPlugin();

  return new ESLint({
    cwd,
    overrideConfigFile: true,
    overrideConfig: [
      {
        files: ['**/*.{js,jsx,ts,tsx}'],
        languageOptions: {
          ecmaVersion: 'latest' as const,
          sourceType: 'module' as const,
          parserOptions: {
            ecmaFeatures: { jsx: true },
          },
        },
        plugins: {
          vizlint: plugin,
        },
        rules: {
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
        },
      },
    ] as any,
    fix,
  });
}

// ── Tool: analyze_file ──────────────────────────────────────────────

export async function analyzeFile(params: {
  filePath: string;
  projectDir?: string;
}): Promise<AnalyzeFileResult> {
  const projectDir = params.projectDir ?? process.cwd();
  const absPath = resolve(projectDir, params.filePath);

  if (!existsSync(absPath)) {
    throw new Error(`File not found: ${params.filePath}`);
  }

  const eslint = await createEslintInstance(projectDir);
  const results = await eslint.lintFiles([absPath]);

  const violations: Violation[] = [];
  let errors = 0;
  let warnings = 0;

  for (const result of results) {
    for (const msg of result.messages) {
      const v: Violation = {
        ruleId: msg.ruleId ?? 'unknown',
        message: msg.message,
        severity: msg.severity === 2 ? 'error' : 'warning',
        line: msg.line,
        column: msg.column,
        endLine: msg.endLine ?? undefined,
        endColumn: msg.endColumn ?? undefined,
      };
      if (msg.fix) {
        v.fix = { range: msg.fix.range as [number, number], text: msg.fix.text };
      }
      violations.push(v);
      if (msg.severity === 2) errors++;
      else warnings++;
    }
  }

  // Sub-score: max(0, 100 - violations * 10), capped at 0
  const score = Math.max(0, 100 - violations.length * 10);

  return {
    filePath: relative(projectDir, absPath),
    violations,
    score,
    totalErrors: errors,
    totalWarnings: warnings,
  };
}

// ── Tool: analyze_project ───────────────────────────────────────────

export async function analyzeProject(params: {
  projectDir?: string;
  maxFiles?: number;
}): Promise<AnalyzeProjectResult> {
  const projectDir = params.projectDir ?? process.cwd();
  const maxFiles = params.maxFiles ?? 200;

  // Use the CLI's discovery and scoring engine
  const { discoverFiles } = await import('@vizlint/cli');
  const { runLint, calculateScore } = await import('@vizlint/cli');

  const files = await discoverFiles({ cwd: projectDir });
  const filesToScan = files.slice(0, maxFiles);

  if (filesToScan.length === 0) {
    return {
      projectDir,
      overallScore: 100,
      grade: 'pass',
      totalFiles: 0,
      filesWithIssues: 0,
      totalViolations: 0,
      categories: {},
      topViolations: [],
    };
  }

  const lintResult = await runLint({ files: filesToScan });
  const scoreResult = calculateScore(lintResult);

  // Collect top 10 violations for the summary
  const topViolations: Violation[] = [];
  for (const result of lintResult.results) {
    for (const msg of result.messages) {
      if (topViolations.length >= 10) break;
      topViolations.push({
        ruleId: msg.ruleId ?? 'unknown',
        message: msg.message,
        severity: msg.severity === 2 ? 'error' : 'warning',
        line: msg.line,
        column: msg.column,
      });
    }
    if (topViolations.length >= 10) break;
  }

  const categories: Record<string, { score: number; violations: number }> = {};
  for (const [cat, data] of Object.entries(scoreResult.categories)) {
    categories[cat] = { score: data.score, violations: data.violations };
  }

  return {
    projectDir,
    overallScore: scoreResult.overall,
    grade: scoreResult.grade,
    totalFiles: lintResult.totalFiles,
    filesWithIssues: lintResult.filesWithViolations,
    totalViolations: lintResult.totalViolations,
    categories,
    topViolations,
  };
}

// ── Tool: analyze_and_fix ───────────────────────────────────────────

export async function analyzeAndFix(params: {
  filePath: string;
  projectDir?: string;
}): Promise<AnalyzeAndFixResult> {
  const projectDir = params.projectDir ?? process.cwd();
  const absPath = resolve(projectDir, params.filePath);

  if (!existsSync(absPath)) {
    throw new Error(`File not found: ${params.filePath}`);
  }

  const originalCode = readFileSync(absPath, 'utf-8');

  // Single lint pass without fix to count original violations
  const eslint = await createEslintInstance(projectDir, false);
  const originalResults = await eslint.lintFiles([absPath]);
  let originalViolationCount = 0;
  for (const r of originalResults) {
    originalViolationCount += r.messages.length;
  }

  // Single lint pass with fix to get corrected code
  const eslintFix = await createEslintInstance(projectDir, true);
  const fixResults = await eslintFix.lintFiles([absPath]);

  let fixedCode = originalCode;
  const remaining: Violation[] = [];

  for (const result of fixResults) {
    if (result.output !== undefined) {
      fixedCode = result.output;
    }
    for (const msg of result.messages) {
      remaining.push({
        ruleId: msg.ruleId ?? 'unknown',
        message: msg.message,
        severity: msg.severity === 2 ? 'error' : 'warning',
        line: msg.line,
        column: msg.column,
      });
    }
  }

  return {
    filePath: relative(projectDir, absPath),
    originalCode,
    fixedCode,
    fixedViolations: Math.max(0, originalViolationCount - remaining.length),
    remainingViolations: remaining,
  };
}
