// Shared JSON-LD fragments for /mcp and /mcp/<agent> pages.
//
// Each page inlines one of these in a <script type="application/ld+json">
// block. Nothing here is rendered visually — these are machine-readable
// metadata Google uses to build richer SERP results and to understand the
// relationship between the /mcp hub and the per-agent pages.
//
// Every field is derived from information already visible on the page; no
// new claims are introduced.

export const MCP_SOFTWARE_APPLICATION = {
  '@type': 'SoftwareApplication',
  '@id': 'https://deslint.com/mcp#software',
  name: '@deslint/mcp',
  alternateName: 'Deslint MCP Server',
  description:
    'Model Context Protocol server that exposes deterministic design-system and accessibility lint as tools any MCP-compatible AI coding agent can call locally.',
  url: 'https://deslint.com/mcp',
  downloadUrl: 'https://www.npmjs.com/package/@deslint/mcp',
  applicationCategory: 'DeveloperApplication',
  operatingSystem: 'macOS, Linux, Windows',
  softwareRequirements: 'Node.js 18 or newer',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  featureList: [
    'analyze_file — design and accessibility violations for a single file',
    'analyze_project — workspace scan with aggregated scores',
    'analyze_and_fix — scan plus safe auto-fixes applied in place',
    'compliance_check — full compliance report',
    'enforce_budget — gate on rule budgets from .deslintrc.json',
    'get_rule_details — rule documentation for the agent',
    'suggest_fix_strategy — structured fix plan',
  ],
  publisher: {
    '@type': 'Organization',
    name: 'Deslint',
    url: 'https://deslint.com',
  },
} as const;

export function mcpAgentTechArticle(opts: {
  agentName: string;
  headline: string;
  description: string;
  url: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: opts.headline,
    description: opts.description,
    url: opts.url,
    mainEntityOfPage: opts.url,
    inLanguage: 'en',
    proficiencyLevel: 'Beginner',
    author: {
      '@type': 'Organization',
      name: 'Deslint',
      url: 'https://deslint.com',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Deslint',
      url: 'https://deslint.com',
    },
    about: {
      '@type': 'SoftwareApplication',
      name: '@deslint/mcp',
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'macOS, Linux, Windows',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
    },
    keywords: [
      opts.agentName,
      'MCP',
      'Model Context Protocol',
      'design system lint',
      'accessibility',
      'ESLint',
    ].join(', '),
  };
}
