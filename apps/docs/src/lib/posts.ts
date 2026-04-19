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
    slug: 'tailwind-v4-eslint-migration',
    title: 'Tailwind v4 ESLint migration: a deterministic upgrade guide',
    description:
      'A working playbook for moving an ESLint setup from Tailwind v3 to v4 — what changes in the class generation, which lint rules go stale, and the deterministic checks that make the migration boring instead of risky.',
    date: '2026-04-19',
    readingMinutes: 10,
    tags: ['Tailwind', 'ESLint', 'Migration', 'AI coding'],
  },
  {
    slug: 'fix-design-drift-ai-generated-code',
    title: 'How to fix design drift in AI-generated code',
    description:
      'AI coding agents rewrite UI faster than any team can review it. A practical, deterministic playbook for catching design-system drift at generation time — with an ESLint plugin and a local MCP server — instead of chasing it in CI.',
    date: '2026-04-17',
    readingMinutes: 11,
    tags: ['AI coding', 'Design systems', 'MCP', 'ESLint'],
  },
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
