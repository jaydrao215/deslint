import { OG_SIZE, renderAgentOg } from '@/lib/agent-og';

export const runtime = 'edge';
export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Deslint MCP server for Cursor — design-token drift and WCAG enforcement during AI-assisted coding';

export default async function Image() {
  return await renderAgentOg({
    agent: 'Cursor',
    tagline:
      'Plug deslint into Cursor via MCP. Catch design-token drift, arbitrary Tailwind values, and accessibility regressions during generation.',
    subhead: 'deslint.com/mcp/cursor',
    accent: '#06B6D4',
    tools: ['analyze_project', 'enforce_budget', 'compliance_check'],
  });
}
