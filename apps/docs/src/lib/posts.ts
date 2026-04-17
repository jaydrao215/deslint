// Single source of truth for blog posts.
//
// Consumed by:
//   - apps/docs/src/app/blog/page.tsx       (index listing)
//   - apps/docs/src/app/sitemap.ts          (auto-inclusion)
//   - apps/docs/src/app/blog/rss.xml/route  (feed generation)
//
// Adding a new post? Append an entry here and the sitemap + RSS pick it up
// on the next build. The per-post page still lives at
// apps/docs/src/app/blog/<slug>/page.tsx.

export interface Post {
  slug: string;
  title: string;
  description: string;
  /** ISO date, e.g. 2026-04-17. */
  date: string;
  readingMinutes: number;
  tags: string[];
}

export const POSTS: Post[] = [
  {
    slug: 'tailwind-arbitrary-values',
    title: 'The hidden cost of Tailwind arbitrary values',
    description:
      'An escape hatch, three archetypes of drift, and why linting them deterministically matters more now that AI writes most of your markup.',
    date: '2026-04-17',
    readingMinutes: 9,
    tags: ['Tailwind', 'Design tokens', 'AI coding'],
  },
];
