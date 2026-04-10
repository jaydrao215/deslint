/**
 * MCP Server — wires Deslint tools to the Model Context Protocol.
 *
 * Transport: stdio (JSON-RPC 2.0), zero network calls.
 * Tools: analyze_file, analyze_project, analyze_and_fix,
 *        compliance_check, get_rule_details, suggest_fix_strategy
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { VERSION } from './index.js';
import { analyzeFile, analyzeProject, analyzeAndFix, complianceCheck, getRuleDetails, suggestFixStrategy } from './tools.js';

/**
 * Create an MCP server with all Deslint tools registered.
 */
export function createServer(): McpServer {
  const server = new McpServer({
    name: 'deslint',
    version: VERSION,
  });

  // ── Tool: analyze_file ──────────────────────────────────────────────

  server.tool(
    'analyze_file',
    'Lint a single file for design quality violations. Returns violations with line numbers, severity, rule IDs, and a file-level score (0-100). Never sends source code to external services.',
    {
      filePath: z.string().max(1024).describe('Path to the file to analyze (relative to projectDir or absolute)'),
      projectDir: z.string().max(1024).optional().describe('Project root directory. Defaults to current working directory.'),
    },
    async (params) => {
      try {
        const result = await analyzeFile({
          filePath: params.filePath,
          projectDir: params.projectDir,
        });

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                error: err instanceof Error ? err.message : String(err),
              }),
            },
          ],
          isError: true,
        };
      }
    },
  );

  // ── Tool: analyze_project ───────────────────────────────────────────

  server.tool(
    'analyze_project',
    'Scan an entire project for design quality violations. Returns a Design Health Score (0-100) with per-category breakdowns (colors, spacing, typography, responsive, consistency) and the top violations. Never sends source code to external services.',
    {
      projectDir: z.string().max(1024).optional().describe('Project root directory. Defaults to current working directory.'),
      maxFiles: z.number().int().min(1).max(5000).optional().describe('Maximum number of files to scan. Defaults to 200.'),
    },
    async (params) => {
      try {
        const result = await analyzeProject({
          projectDir: params.projectDir,
          maxFiles: params.maxFiles,
        });

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                error: err instanceof Error ? err.message : String(err),
              }),
            },
          ],
          isError: true,
        };
      }
    },
  );

  // ── Tool: analyze_and_fix ───────────────────────────────────────────

  server.tool(
    'analyze_and_fix',
    'Analyze a file and return the auto-fixed version. Returns both the original and corrected code, the number of violations fixed, and any remaining violations that require manual attention. Does NOT modify the file on disk. Never sends source code to external services.',
    {
      filePath: z.string().max(1024).describe('Path to the file to analyze and fix (relative to projectDir or absolute)'),
      projectDir: z.string().max(1024).optional().describe('Project root directory. Defaults to current working directory.'),
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

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(response, null, 2),
            },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                error: err instanceof Error ? err.message : String(err),
              }),
            },
          ],
          isError: true,
        };
      }
    },
  );

  // ── Tool: compliance_check ──────────────────────────────────────────

  server.tool(
    'compliance_check',
    'Run a WCAG 2.2 compliance evaluation on a project. Returns per-criterion pass/fail status, the conformance level reached, and the WCAG 2.1 AA equivalence (ADA Title II legal floor). Use this to generate accessibility audit reports.',
    {
      projectDir: z.string().max(1024).optional().describe('Project root directory. Defaults to current working directory.'),
      maxFiles: z.number().int().min(1).max(5000).optional().describe('Maximum number of files to scan. Defaults to 200.'),
    },
    async (params) => {
      try {
        const result = await complianceCheck({
          projectDir: params.projectDir,
          maxFiles: params.maxFiles,
        });

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                error: err instanceof Error ? err.message : String(err),
              }),
            },
          ],
          isError: true,
        };
      }
    },
  );

  // ── Tool: get_rule_details ─────────────────────────────────────────

  server.tool(
    'get_rule_details',
    'Get detailed metadata for a specific Deslint rule, including its description, category, auto-fix capability, remediation effort estimate, WCAG mapping, and documentation URL. Useful for understanding why a violation matters and how to fix it.',
    {
      ruleId: z.string().max(128).describe('Rule ID (e.g. "no-arbitrary-colors" or "deslint/no-arbitrary-colors")'),
    },
    async (params) => {
      try {
        const result = await getRuleDetails({ ruleId: params.ruleId });

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                error: err instanceof Error ? err.message : String(err),
              }),
            },
          ],
          isError: true,
        };
      }
    },
  );

  // ── Tool: suggest_fix_strategy ─────────────────────────────────────

  server.tool(
    'suggest_fix_strategy',
    'Analyze a project and suggest which design violations to fix first, ordered by impact-per-effort ratio. Prioritizes quick wins (auto-fixable, high-count rules) over manual, low-count fixes. Use this to plan an efficient remediation strategy.',
    {
      projectDir: z.string().max(1024).optional().describe('Project root directory. Defaults to current working directory.'),
      maxFiles: z.number().int().min(1).max(5000).optional().describe('Maximum number of files to scan. Defaults to 200.'),
      maxSuggestions: z.number().int().min(1).max(100).optional().describe('Maximum number of fix suggestions to return. Defaults to 10.'),
    },
    async (params) => {
      try {
        const result = await suggestFixStrategy({
          projectDir: params.projectDir,
          maxFiles: params.maxFiles,
          maxSuggestions: params.maxSuggestions,
        });

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                error: err instanceof Error ? err.message : String(err),
              }),
            },
          ],
          isError: true,
        };
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
