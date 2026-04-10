/**
 * @deslint/mcp — MCP server for real-time design quality feedback.
 *
 * Exposes 6 tools via Model Context Protocol (stdio transport):
 *   - analyze_file: Lint a single file, return violations + sub-score
 *   - analyze_project: Scan entire project, return Design Health Score
 *   - analyze_and_fix: Return corrected code block for a specific file
 *   - compliance_check: Run WCAG 2.2 compliance evaluation
 *   - get_rule_details: Get metadata for a specific rule
 *   - suggest_fix_strategy: Prioritized fix recommendations
 *
 * Zero network calls. Pure local static analysis.
 */

import { createRequire } from 'node:module';
const _require = createRequire(import.meta.url);
const _pkg = _require('../package.json') as { version: string };

export const VERSION = _pkg.version;

export { createServer, startServer } from './server.js';
export { analyzeFile, analyzeProject, analyzeAndFix, complianceCheck, getRuleDetails, suggestFixStrategy } from './tools.js';
export type {
  AnalyzeFileResult,
  AnalyzeProjectResult,
  AnalyzeAndFixResult,
  ComplianceCheckResult,
  RuleDetails,
  FixSuggestion,
  SuggestFixStrategyResult,
  Violation,
} from './tools.js';
