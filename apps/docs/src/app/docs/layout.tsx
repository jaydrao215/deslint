'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  BookOpen,
  Rocket,
  Settings,
  Shield,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';

const SIDEBAR_ITEMS = [
  { href: '/docs', label: 'Overview', icon: BookOpen, exact: true },
  { href: '/docs/getting-started', label: 'Getting Started', icon: Rocket },
  { href: '/docs/configuration', label: 'Configuration', icon: Settings },
  { href: '/docs/rules', label: 'Rules Reference', icon: Shield },
];

function SidebarLink({
  href,
  label,
  icon: Icon,
  exact,
  pathname,
  onClick,
}: {
  href: string;
  label: string;
  icon: typeof BookOpen;
  exact?: boolean;
  pathname: string;
  onClick?: () => void;
}) {
  const isActive = exact ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
        isActive
          ? 'bg-primary-50 text-primary border border-primary/10'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-transparent',
      )}
    >
      <Icon
        className={cn(
          'h-4 w-4 shrink-0 transition-colors',
          isActive ? 'text-primary' : 'text-gray-400 group-hover:text-gray-600',
        )}
      />
      {label}
      {isActive && <ChevronRight className="ml-auto h-3.5 w-3.5 text-primary/50" />}
    </Link>
  );
}

export default function DocsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white">
      {/* Top bar */}
      <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-white/80 backdrop-blur-xl border-b border-gray-200/50">
        <div className="flex h-full items-center px-6">
          <Link href="/" className="flex items-center gap-2.5 mr-8">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-white text-xs font-bold">
              V
            </div>
            <span className="font-semibold text-gray-900 tracking-tight">Deslint</span>
            <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">
              Docs
            </span>
          </Link>

          {/* Desktop nav links */}
          <nav className="hidden md:flex items-center gap-1">
            {SIDEBAR_ITEMS.filter((i) => !i.exact).map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'px-3 py-1.5 text-sm rounded-md transition-colors',
                    isActive
                      ? 'text-primary font-medium bg-primary-50/50'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50',
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <a
              href="https://github.com/deslint/deslint"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              aria-label="GitHub"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-4 w-4">
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
            </a>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:text-gray-900"
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      <div className="flex pt-14">
        {/* Sidebar - Desktop */}
        <aside className="hidden md:block fixed top-14 left-0 bottom-0 w-64 border-r border-gray-100 bg-surface-100/50 overflow-y-auto">
          <nav className="p-4 space-y-1">
            {SIDEBAR_ITEMS.map((item) => (
              <SidebarLink
                key={item.href}
                {...item}
                pathname={pathname}
              />
            ))}
          </nav>
          <div className="mt-6 mx-4 p-4 rounded-xl bg-primary-50/50 border border-primary/10">
            <p className="text-xs font-semibold text-primary mb-1">Quick Start</p>
            <code className="text-[11px] text-primary/70 font-mono">
              npm i -D @deslint/eslint-plugin
            </code>
          </div>
        </aside>

        {/* Sidebar - Mobile overlay */}
        {sidebarOpen && (
          <div className="md:hidden fixed inset-0 z-40 pt-14">
            <div className="absolute inset-0 bg-black/20" onClick={() => setSidebarOpen(false)} />
            <div className="relative w-64 h-full bg-white border-r border-gray-200 overflow-y-auto">
              <nav className="p-4 space-y-1">
                {SIDEBAR_ITEMS.map((item) => (
                  <SidebarLink
                    key={item.href}
                    {...item}
                    pathname={pathname}
                    onClick={() => setSidebarOpen(false)}
                  />
                ))}
              </nav>
            </div>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 md:ml-64">
          <div className="mx-auto max-w-3xl px-6 sm:px-8 py-10">
            <article className="prose prose-gray max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-headings:text-gray-900 prose-h1:text-3xl prose-h1:mb-4 prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-4 prose-h2:pb-2 prose-h2:border-b prose-h2:border-gray-100 prose-h3:text-lg prose-h3:mt-8 prose-p:text-gray-600 prose-p:leading-relaxed prose-code:text-primary prose-code:bg-primary-50/50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-[13px] prose-code:font-medium prose-code:before:content-none prose-code:after:content-none prose-pre:bg-gray-950 prose-pre:border prose-pre:border-gray-800/50 prose-pre:rounded-xl prose-pre:text-[13px] prose-strong:text-gray-900 prose-li:text-gray-600 prose-a:text-primary prose-a:no-underline hover:prose-a:underline">
              {children}
            </article>
          </div>
        </main>
      </div>
    </div>
  );
}
