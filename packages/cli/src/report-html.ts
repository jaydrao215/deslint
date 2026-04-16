/**
 * Public entry point for the scan report.
 *
 * The generator splits across `src/report-html/` modules:
 *   - `types.ts`     — shared types, rule maps, `esc()`
 *   - `colors.ts`    — Tailwind → hex palette
 *   - `patterns.ts`  — violation grouping (extractPatterns)
 *   - `previews.ts`  — per-rule visual renderers
 *   - `grading.ts`   — scoring, quality gate, grade ring, trend chart
 *   - `styles.ts`    — the inlined CSS
 *   - `template.ts`  — the top-level HTML document (buildHtml)
 *   - `font.ts`      — base64-embedded Satoshi Bold
 *
 * This file only handles I/O: raw lint results → `ReportData` → on-disk file.
 */

import { relative, resolve } from 'node:path';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import type { LintResult } from './lint-runner.js';
import type { ScoreResult, HistoryEntry } from './score.js';
import { calculateDebt } from './debt.js';
import {
  RULE_CATEGORIES,
  type ViolationEntry,
  type RuleSummary,
} from './report-html/types.js';
import { buildHtml } from './report-html/template.js';

const _require = createRequire(import.meta.url);
const _pkg = _require('../package.json') as { version: string };

export function generateHtmlReport(
  lintResult: LintResult,
  scoreResult: ScoreResult,
  cwd: string,
): string {
  const reportDir = resolve(cwd, '.deslint');
  const reportPath = resolve(reportDir, 'report.html');

  if (!existsSync(reportDir)) {
    mkdirSync(reportDir, { recursive: true });
  }

  // A rule is "fixable" if ESLint attached a `fix` to any of its messages
  // during the scan — this avoids keeping a hardcoded list in sync with the
  // plugin's `meta.fixable` declarations.
  const fixableRules = new Set<string>();
  const violations: ViolationEntry[] = [];
  for (const result of lintResult.results) {
    for (const msg of result.messages) {
      if (!msg.ruleId || !msg.ruleId.startsWith('deslint/')) continue;
      if (msg.fix) fixableRules.add(msg.ruleId);
      violations.push({
        file: relative(cwd, result.filePath),
        line: msg.line,
        column: msg.column,
        severity: msg.severity === 2 ? 'error' : 'warning',
        ruleId: msg.ruleId,
        message: msg.message,
      });
    }
  }

  const ruleMap = new Map<string, RuleSummary>();
  for (const v of violations) {
    if (!ruleMap.has(v.ruleId)) {
      ruleMap.set(v.ruleId, {
        ruleId: v.ruleId,
        shortName: v.ruleId.replace('deslint/', ''),
        count: 0,
        category: RULE_CATEGORIES[v.ruleId] ?? 'Other',
        fixable: fixableRules.has(v.ruleId),
        files: new Set(),
      });
    }
    const r = ruleMap.get(v.ruleId)!;
    r.count++;
    r.files.add(v.file);
  }
  const ruleSummaries = [...ruleMap.values()].sort((a, b) => b.count - a.count);

  const fileMap = new Map<string, number>();
  for (const v of violations) {
    fileMap.set(v.file, (fileMap.get(v.file) ?? 0) + 1);
  }
  const fileHotspots = [...fileMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

  const colorViolations = violations.filter(v => v.ruleId === 'deslint/no-arbitrary-colors');
  const colorMap = new Map<string, { hex: string; suggestion: string; count: number }>();
  for (const v of colorViolations) {
    const hexMatch = v.message.match(/`(?:bg|text|border|ring|shadow|fill|stroke|accent|caret|outline|decoration|placeholder|divide)-\[([^\]]+)\]`/);
    const sugMatch = v.message.match(/Suggested: `([^`]+)`/);
    if (hexMatch) {
      const hex = hexMatch[1];
      if (!colorMap.has(hex)) {
        colorMap.set(hex, { hex, suggestion: sugMatch?.[1] ?? '', count: 0 });
      }
      colorMap.get(hex)!.count++;
    }
  }
  const arbitraryColors = [...colorMap.values()].sort((a, b) => b.count - a.count);

  const contrastViolations = violations
    .filter(v => v.ruleId === 'deslint/a11y-color-contrast')
    .slice(0, 10);

  let history: HistoryEntry[] = [];
  const historyPath = resolve(cwd, '.deslint', 'history.json');
  if (existsSync(historyPath)) {
    try {
      history = JSON.parse(readFileSync(historyPath, 'utf-8'));
    } catch { /* history file is a cache; a corrupt read should not fail the scan */ }
  }

  const debt = calculateDebt(lintResult);

  const html = buildHtml({
    version: _pkg.version,
    timestamp: new Date().toISOString(),
    projectName: cwd.split('/').pop() ?? 'Project',
    score: scoreResult,
    debt,
    summary: {
      totalFiles: lintResult.totalFiles,
      filesWithViolations: lintResult.filesWithViolations,
      totalViolations: violations.length,
      errors: lintResult.bySeverity.errors,
      warnings: lintResult.bySeverity.warnings,
    },
    ruleSummaries,
    fileHotspots,
    violations: violations.slice(0, 500),
    arbitraryColors,
    contrastViolations,
    history: history.slice(-20),
  });

  writeFileSync(reportPath, html);
  return reportPath;
}
