import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Vizlint — Design Quality Gate for AI-Generated Code',
  description:
    'Catch arbitrary colors, inconsistent spacing, and broken responsive layouts before they ship. ESLint plugin + CLI for Tailwind CSS projects.',
  metadataBase: new URL('https://vizlint.dev'),
  openGraph: {
    title: 'Vizlint — Design Quality Gate for AI-Generated Code',
    description:
      'Catch arbitrary colors, inconsistent spacing, and broken responsive layouts before they ship.',
    url: 'https://vizlint.dev',
    siteName: 'Vizlint',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vizlint — Design Quality Gate for AI-Generated Code',
    description:
      'Catch arbitrary colors, inconsistent spacing, and broken responsive layouts before they ship.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-gray-900 font-sans antialiased">{children}</body>
    </html>
  );
}
