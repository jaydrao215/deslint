import { OG_SIZE, renderAgentOg } from '@/lib/agent-og';

export const runtime = 'edge';
export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt =
  'Deslint GitHub Action — Design Health Score, one-click PR suggestions, Sigstore attestation verification, agent scorecard, and token-drift diff on every pull request.';

export default async function Image() {
  return await renderAgentOg({
    agent: 'the PR gate',
    headline: 'Deslint for',
    tagline:
      'Design Health Score, Sigstore-verified attestation, per-agent scorecard, token drift diff — every pull request.',
    subhead: 'deslint.com/action',
    accent: '#EC4899',
    badge: 'ACTION',
    panelLabel: 'PR REVIEW',
    panelDirection: 'pull_request → deslint-action',
    panelCall: 'review posted',
    tools: ['inline-review', 'suggest-fixes', 'require-signed', 'agent-scorecard'],
  });
}
