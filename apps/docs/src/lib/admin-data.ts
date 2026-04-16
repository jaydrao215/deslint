import 'server-only';

import { list, head } from '@vercel/blob';
import { getGitHubStars } from '@/lib/github-stars';

export { getGitHubStars };

export interface WaitlistEntry {
  email: string;
  tier: string;
  ts: number;
}

export interface NpmDownloads {
  package: string;
  lastWeek: number;
  lastMonth: number;
  daily: { day: string; downloads: number }[];
}

const BLOB_PATH = 'waitlist.json';

const NPM_PACKAGES = [
  '@deslint/eslint-plugin',
  '@deslint/cli',
  '@deslint/mcp',
] as const;

export { NPM_PACKAGES };

export async function getWaitlistContacts(): Promise<WaitlistEntry[]> {
  try {
    const { blobs } = await list({ prefix: BLOB_PATH, limit: 1 });
    if (blobs.length === 0) return [];
    const blob = await head(blobs[0]!.url);
    const res = await fetch(blob.url, { cache: 'no-store' });
    if (!res.ok) return [];
    return (await res.json()) as WaitlistEntry[];
  } catch {
    return [];
  }
}

async function fetchNpmPoint(
  pkg: string,
  period: string,
): Promise<number | null> {
  try {
    const res = await fetch(
      `https://api.npmjs.org/downloads/point/${period}/${encodeURIComponent(pkg)}`,
      { next: { revalidate: 300 } },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { downloads?: number };
    return typeof data.downloads === 'number' ? data.downloads : null;
  } catch {
    return null;
  }
}

async function fetchNpmRange(
  pkg: string,
): Promise<{ day: string; downloads: number }[]> {
  try {
    const res = await fetch(
      `https://api.npmjs.org/downloads/range/last-month/${encodeURIComponent(pkg)}`,
      { next: { revalidate: 300 } },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as {
      downloads?: { day: string; downloads: number }[];
    };
    return Array.isArray(data.downloads) ? data.downloads : [];
  } catch {
    return [];
  }
}

export async function getNpmDownloads(): Promise<NpmDownloads[]> {
  const results = await Promise.all(
    NPM_PACKAGES.map(async (pkg) => {
      const [lastWeek, lastMonth, daily] = await Promise.all([
        fetchNpmPoint(pkg, 'last-week'),
        fetchNpmPoint(pkg, 'last-month'),
        fetchNpmRange(pkg),
      ]);
      return {
        package: pkg,
        lastWeek: lastWeek ?? 0,
        lastMonth: lastMonth ?? 0,
        daily,
      };
    }),
  );
  return results;
}
