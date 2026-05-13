import { Navbar } from '@/components/Navbar';
import { Hero } from '@/components/Hero';
import { LaunchCheckCallout } from '@/components/LaunchCheckCallout';
import { AgentCompatStrip } from '@/components/AgentCompatStrip';
import { TrustBanner } from '@/components/TrustBanner';
import { getGitHubStars } from '@/lib/github-stars';
import { getNpmWeeklyDownloads } from '@/lib/npm-downloads';
import { VisualProofSection } from '@/components/VisualProofSection';
import { McpLoopSection } from '@/components/McpLoopSection';
import { ProductShowcase } from '@/components/ProductShowcase';
import { OssProofSection } from '@/components/OssProofSection';
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
        'The verification layer for AI-generated code. Deterministic design-system, accessibility, and backend-safety rules; reproducible attestations; runs inside the agent loop and at the merge gate.',
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
        'The verification layer for AI-generated code. 57 deterministic rules across design-system, accessibility, backend safety (secrets, SQL/shell injection, path traversal, SSRF, weak crypto, insecure cookies, permissive CORS), and Next.js client/server boundary. Reproducible attestations and a commit trailer the merge gate re-verifies. MCP server for Claude Code, Cursor, Codex, and Windsurf.',
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
        '57 deterministic rules across design, accessibility, backend safety, and AI-coding antipatterns',
        'Backend pack: hardcoded secrets, SQL/shell injection, path traversal, SSRF, weak crypto, open redirect, JWT expiry, insecure cookies',
        'Next.js pack: client/server boundary, server-only imports in client bundles, hydration mismatch, leaked env vars',
        'AI-coding hygiene: async useEffect, unwrapped async route handlers, mass-assignment, placeholder code, hardcoded localhost',
        'Reproducible attestations and commit-trailer verification',
        'MCP server for Claude Code, Cursor, Codex, Windsurf',
        'ESLint plugin for React, Vue, Svelte, Angular, Astro',
        'CLI with coverage reports and auto-fix',
        'GitHub Action with PR comments and trailer verification',
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
            text: 'Design-system drift (arbitrary Tailwind values, hex colours outside your token scale), accessibility failures (WCAG contrast, missing landmarks, alt text), dark-mode gaps, responsive layout issues, plus AI-coding-specific failures: leaked API keys, SQL/shell injection, path traversal, SSRF, weak crypto, open redirects, insecure cookies, permissive CORS, async useEffect, unwrapped Express handlers, mass-assignment, server-only imports in client bundles, and hydration mismatches. 57 rules in total, purpose-built for code written by AI.',
          },
        },
      ],
    },
  ],
};

export default async function Home() {
  const [stars, weeklyDownloads] = await Promise.all([
    getGitHubStars(),
    getNpmWeeklyDownloads(),
  ]);
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <Navbar />
      <main>
        <Hero stars={stars} />
        <LaunchCheckCallout />
        <AgentCompatStrip weeklyDownloads={weeklyDownloads} />
        <TrustBanner />
        <VisualProofSection />
        <McpLoopSection />
        <ProductShowcase />
        <OssProofSection />
        <WhatItCatches />
        <ComparisonStrip />
        <Cta />
      </main>
      <Footer />
    </>
  );
}
