import type { MetadataRoute } from 'next';
import { POSTS } from '@/lib/posts';
import { RULES } from '@/lib/rules';

const BASE = 'https://deslint.com';

/**
 * Next.js generates `/sitemap.xml` from this function at build time.
 *
 * Static routes are listed below. Blog posts are auto-appended from
 * `@/lib/posts` so adding a new post is a one-file change that's
 * automatically indexed. If you add another landing page (e.g. a new
 * comparison), add it to `STATIC_ROUTES`.
 */

const STATIC_ROUTES: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] }[] = [
  { path: '/',                               priority: 1.0,  changeFrequency: 'weekly'  },
  { path: '/mcp',                            priority: 0.95, changeFrequency: 'weekly'  },
  { path: '/mcp/claude-code',                priority: 0.9,  changeFrequency: 'weekly'  },
  { path: '/mcp/cursor',                     priority: 0.9,  changeFrequency: 'weekly'  },
  { path: '/mcp/windsurf',                   priority: 0.9,  changeFrequency: 'weekly'  },
  { path: '/mcp/codex',                      priority: 0.9,  changeFrequency: 'weekly'  },
  { path: '/pricing',                        priority: 0.8,  changeFrequency: 'monthly' },
  { path: '/coverage',                       priority: 0.7,  changeFrequency: 'monthly' },
  { path: '/docs',                           priority: 0.8,  changeFrequency: 'weekly'  },
  { path: '/docs/getting-started',           priority: 0.75, changeFrequency: 'weekly'  },
  { path: '/docs/configuration',             priority: 0.65, changeFrequency: 'monthly' },
  { path: '/docs/rules',                     priority: 0.7,  changeFrequency: 'weekly'  },
  { path: '/blog',                           priority: 0.85, changeFrequency: 'weekly'  },
  { path: '/compare/deslint-vs-stylelint',   priority: 0.7,  changeFrequency: 'monthly' },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticEntries = STATIC_ROUTES.map((r) => ({
    url: `${BASE}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  const postEntries = POSTS.map((post) => ({
    url: `${BASE}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }));

  // Each /docs/rules/<slug> is its own indexable page with unique meta and
  // JSON-LD; emit one sitemap entry per rule so Google can crawl them
  // directly instead of relying on the hub's outbound links.
  const ruleEntries = RULES.map((rule) => ({
    url: `${BASE}/docs/rules/${rule.slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  return [...staticEntries, ...postEntries, ...ruleEntries];
}
