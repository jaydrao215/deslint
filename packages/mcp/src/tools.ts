/**
 * MCP Tool implementations for Deslint.
 *
 * These functions are pure (no MCP SDK dependency) — they accept
 * parameters, run the CLI's runLint engine, and return structured results.
 * The MCP server layer (server.ts) wires them to the transport.
 *
 * Design note: every tool delegates to `@deslint/cli`'s `runLint`, which is
 * the same engine the `deslint` CLI uses. That means the MCP server always
 * inherits — for free — the canonical rule list, every parser (TypeScript,
 * Vue, Svelte, Angular, plain HTML), the deslint/* message filter, and
 * category aggregation. No duplication = no drift between how `deslint scan`
 * and `analyze_file` behave.
 */

import { resolve, relative, dirname, basename, join } from 'node:path';
import { existsSync, readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

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

// ── Helpers ──────────────────────────────────────────────────────────

/**
 * Resolve the project directory we'll hand to ESLint. If the caller supplied
 * a projectDir and the file lives inside it, use that. Otherwise pivot to the
 * file's own directory — ESLint v10 silently drops files outside its cwd
 * ("File ignored because outside of base path"), which is exactly the kind
 * of thing an MCP-driven AI agent can't recover from.
 */
function resolveProjectDir(filePath: string, projectDir?: string): { projectDir: string; absPath: string } {
  const requestedDir = projectDir ?? process.cwd();
  const absPath = resolve(requestedDir, filePath);
  const insideRequested = absPath.startsWith(resolve(requestedDir));
  return {
    absPath,
    projectDir: insideRequested ? requestedDir : dirname(absPath),
  };
}

function toViolation(msg: any): Violation {
  const v: Violation = {
    ruleId: msg.ruleId ?? 'unknown',
    message: msg.message,
    severity: msg.severity === 2 ? 'error' : 'warning',
    line: msg.line,
    column: msg.column,
  };
  if (msg.endLine !== undefined && msg.endLine !== null) v.endLine = msg.endLine;
  if (msg.endColumn !== undefined && msg.endColumn !== null) v.endColumn = msg.endColumn;
  if (msg.fix) v.fix = { range: msg.fix.range as [number, number], text: msg.fix.text };
  return v;
}

// ── Tool: analyze_file ──────────────────────────────────────────────

export async function analyzeFile(params: {
  filePath: string;
  projectDir?: string;
}): Promise<AnalyzeFileResult> {
  const { absPath, projectDir } = resolveProjectDir(params.filePath, params.projectDir);

  if (!existsSync(absPath)) {
    throw new Error(`File not found: ${params.filePath}`);
  }

  const { runLint } = await import('@deslint/cli');
  const lintResult = await runLint({ files: [absPath], cwd: projectDir });

  const violations: Violation[] = [];
  let errors = 0;
  let warnings = 0;

  for (const result of lintResult.results) {
    for (const msg of result.messages) {
      violations.push(toViolation(msg));
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

  const { discoverFiles, runLint, calculateScore } = await import('@deslint/cli');

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

  const lintResult = await runLint({ files: filesToScan, cwd: projectDir });
  const scoreResult = calculateScore(lintResult);

  // Collect top 10 violations for the summary
  const topViolations: Violation[] = [];
  for (const result of lintResult.results) {
    for (const msg of result.messages) {
      if (topViolations.length >= 10) break;
      topViolations.push(toViolation(msg));
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

/**
 * Analyze a file and return the auto-fixed version. The original file on
 * disk is NEVER modified. We copy the file to a temp directory, run runLint
 * with `fix: true` against the copy (which writes the fixed output to the
 * copy), then read it back and compare. This preserves the pure-function
 * contract the MCP spec asks for — an AI agent can preview the fix without
 * mutating the workspace.
 */
export async function analyzeAndFix(params: {
  filePath: string;
  projectDir?: string;
}): Promise<AnalyzeAndFixResult> {
  const { absPath, projectDir } = resolveProjectDir(params.filePath, params.projectDir);

  if (!existsSync(absPath)) {
    throw new Error(`File not found: ${params.filePath}`);
  }

  const { runLint } = await import('@deslint/cli');

  const originalCode = readFileSync(absPath, 'utf-8');

  // First pass: read the real file in-place to count original violations.
  const originalLint = await runLint({ files: [absPath], cwd: projectDir });
  const originalCount = originalLint.results[0]?.messages.length ?? 0;

  // Second pass: copy to a temp dir and fix the copy so the workspace stays
  // untouched. We preserve the file's basename so the parser/path heuristics
  // (e.g. `.tsx` → TS parser) still fire.
  const scratchDir = mkdtempSync(join(tmpdir(), 'deslint-mcp-fix-'));
  const scratchPath = join(scratchDir, basename(absPath));

  let fixedCode = originalCode;
  const remaining: Violation[] = [];

  try {
    writeFileSync(scratchPath, originalCode);
    const fixedLint = await runLint({ files: [scratchPath], cwd: scratchDir, fix: true });

    // runLint → ESLint.outputFixes writes the fixed code back to scratchPath
    fixedCode = readFileSync(scratchPath, 'utf-8');

    for (const result of fixedLint.results) {
      for (const msg of result.messages) {
        remaining.push(toViolation(msg));
      }
    }
  } finally {
    rmSync(scratchDir, { recursive: true, force: true });
  }

  return {
    filePath: relative(projectDir, absPath),
    originalCode,
    fixedCode,
    fixedViolations: Math.max(0, originalCount - remaining.length),
    remainingViolations: remaining,
  };
}
