import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Pricing — Deslint Design Linter for Claude Code, Cursor, Codex & Windsurf',
  description:
    "Deslint is free and open-source: full ESLint plugin, CLI, MCP server for Claude Code / Cursor / Codex / Windsurf, and GitHub Action. Teams plan from $99/mo; Enterprise with SSO, on-prem, and SOC 2 from $10k/yr.",
  alternates: { canonical: '/pricing' },
  openGraph: {
    title: 'Deslint Pricing — Free OSS, Teams, Enterprise',
    description:
      'Free forever for open source. Teams dashboards at $99/mo. Enterprise with SSO, on-prem, and audit logs.',
    url: 'https://deslint.com/pricing',
    type: 'website',
  },
};

export default function PricingLayout({ children }: { children: ReactNode }) {
  return children;
}
