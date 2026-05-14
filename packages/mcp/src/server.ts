import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { VERSION } from './index.js';
import { analyzeFile, analyzeProject, analyzeAndFix, complianceCheck, getRuleDetails, suggestFixStrategy, enforceBudget, verifyBeforeWrite, scanDiff, quickCheck, getServerStats, preloadFastPath, verifyShellExec } from './tools.js';

function ok<T extends object>(data: T) {
  return {
    content: [
      { type: 'text' as const, text: JSON.stringify(data, null, 2) },
    ],
    structuredContent: data as unknown as Record<string, unknown>,
  };
}

function fail(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return {
    content: [{ type: 'text' as const, text: JSON.stringify({ error: message }) }],
    structuredContent: { error: message },
    isError: true,
  };
}

const violationSchema = z.object({
  ruleId: z.string(),
  message: z.string(),
  severity: z.enum(['error', 'warning']),
  line: z.number().int(),
  column: z.number().int(),
  endLine: z.number().int().optional(),
  endColumn: z.number().int().optional(),
  fix: z
    .object({
      range: z.tuple([z.number().int(), z.number().int()]),
      text: z.string(),
    })
    .optional(),
});

const errorSchema = z.object({ error: z.string() });

export function createServer(): McpServer {
  const server = new McpServer({
    name: 'deslint',
    version: VERSION,
  });

  const readOnlyAnnotations = {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  };

  server.registerTool(
    'analyze_file',
    {
      title: 'Analyze File for Design Violations',
      description:
        'Lint a single file for design-quality violations. Returns violations with line numbers, severity, rule IDs, and a file-level score (0-100). ' +
        'Use this when the agent has just generated or edited a single file and wants to verify it follows the project\'s design rules. ' +
        'Do NOT use this to scan a whole project \u2014 prefer `analyze_project`. ' +
        'Never sends source code to external services.',
      annotations: { ...readOnlyAnnotations, title: 'Analyze File for Design Violations' },
      inputSchema: {
        filePath: z.string().max(1024).describe('Path to the file to analyze (relative to projectDir or absolute).'),
        projectDir: z.string().max(1024).optional().describe('Project root directory. Defaults to current working directory.'),
        strict: z
          .boolean()
          .optional()
          .describe(
            'When true, every reported violation is promoted to error severity before counting. Set this when the caller is an AI coding agent that wants a stricter bar than the default warn/error mix. Defaults to false.',
          ),
      },
      outputSchema: {
        filePath: z.string(),
        violations: z.array(violationSchema),
        score: z.number(),
        totalErrors: z.number().int(),
        totalWarnings: z.number().int(),
      },
    },
    async (params) => {
      try {
        const result = await analyzeFile({
          filePath: params.filePath,
          projectDir: params.projectDir,
          strict: params.strict,
        });
        return ok(result);
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.registerTool(
    'verify_before_write',
    {
      title: 'Verify Proposed File Content BEFORE Writing It',
      description:
        'Lint candidate code BEFORE writing it to disk. The agent passes the proposed content; the server lints it (in-process, no temp file, no engine spin-up — typically under 5ms warm) and returns pass/fail + violations + a one-line recommended action. ' +
        'PRIMARY USE: call this immediately before every file write the agent makes. ' +
        '`recommendedAction` semantics — `ok-to-write` → write the file; `ok-with-warnings` → ALSO write the file (the warnings are advisory, do NOT retry); `fix-and-retry` → fix the violations and call again ONCE; `consult-user` → the violations require a token decision the agent cannot make alone, surface them. ' +
        'Identical-content re-calls return from cache instantly (`cached: true`) — agents in retry loops should short-circuit on that signal. ' +
        'Pass `strict: true` to promote warnings to errors — recommended for AI-generated code. ' +
        'Use `severityFloor: "error"` to skip warnings entirely (smaller payload, no temptation to retry on advisory drift). Use `categories: [...]` to scope the response to specific rule categories. ' +
        'Never sends source code to external services.',
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
        title: 'Verify Proposed File Content BEFORE Writing It',
      },
      inputSchema: {
        filePath: z.string().max(1024).describe('Path the file WILL be written to (relative to projectDir or absolute). May or may not exist on disk yet.'),
        proposedContent: z.string().max(10 * 1024 * 1024).describe('The candidate file content the agent intends to write. Max 10 MB.'),
        projectDir: z.string().max(1024).optional().describe('Project root directory. Defaults to current working directory.'),
        strict: z.boolean().optional().describe('When true, warnings are promoted to errors. Recommended for AI-generated code.'),
        severityFloor: z.enum(['error', 'warn']).optional().describe('Drop violations below this severity from the response. Default `warn` (everything reported). `error` shrinks the payload AND removes the temptation to retry on advisory drift.'),
        categories: z.array(z.string()).max(20).optional().describe('Restrict reported violations to these rule categories (e.g. `["backend-safety","ai-coding"]`). Categories: colors, spacing, typography, consistency, responsive, frontend-safety, backend-safety, nextjs, ai-coding.'),
      },
      outputSchema: {
        filePath: z.string(),
        passed: z.boolean(),
        violations: z.array(violationSchema),
        score: z.number(),
        totalErrors: z.number().int(),
        totalWarnings: z.number().int(),
        recommendedAction: z.enum(['ok-to-write', 'ok-with-warnings', 'fix-and-retry', 'consult-user']),
        durationMs: z.number(),
        cached: z.boolean(),
      },
    },
    async (params) => {
      try {
        const result = await verifyBeforeWrite({
          filePath: params.filePath,
          proposedContent: params.proposedContent,
          projectDir: params.projectDir,
          strict: params.strict,
          severityFloor: params.severityFloor,
          categories: params.categories,
        });
        return ok(result);
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.registerTool(
    'quick_check',
    {
      title: 'Quick Yes/No Lint Check (sub-200-byte payload)',
      description:
        'Minimal-cost lint check. Returns just `{ clean, errorCount, warningCount, durationMs, cached }` for the proposed content — no enumerated violations. ' +
        'PRIMARY USE: the agent\'s "is this even worth a full verify?" decision. Agents in tight loops should call quick_check first; if `clean: true`, skip the full verify_before_write entirely. ' +
        'Backed by the same fast path + result cache as verify_before_write — calling both for the same content is essentially free (the second call hits the cache).',
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
        title: 'Quick Yes/No Lint Check',
      },
      inputSchema: {
        filePath: z.string().max(1024).describe('Path the file WILL be written to (relative to projectDir or absolute).'),
        proposedContent: z.string().max(10 * 1024 * 1024).describe('The candidate file content. Max 10 MB.'),
        projectDir: z.string().max(1024).optional().describe('Project root directory. Defaults to current working directory.'),
        strict: z.boolean().optional().describe('When true, warnings count as errors for the `clean` boolean.'),
      },
      outputSchema: {
        filePath: z.string(),
        clean: z.boolean(),
        errorCount: z.number().int(),
        warningCount: z.number().int(),
        durationMs: z.number(),
        cached: z.boolean(),
      },
    },
    async (params) => {
      try {
        const result = await quickCheck({
          filePath: params.filePath,
          proposedContent: params.proposedContent,
          projectDir: params.projectDir,
          strict: params.strict,
        });
        return ok(result);
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.registerTool(
    'get_server_stats',
    {
      title: 'Get Per-Session MCP Server Stats',
      description:
        'Per-session telemetry: total verify calls, total wall-clock time spent linting, cache hit rate, average call cost. The /deslint-fix prompt template surfaces a budget warning when the cost crosses a threshold so the agent backs off rather than retrying indefinitely. Numbers reset only when the MCP server process restarts.',
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
        title: 'Get Per-Session MCP Server Stats',
      },
      inputSchema: {},
      outputSchema: {
        totalVerifyCalls: z.number().int(),
        totalVerifyMs: z.number(),
        cacheHits: z.number().int(),
        cacheMisses: z.number().int(),
        cacheHitRate: z.number().nullable(),
        avgVerifyMs: z.number().nullable(),
      },
    },
    async () => {
      try {
        return ok(getServerStats());
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.registerTool(
    'scan_diff',
    {
      title: 'Scan Files Changed in the Current Branch',
      description:
        'Lint only files changed against a base ref (default: origin/main). The result separates `newViolations` (introduced by changes in this branch) from `preExisting` (also fire on the base-ref version), so an agent or merge gate can hard-block on new failures without re-litigating legacy ones. ' +
        'PRIMARY USE: an agent reviewing a PR / its own diff should call this first — wasting a turn fixing pre-existing violations is the dominant agent-time leak in long-running sessions. ' +
        'Requires git in PATH and the base ref to be fetched. Temp files are written under the project directory and removed in a finally block.',
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
        title: 'Scan Files Changed in the Current Branch',
      },
      inputSchema: {
        projectDir: z.string().max(1024).optional().describe('Project root directory. Defaults to current working directory.'),
        baseRef: z.string().max(255).optional().describe('Git ref to compare against (e.g. `origin/main`, `main`, a commit SHA). Defaults to `origin/main`.'),
        maxFiles: z.number().int().min(1).max(5000).optional().describe('Maximum number of changed files to lint. Defaults to 200.'),
      },
      outputSchema: {
        projectDir: z.string(),
        baseRef: z.string(),
        totalChangedFiles: z.number().int(),
        totalNewViolations: z.number().int(),
        totalPreExistingViolations: z.number().int(),
        newViolations: z.array(
          violationSchema.extend({
            filePath: z.string(),
            status: z.enum(['new', 'pre-existing']),
          }),
        ),
        preExisting: z.array(
          violationSchema.extend({
            filePath: z.string(),
            status: z.enum(['new', 'pre-existing']),
          }),
        ),
      },
    },
    async (params) => {
      try {
        const result = await scanDiff({
          projectDir: params.projectDir,
          baseRef: params.baseRef,
          maxFiles: params.maxFiles,
        });
        return ok(result);
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.registerTool(
    'analyze_project',
    {
      title: 'Analyze Project Design Health',
      description:
        'Scan an entire project for design-quality violations. Returns a Design Health Score (0-100) with per-category breakdowns ' +
        '(colors, spacing, typography, responsive, consistency) and the top 10 violations. ' +
        'Use this once at the start of a refactor/audit to size the work; paginate follow-ups via `maxFiles`. ' +
        'Never sends source code to external services.',
      annotations: { ...readOnlyAnnotations, title: 'Analyze Project Design Health' },
      inputSchema: {
        projectDir: z.string().max(1024).optional().describe('Project root directory. Defaults to current working directory.'),
        maxFiles: z.number().int().min(1).max(5000).optional().describe('Maximum number of files to scan. Defaults to 200.'),
      },
      outputSchema: {
        projectDir: z.string(),
        overallScore: z.number(),
        grade: z.string(),
        totalFiles: z.number().int(),
        filesWithIssues: z.number().int(),
        totalViolations: z.number().int(),
        categories: z.record(z.string(), z.object({ score: z.number(), violations: z.number().int() })),
        topViolations: z.array(violationSchema),
      },
    },
    async (params) => {
      try {
        const result = await analyzeProject({
          projectDir: params.projectDir,
          maxFiles: params.maxFiles,
        });
        return ok(result);
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.registerTool(
    'analyze_and_fix',
    {
      title: 'Preview Auto-fixes for a File',
      description:
        'Analyze a file and return the auto-fixed version. Returns both the fixed code and any remaining violations that require manual attention. ' +
        'This tool is read-only: it NEVER modifies the file on disk. The agent is expected to apply the returned `fixedCode` itself. ' +
        'Use this after `analyze_file` reports fixable violations. Never sends source code to external services.',
      annotations: { ...readOnlyAnnotations, title: 'Preview Auto-fixes for a File' },
      inputSchema: {
        filePath: z.string().max(1024).describe('Path to the file to analyze and fix (relative to projectDir or absolute).'),
        projectDir: z.string().max(1024).optional().describe('Project root directory. Defaults to current working directory.'),
      },
      outputSchema: {
        filePath: z.string(),
        fixedCode: z.string(),
        fixedViolations: z.number().int(),
        remainingViolations: z.array(violationSchema),
        hasChanges: z.boolean(),
      },
    },
    async (params) => {
      try {
        const result = await analyzeAndFix({
          filePath: params.filePath,
          projectDir: params.projectDir,
        });
        const response = {
          filePath: result.filePath,
          fixedCode: result.fixedCode,
          fixedViolations: result.fixedViolations,
          remainingViolations: result.remainingViolations,
          hasChanges: result.originalCode !== result.fixedCode,
        };
        return ok(response);
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.registerTool(
    'compliance_check',
    {
      title: 'WCAG 2.2 Compliance Check',
      description:
        'Run a WCAG 2.2 compliance evaluation on a project. Returns per-criterion pass/fail status, the conformance level reached ' +
        '(A / AA / AAA / none), and the WCAG 2.1 AA equivalence (ADA Title II legal floor). ' +
        'Use this to generate accessibility audit reports or to verify a release meets legal compliance requirements.',
      annotations: { ...readOnlyAnnotations, title: 'WCAG 2.2 Compliance Check' },
      inputSchema: {
        projectDir: z.string().max(1024).optional().describe('Project root directory. Defaults to current working directory.'),
        maxFiles: z.number().int().min(1).max(5000).optional().describe('Maximum number of files to scan. Defaults to 200.'),
      },
      outputSchema: {
        projectDir: z.string(),
        levelReached: z.string(),
        wcag21LevelReached: z.string(),
        coveragePercent: z.number(),
        passRatePercent: z.number(),
        totalViolations: z.number().int(),
        summary: z.object({
          evaluated: z.number().int(),
          passed: z.number().int(),
          failed: z.number().int(),
          notEvaluated: z.number().int(),
        }),
        criteria: z.array(
          z.object({
            id: z.string(),
            title: z.string(),
            level: z.string(),
            status: z.enum(['pass', 'fail', 'not-evaluated']),
            violations: z.number().int(),
            description: z.string(),
          }),
        ),
      },
    },
    async (params) => {
      try {
        const result = await complianceCheck({
          projectDir: params.projectDir,
          maxFiles: params.maxFiles,
        });
        return ok(result);
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.registerTool(
    'get_rule_details',
    {
      title: 'Get Deslint Rule Details',
      description:
        'Get detailed metadata for a specific Deslint rule: description, category, auto-fix capability, remediation effort estimate, ' +
        'WCAG mapping, and documentation URL.',
      annotations: { ...readOnlyAnnotations, title: 'Get Deslint Rule Details' },
      inputSchema: {
        ruleId: z.string().max(128).describe('Rule ID (e.g. "no-arbitrary-colors" or "deslint/no-arbitrary-colors").'),
      },
      outputSchema: {
        ruleId: z.string(),
        description: z.string(),
        category: z.string(),
        autoFixable: z.boolean(),
        effortMinutes: z.number(),
        wcagCriteria: z.array(z.object({ id: z.string(), title: z.string(), level: z.string() })),
        defaultSeverity: z.string(),
        docsUrl: z.string(),
      },
    },
    async (params) => {
      try {
        const result = await getRuleDetails({ ruleId: params.ruleId });
        return ok(result);
      } catch (err) {
        return fail(err);
      }
    },
  );

  // v0.6 agent-loop veto. Agents SHOULD call this before declaring a task
  // complete. Rejection returns {allowed: false} + suggestedEdits; agent
  // self-corrects and re-calls. The Action runs the same evaluation
  // server-side on the merge commit \u2014 the backstop against spoofing.
  server.registerTool(
    'enforce_budget',
    {
      title: 'Enforce Error Budget (pre-write veto)',
      description:
        'Evaluate a Deslint scan against an error budget (`.deslint/budget.yml` or `.deslint/budget.json`) and return a strict ' +
        '`allowed: true/false` decision. Use this BEFORE declaring a coding task complete on any frontend file \u2014 a ' +
        'rejection returns suggested edits the agent should apply, then re-call this tool until `allowed: true`. ' +
        'The GitHub Action re-runs the same evaluation on the merge commit, so this cannot be spoofed by the agent. ' +
        'Never sends source code to external services.',
      annotations: { ...readOnlyAnnotations, title: 'Enforce Error Budget' },
      inputSchema: {
        projectDir: z.string().max(1024).optional().describe('Project root directory. Defaults to current working directory.'),
        files: z.array(z.string().max(1024)).max(5000).optional()
          .describe('Optional file list to narrow the scan (relative to projectDir or absolute). When omitted, scans the whole project.'),
        budgetPath: z.string().max(1024).optional()
          .describe('Optional explicit path to the budget file. When omitted, probes .deslint/budget.yml \u2192 .yaml \u2192 .json.'),
        maxFiles: z.number().int().min(1).max(5000).optional()
          .describe('Maximum number of files to scan when `files` is not provided. Defaults to 200.'),
      },
      outputSchema: {
        allowed: z.boolean(),
        enforced: z.boolean(),
        reasons: z.array(
          z.object({
            condition: z.string(),
            message: z.string(),
            threshold: z.number(),
            actual: z.number(),
            category: z.string().optional(),
            ruleId: z.string().optional(),
          }),
        ),
        suggestedEdits: z.array(
          z.object({
            ruleId: z.string(),
            message: z.string(),
            autoFixable: z.boolean(),
            command: z.string().optional(),
          }),
        ),
        score: z.object({
          overall: z.number(),
          grade: z.string(),
          categories: z.record(z.string(), z.object({ score: z.number(), violations: z.number().int() })),
          totalViolations: z.number().int(),
          debtMinutes: z.number(),
        }),
        budgetPath: z.string().optional(),
        filesScanned: z.number().int(),
        trailer: z.string(),
      },
    },
    async (params) => {
      try {
        const result = await enforceBudget({
          projectDir: params.projectDir,
          files: params.files,
          budgetPath: params.budgetPath,
          maxFiles: params.maxFiles,
        });
        return ok(result);
      } catch (err) {
        return fail(err);
      }
    },
  );

  server.registerTool(
    'suggest_fix_strategy',
    {
      title: 'Suggest Fix Strategy (impact per effort)',
      description:
        'Analyze a project and suggest which design violations to fix first, ordered by impact-per-effort ratio. ' +
        'Prioritizes quick wins (auto-fixable, high-count rules) over manual, low-count fixes.',
      annotations: { ...readOnlyAnnotations, title: 'Suggest Fix Strategy' },
      inputSchema: {
        projectDir: z.string().max(1024).optional().describe('Project root directory. Defaults to current working directory.'),
        maxFiles: z.number().int().min(1).max(5000).optional().describe('Maximum number of files to scan. Defaults to 200.'),
        maxSuggestions: z.number().int().min(1).max(100).optional().describe('Maximum number of fix suggestions to return. Defaults to 10.'),
      },
      outputSchema: {
        projectDir: z.string(),
        overallScore: z.number(),
        totalViolations: z.number().int(),
        suggestions: z.array(
          z.object({
            ruleId: z.string(),
            count: z.number().int(),
            autoFixable: z.boolean(),
            totalEffortMinutes: z.number(),
            impactScore: z.number(),
            recommendation: z.string(),
          }),
        ),
        totalEffortMinutes: z.number(),
      },
    },
    async (params) => {
      try {
        const result = await suggestFixStrategy({
          projectDir: params.projectDir,
          maxFiles: params.maxFiles,
          maxSuggestions: params.maxSuggestions,
        });
        return ok(result);
      } catch (err) {
        return fail(err);
      }
    },
  );

  // ─── Resources ──────────────────────────────────────────────────
  //
  // MCP supports three primitives — tools, resources, prompts. Agents
  // can fetch resources up front, cache them, and consult them between
  // tool calls without re-asking the server. Exposing the rule
  // taxonomy as a resource lets the agent read the full set once
  // (instead of N `get_rule_details` calls) and reason about which
  // rules might fire on the file it's about to write.
  //
  //   deslint://rules            — JSON index of every rule
  //   deslint://rules/{slug}     — per-rule docs (description + WCAG)
  //
  // The data comes from the same `getRuleDetails` engine the tool
  // surface uses, so there's no duplication or drift between the
  // resource and the tool view.

  const RULES_INDEX_URI = 'deslint://rules';
  const RULE_DETAIL_URI_TEMPLATE = 'deslint://rules/{slug}';

  server.registerResource(
    'rules-index',
    RULES_INDEX_URI,
    {
      title: 'Deslint rule index',
      description:
        'JSON index of every Deslint rule (id, category, default severity, auto-fix support, WCAG mapping, docs URL). Fetch once; consult between tool calls instead of issuing N `get_rule_details` requests.',
      mimeType: 'application/json',
    },
    async () => {
      const { getAllRuleDetails } = await import('./tools.js');
      const rules = await getAllRuleDetails();
      return {
        contents: [
          {
            uri: RULES_INDEX_URI,
            mimeType: 'application/json',
            text: JSON.stringify({ rules }, null, 2),
          },
        ],
      };
    },
  );

  server.registerResource(
    'rule-detail',
    new ResourceTemplate(RULE_DETAIL_URI_TEMPLATE, { list: undefined }),
    {
      title: 'Deslint rule documentation',
      description:
        'Per-rule documentation. Replace `{slug}` with a rule id (e.g. `deslint://rules/no-arbitrary-colors`). Returns the rule\'s description, category, default severity, auto-fix support, WCAG mapping, and docs URL.',
      mimeType: 'application/json',
    },
    async (uri, { slug }) => {
      const ruleId = Array.isArray(slug) ? slug[0] : slug;
      const result = await getRuleDetails({ ruleId });
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    },
  );

  // ─── Prompt template: /deslint-fix ─────────────────────────────
  //
  // Prompts are templated workflows the user can invoke as a slash
  // command in MCP-aware UIs (Claude Desktop, Cursor, Windsurf). The
  // /deslint-fix prompt primes the agent for a structured
  // analyze → fix → verify loop — the same workflow every "clean up
  // this file" interaction collapses into anyway, made explicit so
  // it's discoverable and consistent across agents.

  server.registerPrompt(
    'deslint-fix',
    {
      title: 'Fix Deslint violations in a file (cost-aware)',
      description:
        'Run a cost-aware fix loop on a file. The agent leads with `quick_check` to skip clean files for free, calls `verify_before_write` AT MOST ONCE for the actual fix, and treats `ok-with-warnings` as ship-it (no retry on advisory drift). Designed to NOT slow down the user — at most one retry, never an indefinite verification loop.',
      argsSchema: {
        filePath: z.string().describe('Path to the file to clean up.'),
        strict: z
          .string()
          .optional()
          .describe('Set to "true" to promote warnings to errors throughout the loop.'),
      },
    },
    ({ filePath, strict }) => {
      const wantStrict = strict === 'true';
      const strictArg = wantStrict ? ', strict: true' : '';
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text:
                `Clean up Deslint violations in \`${filePath}\` using this COST-AWARE loop. ` +
                `The whole point is not to slow the user down with retry-heavy verification — ` +
                `you run AT MOST ONE fix attempt, then ship.\n\n` +

                `1. **Skip clean files for free.** Read the file. Call ` +
                `\`quick_check({ filePath: "${filePath}", proposedContent: <current>${strictArg} })\`. ` +
                `If \`clean: true\` → exit immediately, the file is already passing.\n\n` +

                `2. **Read the violations.** Call ` +
                `\`analyze_file({ filePath: "${filePath}"${strictArg} })\` ONCE for the full list. ` +
                `For each unfamiliar rule, fetch \`deslint://rules/{slug}\` (or call ` +
                `\`get_rule_details\`) so you understand the fix shape — but reuse the result; ` +
                `do not re-fetch the same rule.\n\n` +

                `3. **Fix in one pass.** Apply auto-fixable, token-for-token substitutions ` +
                `directly. For each non-auto-fix violation, propose the manual edit consistent ` +
                `with the project's design tokens. Combine all fixes into a single candidate.\n\n` +

                `4. **Verify ONCE.** Call ` +
                `\`verify_before_write({ filePath: "${filePath}", proposedContent: <candidate>${strictArg} })\`. ` +
                `Then act on \`recommendedAction\`:\n` +
                `   - \`ok-to-write\` → write the file.\n` +
                `   - \`ok-with-warnings\` → **also write the file**. Warnings are advisory; ` +
                `do NOT retry. Mention the warnings in your response so the user knows.\n` +
                `   - \`fix-and-retry\` → ONE more attempt is allowed. Apply the corrections ` +
                `the violations point at, call \`verify_before_write\` again. If still not ` +
                `\`ok-to-write\` or \`ok-with-warnings\`, write the file anyway and report the ` +
                `remaining violations to the user — do NOT loop indefinitely.\n` +
                `   - \`consult-user\` → write the file, but flag the token-decision violations ` +
                `for the user to resolve. Do not guess at design-token choices.\n\n` +

                `5. **Report cost.** When done, call \`get_server_stats\` and include ` +
                `\`totalVerifyMs\` in your response (e.g. "deslint cost 12ms this turn"). The ` +
                `user wants to see the verification overhead is small.\n\n` +

                `**Hard rule: never call \`verify_before_write\` more than twice for the same ` +
                `file in one turn.** If you hit two attempts and still see violations, ship ` +
                `what you have and surface the remaining issues — re-trying further is what ` +
                `frustrates users about MCP-driven linting.`,
            },
          },
        ],
      };
    },
  );

  // ─── Agent Action Firewall: verify_shell_exec ───────────────────
  //
  // The first interceptor of the v0.10 "verify_before_*" family.
  // Agent calls this BEFORE running any shell command; firewall
  // consults `.deslint/policy.yml` and returns a deterministic
  // verdict. Sub-1ms warm; identical (command, project) pairs return
  // from cache instantly.
  server.registerTool(
    'verify_shell_exec',
    {
      title: 'Verify a Shell Command Before the Agent Runs It (Agent Firewall)',
      description:
        'Pre-execution gate for shell commands. The agent passes the candidate command; the server consults `.deslint/policy.yml` and returns a deterministic verdict (`allow` | `warn` | `deny`) + reason + matched pattern. ' +
        'PRIMARY USE: call this immediately before EVERY shell command the agent runs. If `verdict: "deny"` → DO NOT RUN the command and surface the reason to the user. If `"warn"` → run it but flag in the response. If `"allow"` → run normally. ' +
        'Reasons explained: `denylist` (policy explicitly blocks), `allowlist` (policy explicitly permits), `default` (fell through to `defaultAction`), `builtin:<id>` (caught by a built-in dangerous-pattern check — `destructive-rm`, `curl-pipe-shell`, `reverse-shell`, etc.), `no-policy` (no `.deslint/policy.yml` found; firewall is a no-op). ' +
        'Identical (command, project) pairs return from cache instantly with `cached: true` — safe to call as a guard before every exec, no perf concern. ' +
        'Never sends source code to external services. The shell command stays local.',
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
        title: 'Verify a Shell Command Before the Agent Runs It',
      },
      inputSchema: {
        command: z.string().min(1).max(32 * 1024).describe('The candidate shell command the agent intends to run, verbatim (rendered string, not argv). Max 32 KB.'),
        projectDir: z.string().max(1024).optional().describe('Project root directory. Defaults to current working directory. The firewall reads policy from `<projectDir>/.deslint/policy.yml` (or .yaml / .json).'),
      },
      outputSchema: {
        command: z.string(),
        verdict: z.enum(['allow', 'warn', 'deny']),
        reason: z.string(),
        message: z.string(),
        matchedPattern: z.string().optional(),
        durationMs: z.number(),
        cached: z.boolean(),
      },
    },
    async (params) => {
      try {
        const result = await verifyShellExec({
          command: params.command,
          projectDir: params.projectDir,
        });
        return ok(result);
      } catch (err) {
        return fail(err);
      }
    },
  );

  return server;
}

export async function startServer(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  // Eat the ~1s plugin/parser-import cost ONCE on startup, before
  // the agent's first call. The agent's first `verify_before_write`
  // would otherwise pay it. Fire-and-forget so a failure (e.g.
  // a project without an eslint.config) doesn't block the server.
  preloadFastPath().catch(() => { /* warm cache best-effort */ });
  await server.connect(transport);
}

export { errorSchema };
