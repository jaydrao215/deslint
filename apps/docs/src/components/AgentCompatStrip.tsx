import Link from 'next/link';
import { formatDownloadCount } from '@/lib/npm-downloads';

/**
 * Thin signal row that lives between Hero and TrustBanner.
 *
 * Two jobs, neither duplicated elsewhere on the page:
 *   1. Announce MCP compatibility by naming the four supported agents as
 *      links. Hero is deliberately vendor-neutral, so this is where a dev
 *      scanning for "does it work with my agent?" gets a yes.
 *   2. Surface the npm weekly-download count as soft social proof for
 *      devs — complements the GitHub star count already shown in Hero.
 *
 * Server component: both signals are fetched at build and revalidated
 * hourly. No client JS, no layout shift.
 */

const AGENTS = [
  { name: 'Cursor', href: '/mcp/cursor' },
  { name: 'Claude Code', href: '/mcp/claude-code' },
  { name: 'Codex', href: '/mcp/codex' },
  { name: 'Windsurf', href: '/mcp/windsurf' },
];

interface AgentCompatStripProps {
  weeklyDownloads: number | null;
}

export function AgentCompatStrip({ weeklyDownloads }: AgentCompatStripProps) {
  return (
    <section
      aria-label="MCP-compatible AI coding agents and npm install volume"
      className="border-b border-gray-200/80 bg-white py-4 px-6"
    >
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 text-xs text-gray-500 sm:flex-row sm:text-sm">
        <div className="flex items-center gap-2">
          <span className="text-gray-400">Works with:</span>
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {AGENTS.map((a) => (
              <li key={a.name}>
                <Link
                  href={a.href}
                  className="font-medium text-gray-700 hover:text-primary motion-safe:transition-colors"
                >
                  {a.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {weeklyDownloads !== null && (
          <a
            href="https://www.npmjs.com/package/@deslint/eslint-plugin"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-gray-500 hover:text-primary motion-safe:transition-colors"
          >
            {formatDownloadCount(weeklyDownloads)} npm installs / week
          </a>
        )}
      </div>
    </section>
  );
}
