'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Menu, X, BookOpen, Zap, CreditCard, Terminal } from 'lucide-react';
import { BrandLockup } from './BrandLockup';

const NAV_LINKS = [
  { href: '/mcp', label: 'MCP', icon: Terminal },
  { href: '/docs', label: 'Docs', icon: BookOpen },
  { href: '/docs/getting-started', label: 'Get Started', icon: Zap },
  { href: '/docs/rules', label: 'Rules', icon: BookOpen },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the mobile menu on Escape, and when the viewport grows past the
  // md breakpoint (user rotated the device / resized to desktop).
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    const mql = window.matchMedia('(min-width: 768px)');
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) setMobileOpen(false);
    };
    window.addEventListener('keydown', onKey);
    mql.addEventListener('change', onChange);
    return () => {
      window.removeEventListener('keydown', onKey);
      mql.removeEventListener('change', onChange);
    };
  }, [mobileOpen]);

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 motion-safe:transition-all motion-safe:duration-300',
        // Solid backdrop when scrolled OR when mobile menu is open — prevents
        // hero / page content from bleeding through the translucent nav and
        // floating menu items on first paint at the top of the page.
        scrolled || mobileOpen
          ? 'bg-white/90 backdrop-blur-xl border-b border-gray-200/50 shadow-sm'
          : 'bg-transparent',
      )}
    >
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" aria-label="Deslint home" className="group motion-safe:transition-transform hover:scale-[1.02]">
            <BrandLockup priority />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-3.5 py-2 text-sm text-gray-600 hover:text-primary rounded-lg hover:bg-primary-50/50 motion-safe:transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-gray-700 rounded-lg ring-1 ring-gray-200 hover:ring-primary/30 hover:text-primary hover:bg-primary-50/40 motion-safe:transition-all"
            >
              <CreditCard className="h-4 w-4" />
              <span>Pricing</span>
            </Link>
            <a
              href="https://github.com/jaydrao215/deslint"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3.5 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 motion-safe:transition-colors"
            >
              <GitHubIcon />
              <span>GitHub</span>
            </a>
            <Link
              href="/docs/getting-started"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-light motion-safe:transition-all hover:shadow-lg hover:shadow-primary/20"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile Toggle */}
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 hover:text-gray-900"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            aria-controls="primary-mobile-menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile Menu — solid background so items are readable even when
            the page is scrolled to the top (header would otherwise be
            transparent and the menu would float over hero copy). */}
        {mobileOpen && (
          <div
            id="primary-mobile-menu"
            className="md:hidden -mx-6 px-6 border-t border-gray-200/60 bg-white/95 backdrop-blur-xl py-4 space-y-1 max-h-[calc(100vh-4rem)] overflow-y-auto shadow-lg"
          >
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-600 hover:text-primary rounded-lg hover:bg-primary-50/50"
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Link>
            ))}
            <div className="pt-3 border-t border-gray-100 space-y-1">
              <Link
                href="/pricing"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-700 rounded-lg ring-1 ring-gray-200 hover:ring-primary/30 hover:text-primary"
              >
                <CreditCard className="h-4 w-4" />
                Pricing
              </Link>
              <a
                href="https://github.com/jaydrao215/deslint"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-600 rounded-lg"
              >
                <GitHubIcon />
                GitHub
              </a>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

function GitHubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-4 w-4">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}
