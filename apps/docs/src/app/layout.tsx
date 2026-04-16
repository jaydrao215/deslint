import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';
import 'asciinema-player/dist/bundle/asciinema-player.css';

export const metadata: Metadata = {
  title: 'Deslint — Design Quality Gate for AI-Generated Code',
  description:
    'Catch design drift, broken responsive layouts, and WCAG failures in AI-generated frontend code. ESLint plugin, CLI, and MCP server for every framework.',
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
    title: 'Deslint — Design Quality Gate for AI-Generated Code',
    description:
      'Catch design drift, broken responsive layouts, and WCAG failures in AI-generated frontend code.',
    url: 'https://deslint.com',
    siteName: 'Deslint',
    type: 'website',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Deslint homepage hero preview',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Deslint — Design Quality Gate for AI-Generated Code',
    description:
      'Catch design drift, broken responsive layouts, and WCAG failures in AI-generated frontend code.',
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
