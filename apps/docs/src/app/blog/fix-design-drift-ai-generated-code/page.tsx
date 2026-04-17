import type { Metadata } from 'next';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { FadeIn } from '@/components/motion';
import { BreadcrumbJsonLd } from '@/components/BreadcrumbJsonLd';

const PUBLISHED = '2026-04-17';
const UPDATED = '2026-04-17';
const READING_MINUTES = 11;

export const metadata: Metadata = {
  title:
    'How to fix design drift in AI-generated code — a deterministic playbook',
  description:
    'AI coding agents rewrite UI faster than any team can review it. A practical playbook for catching design-system drift at generation time using an ESLint plugin for design systems and a local MCP server for Cursor, Claude Code, Windsurf, and Codex.',
  alternates: { canonical: '/blog/fix-design-drift-ai-generated-code' },
  keywords: [
    'fix design drift in ai generated code',
    'ai coding agent design drift',
    'eslint plugin for design systems ai',
    'deslint mcp',
    'mcp server design lint',
    'local mcp linting for cursor',
    'local mcp linting for claude code',
    'design token drift ai',
    'deterministic design linter',
  ],
  openGraph: {
    title: 'How to fix design drift in AI-generated code',
    description:
      'A deterministic playbook for stopping design-system drift at generation time — ESLint plugin + local MCP server for Cursor, Claude Code, Windsurf, and Codex.',
    url: 'https://deslint.com/blog/fix-design-drift-ai-generated-code',
    type: 'article',
    publishedTime: PUBLISHED,
    modifiedTime: UPDATED,
    authors: ['Deslint'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'How to fix design drift in AI-generated code',
    description:
      'Stop design-system drift at generation time — not 24 hours later in CI.',
  },
};

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'BlogPosting',
  headline: 'How to fix design drift in AI-generated code',
  description:
    'A deterministic playbook for stopping design-system drift at generation time — ESLint plugin for design systems plus a local MCP server Cursor, Claude Code, Windsurf, and Codex can call in-loop.',
  datePublished: PUBLISHED,
  dateModified: UPDATED,
  author: {
    '@type': 'Organization',
    name: 'Deslint',
    url: 'https://deslint.com',
  },
  publisher: {
    '@type': 'Organization',
    name: 'Deslint',
    url: 'https://deslint.com',
    logo: {
      '@type': 'ImageObject',
      url: 'https://deslint.com/icons/icon-192.png',
    },
  },
  mainEntityOfPage: {
    '@type': 'WebPage',
    '@id': 'https://deslint.com/blog/fix-design-drift-ai-generated-code',
  },
  keywords:
    'fix design drift in ai generated code, ai coding agent design drift, eslint plugin for design systems ai, deslint mcp, local mcp linting for cursor, local mcp linting for claude code',
};

export default function FixDesignDriftAiGeneratedCodePost() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <BreadcrumbJsonLd
        trail={[
          { name: 'Blog', path: '/blog' },
          {
            name: 'Fix design drift in AI-generated code',
            path: '/blog/fix-design-drift-ai-generated-code',
          },
        ]}
      />
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 pt-32 pb-20">
        <FadeIn className="mb-12">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
            AI coding · Design systems · {READING_MINUTES} min read
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 leading-[1.08] mb-6">
            How to fix{' '}
            <span className="text-primary">design drift</span> in
            AI-generated code
          </h1>
          <p className="text-xl text-gray-600 leading-relaxed mb-8">
            AI coding agents rewrite UI faster than any team can review it. A
            practical playbook for catching design-system drift at generation
            time — with a purpose-built ESLint plugin and a local MCP server
            Cursor, Claude Code, Windsurf, and Codex call in-loop — instead
            of chasing it in CI 24 hours later.
          </p>
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <time dateTime={PUBLISHED}>April 17, 2026</time>
            <span aria-hidden="true">·</span>
            <span>{READING_MINUTES} min read</span>
            <span aria-hidden="true">·</span>
            <Link href="/mcp" className="text-primary hover:underline">
              MCP setup
            </Link>
          </div>
        </FadeIn>

        <article className="space-y-12">
          <FadeIn>
            <p className="text-lg text-gray-700 leading-relaxed mb-6">
              Design drift is the slow, silent erosion of a design system
              across a codebase — arbitrary hex colours instead of tokens,
              off-scale paddings, ad-hoc border radii, missing ARIA
              attributes, layouts that silently break at the md breakpoint.
              It is not a new problem. What is new is the rate.
            </p>
            <p className="text-lg text-gray-700 leading-relaxed mb-6">
              An AI coding agent can produce a 14-file diff in under a
              minute. On a fast team, dozens of those diffs land per day.
              Post-PR review cannot keep pace, and linters that only run in
              CI only catch the damage after it has merged — at which point
              the drift has already shipped to staging and is about to
              cascade into more agent-generated code that uses the freshly
              drifted components as reference.
            </p>
            <p className="text-lg text-gray-700 leading-relaxed">
              The fix is not more reviewers. It is moving the check earlier
              — to the moment the agent is about to write the code. This
              post is the practical playbook for doing that with a local,
              deterministic, zero-egress toolchain.
            </p>
          </FadeIn>

          {/* Subsequent batches fill in: definition, why post-PR fails,
              three install surfaces (MCP/ESLint/CI), and rollout plan. */}
        </article>

        <div className="mt-16 flex flex-wrap gap-3">
          <Link
            href="/mcp"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary-light motion-safe:transition-all"
          >
            See the MCP tool surface
          </Link>
          <Link
            href="/docs/getting-started"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:border-gray-300 hover:bg-gray-50 motion-safe:transition-all"
          >
            Install in 2 minutes
          </Link>
          <Link
            href="/docs/rules"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:border-gray-300 hover:bg-gray-50 motion-safe:transition-all"
          >
            Browse every rule
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
