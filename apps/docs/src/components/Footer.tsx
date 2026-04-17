import Link from 'next/link';
import { BrandLockup } from './BrandLockup';

const GITHUB_URL = 'https://github.com/jaydrao215/deslint';

interface FooterLink {
  label: string;
  href: string;
  external?: boolean;
}

const FOOTER_LINKS: Record<string, FooterLink[]> = {
  Product: [
    { label: 'Getting Started', href: '/docs/getting-started' },
    { label: 'Rules Reference', href: '/docs/rules' },
    { label: 'Configuration', href: '/docs/configuration' },
    { label: 'Pricing', href: '/pricing' },
  ],
  Resources: [
    { label: 'Documentation', href: '/docs' },
    { label: 'Blog', href: '/blog' },
    { label: 'Deslint vs. stylelint', href: '/compare/deslint-vs-stylelint' },
    { label: 'Framework & WCAG coverage', href: '/coverage' },
    { label: 'GitHub', href: GITHUB_URL, external: true },
    { label: 'npm', href: 'https://www.npmjs.com/package/@deslint/eslint-plugin', external: true },
  ],
  Community: [
    { label: 'Discussions', href: `${GITHUB_URL}/discussions`, external: true },
    { label: 'Report Issue', href: `${GITHUB_URL}/issues`, external: true },
    { label: 'Changelog', href: `${GITHUB_URL}/releases`, external: true },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-surface-100">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" aria-label="Deslint home" className="inline-block mb-4">
              <BrandLockup size="footer" showTagline />
            </Link>
            <p className="text-sm text-gray-500 leading-relaxed mb-4 max-w-xs">
              Design quality for the AI code era. Design-system + WCAG linting,
              local-first, every framework.
            </p>
            <div className="flex items-center gap-3">
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900 motion-safe:transition-colors"
                aria-label="GitHub"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-4 w-4"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" /></svg>
              </a>
            </div>
          </div>

          {/* Link columns — h3 to preserve h1→h2→h3 hierarchy (WCAG 1.3.1) */}
          {Object.entries(FOOTER_LINKS).map(([heading, links]) => (
            <div key={heading}>
              <h3 className="text-sm font-semibold text-gray-900 mb-4">{heading}</h3>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    {link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-gray-500 hover:text-primary motion-safe:transition-colors"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-sm text-gray-500 hover:text-primary motion-safe:transition-colors"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between overflow-hidden">
          <div className="flex flex-col gap-1 text-xs text-gray-400 sm:text-sm">
            <p>
              &copy; {new Date().getFullYear()} Deslint &middot;{' '}
              <span className="text-gray-500">
                MIT licensed &middot; always-free open source core
              </span>
            </p>
            <p className="text-[11px] text-gray-400 sm:text-xs">
              Local-first &middot; deterministic &middot; zero cloud dependency
            </p>
          </div>
          <a
            href="mailto:hello@deslint.com?subject=Teams%20%26%20enterprise%20inquiry"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-xs font-medium text-gray-600 motion-safe:transition-colors hover:border-primary/30 hover:bg-primary-50/60 hover:text-primary sm:text-sm"
          >
            <span className="hidden sm:inline">Teams &amp; enterprise?</span>
            <span className="sm:hidden">Enterprise</span>
            <span className="text-gray-400 sm:inline">&rarr;</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
