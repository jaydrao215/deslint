/**
 * MCP Server — wires Deslint tools to the Model Context Protocol.
 *
 * Transport: stdio (JSON-RPC 2.0), zero network calls.
 * Tools: analyze_file, analyze_project, analyze_and_fix,
 *        compliance_check, get_rule_details, suggest_fix_strategy
 *
 * Anthropic-standard features (2025/2026 spec):
 *  - `registerTool` API (replaces the deprecated `server.tool(...)` shape)
 *  - `title` — human-readable label shown in MCP-aware UIs
 *  - `annotations` — readOnlyHint / destructiveHint / idempotentHint / openWorldHint
 *    so clients can safely skip confirmation prompts on pure-read tools
 *  - `outputSchema` — Zod schema of the response, mirrored in `structuredContent`
 *    so agents can parse results without regex-ing stringified JSON
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { VERSION } from './index.js';
import { analyzeFile, analyzeProject, analyzeAndFix, complianceCheck, getRuleDetails, suggestFixStrategy } from './tools.js';

// ── Shared response builder ──────────────────────────────────────────
//
// Every Deslint tool returns the same shape:
//   - `content`: a single text block with pretty-printed JSON, so agents
//     that haven't implemented `structuredContent` parsing still work.
//   - `structuredContent`: the same payload as a typed object, matching
//     the tool's `outputSchema`. Modern MCP clients (Claude Code, Cursor)
//     prefer this.
//
// Errors get `isError: true` + a structured `{ error: string }` payload
// so agents can recover deterministically.
function ok<T extends object>(data: T) {
  return {
    content: [
      { type: 'text' as const, text: JSON.stringify(data, null, 2) },
    ],
    // SDK types the structured payload as Record<string, unknown>; our
    // tool-result interfaces are plain object types which are structurally
    // compatible at runtime but not assignable. Cast once, here, instead of
    // weakening every interface with an index signature.
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

// ── Reusable output-schema fragments ─────────────────────────────────

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

/**
 * Create an MCP server with all Deslint tools registered.
 */
export function createServer(): McpServer {
  const server = new McpServer({
    name: 'deslint',
    version: VERSION,
  });

  // Every Deslint tool is read-only, idempotent, and closed-world (it never
  // touches the network). Declaring these annotations lets MCP clients skip
  // confirmation prompts for repeated calls during an agent loop.
  const readOnlyAnnotations = {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  };

  // ── Tool: analyze_file ──────────────────────────────────────────────

  server.registerTool(
    'analyze_file',
    {
      title: 'Analyze File for Design Violations',
      description:
        'Lint a single file for design-quality violations. Returns violations with line numbers, severity, rule IDs, and a file-level score (0-100). ' +
        'Use this when the agent has just generated or edited a single file and wants to verify it follows the project\'s design rules. ' +
        'Do NOT use this to scan a whole project — prefer `analyze_project`. ' +
        'Never sends source code to external services.',
      annotations: { ...readOnlyAnnotations, title: 'Analyze File for Design Violations' },
      inputSchema: {
        filePath: z.string().max(1024).describe('Path to the file to analyze (relative to projectDir or absolute).'),
        projectDir: z
          .string()
          .max(1024)
          .optional()
          .describe('Project root directory. Defaults to current working directory.'),
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

  // ── Tool: analyze_project ───────────────────────────────────────────

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
        projectDir: z
          .string()
          .max(1024)
          .optional()
          .describe('Project root directory. Defaults to current working directory.'),
        maxFiles: z
          .number()
          .int()
          .min(1)
          .max(5000)
          .optional()
          .describe('Maximum number of files to scan. Defaults to 200.'),
      },
      outputSchema: {
        projectDir: z.string(),
        overallScore: z.number(),
        grade: z.string(),
        totalFiles: z.number().int(),
        filesWithIssues: z.number().int(),
        totalViolations: z.number().int(),
        categories: z.record(
          z.string(),
          z.object({ score: z.number(), violations: z.number().int() }),
        ),
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

  // ── Tool: analyze_and_fix ───────────────────────────────────────────

  server.registerTool(
    'analyze_and_fix',
    {
      title: 'Preview Auto-fixes for a File',
      description:
        'Analyze a file and return the auto-fixed version. Returns both the fixed code and any remaining violations that require manual attention. ' +
        'This tool is read-only: it NEVER modifies the file on disk. The agent is expected to apply the returned `fixedCode` itself. ' +
        'Use this after `analyze_file` reports fixable violations. Never sends source code to external services.',
      // `analyze_and_fix` is still read-only from the filesystem's POV — it
      // previews fixes without touching disk. The agent decides whether to
      // write `fixedCode` back.
      annotations: { ...readOnlyAnnotations, title: 'Preview Auto-fixes for a File' },
      inputSchema: {
        filePath: z
          .string()
          .max(1024)
          .describe('Path to the file to analyze and fix (relative to projectDir or absolute).'),
        projectDir: z
          .string()
          .max(1024)
          .optional()
          .describe('Project root directory. Defaults to current working directory.'),
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

        // Only send the fixed code and metadata — never raw original source to LLM
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

  // ── Tool: compliance_check ──────────────────────────────────────────

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
        maxFiles: z
          .number()
          .int()
          .min(1)
          .max(5000)
          .optional()
          .describe('Maximum number of files to scan. Defaults to 200.'),
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

  // ── Tool: get_rule_details ─────────────────────────────────────────

  server.registerTool(
    'get_rule_details',
    {
      title: 'Get Deslint Rule Details',
      description:
        'Get detailed metadata for a specific Deslint rule: description, category, auto-fix capability, remediation effort estimate, ' +
        'WCAG mapping, and documentation URL. Use this to explain to the user *why* a violation matters and *how* to fix it, ' +
        'or when deciding whether to suppress vs. fix a rule.',
      annotations: { ...readOnlyAnnotations, title: 'Get Deslint Rule Details' },
      inputSchema: {
        ruleId: z
          .string()
          .max(128)
          .describe('Rule ID (e.g. "no-arbitrary-colors" or "deslint/no-arbitrary-colors").'),
      },
      outputSchema: {
        ruleId: z.string(),
        description: z.string(),
        category: z.string(),
        autoFixable: z.boolean(),
        effortMinutes: z.number(),
        wcagCriteria: z.array(
          z.object({ id: z.string(), title: z.string(), level: z.string() }),
        ),
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

  // ── Tool: suggest_fix_strategy ─────────────────────────────────────

  server.registerTool(
    'suggest_fix_strategy',
    {
      title: 'Suggest Fix Strategy (impact per effort)',
      description:
        'Analyze a project and suggest which design violations to fix first, ordered by impact-per-effort ratio. ' +
        'Prioritizes quick wins (auto-fixable, high-count rules) over manual, low-count fixes. ' +
        'Use this to plan an efficient remediation sprint, or when the user asks "where do I start?".',
      annotations: { ...readOnlyAnnotations, title: 'Suggest Fix Strategy' },
      inputSchema: {
        projectDir: z.string().max(1024).optional().describe('Project root directory. Defaults to current working directory.'),
        maxFiles: z.number().int().min(1).max(5000).optional().describe('Maximum number of files to scan. Defaults to 200.'),
        maxSuggestions: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe('Maximum number of fix suggestions to return. Defaults to 10.'),
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

/**
 * Start the MCP server using stdio transport.
 * This is the entry point when running as `npx @deslint/mcp`.
 */
export async function startServer(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// errorSchema is exported for downstream tooling that wants to validate
// error payloads; keeping the local reference silences the unused-export
// warning without changing shipped behavior.
export { errorSchema };
