import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';
import 'asciinema-player/dist/bundle/asciinema-player.css';

const TITLE = 'Deslint — Design Lint for AI Coding Agents via MCP';
const DESCRIPTION =
  'Deterministic design-system and accessibility lint for AI-generated frontend code. MCP server for Claude Code, Cursor, Codex, and Windsurf. ESLint plugin, CLI, and GitHub Action. Local. No LLM. Zero cloud.';

export const metadata: Metadata = {
  title: {
    default: TITLE,
    template: '%s · Deslint',
  },
  description: DESCRIPTION,
  keywords: [
    'mcp',
    'model context protocol',
    'claude code',
    'cursor',
    'codex',
    'windsurf',
    'ai coding agents',
    'design system lint',
    'design tokens',
    'tailwind lint',
    'eslint plugin',
    'accessibility',
    'wcag',
    'design drift',
  ],
  authors: [{ name: 'Deslint' }],
  creator: 'Deslint',
  publisher: 'Deslint',
  alternates: {
    canonical: '/',
    types: {
      'application/rss+xml': [
        { url: '/blog/rss.xml', title: 'Deslint Blog' },
      ],
    },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  metadataBase: new URL('https://deslint.com'),
  icons: {
    icon: [
      { url: '/icons/favicon.ico', sizes: 'any' },
      { url: '/icons/icon-32.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/icons/apple-touch-icon.png',
  },
  manifest: '/icons/site.webmanifest',
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: 'https://deslint.com',
    siteName: 'Deslint',
    type: 'website',
    locale: 'en_US',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Deslint — MCP design linter for AI coding agents',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/opengraph-image'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-gray-900 font-sans antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
