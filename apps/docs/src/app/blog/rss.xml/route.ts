import { POSTS } from '@/lib/posts';

// RSS 2.0 feed at /blog/rss.xml.
//
// Generated from the same source of truth as the blog index and sitemap.
// Static (no runtime state), force-static so it ships as a plain file.

export const dynamic = 'force-static';

const BASE = 'https://deslint.com';
const FEED_TITLE = 'Deslint Blog';
const FEED_DESCRIPTION =
  'Long-form writing on design systems, AI coding agents, MCP, and deterministic lint.';

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function GET(): Response {
  const sorted = [...POSTS].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  const lastBuildDate = sorted[0]
    ? new Date(sorted[0].date).toUTCString()
    : new Date().toUTCString();

  const items = sorted
    .map((p) => {
      const url = `${BASE}/blog/${p.slug}`;
      return `    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${new Date(p.date).toUTCString()}</pubDate>
      <description>${escapeXml(p.description)}</description>
${p.tags.map((t) => `      <category>${escapeXml(t)}</category>`).join('\n')}
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(FEED_TITLE)}</title>
    <link>${BASE}/blog</link>
    <atom:link href="${BASE}/blog/rss.xml" rel="self" type="application/rss+xml" />
    <description>${escapeXml(FEED_DESCRIPTION)}</description>
    <language>en-us</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
