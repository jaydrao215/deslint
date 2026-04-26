import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Pricing — Deslint, the Verification Layer for AI-Generated Code',
  description:
    'Deslint is free and open-source: the full verification layer — ESLint plugin, CLI, MCP server for Claude Code / Cursor / Codex / Windsurf, and GitHub Action with trailer verification. Teams plan from $99/mo; Enterprise with SSO, on-prem, and SOC 2 from $10k/yr.',
  alternates: { canonical: '/pricing' },
  openGraph: {
    title: 'Deslint Pricing — Free OSS, Teams, Enterprise',
    description:
      'The verification layer for AI-generated code — free forever for open source. Teams dashboards at $99/mo. Enterprise with SSO, on-prem, and audit logs.',
    url: 'https://deslint.com/pricing',
    type: 'website',
  },
};

// Product + AggregateOffer JSON-LD mirrors the three tiers rendered on
// the pricing page. Rendered in the server-side layout so Google reads
// it regardless of the client-component page below. Every price here
// must match what users see on the page.
const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: 'Deslint',
  description:
    'The verification layer for AI-generated code. Deterministic design-system and accessibility rules, reproducible attestations, and a commit trailer the merge gate re-verifies. ESLint plugin, CLI, GitHub Action, and MCP server for Claude Code, Cursor, Codex, and Windsurf.',
  url: 'https://deslint.com/pricing',
  brand: { '@type': 'Brand', name: 'Deslint' },
  category: 'DeveloperApplication',
  offers: {
    '@type': 'AggregateOffer',
    priceCurrency: 'USD',
    lowPrice: '0',
    highPrice: '10000',
    offerCount: 3,
    offers: [
      {
        '@type': 'Offer',
        name: 'Open Source',
        description:
          'The full verification layer — ESLint plugin, CLI, MCP server, and GitHub Action with trailer verification. Free forever under MIT.',
        price: '0',
        priceCurrency: 'USD',
        url: 'https://deslint.com/docs/getting-started',
        availability: 'https://schema.org/InStock',
      },
      {
        '@type': 'Offer',
        name: 'Teams',
        description:
          'Cross-repo dashboards, weekly drift digest, team-wide rule bundles. Up to 5 developers at $99/month; $19 per additional seat.',
        price: '99',
        priceCurrency: 'USD',
        url: 'https://deslint.com/pricing',
        availability: 'https://schema.org/PreOrder',
        priceSpecification: {
          '@type': 'UnitPriceSpecification',
          price: '99',
          priceCurrency: 'USD',
          unitText: 'MONTH',
          referenceQuantity: {
            '@type': 'QuantitativeValue',
            value: 5,
            unitText: 'developers',
          },
        },
      },
      {
        '@type': 'Offer',
        name: 'Enterprise',
        description:
          'Self-hosted / air-gapped deployment, SAML SSO + SCIM, audit logs, custom rules, and dedicated onboarding. From $10,000 per year for 20+ seats.',
        price: '10000',
        priceCurrency: 'USD',
        url: 'https://deslint.com/pricing',
        availability: 'https://schema.org/InStock',
        priceSpecification: {
          '@type': 'UnitPriceSpecification',
          price: '10000',
          priceCurrency: 'USD',
          unitText: 'YEAR',
        },
      },
    ],
  },
};

export default function PricingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      {children}
    </>
  );
}
