/**
 * MCP Server — wires Vizlint tools to the Model Context Protocol.
 *
 * Transport: stdio (JSON-RPC 2.0), zero network calls.
 * Tools: analyze_file, analyze_project, analyze_and_fix
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { VERSION } from './index.js';
import { analyzeFile, analyzeProject, analyzeAndFix } from './tools.js';

/**
 * Create an MCP server with all Vizlint tools registered.
 */
export function createServer(): McpServer {
  const server = new McpServer({
    name: 'vizlint',
    version: VERSION,
  });

  // ── Tool: analyze_file ──────────────────────────────────────────────

  server.tool(
    'analyze_file',
    'Lint a single file for design quality violations. Returns violations with line numbers, severity, rule IDs, and a file-level score (0-100). Never sends source code to external services.',
    {
      filePath: z.string().describe('Path to the file to analyze (relative to projectDir or absolute)'),
      projectDir: z.string().optional().describe('Project root directory. Defaults to current working directory.'),
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
      projectDir: z.string().optional().describe('Project root directory. Defaults to current working directory.'),
      maxFiles: z.number().optional().describe('Maximum number of files to scan. Defaults to 200.'),
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
      filePath: z.string().describe('Path to the file to analyze and fix (relative to projectDir or absolute)'),
      projectDir: z.string().optional().describe('Project root directory. Defaults to current working directory.'),
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

  return server;
}

/**
 * Start the MCP server using stdio transport.
 * This is the entry point when running as `npx @vizlint/mcp`.
 */
export async function startServer(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
