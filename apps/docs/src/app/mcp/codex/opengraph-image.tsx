import { OG_SIZE, renderAgentOg } from '@/lib/agent-og';

export const runtime = 'edge';
export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Deslint MCP server for OpenAI Codex — deterministic design-system linting for agent-generated code';

export default function Image() {
  return renderAgentOg({
    agent: 'Codex',
    tagline:
      'Deslint MCP tools for OpenAI Codex. Deterministic design-system and WCAG gates attached to every Codex generation.',
    subhead: 'deslint.com/mcp/codex',
    accent: '#A855F7',
    tools: ['analyze_project', 'enforce_budget', 'compliance_check'],
  });
}
