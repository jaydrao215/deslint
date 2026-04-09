// Fetches the public GitHub star count at build time.
// Returns null on any failure — caller renders a count-less CTA.
// Next revalidates once per hour so incremental rebuilds pick up new stars
// without hammering the API.

const REPO = 'deslint/deslint';

export async function getGitHubStars(): Promise<number | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}`, {
      headers: { Accept: 'application/vnd.github+json' },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    if (typeof data === 'object' && data !== null && 'stargazers_count' in data) {
      const n = (data as { stargazers_count: unknown }).stargazers_count;
      return typeof n === 'number' ? n : null;
    }
    return null;
  } catch {
    return null;
  }
}

export function formatStarCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return n.toString();
}
