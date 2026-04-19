import type { Metadata } from 'next';
import Link from 'next/link';
import { BreadcrumbJsonLd } from '@/components/BreadcrumbJsonLd';
import { CATEGORIES, RULES, getRulesByCategory } from '@/lib/rules';

export const metadata: Metadata = {
  title: 'Rules Reference — 34 Design, Accessibility & Token Lint Rules',
  description:
    'All 34 Deslint rules with examples, options, and auto-fix behaviour. Design-token rules (no-arbitrary-colors, consistent-border-radius), accessibility (a11y-color-contrast, aria-validation), responsive layout, dark-mode coverage, and more — every rule is its own indexable page.',
  alternates: { canonical: '/docs/rules' },
  openGraph: {
    title: 'Deslint Rules Reference — 34 Design & A11y Lint Rules',
    description:
      'Every Deslint rule — examples, options, auto-fix support, and a per-rule page. Tailwind token drift, WCAG contrast, dark-mode, responsive, and consistency categories.',
    url: 'https://deslint.com/docs/rules',
    type: 'article',
  },
};

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: 'Deslint Rules Reference',
  description:
    'All 34 deterministic rules shipped by Deslint for design-token, accessibility, responsive-layout, dark-mode, and consistency coverage. Each entry links to the rule\'s own page.',
  url: 'https://deslint.com/docs/rules',
  numberOfItems: RULES.length,
  itemListElement: RULES.map((rule, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    url: `https://deslint.com/docs/rules/${rule.slug}`,
    name: rule.name,
  })),
};

function categoryAnchor(category: string): string {
  return category
    .toLowerCase()
    .replace(/&/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export default function RulesReference() {
  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <BreadcrumbJsonLd
        trail={[
          { name: 'Documentation', path: '/docs' },
          { name: 'Rules Reference', path: '/docs/rules' },
        ]}
      />

      <h1>Rules Reference</h1>
      <p>
        Deslint ships with {RULES.length} rules across {CATEGORIES.length} scoring
        categories. Each rule can be set to <code>&quot;error&quot;</code>,{' '}
        <code>&quot;warn&quot;</code>, or <code>&quot;off&quot;</code>. Rules
        marked <em>fixable</em> auto-fix when you run <code>eslint --fix</code>.
      </p>

      <p className="not-prose rounded-xl border border-primary/20 bg-primary-50/40 px-5 py-4 text-sm text-gray-700 leading-relaxed">
        <strong className="text-gray-900">Deep dive: </strong>
        for the full story on why arbitrary Tailwind values drift — the three
        archetypes, how AI coding agents amplify them, and how deslint catches
        each — read{' '}
        <Link
          href="/blog/tailwind-arbitrary-values"
          className="text-primary font-semibold hover:underline"
        >
          The hidden cost of Tailwind arbitrary values
        </Link>
        .
      </p>

      {CATEGORIES.map((category) => {
        const rules = getRulesByCategory(category);
        if (rules.length === 0) return null;
        return (
          <section key={category}>
            <h2 id={categoryAnchor(category)}>{category}</h2>
            <ul className="not-prose grid gap-3 sm:grid-cols-2">
              {rules.map((rule) => (
                <li key={rule.slug}>
                  <Link
                    href={`/docs/rules/${rule.slug}`}
                    className="group block rounded-xl border border-gray-200 bg-white px-4 py-3.5 hover:border-primary/40 hover:shadow-sm motion-safe:transition-all"
                  >
                    <div className="flex items-baseline justify-between mb-1">
                      <code className="font-mono text-sm font-semibold text-primary group-hover:text-primary-light">
                        {rule.name}
                      </code>
                      <span className="text-[11px] text-gray-400 ml-3 shrink-0">
                        /docs/rules/{rule.slug} →
                      </span>
                    </div>
                    <span className="block text-sm text-gray-600 leading-snug">
                      {rule.tagline}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <h2>Inline Suppression</h2>
      <p>
        Suppress a single violation with <code>deslint-ignore</code> and a
        mandatory reason:
      </p>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
        <code>{`{/* deslint-ignore no-arbitrary-colors -- brand gradient requires exact hex */}
<div className="bg-[#1E3A5F]" />`}</code>
      </pre>

      <h2>Report a False Positive</h2>
      <p>
        If a rule flags code that you believe is correct, please report it so we
        can improve Deslint for everyone. Include the rule name, the flagged
        code, and why you think it&apos;s a false positive.
      </p>
      <p>
        <a
          href="https://github.com/jaydrao215/deslint/issues/new?labels=false-positive"
          target="_blank"
          rel="noopener noreferrer"
        >
          Report a false positive on GitHub &rarr;
        </a>
      </p>
    </div>
  );
}
