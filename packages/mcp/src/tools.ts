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
import { resolve, relative, dirname, join, normalize, isAbsolute, sep, extname, basename } from 'node:path';
import { existsSync, readFileSync, statSync, writeFileSync, unlinkSync } from 'node:fs';
import { randomBytes, createHash } from 'node:crypto';
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
  /** `null` when the scan had no applicable input — e.g. a pure
   *  CSS-in-JS codebase where the class-based rules couldn't evaluate
   *  anything. Agents must treat null as "no score available" rather
   *  than coerce to 0 or 100. */
  overallScore: number | null;
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
export interface VerifyBeforeWriteResult {
  filePath: string;
  /** Did the candidate code pass every rule? Honours `strict` if set. */
  passed: boolean;
  violations: Violation[];
  /** 0-100 sub-score — same calculation as `analyze_file`. */
  score: number;
  totalErrors: number;
  totalWarnings: number;
  /** One-line, agent-actionable recommendation: "ok-to-write" /
   *  "ok-with-warnings" / "fix-and-retry" / "consult-user". The
   *  agent's prompt template pivots on this string.
   *
   *  `ok-with-warnings` is the "good enough, ship it" signal: the
   *  candidate passed all error-severity rules but has advisory
   *  warnings the agent should NOT spend a turn re-verifying. */
  recommendedAction: 'ok-to-write' | 'ok-with-warnings' | 'fix-and-retry' | 'consult-user';
  /** Wall-clock time the verify call spent inside the linter, in ms.
   *  Surfaced so callers (and the user-facing UI) can see deslint's
   *  cost on agent throughput; an agent prompt template can use this
   *  to back off if cost is climbing. */
  durationMs: number;
  /** True when the result was served from the in-memory cache (same
   *  filePath + same content already verified this server session).
   *  Agents in retry loops should short-circuit on cached:true rather
   *  than re-verifying. */
  cached: boolean;
}
export interface QuickCheckResult {
  filePath: string;
  /** True iff there are no error-severity violations. Designed for
   *  the agent's "is this even worth a full verify?" decision: the
   *  payload is a fixed sub-200-byte JSON regardless of the file
   *  size, so the agent doesn't pay for token cost on a clean check. */
  clean: boolean;
  errorCount: number;
  warningCount: number;
  durationMs: number;
  cached: boolean;
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
  /** `null` when the scan had no applicable input. Mirrors
   *  AnalyzeProjectResult.overallScore. */
  overallScore: number | null;
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
/**
 * Read user-declared rule overrides from the project's `.deslintrc.json`.
 * Same contract `enforceBudget` and the CLI use: a malformed root is
 * salvaged by falling through to the raw `rules` key so a reviewer can
 * still edit one corner of the config without the scan going silent,
 * and any read/parse failure returns `{}` so MCP never crashes on bad
 * input — the worst a broken config can do is fall back to defaults.
 *
 * This is what closes the "MCP ignores .deslintrc.json" gap that made
 * MCP-driven agents report violations for rules the user had turned
 * off in their config.
 */
async function loadUserRules(projectDir: string): Promise<Record<string, unknown>> {
  const rcPath = join(projectDir, '.deslintrc.json');
  if (!existsSync(rcPath)) return {};
  try {
    const raw = JSON.parse(readFileSync(rcPath, 'utf-8'));
    const { safeParseConfig } = await import('@deslint/shared');
    const parsed = safeParseConfig(raw);
    if (parsed.success) {
      return (parsed.data.rules ?? {}) as Record<string, unknown>;
    }
    return (raw?.rules ?? {}) as Record<string, unknown>;
  } catch {
    return {};
  }
}
// ── Tool: analyze_file ──────────────────────────────────────────────
export async function analyzeFile(params: {
  filePath: string;
  projectDir?: string;
  /** When true, every reported violation is promoted to error severity
   *  before counting. Intended for AI-coding contexts that want to
   *  hold themselves to a stricter bar than the default preset's
   *  warn/error mix. Defaults to false. */
  strict?: boolean;
}): Promise<AnalyzeFileResult> {
  const { absPath, projectDir } = resolveProjectDir(params.filePath, params.projectDir);
  validateFile(absPath, params.filePath);
  const { runLint } = await import('@deslint/cli');
  const userRules = await loadUserRules(projectDir);
  const lintResult = await runLint({
    files: [absPath],
    cwd: projectDir,
    ruleOverrides: userRules,
  });
  const strict = params.strict === true;
  const violations: Violation[] = [];
  let errors = 0;
  let warnings = 0;
  for (const result of lintResult.results) {
    for (const msg of result.messages) {
      if (strict && msg.severity === 1) msg.severity = 2;
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
    // Zero scannable files is semantically "not applicable", not
    // "perfect score". The type already promises `number | null` and
    // a downstream dashboard branching on `null` should not see a
    // fabricated 100 here — that's how regulated buyers end up
    // shipping a design-quality claim we never earned. Mirror the
    // CLI / Action applicability gate so all three surfaces render
    // N/A consistently.
    return {
      projectDir,
      overallScore: null,
      grade: 'skipped',
      totalFiles: 0,
      filesWithIssues: 0,
      totalViolations: 0,
      categories: {},
      topViolations: [],
    };
  }
  const userRules = await loadUserRules(projectDir);
  const lintResult = await runLint({
    files: filesToScan,
    cwd: projectDir,
    ruleOverrides: userRules,
  });
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
 * Analyze a file and return the auto-fixed version. The original file
 * on disk is NEVER modified.
 *
 * Implementation: we run two lint passes in the real project directory
 * so the scan sees the user's `.deslintrc.json` (same rule overrides
 * as `deslint scan`) and, if the project uses TypeScript path aliases
 * or a rule with cross-file context, the fix pass lands in the same
 * environment. The fix pass uses `fix: true, writeFixes: false` —
 * ESLint computes the fixes and returns the fixed source on
 * `result.output` without ever calling `fs.writeFile`. A prior
 * implementation wrote a basename copy into a `mkdtempSync` scratch
 * directory; that kept the workspace clean but lost the user's config
 * (and, by extension, the correctness of the fix preview). The
 * `writeFixes: false` approach achieves both.
 */
export async function analyzeAndFix(params: {
  filePath: string;
  projectDir?: string;
}): Promise<AnalyzeAndFixResult> {
  const { absPath, projectDir } = resolveProjectDir(params.filePath, params.projectDir);
  validateFile(absPath, params.filePath);
  const { runLint } = await import('@deslint/cli');
  const userRules = await loadUserRules(projectDir);
  const originalCode = readFileSync(absPath, 'utf-8');
  // First pass: count the violations the user would see in `deslint scan`.
  const originalLint = await runLint({
    files: [absPath],
    cwd: projectDir,
    ruleOverrides: userRules,
  });
  const originalCount = originalLint.results[0]?.messages.length ?? 0;
  // Second pass: compute the fix in-memory. `writeFixes: false` is the
  // documented dry-run mode in lint-runner — ESLint returns the fixed
  // source on `result.output` without touching disk.
  const fixedLint = await runLint({
    files: [absPath],
    cwd: projectDir,
    ruleOverrides: userRules,
    fix: true,
    writeFixes: false,
  });
  const fixedResult = fixedLint.results[0];
  const fixedCode = fixedResult?.output ?? originalCode;
  const remaining: Violation[] = [];
  for (const result of fixedLint.results) {
    for (const msg of result.messages) {
      remaining.push(toViolation(msg));
    }
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
  const userRules = await loadUserRules(projectDir);
  const lintResult = await runLint({
    files: filesToScan,
    cwd: projectDir,
    ruleOverrides: userRules,
  });
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
  /** Scan snapshot used to evaluate the budget. `overall` is `null`
   *  when the scan had no applicable input. */
  score: {
    overall: number | null;
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
    // Budget checks still run on N/A scans — rule-count caps can fire
    // even when the overall score is null. Use 100 as the floor so the
    // score-threshold condition doesn't accidentally fail a no-op scan.
    overall: scoreResult.overall ?? 100,
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
    // Trailer records the committed scan claim; N/A scans emit the
    // neutral 100 floor so the trailer still verifies deterministically.
    score: scoreResult.overall ?? 100,
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
  'deslint/no-arbitrary-border-radius': { description: 'Enforce the radius scale; reject arbitrary values like rounded-[8px].', category: 'consistency', autoFixable: true },
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
  // ── Consistency expansion (v0.6) ───────────────────────────────────
  'deslint/no-conflicting-classes': { description: 'Detect contradictory Tailwind utilities like `flex hidden` on the same element.', category: 'consistency', autoFixable: false },
  'deslint/no-duplicate-class-strings': { description: 'Flag identical class strings repeated 3+ times in a file; extract to a constant.', category: 'consistency', autoFixable: false },
  'deslint/max-tailwind-classes': { description: 'Cap utility classes per element so deeply-styled markup gets refactored.', category: 'consistency', autoFixable: false },
  'deslint/prefer-semantic-html': { description: 'Prefer semantic <button>/<nav>/<header>/<main> over <div role="…"> equivalents.', category: 'consistency', autoFixable: false },
  'deslint/consistent-color-palette': { description: 'Cap unique color families per file; flag palettes that have crept beyond design intent.', category: 'colors', autoFixable: false },
  // ── Frontend safety (v0.8) ─────────────────────────────────────────
  'deslint/no-dangerous-html': { description: 'Flag `dangerouslySetInnerHTML` and Astro `set:html` — XSS path on user-supplied input.', category: 'frontend-safety', autoFixable: false },
  'deslint/safe-external-links': { description: 'Require `rel="noopener noreferrer"` on `<a target="_blank">` to block reverse-tabnabbing.', category: 'frontend-safety', autoFixable: true },
  'deslint/iframe-sandbox': { description: 'Require a `sandbox` attribute on `<iframe>` to constrain embedded content.', category: 'frontend-safety', autoFixable: false },
  // ── Backend safety (v0.9 — wave 1+2) ───────────────────────────────
  'deslint/no-hardcoded-secrets': { description: 'Provider-fingerprinted API keys/tokens (AWS, GitHub, Stripe, Google, Slack, OpenAI, Anthropic, JWT, PEM) plus high-entropy literals bound to secret-named identifiers.', category: 'backend-safety', autoFixable: false },
  'deslint/no-sql-injection': { description: 'SQL queries built by `+` concatenation or template-literal interpolation; safe carve-outs for `sql\\`…\\`` tagged templates and parameterized placeholders.', category: 'backend-safety', autoFixable: false },
  'deslint/no-shell-injection': { description: '`child_process.exec` / `execSync` / `spawn({ shell: true })` with a dynamic command string.', category: 'backend-safety', autoFixable: false },
  'deslint/no-weak-crypto': { description: '`createHash("md5"|"sha1")`, deprecated ciphers, and `Math.random()` bound to security-sensitive identifiers.', category: 'backend-safety', autoFixable: false },
  'deslint/safe-redirect': { description: 'Open-redirect / phishing path: `res.redirect(req.query.next)` and equivalents on Express, Koa, Fastify, and Next.js.', category: 'backend-safety', autoFixable: false },
  'deslint/no-path-traversal': { description: '`fs.readFile` / `path.join` / `res.sendFile` with request-sourced input (CWE-22). Recognises Express\'s `{ root }` allowlist as safe.', category: 'backend-safety', autoFixable: false },
  'deslint/no-ssrf': { description: '`fetch` / `axios` / `http.request` / `got` / `ky` / `superagent` called with a request-derived URL (CWE-918).', category: 'backend-safety', autoFixable: false },
  'deslint/secure-cookies': { description: '`res.cookie` / `reply.setCookie` / `cookies().set` missing `httpOnly` / `secure` / `sameSite`. Session-named cookies get a louder consolidated message.', category: 'backend-safety', autoFixable: false },
  'deslint/no-permissive-cors': { description: '`cors({ origin: "*", credentials: true })`, reflect-any-origin callbacks, and manual `Access-Control-Allow-Origin: *` with credentials.', category: 'backend-safety', autoFixable: false },
  'deslint/no-eval': { description: '`eval()`, `new Function(...)`, `vm.runInNewContext` / `runInThisContext` / `runInContext`, plus string-arg `setTimeout`/`setInterval`.', category: 'backend-safety', autoFixable: false },
  'deslint/no-disabled-tls': { description: '`rejectUnauthorized: false`, `new https.Agent({ rejectUnauthorized: false })`, and `process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"`.', category: 'backend-safety', autoFixable: false },
  'deslint/require-jwt-expiry': { description: '`jwt.sign(...)` without `expiresIn`; `algorithm: "none"`.', category: 'backend-safety', autoFixable: false },
  // ── Next.js stability (v0.9 — wave 2+3) ────────────────────────────
  'deslint/no-hydration-mismatch': { description: '`Math.random()` / `Date.now()` / `new Date()` / `performance.now()` / `crypto.randomUUID()` inline in JSX. Safe inside useEffect/useLayoutEffect.', category: 'nextjs', autoFixable: false },
  'deslint/no-leaked-env-on-client': { description: 'Non-public `process.env.X` reads from `"use client"` or `*.client.{ts,tsx,js,jsx}` files (where X isn\'t `NEXT_PUBLIC_*` / `VITE_*` / `PUBLIC_*` / etc.).', category: 'nextjs', autoFixable: false },
  'deslint/no-server-only-in-client': { description: 'Imports of Node core (`fs`, `crypto`, `child_process`, …), DB drivers (`@prisma/client`, `mongoose`, `redis`, …), and the `server-only` package from `"use client"` files.', category: 'nextjs', autoFixable: false },
  'deslint/no-async-useeffect': { description: '`useEffect(async () => …)` / `useLayoutEffect(async () => …)` — returns a Promise instead of a cleanup function.', category: 'nextjs', autoFixable: false },
  // ── AI-coding hygiene (v0.9 — wave 3+4) ────────────────────────────
  'deslint/no-floating-promise-handler': { description: 'Async Express/Fastify route handlers without `try/catch`, `.catch(next)`, or an async-wrapper (`asyncHandler`/`catchAsync`/`wrap`/`tryCatch`).', category: 'ai-coding', autoFixable: false },
  'deslint/no-unsafe-mass-assignment': { description: '`Object.assign(user, req.body)`, `{ ...user, ...req.body }`, `User.create(req.body)`, `user.update(req.body)` (OWASP A04).', category: 'ai-coding', autoFixable: false },
  'deslint/no-placeholder-code': { description: '`throw new Error("not implemented" | "TODO" | "FIXME" | "placeholder" | "coming soon" | …)` left behind by AI.', category: 'ai-coding', autoFixable: false },
  'deslint/no-hardcoded-localhost': { description: '`localhost` / `127.0.0.1` / `0.0.0.0` / `host.docker.internal` URLs hardcoded in production source. Test/fixture paths exempt by filename.', category: 'ai-coding', autoFixable: false },
  'deslint/no-empty-catch': { description: '`try { … } catch {}`, `catch (e) {}`, `catch (e) { /* TODO */ }` — silently swallow runtime errors.', category: 'ai-coding', autoFixable: false },
  'deslint/no-prod-console': { description: '`console.log`/`debug`/`info`/`dir`/`trace`/`table`/`time*` in non-test source. `console.error`/`console.warn` allowed.', category: 'ai-coding', autoFixable: false },
  'deslint/no-leaked-stack-trace': { description: '`res.status(500).send(err.stack)` / `res.json({ error: err })` / `new Response(err.stack)` — leaks the internal call graph.', category: 'ai-coding', autoFixable: false },
  'deslint/no-unvalidated-input': { description: '`as T` / `<T>x` / `satisfies T` on `req.body` / `req.query` / `req.params` / `await request.json()` without going through a validator.', category: 'ai-coding', autoFixable: false },
  'deslint/no-mock-data-in-prod': { description: '`mockUsers`/`fakeOrders`/`seedData` arrays + placeholder emails (`john.doe@example.com`, `test@test.com`) outside test/fixture/story paths.', category: 'ai-coding', autoFixable: false },
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
  // Maps each rule to its severity in `configs.recommended`. New rules
  // default to `'warn'`. Errors here mirror packages/eslint-plugin/src/index.ts
  // — when that file's recommended preset changes, update both sides.
  const RECOMMENDED_SEVERITY: Record<string, string> = {
    // Frontend / a11y errors
    'deslint/viewport-meta': 'error',
    'deslint/aria-validation': 'error',
    'deslint/max-component-lines': 'off',
    'deslint/missing-states': 'off',
    'deslint/dark-mode-coverage': 'off',
    'deslint/no-inline-styles': 'off',
    'deslint/no-duplicate-class-strings': 'off',
    'deslint/max-tailwind-classes': 'off',
    'deslint/consistent-color-palette': 'off',
    'deslint/spacing-rhythm-consistency': 'off',
    // Backend safety — most are error in recommended
    'deslint/no-hardcoded-secrets': 'error',
    'deslint/no-sql-injection': 'error',
    'deslint/no-shell-injection': 'error',
    'deslint/no-path-traversal': 'error',
    'deslint/no-ssrf': 'error',
    'deslint/no-permissive-cors': 'error',
    'deslint/no-eval': 'error',
    'deslint/no-disabled-tls': 'error',
    // Next.js / AI-coding errors
    'deslint/no-leaked-env-on-client': 'error',
    'deslint/no-async-useeffect': 'error',
    'deslint/no-server-only-in-client': 'error',
    'deslint/no-floating-promise-handler': 'error',
    'deslint/no-unsafe-mass-assignment': 'error',
    'deslint/no-empty-catch': 'error',
    'deslint/no-leaked-stack-trace': 'error',
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
/**
 * Return RuleDetails for every rule the plugin exports — the
 * collection backing the `deslint://rules` MCP resource.
 *
 * Implementation note: we reuse `getRuleDetails` per-rule so the
 * WCAG mapping + severity logic stays in one place; the loop runs in
 * ~5ms across all 60+ rules and is cheap to call repeatedly. Agents
 * are expected to cache the result for the session.
 */
export async function getAllRuleDetails(): Promise<RuleDetails[]> {
  const out: RuleDetails[] = [];
  for (const ruleId of Object.keys(RULE_METADATA)) {
    try {
      out.push(await getRuleDetails({ ruleId }));
    } catch {
      // Defensive — should never throw given we iterate the
      // metadata keys themselves, but a failure on one rule
      // shouldn't deny the resource entirely.
    }
  }
  return out;
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
    // Mirror the analyze_project N/A contract. A dashboard ordering
    // by score must be able to bucket "no scannable files" separately
    // from "scanned and scored 100."
    return {
      projectDir,
      overallScore: null,
      totalViolations: 0,
      suggestions: [],
      totalEffortMinutes: 0,
    };
  }
  const userRules = await loadUserRules(projectDir);
  const lintResult = await runLint({
    files: filesToScan,
    cwd: projectDir,
    ruleOverrides: userRules,
  });
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

// ── Fast-path infrastructure ────────────────────────────────────────
//
// User feedback: "MCP keeps pushing the agent to verify again and
// again, slowing the user's output." The fix is to make verify cheap
// enough that calling it on every write is invisible cost — not to
// call it less often. Three layers of optimization:
//
//   1. Module-level config cache. Building the flat-config array
//      means importing 6+ parser packages (TypeScript, Vue, Svelte,
//      Angular, html-eslint, astro). On first call this dominates
//      cold-start (~6s in benchmarks). Cache by (projectDir +
//      ruleOverrides hash) and the second call is free.
//
//   2. Linter.verify fast path. The original implementation wrote
//      the proposed content to a temp file, then invoked the full
//      ESLint engine, which spins up file discovery, ignore-file
//      resolution, and config inheritance per call (~5ms warm).
//      ESLint's `Linter` is the underlying primitive that takes
//      content + config + filename and just runs rules. ~0.1ms warm.
//
//   3. Result cache by content hash. Agents in retry loops (the
//      `/deslint-fix` workflow being the canonical case) routinely
//      call verify with IDENTICAL content — once before the fix
//      attempt, once again to confirm. Hash the (filePath +
//      strict + content) tuple; cache hit returns instantly with
//      `cached: true` so the agent prompt template can short-circuit.
//
// Combined: cold start unchanged (one parser-import tax); warm verify
// 50× faster than before; identical-content re-calls are O(1).

interface ConfigCacheEntry {
  configs: any[];
  linter: any; // eslint Linter instance
}

const CONFIG_CACHE = new Map<string, Promise<ConfigCacheEntry>>();
const RESULT_CACHE = new Map<string, VerifyBeforeWriteResult>();
const RESULT_CACHE_MAX_ENTRIES = 256;

/**
 * Wall-clock telemetry. Surfaced via the `getServerStats` tool so the
 * MCP server can answer "how much agent time has deslint cost this
 * session?". Reset only when the server restarts.
 */
const SESSION_STATS = {
  totalVerifyCalls: 0,
  totalVerifyMs: 0,
  cacheHits: 0,
  cacheMisses: 0,
  slowVerifyCount: 0,
};

/**
 * Soft wall-clock budget for `verify_before_write`. We CANNOT
 * cancel ESLint mid-run (`Linter.verify` is synchronous), so this
 * is an observability gate, not a hard cancellation:
 *
 *   - measure elapsed wall-clock on every verify
 *   - if it exceeds the budget, log a structured warning to stderr
 *     (NOT stdout — stdout is the MCP JSON-RPC channel) and
 *     increment `slowVerifyCount` in SESSION_STATS so the agent
 *     can `get_server_stats` to see degradation over a session
 *   - the verify still completes and its result still ships back
 *
 * Why soft rather than hard: catastrophic verifies on real-world
 * inputs are vanishingly rare (10 MB content cap + well-tested
 * plugin = bounded worst case), and a fake-AbortSignal that lies
 * about cancelling sync work is worse than no abort at all. The
 * structured warning gives users + ops the signal they need to
 * investigate, without changing the deterministic verdict contract.
 *
 * Tuned generously: 2 seconds. The integration script measures
 * real-world verify at sub-10 ms on shadcn-ui production code,
 * so any cross-of-2-seconds is a real anomaly worth surfacing.
 */
const VERIFY_BUDGET_MS = 2000;

function configCacheKey(projectDir: string, ruleOverrides: Record<string, unknown>): string {
  const sorted = Object.keys(ruleOverrides).sort().map((k) => `${k}=${JSON.stringify(ruleOverrides[k])}`).join(';');
  return `${projectDir} ${sorted}`;
}

function resultCacheKey(absPath: string, content: string, strict: boolean): string {
  const h = createHash('sha1').update(content).digest('hex');
  return `${absPath} ${h} ${strict ? '1' : '0'}`;
}

async function getCachedConfigs(projectDir: string, ruleOverrides: Record<string, unknown>): Promise<ConfigCacheEntry> {
  const key = configCacheKey(projectDir, ruleOverrides);
  const existing = CONFIG_CACHE.get(key);
  if (existing) return existing;

  // Build configs + linter once, cache the *Promise* so concurrent
  // callers share the work even mid-flight.
  const built = (async () => {
    const { buildLintConfigs } = await import('@deslint/cli');
    const configs = await buildLintConfigs({ ruleOverrides });
    // Lazy-import the Linter primitive only on the fast path so
    // existing analyze_file/analyze_project paths (which use the full
    // ESLint engine) don't pay for it.
    const { Linter } = await import('eslint');
    return { configs, linter: new Linter() } satisfies ConfigCacheEntry;
  })();
  CONFIG_CACHE.set(key, built);
  return built;
}

/**
 * Eagerly warm the config cache for a project on server startup.
 * Eats the ~6s plugin/parser-import cost once per server process so
 * the agent's FIRST `verify_before_write` call is also fast.
 *
 * Called from `startServer()` for the cwd. Safe to call from tests
 * with any projectDir; cache lookups are keyed by directory so
 * additional projects warm independently on first use.
 */
export async function preloadFastPath(projectDir?: string): Promise<void> {
  await getCachedConfigs(resolve(projectDir ?? process.cwd()), {});
}

// ── Tool: verify_before_write ───────────────────────────────────────
/**
 * Pre-write gate: lint candidate code BEFORE the agent commits it to
 * disk. Now uses the fast path described above — identical-content
 * calls are O(1), warm calls hit `Linter.verify` directly (~0.1ms),
 * and the temp-file dance the v1 implementation needed is gone.
 *
 * Why this exists. The existing `analyze_file` tool runs *after* the
 * agent has written the file. By then the bad code is already on
 * disk, already in the diff, already shaping the agent's next
 * reasoning step. `verify_before_write` flips the moment of truth —
 * the agent passes the proposed content, gets a pass/fail +
 * violations + a one-line recommended action + a duration estimate,
 * and decides what to do BEFORE touching disk.
 *
 * `strict: true` promotes every reported violation to error severity
 * before scoring. The intended caller is an AI agent that wants to
 * hold itself to a higher bar than the default preset's warn/error
 * mix.
 *
 * Optional filters narrow the lint pass when the agent knows it only
 * cares about a slice of the rule set:
 *   - `severityFloor: 'error'` skips warning-only violations entirely
 *     (cheaper, smaller payload, agent can't be tempted to retry on
 *     advisory drift).
 *   - `categories: ['backend-safety', 'ai-coding']` restricts the
 *     reported set to those rule categories.
 */
export async function verifyBeforeWrite(params: {
  filePath: string;
  proposedContent: string;
  projectDir?: string;
  strict?: boolean;
  /** Drop violations below this severity from the response. Default
   *  `'warn'` (every reported violation is included). Set to `'error'`
   *  when the agent only cares about hard blockers — the response
   *  shrinks AND the agent's prompt template can't be tempted to
   *  retry on advisory drift. */
  severityFloor?: 'error' | 'warn';
  /** When set, only violations whose rule belongs to one of these
   *  categories are returned. Categories are the keys used by
   *  RULE_METADATA: `'colors'`, `'spacing'`, `'typography'`,
   *  `'consistency'`, `'responsive'`, `'frontend-safety'`,
   *  `'backend-safety'`, `'nextjs'`, `'ai-coding'`. */
  categories?: string[];
}): Promise<VerifyBeforeWriteResult> {
  const { absPath, projectDir } = resolveProjectDir(params.filePath, params.projectDir);

  // Validate the proposed content's size (mirror validateFile's
  // MAX_FILE_SIZE_BYTES guard, but on an in-memory string).
  const byteLen = Buffer.byteLength(params.proposedContent, 'utf8');
  if (byteLen > MAX_FILE_SIZE_BYTES) {
    throw new Error(
      `Proposed content too large for ${params.filePath} (${Math.round(byteLen / 1024 / 1024)}MB). Maximum: ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB.`,
    );
  }

  const strict = params.strict === true;
  const severityFloor = params.severityFloor ?? 'warn';
  const categoryFilter = params.categories ? new Set(params.categories) : null;

  // Result cache: identical (filePath, content, strict) → instant.
  // We only cache the unfiltered shape; filter passes are cheap and
  // produce smaller responses.
  const cacheKey = resultCacheKey(absPath, params.proposedContent, strict);
  const cached = RESULT_CACHE.get(cacheKey);
  if (cached) {
    SESSION_STATS.cacheHits++;
    return applyFilters({ ...cached, cached: true }, severityFloor, categoryFilter);
  }
  SESSION_STATS.cacheMisses++;

  const t0 = performance.now();

  // Fast path: Linter.verify with cached configs. Avoids the temp
  // file, avoids a fresh ESLint engine spin-up.
  const userRules = await loadUserRules(projectDir);
  const { configs, linter } = await getCachedConfigs(projectDir, userRules);

  // Linter requires a relative-to-cwd filename so flat-config `files`
  // globs match. Pass projectDir as cwd; the relative path comes
  // from `relative()`.
  const relPath = relative(projectDir, absPath);
  const messages: any[] = linter.verify(
    params.proposedContent,
    configs,
    { filename: relPath, allowInlineConfig: false },
  );

  const violations: Violation[] = [];
  let errors = 0;
  let warnings = 0;
  for (const msg of messages) {
    if (strict && msg.severity === 1) msg.severity = 2;
    violations.push(toViolation(msg));
    if (msg.severity === 2) errors++;
    else warnings++;
  }

  const score = Math.max(0, 100 - violations.length * 10);
  const passed = errors === 0;

  let recommendedAction: VerifyBeforeWriteResult['recommendedAction'];
  if (passed && warnings === 0) {
    recommendedAction = 'ok-to-write';
  } else if (passed) {
    // Passed all hard blockers but had advisory warnings. The agent
    // should NOT spend a turn re-verifying — this is the "good enough,
    // ship it" signal added in v0.9 in response to user-reported
    // friction with retry-heavy `/deslint-fix` workflows.
    recommendedAction = 'ok-with-warnings';
  } else if (
    violations.some((v) => /no-arbitrary-(colors|spacing|typography|border-radius|zindex)/.test(v.ruleId)) &&
    !violations.some((v) => v.fix)
  ) {
    recommendedAction = 'consult-user';
  } else {
    recommendedAction = 'fix-and-retry';
  }

  const durationMs = Math.round((performance.now() - t0) * 100) / 100;
  SESSION_STATS.totalVerifyCalls++;
  SESSION_STATS.totalVerifyMs += durationMs;

  // Soft budget. If this single verify took longer than the budget,
  // log a one-line structured warning to stderr (never stdout — that
  // would corrupt the JSON-RPC channel) and bump the session-stats
  // counter so the agent's get_server_stats call surfaces it.
  if (durationMs > VERIFY_BUDGET_MS) {
    SESSION_STATS.slowVerifyCount++;
    process.stderr.write(
      `[deslint] verify_before_write slow path: ${durationMs}ms on ${relPath} (budget ${VERIFY_BUDGET_MS}ms, content ${byteLen}B)\n`,
    );
  }

  const result: VerifyBeforeWriteResult = {
    filePath: relPath,
    passed,
    violations,
    score,
    totalErrors: errors,
    totalWarnings: warnings,
    recommendedAction,
    durationMs,
    cached: false,
  };

  // Cache the unfiltered result. Cap memory by evicting oldest on
  // overflow (Map iteration order is insertion order, so .keys().next()
  // is the oldest).
  if (RESULT_CACHE.size >= RESULT_CACHE_MAX_ENTRIES) {
    const oldest = RESULT_CACHE.keys().next().value;
    if (oldest !== undefined) RESULT_CACHE.delete(oldest);
  }
  RESULT_CACHE.set(cacheKey, result);

  return applyFilters(result, severityFloor, categoryFilter);
}

function applyFilters(
  result: VerifyBeforeWriteResult,
  severityFloor: 'error' | 'warn',
  categoryFilter: Set<string> | null,
): VerifyBeforeWriteResult {
  if (severityFloor === 'warn' && !categoryFilter) return result;

  const ruleCategory = (ruleId: string): string | null => {
    const meta = RULE_METADATA[ruleId];
    return meta?.category ?? null;
  };

  const filtered = result.violations.filter((v) => {
    if (severityFloor === 'error' && v.severity !== 'error') return false;
    if (categoryFilter) {
      const cat = ruleCategory(v.ruleId);
      if (!cat || !categoryFilter.has(cat)) return false;
    }
    return true;
  });

  // Recount on the filtered set, but keep the original `passed` /
  // `recommendedAction` semantics: if the original had errors but
  // the filter dropped them all, we still tell the agent
  // "ok-with-warnings" rather than lying with "ok-to-write".
  const errors = filtered.filter((v) => v.severity === 'error').length;
  const warnings = filtered.filter((v) => v.severity === 'warning').length;

  let recommendedAction = result.recommendedAction;
  if (filtered.length === 0) {
    recommendedAction = result.passed ? 'ok-to-write' : 'ok-with-warnings';
  }

  return {
    ...result,
    violations: filtered,
    totalErrors: errors,
    totalWarnings: warnings,
    recommendedAction,
  };
}

// ── Tool: quick_check ────────────────────────────────────────────
/**
 * Sub-200-byte yes/no check. Designed for the agent's "is this even
 * worth a full verify?" decision. Returns a fixed, tiny payload
 * regardless of file size so the agent doesn't pay token cost on
 * clean checks. Backed by the same fast path + result cache as
 * `verifyBeforeWrite` — calling `quickCheck` then `verifyBeforeWrite`
 * for the same content is free; the second call hits the cache.
 */
export async function quickCheck(params: {
  filePath: string;
  proposedContent: string;
  projectDir?: string;
  strict?: boolean;
}): Promise<QuickCheckResult> {
  const t0 = performance.now();
  // Reuse the full verify (cached on identical content) but only
  // surface counts. Keeps semantics in lock-step.
  const full = await verifyBeforeWrite({
    filePath: params.filePath,
    proposedContent: params.proposedContent,
    projectDir: params.projectDir,
    strict: params.strict,
    // Always count the full set in quick_check — the floor only
    // affects what `verify_before_write` returns, not what
    // `quick_check` summarizes.
    severityFloor: 'warn',
  });
  return {
    filePath: full.filePath,
    clean: full.totalErrors === 0,
    errorCount: full.totalErrors,
    warningCount: full.totalWarnings,
    durationMs: Math.round((performance.now() - t0) * 100) / 100,
    cached: full.cached,
  };
}

// ── Tool: get_server_stats ──────────────────────────────────────
/**
 * Per-session telemetry the agent (or the user-facing UI) can use to
 * see how much wall-clock time deslint has cost this session. The
 * `/deslint-fix` prompt template surfaces a budget warning when this
 * crosses a threshold, so the agent backs off rather than retrying
 * indefinitely.
 *
 * Numbers reset only when the MCP server process restarts.
 */
export interface ServerStats {
  totalVerifyCalls: number;
  totalVerifyMs: number;
  cacheHits: number;
  cacheMisses: number;
  /** cacheHits / (cacheHits + cacheMisses), rounded to 2 decimals.
   *  null when there have been no calls yet. */
  cacheHitRate: number | null;
  /** Average wall-clock cost per non-cached verify call, in ms. */
  avgVerifyMs: number | null;
  /** Number of verify_before_write calls that exceeded the 2 s soft
   *  budget. Stays at 0 in healthy operation; any non-zero value is
   *  a signal that ESLint hit a pathological input. The MCP server
   *  also writes one line to stderr per slow call so logs surface
   *  the file path. */
  slowVerifyCount: number;
}

export function getServerStats(): ServerStats {
  const total = SESSION_STATS.cacheHits + SESSION_STATS.cacheMisses;
  return {
    totalVerifyCalls: SESSION_STATS.totalVerifyCalls,
    totalVerifyMs: Math.round(SESSION_STATS.totalVerifyMs * 100) / 100,
    cacheHits: SESSION_STATS.cacheHits,
    cacheMisses: SESSION_STATS.cacheMisses,
    cacheHitRate: total === 0 ? null : Math.round((SESSION_STATS.cacheHits / total) * 100) / 100,
    avgVerifyMs:
      SESSION_STATS.totalVerifyCalls === 0
        ? null
        : Math.round((SESSION_STATS.totalVerifyMs / SESSION_STATS.totalVerifyCalls) * 100) / 100,
    slowVerifyCount: SESSION_STATS.slowVerifyCount,
  };
}

/** Test-only helper: reset all caches and stats so tests don't see
 *  cross-test leakage. Not exported in the public d.ts via index.ts. */
export function _resetCaches(): void {
  CONFIG_CACHE.clear();
  RESULT_CACHE.clear();
  SESSION_STATS.totalVerifyCalls = 0;
  SESSION_STATS.totalVerifyMs = 0;
  SESSION_STATS.cacheHits = 0;
  SESSION_STATS.cacheMisses = 0;
  SESSION_STATS.slowVerifyCount = 0;
}

// ── Tool: scan_diff ──────────────────────────────────────────────
/**
 * Lint only files changed against a base ref (default: origin/main).
 * The result separates `newViolations` (introduced by changes in this
 * branch) from `preExisting` (lived in the file before the change),
 * so an agent / merge gate can hard-block on new failures while
 * staying quiet on legacy ones.
 *
 * "New" means the violation's (ruleId, line) is not present in the
 * base ref's version of the same file. The line-number heuristic is
 * deliberate: it tolerates a re-indented file (where every legacy
 * violation moves by a constant) without flagging the whole file as
 * new. If the file is new (added in the branch), every violation is
 * new.
 *
 * This is the MCP-side mirror of the `--ai-diff` CLI mode I called
 * out in last session's gap analysis. Agents reading the diff before
 * proposing further edits should call this first so they don't waste
 * a turn fixing pre-existing violations.
 */
export interface ScanDiffViolation extends Violation {
  filePath: string;
  /** 'new' = introduced by changes in this branch; 'pre-existing' =
   *  also fires on the base-ref version of the file. */
  status: 'new' | 'pre-existing';
}

export interface ScanDiffResult {
  projectDir: string;
  baseRef: string;
  totalChangedFiles: number;
  totalNewViolations: number;
  totalPreExistingViolations: number;
  newViolations: ScanDiffViolation[];
  preExisting: ScanDiffViolation[];
}

export async function scanDiff(params: {
  projectDir?: string;
  baseRef?: string;
  maxFiles?: number;
}): Promise<ScanDiffResult> {
  const projectDir = resolve(params.projectDir ?? process.cwd());
  const baseRef = params.baseRef ?? 'origin/main';
  const maxFiles = clampMaxFiles(params.maxFiles);

  // Discover changed files via `git diff --name-only baseRef...HEAD`.
  // We use the merge-base form (`...`) so commits the base has but the
  // branch doesn't aren't counted as "changes." Same convention as the
  // CLI's existing `scan --diff` mode.
  const { execFile } = await import('node:child_process');
  const { promisify } = await import('node:util');
  const exec = promisify(execFile);

  let changedRaw = '';
  try {
    const { stdout } = await exec('git', ['diff', '--name-only', '--diff-filter=AM', `${baseRef}...HEAD`], {
      cwd: projectDir,
      timeout: 15_000,
    });
    changedRaw = stdout;
  } catch (err) {
    throw new Error(
      `git diff failed against ${baseRef}: ${err instanceof Error ? err.message : String(err)}. Is ${baseRef} fetched?`,
    );
  }

  const SUPPORTED_EXT = /\.(?:tsx?|jsx?|mjs|cjs|vue|svelte|astro|html)$/i;
  const changedFiles = changedRaw
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((p) => SUPPORTED_EXT.test(p))
    .slice(0, maxFiles)
    .map((p) => join(projectDir, p));

  if (changedFiles.length === 0) {
    return {
      projectDir,
      baseRef,
      totalChangedFiles: 0,
      totalNewViolations: 0,
      totalPreExistingViolations: 0,
      newViolations: [],
      preExisting: [],
    };
  }

  const { runLint } = await import('@deslint/cli');
  const userRules = await loadUserRules(projectDir);

  // Lint the branch version (the files on disk now).
  const branchResult = await runLint({
    files: changedFiles,
    cwd: projectDir,
    ruleOverrides: userRules,
  });

  // For each changed file, try to retrieve the base-ref version via
  // `git show baseRef:<relpath>`. If the file is new (added in the
  // branch), `git show` exits non-zero — we treat every violation in
  // the new file as a new violation. If it exists in base, we lint
  // that content too (via the same `.deslint-verify-*` temp-file
  // dance used by verifyBeforeWrite) and diff the violation sets.
  const newViolations: ScanDiffViolation[] = [];
  const preExisting: ScanDiffViolation[] = [];

  for (const fileResult of branchResult.results) {
    const absPath = fileResult.filePath;
    const relPath = relative(projectDir, absPath);

    let baseViolationKeys: Set<string> | null = null;
    try {
      const { stdout: baseSrc } = await exec('git', ['show', `${baseRef}:${relPath}`], {
        cwd: projectDir,
        timeout: 10_000,
        maxBuffer: MAX_FILE_SIZE_BYTES,
      });

      // Lint the base content via a temp file in the same dir.
      const ext = extname(absPath);
      const tempName = `.deslint-verify-${randomBytes(6).toString('hex')}${ext}`;
      const tempPath = join(dirname(absPath), tempName);
      try {
        writeFileSync(tempPath, baseSrc, 'utf-8');
        const baseLintResult = await runLint({
          files: [tempPath],
          cwd: projectDir,
          ruleOverrides: userRules,
        });
        baseViolationKeys = new Set<string>();
        for (const r of baseLintResult.results) {
          for (const m of r.messages) {
            baseViolationKeys.add(`${m.ruleId ?? 'unknown'}:${m.line}`);
          }
        }
      } finally {
        try { unlinkSync(tempPath); } catch { /* ignore */ }
      }
    } catch {
      // File is new in the branch — leave baseViolationKeys null, so
      // every branch violation is considered new.
      baseViolationKeys = null;
    }

    for (const msg of fileResult.messages) {
      const v = toViolation(msg);
      const out: ScanDiffViolation = { ...v, filePath: relPath, status: 'new' };
      const key = `${v.ruleId}:${v.line}`;
      if (baseViolationKeys && baseViolationKeys.has(key)) {
        out.status = 'pre-existing';
        preExisting.push(out);
      } else {
        newViolations.push(out);
      }
    }
  }

  return {
    projectDir,
    baseRef,
    totalChangedFiles: changedFiles.length,
    totalNewViolations: newViolations.length,
    totalPreExistingViolations: preExisting.length,
    newViolations,
    preExisting,
  };
}

/* Internal helper export — `basename` re-export so server.ts can use
 * it in the resource handlers without re-importing 'node:path'. */
export const _internal = { basename };

// ── Agent Action Firewall: verify_shell_exec ─────────────────────────
//
// Extends Deslint from "lint files" to "intercept agent actions." The
// agent calls verifyShellExec BEFORE actually running the shell
// command. We consult the project's `.deslint/policy.yml`, evaluate
// deny → allow → defaultAction → builtinChecks, and return a verdict
// the agent must honour.
//
// Strategic context: this is the first interceptor of the
// "verify_before_*" family the 2027 roadmap calls for. The shape it
// establishes here (cached policy, deterministic verdict, deny-wins
// semantics, builtinChecks layered on top) is the template every
// subsequent interceptor (network, file read, secret access, git op)
// inherits.
//
// Performance contract: warm calls < 1ms. The policy is loaded once
// per project per session via the existing config-cache shape, then
// matcher predicates are compiled and cached as well. No I/O on the
// hot path.

export interface VerifyShellExecResult {
  /** The command the agent proposed to run, verbatim. */
  command: string;
  /** The verdict: 'allow' = ok to run; 'warn' = run but flagged;
   *  'deny' = MUST NOT run. The agent's prompt template treats deny
   *  as a hard stop. */
  verdict: 'allow' | 'warn' | 'deny';
  /** Why the firewall reached this verdict — one of:
   *  - 'denylist'      — matched the policy's `shellExec.deny` list
   *  - 'allowlist'     — matched the policy's `shellExec.allow` list
   *  - 'default'       — fell through to `shellExec.defaultAction`
   *  - 'builtin:<id>'  — caught by a built-in check (id is the
   *                      check category, e.g. 'destructive-rm')
   *  - 'no-policy'     — no `.deslint/policy.yml` found in the
   *                      project, so the firewall is a no-op (returns
   *                      verdict='allow', reason='no-policy'). */
  reason:
    | 'denylist'
    | 'allowlist'
    | 'default'
    | 'no-policy'
    | `builtin:${string}`;
  /** Human-readable message — what the agent should say to the user
   *  when surfacing the verdict. Mirrors the lint-message convention
   *  used by analyze_file / verify_before_write. */
  message: string;
  /** Optional pattern that matched (when reason is 'denylist' /
   *  'allowlist'). Lets the agent cite the policy line in its
   *  response: "blocked by `re:^pnpm publish` in your firewall
   *  policy." */
  matchedPattern?: string;
  /** Wall-clock cost of the verify call. Stays under 1ms warm so the
   *  agent never feels the firewall in its loop. */
  durationMs: number;
  /** Whether this result was served from the result cache. Identical
   *  (command, policy) pairs return instantly with cached:true. */
  cached: boolean;
}

/**
 * Built-in dangerous-pattern detectors. Each entry is a vetted
 * matcher we ship and update across the deslint ecosystem so users
 * don't have to maintain these regexes themselves. The category id
 * is what gets returned in `reason` as `builtin:<id>`.
 *
 * Patterns are conservative — false positives here mean the firewall
 * blocks legitimate work, which is the WORST thing it can do. We
 * deliberately err on the side of letting borderline cases through.
 *
 * Maintained here (not in policy-schema.ts) so the matchers can be
 * tuned without breaking the policy DSL's shape.
 */
const BUILTIN_SHELL_CHECKS: Record<string, { matcher: RegExp; message: string }> = {
  'destructive-rm': {
    // rm -rf /, rm -rf ~, rm -rf $HOME, rm -rf "/", and the leading-
    // path variants like `rm -rf / *`. Does NOT match `rm -rf
    // ./build` or `rm -rf node_modules` — those are legitimate.
    matcher: /\brm\s+(-[a-zA-Z]*r[a-zA-Z]*f|-[a-zA-Z]*f[a-zA-Z]*r|-rf|-fr|--recursive\s+--force)\s+(?:["']?(?:\/|~|\$HOME|\$\{HOME\})["']?(?:\s|$|\s*\*))/,
    message: 'destructive `rm -rf` targeting filesystem root, home, or HOME env var — blocked as a built-in check.',
  },
  'curl-pipe-shell': {
    // curl ... | sh / bash, wget ... | sh, and their variants. The
    // canonical "trust this random script to install itself" pattern.
    matcher: /\b(?:curl|wget|fetch)\b[^|]*\|\s*(?:bash|sh|zsh|ksh|fish|dash|cmd|powershell|pwsh)\b/,
    message: 'piping a network download into a shell interpreter — blocked. Download to a file, audit it, then run it.',
  },
  'sudo': {
    matcher: /(?:^|\s|;|&&|\|\|)sudo\s+/,
    message: '`sudo` invocation — flagged. Agents should not need root privileges; if this is intentional, allowlist explicitly.',
  },
  'history-rewrite': {
    matcher: /\bgit\s+(?:reset\s+--hard|filter-branch|push\s+(?:--force|-f)(?:\s|$)|filter-repo|reflog\s+expire)\b/,
    message: 'git history-rewriting command — blocked by default. These operations are destructive across collaborators.',
  },
  'process-substitution': {
    matcher: /(?:<|>)\((?:curl|wget|nc|ncat)\s/,
    message: 'process substitution invoking a network command — blocked. Common in obfuscated supply-chain exploits.',
  },
  'crypto-mining': {
    matcher: /\b(?:xmrig|cgminer|minerd|ethminer|cpuminer)\b/i,
    message: 'known cryptocurrency miner binary — blocked. If this is intentional, allowlist explicitly.',
  },
  'reverse-shell': {
    // nc -e, bash -i >& /dev/tcp/host/port, python -c 'socket...'
    // canonical reverse-shell patterns. Each is a known exploit sig.
    matcher: /(?:\bnc\b[^|]*\s-[a-z]*e\b|\bbash\b[^|]*-i[^|]*>&\s*\/dev\/tcp\/|python\s+-c\s+["'][^"']*socket[^"']*connect)/,
    message: 'reverse-shell pattern detected — blocked. This signature is associated with active exploitation.',
  },
};

/**
 * Compiled-matcher cache. Keyed by `${policyHash}:${section}` — when
 * the policy file content is unchanged, matcher predicates are
 * compiled ONCE and reused across every shell-exec call. Cleared
 * (along with everything else) by `_resetCaches`.
 */
interface CompiledShellPolicy {
  denyMatch: (cmd: string) => boolean;
  allowMatch: (cmd: string) => boolean;
  denyPatterns: readonly string[];
  allowPatterns: readonly string[];
}
const SHELL_POLICY_CACHE = new Map<string, CompiledShellPolicy>();
const POLICY_FILE_CACHE = new Map<string, { policy: any | null; loadedAt: number }>();
const POLICY_TTL_MS = 5_000; // re-read the file at most every 5 seconds

const SHELL_RESULT_CACHE = new Map<string, VerifyShellExecResult>();
const SHELL_RESULT_CACHE_MAX = 256;

async function loadPolicyForProject(projectDir: string): Promise<any | null> {
  const cached = POLICY_FILE_CACHE.get(projectDir);
  if (cached && Date.now() - cached.loadedAt < POLICY_TTL_MS) {
    return cached.policy;
  }

  const ymlPath = join(projectDir, '.deslint', 'policy.yml');
  const yamlPath = join(projectDir, '.deslint', 'policy.yaml');
  const jsonPath = join(projectDir, '.deslint', 'policy.json');

  let raw: string | null = null;
  let format: 'yaml' | 'json' = 'json';
  for (const [path, fmt] of [
    [ymlPath, 'yaml'],
    [yamlPath, 'yaml'],
    [jsonPath, 'json'],
  ] as const) {
    if (existsSync(path)) {
      try {
        raw = readFileSync(path, 'utf-8');
        format = fmt;
        break;
      } catch { /* keep trying */ }
    }
  }

  if (raw === null) {
    POLICY_FILE_CACHE.set(projectDir, { policy: null, loadedAt: Date.now() });
    return null;
  }

  // YAML is parsed via `js-yaml`, which is already shipped as a
  // transitive dependency of @deslint/shared (the budget loader uses
  // the same parser). JSON policies parse directly with no extra
  // module load.
  let parsed: unknown;
  try {
    if (format === 'json') {
      parsed = JSON.parse(raw);
    } else {
      try {
        const yamlMod = (await import('js-yaml')) as {
          load?: (s: string) => unknown;
          default?: { load?: (s: string) => unknown };
        };
        const loadFn = yamlMod.load ?? yamlMod.default?.load;
        if (!loadFn) {
          POLICY_FILE_CACHE.set(projectDir, { policy: null, loadedAt: Date.now() });
          return null;
        }
        parsed = loadFn(raw);
      } catch {
        POLICY_FILE_CACHE.set(projectDir, { policy: null, loadedAt: Date.now() });
        return null;
      }
    }
  } catch {
    POLICY_FILE_CACHE.set(projectDir, { policy: null, loadedAt: Date.now() });
    return null;
  }

  const { safeParsePolicy } = await import('@deslint/shared');
  const result = safeParsePolicy(parsed);
  const policy = result.success ? result.data : null;
  POLICY_FILE_CACHE.set(projectDir, { policy, loadedAt: Date.now() });
  return policy;
}

function getCompiledShellPolicy(projectDir: string, policy: any): CompiledShellPolicy {
  const policyJson = JSON.stringify(policy?.shellExec ?? {});
  const hash = createHash('sha1').update(projectDir).update(':').update(policyJson).digest('hex');
  const cached = SHELL_POLICY_CACHE.get(hash);
  if (cached) return cached;

  // Inline implementation of compileMatchers — kept here to avoid the
  // dynamic import on the hot path. (We're already importing
  // `safeParsePolicy` lazily; importing the matcher every call would
  // add latency. The compiled cache makes this a one-time cost per
  // session per policy version.)
  const compile = (patterns: readonly string[]) => {
    const literals = new Set<string>();
    const regexes: RegExp[] = [];
    for (const p of patterns) {
      if (p.startsWith('re:')) {
        try { regexes.push(new RegExp(p.slice(3))); } catch { /* skip malformed */ }
      } else {
        literals.add(p);
      }
    }
    return (input: string) => {
      if (literals.has(input)) return true;
      for (const re of regexes) if (re.test(input)) return true;
      return false;
    };
  };

  const denyPatterns = (policy?.shellExec?.deny ?? []) as readonly string[];
  const allowPatterns = (policy?.shellExec?.allow ?? []) as readonly string[];
  const compiled: CompiledShellPolicy = {
    denyMatch: compile(denyPatterns),
    allowMatch: compile(allowPatterns),
    denyPatterns,
    allowPatterns,
  };
  SHELL_POLICY_CACHE.set(hash, compiled);
  return compiled;
}

/**
 * Find the first matching deny/allow pattern, returning the pattern
 * string so the verdict's `matchedPattern` field is populated.
 * (compileMatchers returns a boolean predicate; we need the source
 * pattern for the report.)
 */
function findMatchingPattern(patterns: readonly string[], input: string): string | null {
  for (const p of patterns) {
    if (p.startsWith('re:')) {
      try {
        if (new RegExp(p.slice(3)).test(input)) return p;
      } catch { /* skip malformed */ }
    } else if (p === input) {
      return p;
    }
  }
  return null;
}

export async function verifyShellExec(params: {
  command: string;
  projectDir?: string;
}): Promise<VerifyShellExecResult> {
  const t0 = performance.now();
  const projectDir = resolve(params.projectDir ?? process.cwd());
  const command = params.command;

  // Length cap mirrors the existing 10 MB content cap on
  // verify_before_write — but shell commands shouldn't approach that.
  // 32 KB is generous and lets us cache cheaply.
  if (command.length > 32 * 1024) {
    throw new Error(`Proposed shell command too long (${command.length} bytes). Maximum: 32 KB.`);
  }

  // Result cache: (projectDir, command) → verdict
  const cacheKey = `${projectDir}\x00${command}`;
  const hit = SHELL_RESULT_CACHE.get(cacheKey);
  if (hit) {
    return { ...hit, cached: true, durationMs: Math.round((performance.now() - t0) * 100) / 100 };
  }

  const policy = await loadPolicyForProject(projectDir);

  if (!policy) {
    const result: VerifyShellExecResult = {
      command,
      verdict: 'allow',
      reason: 'no-policy',
      message:
        'No `.deslint/policy.yml` found in this project — the firewall is a no-op. Add a policy file to start enforcing shell-exec rules.',
      durationMs: Math.round((performance.now() - t0) * 100) / 100,
      cached: false,
    };
    cacheShellResult(cacheKey, result);
    return result;
  }

  const compiled = getCompiledShellPolicy(projectDir, policy);
  const shellPolicy = policy.shellExec;

  // 1. deny list wins
  const denyMatch = findMatchingPattern(compiled.denyPatterns, command);
  if (denyMatch) {
    const result: VerifyShellExecResult = {
      command,
      verdict: 'deny',
      reason: 'denylist',
      matchedPattern: denyMatch,
      message: `Blocked by your firewall policy (\`shellExec.deny\` matched \`${denyMatch}\`).`,
      durationMs: Math.round((performance.now() - t0) * 100) / 100,
      cached: false,
    };
    cacheShellResult(cacheKey, result);
    return result;
  }

  // 2. allow list permits
  const allowMatch = findMatchingPattern(compiled.allowPatterns, command);
  if (allowMatch) {
    const result: VerifyShellExecResult = {
      command,
      verdict: 'allow',
      reason: 'allowlist',
      matchedPattern: allowMatch,
      message: `Permitted by your firewall policy (\`shellExec.allow\` matched \`${allowMatch}\`).`,
      durationMs: Math.round((performance.now() - t0) * 100) / 100,
      cached: false,
    };
    cacheShellResult(cacheKey, result);
    return result;
  }

  // 3. built-in checks (always layered on top — even when defaultAction='allow')
  const builtinList: string[] = shellPolicy?.builtinChecks ?? ['destructive-rm', 'curl-pipe-shell', 'reverse-shell'];
  for (const checkId of builtinList) {
    const check = BUILTIN_SHELL_CHECKS[checkId];
    if (!check) continue;
    if (check.matcher.test(command)) {
      const result: VerifyShellExecResult = {
        command,
        verdict: 'deny',
        reason: `builtin:${checkId}`,
        message: check.message,
        durationMs: Math.round((performance.now() - t0) * 100) / 100,
        cached: false,
      };
      cacheShellResult(cacheKey, result);
      return result;
    }
  }

  // 4. fallthrough — defaultAction decides
  const defaultAction = (shellPolicy?.defaultAction ?? 'warn') as 'allow' | 'warn' | 'deny';
  const result: VerifyShellExecResult = {
    command,
    verdict: defaultAction,
    reason: 'default',
    message:
      defaultAction === 'allow'
        ? 'Command not on any list; firewall defaults to allow.'
        : defaultAction === 'deny'
          ? `Command not on the allow list; firewall defaults to deny. Add it to \`shellExec.allow\` if intentional.`
          : 'Command not on any list; firewall defaults to warn. Review before running, or add to `shellExec.allow` to silence.',
    durationMs: Math.round((performance.now() - t0) * 100) / 100,
    cached: false,
  };
  cacheShellResult(cacheKey, result);
  return result;
}

function cacheShellResult(key: string, result: VerifyShellExecResult): void {
  if (SHELL_RESULT_CACHE.size >= SHELL_RESULT_CACHE_MAX) {
    const oldest = SHELL_RESULT_CACHE.keys().next().value;
    if (oldest !== undefined) SHELL_RESULT_CACHE.delete(oldest);
  }
  SHELL_RESULT_CACHE.set(key, result);
}

/**
 * Test-only: clear the firewall's per-session caches alongside the
 * existing _resetCaches. Exported here rather than added to that
 * function so the tests can wipe only the firewall state when they
 * want to.
 */
export function _resetFirewallCaches(): void {
  SHELL_POLICY_CACHE.clear();
  POLICY_FILE_CACHE.clear();
  SHELL_RESULT_CACHE.clear();
}
