/**
 * @vizlint/mcp — MCP server for real-time design quality feedback.
 *
 * Exposes 3 tools via Model Context Protocol (stdio transport):
 *   - analyze_file: Lint a single file, return violations + sub-score
 *   - analyze_project: Scan entire project, return Design Health Score
 *   - analyze_and_fix: Return corrected code block for a specific file
 *
 * Zero network calls. Pure local static analysis.
 */

export const VERSION = '0.1.0';

export { createServer, startServer } from './server.js';
export { analyzeFile, analyzeProject, analyzeAndFix } from './tools.js';
export type { AnalyzeFileResult, AnalyzeProjectResult, AnalyzeAndFixResult, Violation } from './tools.js';
