import { OG_SIZE, renderAgentOg } from '@/lib/agent-og';

export const runtime = 'edge';
export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Deslint MCP server for Claude Code — deterministic design-system and WCAG enforcement inside the agent loop';

export default function Image() {
  return renderAgentOg({
    agent: 'Claude Code',
    tagline:
      'Deterministic design-system and WCAG gates, exposed to Claude Code as MCP tools. Pre-generation, zero cloud.',
    subhead: 'deslint.com/mcp/claude-code',
    accent: '#D97706',
    tools: ['analyze_project', 'enforce_budget', 'compliance_check'],
  });
}
