import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { VERSION } from './index.js';
import { analyzeFile, analyzeProject, analyzeAndFix, complianceCheck, getRuleDetails, suggestFixStrategy, enforceBudget } from './tools.js';

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

  return server;
}

export async function startServer(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

export { errorSchema };
