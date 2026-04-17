import { OG_SIZE, renderAgentOg } from '@/lib/agent-og';

export const runtime = 'edge';
export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Deslint MCP server for Windsurf — design system enforcement inside the Cascade coding loop';

export default function Image() {
  return renderAgentOg({
    agent: 'Windsurf',
    tagline:
      'Deslint MCP tools inside the Windsurf Cascade loop. Design-token enforcement that runs before the agent commits a change.',
    subhead: 'deslint.com/mcp/windsurf',
    accent: '#22C55E',
    tools: ['analyze_project', 'enforce_budget', 'compliance_check'],
  });
}
