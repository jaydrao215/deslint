import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BreadcrumbJsonLd } from '@/components/BreadcrumbJsonLd';
import { RULES, getRule, getRelatedRules } from '@/lib/rules';

interface Params {
  slug: string;
}

export function generateStaticParams(): Params[] {
  return RULES.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<Params> },
): Promise<Metadata> {
  const { slug } = await params;
  const rule = getRule(slug);
  if (!rule) return {};

  const title = `${rule.name} — Deslint Rule Reference`;
  const description = rule.tagline;
  const url = `https://deslint.com/docs/rules/${rule.slug}`;

  return {
    title,
    description,
    alternates: { canonical: `/docs/rules/${rule.slug}` },
    keywords: [
      rule.name,
      'deslint rule',
      'eslint rule',
      `${rule.category.toLowerCase()} lint`,
      'design system lint',
      'ai generated code',
      ...(rule.wcag ? ['wcag', 'accessibility'] : []),
    ],
    openGraph: {
      title: `${rule.name} — Deslint`,
      description,
      url,
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${rule.name} — Deslint Rule`,
      description,
    },
  };
}

export default async function RulePage(
  { params }: { params: Promise<Params> },
) {
  const { slug } = await params;
  const rule = getRule(slug);
  if (!rule) notFound();

  const related = getRelatedRules(rule);
  const url = `https://deslint.com/docs/rules/${rule.slug}`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: `${rule.name} — Deslint Rule`,
    description: rule.tagline,
    url,
    mainEntityOfPage: url,
    inLanguage: 'en',
    proficiencyLevel: 'Beginner',
    author: {
      '@type': 'Organization',
      name: 'Deslint',
      url: 'https://deslint.com',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Deslint',
      url: 'https://deslint.com',
    },
    keywords: [
      rule.name,
      rule.category,
      'eslint rule',
      'design system lint',
      ...(rule.wcag ? ['WCAG', 'accessibility'] : []),
    ].join(', '),
    about: {
      '@type': 'SoftwareApplication',
      name: '@deslint/eslint-plugin',
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'macOS, Linux, Windows',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    },
  };

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <BreadcrumbJsonLd
        trail={[
          { name: 'Documentation', path: '/docs' },
          { name: 'Rules Reference', path: '/docs/rules' },
          { name: rule.name, path: `/docs/rules/${rule.slug}` },
        ]}
      />

      <p className="not-prose text-xs font-semibold text-primary uppercase tracking-wider mb-3">
        {rule.category}
      </p>
      <h1>{rule.name}</h1>
      <p className="lead">{rule.tagline}</p>

      <p>{rule.description}</p>

      <h2>Behavior</h2>
      <ul>
        <li><strong>Fixable:</strong> {rule.fixable}</li>
        <li><strong>Suggestions:</strong> {rule.suggestions}</li>
        {rule.wcag && <li><strong>Maps to:</strong> {rule.wcag}</li>}
      </ul>

      {rule.options && (
        <>
          <h2>Options</h2>
          <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
            <code>{rule.options}</code>
          </pre>
        </>
      )}

      <h2>Examples</h2>
      <p><strong>Bad:</strong></p>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
        <code>{rule.badCode}</code>
      </pre>
      <p><strong>Good:</strong></p>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
        <code>{rule.goodCode}</code>
      </pre>

      <h2>Related rules</h2>
      <ul className="not-prose grid gap-3 sm:grid-cols-3">
        {related.map((r) => (
          <li key={r.slug}>
            <Link
              href={`/docs/rules/${r.slug}`}
              className="block rounded-xl border border-gray-200 bg-white px-4 py-3 hover:border-primary/40 hover:shadow-sm motion-safe:transition-all"
            >
              <code className="block font-mono text-sm font-semibold text-primary mb-1">
                {r.name}
              </code>
              <span className="block text-xs text-gray-500 leading-snug">
                {r.tagline}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <h2>Use it</h2>
      <p>
        Enable <code>{rule.name}</code> in your <code>eslint.config.js</code>:
      </p>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
        <code>{`import deslint from '@deslint/eslint-plugin';

export default [
  {
    plugins: { deslint },
    rules: {
      'deslint/${rule.name}': 'error',
    },
  },
];`}</code>
      </pre>

      <p className="not-prose mt-8 text-sm text-gray-500">
        Found a false positive?{' '}
        <a
          href={`https://github.com/jaydrao215/deslint/issues/new?labels=false-positive&title=False%20positive%3A%20${encodeURIComponent(rule.name)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          Report it on GitHub →
        </a>
      </p>

      <p className="not-prose mt-4 text-sm text-gray-500">
        ←{' '}
        <Link href="/docs/rules" className="text-primary hover:underline">
          Back to all rules
        </Link>
      </p>
    </div>
  );
}
