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
 *
 * v0.3.0 additions: compliance_check, get_rule_details, suggest_fix_strategy
 */
import { resolve, relative, dirname, basename, join, normalize, isAbsolute, sep } from 'node:path';
import { existsSync, readFileSync, writeFileSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
// ── Security constants ────────────────────────────────────────────────
/** Maximum file size (10 MB) to prevent memory exhaustion via oversized files. */
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
/** Maximum files to scan per request to prevent resource exhaustion. */
const MAX_FILES_LIMIT = 5000;
/** Maximum suggestions to return per request. */
const MAX_SUGGESTIONS_LIMIT = 100;
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
export interface ComplianceCheckResult {
  projectDir: string;
  /** WCAG 2.2 conformance level reached ('A', 'AA', 'AAA', or 'none'). */
  levelReached: string;
  /** WCAG 2.1 AA conformance level (ADA Title II legal floor). */
  wcag21LevelReached: string;
  /** Percentage of mapped criteria evaluated. */
  coveragePercent: number;
  /** Percentage of evaluated criteria that pass. */
  passRatePercent: number;
  totalViolations: number;
  summary: { evaluated: number; passed: number; failed: number; notEvaluated: number };
  criteria: Array<{
    id: string;
    title: string;
    level: string;
    status: 'pass' | 'fail' | 'not-evaluated';
    violations: number;
    description: string;
  }>;
}
export interface RuleDetails {
  ruleId: string;
  description: string;
  category: string;
  /** Whether the rule supports auto-fix. */
  autoFixable: boolean;
  /** Estimated remediation effort per violation, in minutes. */
  effortMinutes: number;
  /** WCAG criteria this rule maps to, if any. */
  wcagCriteria: Array<{ id: string; title: string; level: string }>;
  /** Default severity in recommended config. */
  defaultSeverity: string;
  /** URL for full rule documentation. */
  docsUrl: string;
}
export interface FixSuggestion {
  ruleId: string;
  /** Number of violations for this rule. */
  count: number;
  /** Whether auto-fix can resolve these violations. */
  autoFixable: boolean;
  /** Estimated total effort in minutes. */
  totalEffortMinutes: number;
  /** Impact score (higher = more score improvement per minute of effort). */
  impactScore: number;
  /** Short recommendation on priority. */
  recommendation: string;
}
export interface SuggestFixStrategyResult {
  projectDir: string;
  overallScore: number;
  totalViolations: number;
  /** Fix suggestions ordered by impact score (highest first). */
  suggestions: FixSuggestion[];
  /** Estimated total effort to fix everything, in minutes. */
  totalEffortMinutes: number;
}
// ── Helpers ──────────────────────────────────────────────────────────
/**
 * Resolve the project directory we'll hand to ESLint. If the caller supplied
 * a projectDir and the file lives inside it, use that. Otherwise pivot to the
 * file's own directory — ESLint v10 silently drops files outside its cwd
 * ("File ignored because outside of base path"), which is exactly the kind
 * of thing an MCP-driven AI agent can't recover from.
 *
 * Security: normalizes paths and validates the resolved file lives inside
 * the project directory to prevent path-traversal attacks via filePath
 * containing `../` sequences.
 */
function resolveProjectDir(filePath: string, projectDir?: string): { projectDir: string; absPath: string } {
  const requestedDir = resolve(projectDir ?? process.cwd());
  // Normalize to collapse any ../ sequences before comparison
  const absPath = normalize(resolve(requestedDir, filePath));
  // Use `path.relative` for a cross-platform containment check. A resolved
  // path is inside the requested dir iff its relative path is empty, doesn't
  // start with `..`, and is not itself absolute (Windows drive-letter escape).
  // The old `absPath.startsWith(requestedDir + '/')` check was Linux-only.
  const rel = relative(requestedDir, absPath);
  const insideRequested = rel === '' || (!rel.startsWith('..' + sep) && rel !== '..' && !isAbsolute(rel));
  return {
    absPath,
    projectDir: insideRequested ? requestedDir : dirname(absPath),
  };
}
/**
 * Validate that a file exists and is within safe size limits.
 * Prevents memory exhaustion from oversized files.
 */
function validateFile(absPath: string, displayPath: string): void {
  if (!existsSync(absPath)) {
    throw new Error(`File not found: ${displayPath}`);
  }
  const stat = statSync(absPath);
  if (!stat.isFile()) {
    throw new Error(`Not a file: ${displayPath}`);
  }
  if (stat.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(
      `File too large: ${displayPath} (${Math.round(stat.size / 1024 / 1024)}MB). Maximum: ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB.`,
    );
  }
}
/**
 * Clamp numeric parameters to safe ranges.
 */
function clampMaxFiles(maxFiles?: number): number {
  const val = maxFiles ?? 200;
  return Math.max(1, Math.min(val, MAX_FILES_LIMIT));
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
  validateFile(absPath, params.filePath);
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
  const projectDir = resolve(params.projectDir ?? process.cwd());
  const maxFiles = clampMaxFiles(params.maxFiles);
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
  validateFile(absPath, params.filePath);
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
// ── Tool: compliance_check ─────────────────────────────────────────
/**
 * Run WCAG 2.2 compliance evaluation on a project. Returns per-criterion
 * pass/fail status, conformance level reached, and the WCAG 2.1 AA
 * equivalence (ADA Title II legal floor).
 */
export async function complianceCheck(params: {
  projectDir?: string;
  maxFiles?: number;
}): Promise<ComplianceCheckResult> {
  const projectDir = resolve(params.projectDir ?? process.cwd());
  const maxFiles = clampMaxFiles(params.maxFiles);
  const { discoverFiles, runLint } = await import('@deslint/cli');
  const { evaluateCompliance, WCAG_CRITERIA } = await import('@deslint/shared');
  const files = await discoverFiles({ cwd: projectDir });
  const filesToScan = files.slice(0, maxFiles);
  if (filesToScan.length === 0) {
    return {
      projectDir,
      levelReached: 'none',
      wcag21LevelReached: 'none',
      coveragePercent: 0,
      passRatePercent: 100,
      totalViolations: 0,
      summary: { evaluated: 0, passed: 0, failed: 0, notEvaluated: WCAG_CRITERIA.length },
      criteria: WCAG_CRITERIA.map((c) => ({
        id: c.id,
        title: c.title,
        level: c.level,
        status: 'not-evaluated' as const,
        violations: 0,
        description: c.description,
      })),
    };
  }
  const lintResult = await runLint({ files: filesToScan, cwd: projectDir });
  // Build per-rule file count for the compliance evaluator
  const filesByRule: Record<string, number> = {};
  for (const result of lintResult.results) {
    const seenRules = new Set<string>();
    for (const msg of result.messages) {
      if (msg.ruleId && !seenRules.has(msg.ruleId)) {
        filesByRule[msg.ruleId] = (filesByRule[msg.ruleId] ?? 0) + 1;
        seenRules.add(msg.ruleId);
      }
    }
  }
  const compliance = evaluateCompliance({
    byRule: lintResult.byRule,
    filesByRule,
  });
  return {
    projectDir,
    levelReached: compliance.levelReached,
    wcag21LevelReached: compliance.wcag21.levelReached,
    coveragePercent: compliance.coveragePercent,
    passRatePercent: compliance.passRatePercent,
    totalViolations: compliance.totalViolations,
    summary: compliance.summary,
    criteria: compliance.criteria.map((c) => ({
      id: c.criterion.id,
      title: c.criterion.title,
      level: c.criterion.level,
      status: c.status,
      violations: c.violations,
      description: c.criterion.description,
    })),
  };
}
// ── Tool: enforce_budget ───────────────────────────────────────────
/**
 * Shape of a single budget breach returned by `enforce_budget`.
 * Mirrors @deslint/shared's `BudgetBreach` but with a serializable,
 * MCP-friendly interface (no enum unions with shared).
 */
export interface EnforceBudgetBreach {
  condition: string;
  message: string;
  threshold: number;
  actual: number;
  /** Category, if the breach is category-scoped. */
  category?: string;
  /** Rule id (canonical `deslint/<rule>`), if rule-scoped. */
  ruleId?: string;
}
/**
 * Minimal suggested-edit shape. Populated with the cheapest manual fixes
 * the agent could apply to bring the scan under budget; today we surface
 * the top N auto-fixable rules driving the breach, each annotated with
 * the command to run. This is advisory — the Action is the judge.
 */
export interface EnforceBudgetEdit {
  /** The rule driving the suggestion. */
  ruleId: string;
  /** Human-readable message describing what to do. */
  message: string;
  /** Whether the suggestion is auto-fixable. */
  autoFixable: boolean;
  /** Shell command the agent can run (informational only). */
  command?: string;
}
export interface EnforceBudgetResult {
  /** True when every configured cap is satisfied. If no budget is
   *  configured and no `budgetPath` was given, returns true: "there is
   *  nothing to enforce." */
  allowed: boolean;
  /** True when the budget file exists AND has `enforce: true`. The Action
   *  uses this to decide whether to fail CI; agents should treat any
   *  `allowed: false` as a veto regardless of `enforced`. */
  enforced: boolean;
  /** All breaches. Empty when `allowed` is true. */
  reasons: EnforceBudgetBreach[];
  /** Advisory edits the agent can apply to get under budget. */
  suggestedEdits: EnforceBudgetEdit[];
  /** Scan snapshot used to evaluate the budget. */
  score: {
    overall: number;
    grade: string;
    categories: Record<string, { score: number; violations: number }>;
    totalViolations: number;
    debtMinutes: number;
  };
  /** Absolute path of the budget file used, if any. Undefined when
   *  no budget was found. */
  budgetPath?: string;
  /** Number of files actually scanned (after any `files` narrowing). */
  filesScanned: number;
  /** Ready-to-paste commit-trailer line. Agents SHOULD include this in
   *  the commit message of the PR to prove compliance; the Action
   *  re-computes and verifies it. Format:
   *  `Deslint-Compliance: <sha16>.<score>.<fileCount>`. */
  trailer: string;
}
/**
 * `enforce_budget` — evaluate a scan against `.deslint/budget.yml` (or an
 * explicit path) and return a strict allowed/rejected decision.
 *
 * Design intent (from v0.6 plan): this is the agent-loop veto. An agent
 * SHOULD call `enforce_budget` before declaring a task complete. A
 * rejection returns `{allowed: false}` + suggested edits; the agent
 * self-corrects and re-calls. The GitHub Action runs the same evaluation
 * on the merge commit — it is the backstop, so agents cannot spoof
 * approval.
 *
 * Pure function: no I/O side-effects beyond reading the requested files
 * and the budget file. Idempotent: calling it twice on the same inputs
 * returns byte-identical output.
 */
export async function enforceBudget(params: {
  projectDir?: string;
  /** Optional narrowing — limit the scan to this file set (absolute or
   *  relative to `projectDir`). When omitted, scans the whole project
   *  via the normal file-discovery pipeline. */
  files?: string[];
  /** Optional explicit path to the budget file. When omitted, the loader
   *  probes `.deslint/budget.yml` → `.yaml` → `.json`. */
  budgetPath?: string;
  /** Resource cap, mirrors `analyze_project`. */
  maxFiles?: number;
}): Promise<EnforceBudgetResult> {
  const projectDir = resolve(params.projectDir ?? process.cwd());
  const maxFiles = clampMaxFiles(params.maxFiles);
  const { discoverFiles, runLint, calculateScore } = await import('@deslint/cli');
  const {
    loadBudget,
    evaluateBudget,
    effortForRule,
    formatTrailerLine,
    safeParseConfig,
  } = await import('@deslint/shared');
  // Read user-declared rule overrides from `.deslintrc.json`, if present.
  // Used both for applying overrides to the scan AND for computing the
  // trailer's ruleset hash (which the Action re-computes identically).
  let userRules: Record<string, unknown> = {};
  const rcPath = join(projectDir, '.deslintrc.json');
  if (existsSync(rcPath)) {
    try {
      const raw = JSON.parse(readFileSync(rcPath, 'utf-8'));
      const parsed = safeParseConfig(raw);
      if (parsed.success) {
        userRules = (parsed.data.rules ?? {}) as Record<string, unknown>;
      } else {
        userRules = (raw?.rules ?? {}) as Record<string, unknown>;
      }
    } catch {
      /* leave userRules empty */
    }
  }
  // Load budget up front — if it's configured-but-malformed, we want to
  // fail loudly rather than silently pretend there's no cap.
  const loaded = await loadBudget({ explicitPath: params.budgetPath, cwd: projectDir });
  // Resolve the candidate file list. An explicit `files` list lets an
  // agent restrict evaluation to just-edited files; otherwise we scan
  // everything (bounded by `maxFiles`).
  let candidates: string[];
  if (params.files && params.files.length > 0) {
    candidates = params.files.map((f) => (isAbsolute(f) ? f : resolve(projectDir, f)));
    // Path-traversal guard: any file outside projectDir is refused.
    for (const abs of candidates) {
      const rel = relative(projectDir, abs);
      if (rel.startsWith('..' + sep) || rel === '..' || isAbsolute(rel)) {
        throw new Error(`File outside project directory: ${abs}`);
      }
      validateFile(abs, abs);
    }
  } else {
    const discovered = await discoverFiles({ cwd: projectDir });
    candidates = discovered.slice(0, maxFiles);
  }
  // Zero-file scan: trivially passes, since there's nothing to violate.
  if (candidates.length === 0) {
    return {
      allowed: true,
      enforced: loaded?.budget.enforce === true,
      reasons: [],
      suggestedEdits: [],
      score: {
        overall: 100,
        grade: 'pass',
        categories: {},
        totalViolations: 0,
        debtMinutes: 0,
      },
      budgetPath: loaded?.path,
      filesScanned: 0,
      trailer: formatTrailerLine({ rules: userRules, score: 100, fileCount: 0 }),
    };
  }
  const lintResult = await runLint({
    files: candidates,
    cwd: projectDir,
    ruleOverrides: userRules,
  });
  const scoreResult = calculateScore(lintResult);
  // Debt minutes: effort × count per rule.
  let debtMinutes = 0;
  for (const [ruleId, count] of Object.entries(lintResult.byRule)) {
    debtMinutes += effortForRule(ruleId) * count;
  }
  const snapshot = {
    overall: scoreResult.overall,
    categories: {
      colors: scoreResult.categories.colors.score,
      spacing: scoreResult.categories.spacing.score,
      typography: scoreResult.categories.typography.score,
      responsive: scoreResult.categories.responsive.score,
      consistency: scoreResult.categories.consistency.score,
    },
    totalViolations: lintResult.totalViolations,
    debtMinutes,
    byRule: lintResult.byRule,
  };
  const budgetResult = evaluateBudget(loaded?.budget, snapshot);
  // Build suggested edits: for each breach that names a rule or hits a
  // category, surface the top drivers (autoFixable first) so the agent
  // knows what to fix. This is deliberately small (≤10) to keep the
  // response bounded.
  const suggestedEdits: EnforceBudgetEdit[] = [];
  const seenRules = new Set<string>();
  // Breach-driven suggestions first.
  for (const breach of budgetResult.breaches) {
    if (breach.ruleId && !seenRules.has(breach.ruleId)) {
      seenRules.add(breach.ruleId);
      const meta = RULE_METADATA[breach.ruleId];
      suggestedEdits.push({
        ruleId: breach.ruleId,
        message: `${breach.message} ${meta?.autoFixable ? 'Auto-fixable — run `deslint fix`.' : 'Manual fix needed.'}`,
        autoFixable: meta?.autoFixable ?? false,
        command: meta?.autoFixable ? 'deslint fix' : undefined,
      });
    }
  }
  // Fill the remainder with top-driver rules in the current scan.
  const sortedRules = Object.entries(lintResult.byRule).sort((a, b) => b[1] - a[1]);
  for (const [ruleId, count] of sortedRules) {
    if (suggestedEdits.length >= 10) break;
    if (seenRules.has(ruleId)) continue;
    const meta = RULE_METADATA[ruleId];
    suggestedEdits.push({
      ruleId,
      message: `${count} violation${count === 1 ? '' : 's'} of ${ruleId}. ${meta?.autoFixable ? 'Auto-fixable.' : 'Manual fix needed.'}`,
      autoFixable: meta?.autoFixable ?? false,
      command: meta?.autoFixable ? 'deslint fix' : undefined,
    });
    seenRules.add(ruleId);
  }
  const categories: Record<string, { score: number; violations: number }> = {};
  for (const [cat, data] of Object.entries(scoreResult.categories)) {
    categories[cat] = { score: data.score, violations: data.violations };
  }
  const trailer = formatTrailerLine({
    rules: userRules,
    score: scoreResult.overall,
    fileCount: lintResult.totalFiles,
  });
  return {
    allowed: budgetResult.passed,
    enforced: budgetResult.enforced,
    reasons: budgetResult.breaches.map((b) => ({
      condition: b.condition,
      message: b.message,
      threshold: b.threshold,
      actual: b.actual,
      category: b.category,
      ruleId: b.ruleId,
    })),
    suggestedEdits,
    score: {
      overall: scoreResult.overall,
      grade: scoreResult.grade,
      categories,
      totalViolations: lintResult.totalViolations,
      debtMinutes,
    },
    budgetPath: loaded?.path,
    filesScanned: lintResult.totalFiles,
    trailer,
  };
}
// ── Tool: get_rule_details ─────────────────────────────────────────
/** Metadata for all deslint rules, used by the get_rule_details tool. */
const RULE_METADATA: Record<string, { description: string; category: string; autoFixable: boolean }> = {
  'deslint/no-arbitrary-colors': { description: 'Flag hardcoded hex/rgb colors in Tailwind arbitrary values; suggest design tokens.', category: 'colors', autoFixable: true },
  'deslint/no-arbitrary-spacing': { description: 'Enforce 4/8px spacing grid; reject arbitrary spacing values like p-[13px].', category: 'spacing', autoFixable: true },
  'deslint/no-arbitrary-typography': { description: 'Enforce type scale; reject arbitrary font sizes, weights, and line heights.', category: 'typography', autoFixable: true },
  'deslint/no-arbitrary-zindex': { description: 'Reject arbitrary z-index values like z-[999]; enforce defined scale.', category: 'consistency', autoFixable: true },
  'deslint/no-inline-styles': { description: 'Flag style={{}} attributes; prefer utility classes.', category: 'consistency', autoFixable: false },
  'deslint/no-magic-numbers-layout': { description: 'Flag arbitrary numbers in grid/flex layout properties.', category: 'spacing', autoFixable: true },
  'deslint/consistent-component-spacing': { description: 'Detect spacing divergence across same-type components.', category: 'consistency', autoFixable: false },
  'deslint/consistent-border-radius': { description: 'Detect mixed rounded-* values in same-type components.', category: 'consistency', autoFixable: false },
  'deslint/responsive-required': { description: 'Require responsive breakpoints on fixed-width containers.', category: 'responsive', autoFixable: false },
  'deslint/dark-mode-coverage': { description: 'Flag elements with color/bg utilities missing dark: variants.', category: 'colors', autoFixable: true },
  'deslint/missing-states': { description: 'Flag interactive elements missing hover/focus/disabled state handling.', category: 'consistency', autoFixable: false },
  'deslint/a11y-color-contrast': { description: 'Check WCAG AA contrast ratios for text and UI components.', category: 'colors', autoFixable: false },
  'deslint/image-alt-text': { description: 'Require meaningful alt text on <img> elements.', category: 'responsive', autoFixable: false },
  'deslint/heading-hierarchy': { description: 'Flag skipped heading levels (e.g. h1 → h3).', category: 'consistency', autoFixable: false },
  'deslint/form-labels': { description: 'Match <label> to <input id>; flag unlabeled form controls.', category: 'consistency', autoFixable: false },
  'deslint/link-text': { description: 'Flag generic link text ("click here", "read more").', category: 'consistency', autoFixable: false },
  'deslint/lang-attribute': { description: 'Require lang attribute on <html> element.', category: 'consistency', autoFixable: true },
  'deslint/viewport-meta': { description: 'Flag user-scalable=no and maximum-scale=1 on viewport meta.', category: 'consistency', autoFixable: false },
  'deslint/aria-validation': { description: 'Catch invalid ARIA roles, hallucinated attributes, and LLM typos.', category: 'consistency', autoFixable: false },
  'deslint/max-component-lines': { description: 'Flag overly large components exceeding line count threshold.', category: 'consistency', autoFixable: false },
  'deslint/focus-visible-style': { description: 'Detect outline-none without replacement focus indicator (WCAG 2.4.7).', category: 'responsive', autoFixable: false },
  'deslint/touch-target-size': { description: 'Flag interactive elements with touch targets smaller than 24x24px (WCAG 2.5.8).', category: 'responsive', autoFixable: false },
  'deslint/autocomplete-attribute': { description: 'Require autocomplete on identity/payment form fields (WCAG 1.3.5).', category: 'consistency', autoFixable: false },
  'deslint/prefers-reduced-motion': { description: 'Flag animation/transition classes without motion-safe:/motion-reduce: variants (WCAG 2.3.3).', category: 'responsive', autoFixable: true },
  'deslint/icon-accessibility': { description: 'Require accessible names on icon-only interactive elements; flag decorative icons missing aria-hidden.', category: 'consistency', autoFixable: true },
  'deslint/focus-trap-patterns': { description: 'Require role, aria-modal, and labels on dialog/modal elements (WCAG 2.4.3, 2.1.2).', category: 'consistency', autoFixable: true },
  'deslint/responsive-image-optimization': { description: 'Require loading, width/height, and srcset on <img> for performance and CLS prevention.', category: 'responsive', autoFixable: true },
  'deslint/spacing-rhythm-consistency': { description: 'Detect inconsistent spacing patterns across similar elements; flag deviations from dominant rhythm.', category: 'spacing', autoFixable: false },
};
/**
 * Return metadata for a specific deslint rule, including its WCAG mapping,
 * effort estimate, and auto-fix capability.
 */
export async function getRuleDetails(params: {
  ruleId: string;
}): Promise<RuleDetails> {
  const { effortForRule, WCAG_CRITERIA } = await import('@deslint/shared');
  const ruleId = params.ruleId.startsWith('deslint/')
    ? params.ruleId
    : `deslint/${params.ruleId}`;
  const meta = RULE_METADATA[ruleId];
  if (!meta) {
    throw new Error(
      `Unknown rule: ${params.ruleId}. Available rules: ${Object.keys(RULE_METADATA).map((r) => r.replace('deslint/', '')).join(', ')}`,
    );
  }
  // Find WCAG criteria this rule maps to
  const wcagCriteria = WCAG_CRITERIA
    .filter((c) => c.rules.includes(ruleId))
    .map((c) => ({ id: c.id, title: c.title, level: c.level }));
  // Determine default severity from recommended config
  const RECOMMENDED_SEVERITY: Record<string, string> = {
    'deslint/viewport-meta': 'error',
    'deslint/aria-validation': 'error',
    'deslint/max-component-lines': 'off',
    'deslint/missing-states': 'off',
    'deslint/dark-mode-coverage': 'off',
    'deslint/no-inline-styles': 'off',
  };
  const defaultSeverity = RECOMMENDED_SEVERITY[ruleId] ?? 'warn';
  return {
    ruleId,
    description: meta.description,
    category: meta.category,
    autoFixable: meta.autoFixable,
    effortMinutes: effortForRule(ruleId),
    wcagCriteria,
    defaultSeverity,
    docsUrl: `https://deslint.com/docs/rules/${ruleId.replace('deslint/', '')}`,
  };
}
// ── Tool: suggest_fix_strategy ─────────────────────────────────────
/**
 * Analyze a project and suggest which violations to fix first, ordered by
 * impact/effort ratio. Helps AI agents prioritize fixes for maximum design
 * health improvement with minimum effort.
 */
export async function suggestFixStrategy(params: {
  projectDir?: string;
  maxFiles?: number;
  maxSuggestions?: number;
}): Promise<SuggestFixStrategyResult> {
  const projectDir = resolve(params.projectDir ?? process.cwd());
  const maxFiles = clampMaxFiles(params.maxFiles);
  const maxSuggestions = Math.max(1, Math.min(params.maxSuggestions ?? 10, MAX_SUGGESTIONS_LIMIT));
  const { discoverFiles, runLint, calculateScore } = await import('@deslint/cli');
  const { effortForRule } = await import('@deslint/shared');
  const files = await discoverFiles({ cwd: projectDir });
  const filesToScan = files.slice(0, maxFiles);
  if (filesToScan.length === 0) {
    return {
      projectDir,
      overallScore: 100,
      totalViolations: 0,
      suggestions: [],
      totalEffortMinutes: 0,
    };
  }
  const lintResult = await runLint({ files: filesToScan, cwd: projectDir });
  const scoreResult = calculateScore(lintResult);
  // Build per-rule stats
  const ruleStats: Array<{
    ruleId: string;
    count: number;
    autoFixable: boolean;
    effortPerViolation: number;
    totalEffort: number;
  }> = [];
  for (const [ruleId, count] of Object.entries(lintResult.byRule)) {
    const meta = RULE_METADATA[ruleId];
    const effort = effortForRule(ruleId);
    ruleStats.push({
      ruleId,
      count,
      autoFixable: meta?.autoFixable ?? false,
      effortPerViolation: effort,
      totalEffort: effort * count,
    });
  }
  // Calculate impact: how much each rule contributes to the overall score
  // Higher violation count + lower effort = higher impact score
  const totalViolations = lintResult.totalViolations;
  const suggestions: FixSuggestion[] = ruleStats
    .map((stat) => {
      const violationShare = totalViolations > 0 ? stat.count / totalViolations : 0;
      // Impact = score improvement per minute of effort
      // Auto-fixable rules have 3x impact since they're instant
      const effortMultiplier = stat.autoFixable ? 0.33 : 1;
      const impactScore = stat.totalEffort > 0
        ? Math.round((violationShare * 100) / (stat.totalEffort * effortMultiplier) * 100) / 100
        : 0;
      let recommendation: string;
      if (stat.autoFixable && stat.count > 5) {
        recommendation = `Quick win: run \`deslint fix\` to auto-fix all ${stat.count} violations.`;
      } else if (stat.autoFixable) {
        recommendation = `Auto-fixable. Run \`deslint fix\` for instant resolution.`;
      } else if (stat.totalEffort <= 15) {
        recommendation = `Low effort. Manual fix needed — ~${stat.totalEffort} minutes total.`;
      } else {
        recommendation = `Higher effort (${stat.totalEffort}min). Consider fixing incrementally.`;
      }
      return {
        ruleId: stat.ruleId,
        count: stat.count,
        autoFixable: stat.autoFixable,
        totalEffortMinutes: stat.totalEffort,
        impactScore,
        recommendation,
      };
    })
    .sort((a, b) => b.impactScore - a.impactScore)
    .slice(0, maxSuggestions);
  const totalEffortMinutes = ruleStats.reduce((sum, s) => sum + s.totalEffort, 0);
  return {
    projectDir,
    overallScore: scoreResult.overall,
    totalViolations,
    suggestions,
    totalEffortMinutes,
  };
}
