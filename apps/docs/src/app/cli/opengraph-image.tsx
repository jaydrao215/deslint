import { OG_SIZE, renderAgentOg } from '@/lib/agent-og';

export const runtime = 'edge';
export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt =
  'Deslint CLI — local scan, fix, and Sigstore-ready attestation for AI-generated frontend code. 34 deterministic rules, zero LLM in the hot path, zero code egress.';

export default async function Image() {
  return await renderAgentOg({
    agent: 'the CLI',
    headline: 'Deslint',
    tagline:
      'Local scan, deterministic fix, Sigstore-ready attestation. One command from a terminal; every check runs as ESLint.',
    subhead: 'deslint.com/cli',
    accent: '#06B6D4',
    badge: 'CLI',
    panelLabel: 'DESLINT SCAN',
    panelDirection: '$ npx deslint scan',
    panelCall: 'score: 95 / 100',
    tools: ['scan', 'fix', 'attest', 'verify'],
  });
}
