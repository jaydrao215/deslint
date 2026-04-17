import type { MetadataRoute } from 'next';

const BASE = 'https://deslint.com';

/**
 * Next.js generates `/sitemap.xml` from this function at build time.
 * New landing pages (MCP hub, per-agent pages, case studies) must be
 * added here so Google discovers them; otherwise the SEO push is wasted.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const routes: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] }[] = [
    { path: '/',                        priority: 1.0, changeFrequency: 'weekly' },
    { path: '/mcp',                     priority: 0.95, changeFrequency: 'weekly' },
    { path: '/mcp/claude-code',         priority: 0.9,  changeFrequency: 'weekly' },
    { path: '/mcp/cursor',              priority: 0.9,  changeFrequency: 'weekly' },
    { path: '/mcp/windsurf',            priority: 0.9,  changeFrequency: 'weekly' },
    { path: '/mcp/codex',               priority: 0.9,  changeFrequency: 'weekly' },
    { path: '/pricing',                 priority: 0.8,  changeFrequency: 'monthly' },
    { path: '/coverage',                priority: 0.7,  changeFrequency: 'monthly' },
    { path: '/docs',                    priority: 0.8,  changeFrequency: 'weekly' },
    { path: '/docs/getting-started',    priority: 0.75, changeFrequency: 'weekly' },
    { path: '/docs/configuration',      priority: 0.65, changeFrequency: 'monthly' },
    { path: '/docs/rules',              priority: 0.7,  changeFrequency: 'weekly' },
  ];

  return routes.map((r) => ({
    url: `${BASE}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
