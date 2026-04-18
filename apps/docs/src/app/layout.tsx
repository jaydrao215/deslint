import type { Metadata, Viewport } from 'next';
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
    'mcp server',
    'claude code',
    'claude code linter',
    'cursor',
    'cursor linter',
    'codex',
    'windsurf',
    'copilot',
    'ai coding agents',
    'ai code review',
    'ai code quality',
    'ai generated code lint',
    'vibe coding',
    'design system lint',
    'design system enforcement',
    'design tokens',
    'design qa',
    'design drift',
    'tailwind lint',
    'tailwind design system',
    'eslint plugin',
    'react accessibility lint',
    'accessibility',
    'wcag',
    'wcag scanner',
    'responsive design lint',
    'dark mode audit',
    'local linter',
    'local code analysis',
    'deterministic static analysis',
  ],
  applicationName: 'Deslint',
  authors: [{ name: 'Deslint', url: 'https://deslint.com' }],
  creator: 'Deslint',
  publisher: 'Deslint',
  category: 'technology',
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
      { url: '/favicon.ico', sizes: '48x48 32x32 16x16', type: 'image/x-icon' },
      { url: '/icons/icon-32.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/icons/site.webmanifest',
  appleWebApp: {
    title: 'Deslint',
    statusBarStyle: 'black-translucent',
    capable: true,
  },
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

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#534AB7' },
    { media: '(prefers-color-scheme: dark)',  color: '#0B0A18' },
  ],
  colorScheme: 'light dark',
  width: 'device-width',
  initialScale: 1,
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
