// Fetches the npm weekly downloads count for @deslint/eslint-plugin at build
// time. Returns null on any failure — caller renders a count-less strip.
// Revalidates once per hour like the GitHub star fetch.

const PACKAGE = '@deslint/eslint-plugin';

export async function getNpmWeeklyDownloads(): Promise<number | null> {
  try {
    const res = await fetch(
      `https://api.npmjs.org/downloads/point/last-week/${PACKAGE}`,
      { next: { revalidate: 3600 } },
    );
    if (!res.ok) return null;
    const data: unknown = await res.json();
    if (typeof data === 'object' && data !== null && 'downloads' in data) {
      const n = (data as { downloads: unknown }).downloads;
      return typeof n === 'number' ? n : null;
    }
    return null;
  } catch {
    return null;
  }
}

export function formatDownloadCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return n.toString();
}
