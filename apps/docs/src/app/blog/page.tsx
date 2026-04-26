import type { Metadata } from 'next';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { FadeIn } from '@/components/motion';
import { BreadcrumbJsonLd } from '@/components/BreadcrumbJsonLd';
import { POSTS } from '@/lib/posts';

export const metadata: Metadata = {
  title: 'Blog — Design Systems, AI Coding Agents, and Deterministic Lint',
  description:
    'Long-form writing from the Deslint team on design token drift, Tailwind arbitrary values, AI coding agents (Claude Code, Cursor, Codex, Windsurf), MCP, and deterministic design-system enforcement.',
  alternates: { canonical: '/blog' },
  openGraph: {
    title: 'Deslint Blog',
    description:
      'Long-form writing on design systems in the AI coding era. Token drift, arbitrary values, MCP, and deterministic lint.',
    url: 'https://deslint.com/blog',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Deslint Blog',
    description:
      'Long-form writing on design systems, AI coding agents, and deterministic lint.',
  },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// ItemList JSON-LD describing the posts in the order they're rendered.
// Helps Google generate sitelinks and list-style rich results for the
// /blog index. Each ListItem references the canonical post URL; the
// full post metadata lives on the individual post page.
const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: 'Deslint Blog',
  description:
    'Long-form writing on design systems, AI coding agents, MCP, and deterministic lint.',
  url: 'https://deslint.com/blog',
  numberOfItems: POSTS.length,
  itemListElement: POSTS.map((post, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    url: `https://deslint.com/blog/${post.slug}`,
    name: post.title,
  })),
};

export default function BlogIndex() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <Navbar />
      <BreadcrumbJsonLd trail={[{ name: 'Blog', path: '/blog' }]} />
      <main className="mx-auto max-w-3xl px-6 pt-32 pb-20">
        <FadeIn className="mb-12">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
            Deslint blog
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 leading-[1.08] mb-6">
            Design systems in the{' '}
            <span className="text-primary">AI coding era</span>
          </h1>
          <p className="text-xl text-gray-600 leading-relaxed">
            Long-form writing on what breaks when Claude Code, Cursor, and
            Codex write 80% of your UI — and the deterministic checks that
            hold the line.
          </p>
        </FadeIn>

        <FadeIn>
          <ul className="space-y-8">
            {POSTS.map((post) => (
              <li key={post.slug}>
                <Link
                  href={`/blog/${post.slug}`}
                  className="group block rounded-2xl border border-gray-200 bg-white p-6 sm:p-7 motion-safe:transition-all motion-safe:duration-300 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-0.5"
                >
                  <div className="flex items-center gap-2 mb-3">
                    {post.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[11px] font-semibold uppercase tracking-wider text-primary bg-primary-50 px-2 py-0.5 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-2 group-hover:text-primary motion-safe:transition-colors">
                    {post.title}
                  </h2>
                  <p className="text-gray-600 leading-relaxed mb-4">
                    {post.description}
                  </p>
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <time dateTime={post.date}>{formatDate(post.date)}</time>
                    <span aria-hidden="true">·</span>
                    <span>{post.readingMinutes} min read</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </FadeIn>

        <FadeIn>
          <div className="mt-16 rounded-2xl border border-gray-200 bg-gray-50/80 p-6 text-sm text-gray-600 leading-relaxed">
            More posts in the pipeline: Figma Variables → ESLint, Cursor +
            design systems, an honest deslint vs. stylelint comparison.
            Want a particular topic covered?{' '}
            <a
              href="mailto:hello@deslint.com?subject=Blog%20topic%20suggestion"
              className="text-primary font-semibold hover:underline"
            >
              Tell us.
            </a>
          </div>
        </FadeIn>
      </main>
      <Footer />
    </>
  );
}
