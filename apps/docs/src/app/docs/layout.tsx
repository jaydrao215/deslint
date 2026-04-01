import Link from 'next/link';

const NAV_ITEMS = [
  { href: '/docs/getting-started', label: 'Getting Started' },
  { href: '/docs/configuration', label: 'Configuration' },
  { href: '/docs/rules', label: 'Rules Reference' },
];

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-bold text-[#1A5276]">
            Vizlint
          </Link>
          <nav className="flex gap-6 text-sm">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-gray-600 hover:text-[#1A5276] transition-colors"
              >
                {item.label}
              </Link>
            ))}
            <a
              href="https://github.com/vizlint/vizlint"
              className="text-gray-600 hover:text-[#1A5276] transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-4xl px-6 py-12">
        <article className="prose prose-gray max-w-none prose-headings:text-[#1A5276] prose-code:text-[#1A5276] prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
          {children}
        </article>
      </main>
    </div>
  );
}
