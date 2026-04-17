import { Navbar } from '@/components/Navbar';
import { Hero } from '@/components/Hero';
import { TrustBanner } from '@/components/TrustBanner';
import { getGitHubStars } from '@/lib/github-stars';
import { VisualProofSection } from '@/components/VisualProofSection';
import { McpLoopSection } from '@/components/McpLoopSection';
import { ProductShowcase } from '@/components/ProductShowcase';
import { WhatItCatches } from '@/components/WhatItCatches';
import { ComparisonStrip } from '@/components/ComparisonStrip';
import { Cta } from '@/components/Cta';
import { Footer } from '@/components/Footer';

/**
 * SoftwareApplication + FAQPage JSON-LD.
 *
 * Google uses this to build rich results ("Deslint — Free · Developer Tool")
 * and to disambiguate us from generic "design lint" queries. Every field
 * is safe to serve publicly; pricing mirrors /pricing.
 */
const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://deslint.com/#organization',
      name: 'Deslint',
      url: 'https://deslint.com',
      logo: 'https://deslint.com/icons/icon-192.png',
      description:
        'Deterministic design-system and accessibility lint for AI-generated frontend code.',
      sameAs: ['https://github.com/jaydrao215/deslint'],
    },
    {
      '@type': 'WebSite',
      '@id': 'https://deslint.com/#website',
      url: 'https://deslint.com',
      name: 'Deslint',
      publisher: { '@id': 'https://deslint.com/#organization' },
    },
    {
      '@type': 'SoftwareApplication',
      name: 'Deslint',
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'macOS, Linux, Windows',
      description:
        'Deterministic design-system and accessibility lint for AI-generated frontend code. MCP server for Claude Code, Cursor, Codex, and Windsurf.',
      url: 'https://deslint.com',
      offers: [
        {
          '@type': 'Offer',
          name: 'Open Source',
          price: '0',
          priceCurrency: 'USD',
        },
        {
          '@type': 'Offer',
          name: 'Teams',
          price: '99',
          priceCurrency: 'USD',
          priceSpecification: {
            '@type': 'UnitPriceSpecification',
            price: '99',
            priceCurrency: 'USD',
            unitText: 'MONTH',
          },
        },
      ],
      featureList: [
        '33 deterministic design and accessibility rules',
        'MCP server for Claude Code, Cursor, Codex, Windsurf',
        'ESLint plugin for React, Vue, Svelte, Angular, Astro',
        'CLI with coverage reports and auto-fix',
        'GitHub Action with PR comments',
        'Local-first, zero LLM, zero cloud egress',
      ],
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Does Deslint work with Claude Code, Cursor, Codex, or Windsurf?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. Deslint ships a Model Context Protocol (MCP) server that runs as a local subprocess of any MCP-compatible AI coding agent, including Claude Code, Cursor, Codex, and Windsurf. The agent can call tools like analyze_and_fix and enforce_budget before it writes code.',
          },
        },
        {
          '@type': 'Question',
          name: 'Does Deslint send my code to a cloud?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'No. Deslint is local-first. The ESLint plugin, CLI, and MCP server all run on your machine. There is no LLM inference in the hot path; rules are deterministic. Zero bytes of source code leave your machine.',
          },
        },
        {
          '@type': 'Question',
          name: 'What does Deslint catch that ESLint does not?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Design-system drift (arbitrary Tailwind values, hex colours outside your token scale), accessibility failures (WCAG contrast, missing landmarks, alt text), dark-mode gaps, responsive layout issues, bundle bloat, and more. Deslint ships 33 rules purpose-built for frontend code written by AI.',
          },
        },
      ],
    },
  ],
};

export default async function Home() {
  const stars = await getGitHubStars();
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <Navbar />
      <main>
        <Hero stars={stars} />
        <TrustBanner />
        <VisualProofSection />
        <McpLoopSection />
        <ProductShowcase />
        <WhatItCatches />
        <ComparisonStrip />
        <Cta />
      </main>
      <Footer />
    </>
  );
}
