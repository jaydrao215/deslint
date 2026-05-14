import type { Metadata } from 'next';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { BreadcrumbJsonLd } from '@/components/BreadcrumbJsonLd';
import { VisualProofPlayer } from '@/components/VisualProofPlayer';

export const metadata: Metadata = {
  title: 'Visual Proof — The Four Failures AI Code Ships, Before and After Deslint',
  description:
    'Four common failures AI-generated code ships: dark-mode breaks, responsive reflow, contrast loss, and invisible accessibility gaps. Each one rendered live in your browser — not a screenshot — before and after Deslint fixes it. Plus a 40-second loop you can share.',
  alternates: { canonical: '/proof' },
  keywords: [
    'AI generated code visual proof',
    'dark mode AI bug',
    'responsive reflow AI',
    'contrast accessibility AI',
    'before and after lint',
    'design system AI fix',
  ],
  openGraph: {
    title: 'Visual Proof — Four Failures AI Code Ships, Before and After Deslint',
    description:
      'Dark mode, responsive reflow, contrast, accessibility — rendered live before and after Deslint fixes them. Not screenshots; real DOM, every time.',
    url: 'https://deslint.com/proof',
    type: 'website',
  },
};

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  '@id': 'https://deslint.com/proof',
  name: 'Visual Proof — Deslint',
  description:
    'Four common failures AI-generated code ships, rendered live before and after Deslint fixes them. Dark-mode breaks, responsive reflow, contrast loss, accessibility gaps.',
  url: 'https://deslint.com/proof',
  isPartOf: {
    '@type': 'WebSite',
    name: 'Deslint',
    url: 'https://deslint.com',
  },
  about: [
    { '@type': 'Thing', name: 'Dark mode parity' },
    { '@type': 'Thing', name: 'Responsive reflow' },
    { '@type': 'Thing', name: 'Color contrast (WCAG 2.2 AA)' },
    { '@type': 'Thing', name: 'Web accessibility (WCAG)' },
  ],
};

export default function ProofPage() {
  return (
    <>
      <Navbar />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <BreadcrumbJsonLd trail={[{ name: 'Visual Proof', path: '/proof' }]} />
      <main>
        <Hero />
        <VisualProofPlayer />
        <FourFailuresExplainer />
        <GetStarted />
      </main>
      <Footer />
    </>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-gray-200 bg-gradient-to-br from-white via-primary-50/30 to-white px-6 pt-32 pb-12">
      <div className="absolute inset-0 dot-grid opacity-40 pointer-events-none" />
      <div className="relative z-10 mx-auto max-w-4xl">
        <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
          Visual proof
        </p>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 leading-[1.05] mb-6 text-balance">
          Four failures AI code ships.{' '}
          <span className="gradient-text-hero">Rendered live, not as a screenshot.</span>
        </h1>
        <p className="text-lg sm:text-xl text-gray-600 leading-relaxed max-w-3xl">
          Dark-mode breaks, responsive reflow, contrast loss, invisible
          accessibility gaps. Each one rendered in real DOM in your browser,
          before and after Deslint fixes it. Same input, same output, every time.
        </p>
      </div>
    </section>
  );
}

function FourFailuresExplainer() {
  return (
    <section className="px-6 py-20 bg-white">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
          What the four beats catch
        </p>
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 text-balance leading-tight">
          The bugs your type-checker and tests cannot see.
        </h2>
        <p className="text-lg text-gray-600 leading-relaxed mb-10 max-w-3xl">
          Every beat above maps to a documented Deslint rule. The fix is
          deterministic — the same hex colour, the same fixed width, the
          same missing alt text always produces the same lint output and the
          same suggested rewrite.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card
            beat="01"
            title="Dark mode · flipped"
            blurb="AI generated hardcoded greys. The light preview looks fine. Flip to dark mode and the page disappears."
            rule="dark-mode-coverage"
            ruleHref="/docs/rules/dark-mode-coverage"
          />
          <Card
            beat="02"
            title="Responsive · reflow"
            blurb="Fixed widths, rigid grids, no breakpoints. Survives the laptop, clips off-screen at 375 px."
            rule="responsive-required"
            ruleHref="/docs/rules/responsive-required"
          />
          <Card
            beat="03"
            title="Contrast · readability"
            blurb="A subtitle that looks stylish at full vision disappears under mild vision loss. WCAG 1.4.3 contrast 3.7:1."
            rule="a11y-color-contrast"
            ruleHref="/docs/rules/a11y-color-contrast"
          />
          <Card
            beat="04"
            title="A11y · the invisible wins"
            blurb="No pixel diff. Empty alt, skipped headings, unlabeled inputs. Lighthouse score climbs from 67 to 100."
            rule="image-alt-text · heading-hierarchy · form-labels"
            ruleHref="/docs/rules"
          />
        </div>
      </div>
    </section>
  );
}

function Card({
  beat,
  title,
  blurb,
  rule,
  ruleHref,
}: {
  beat: string;
  title: string;
  blurb: string;
  rule: string;
  ruleHref: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6">
      <div className="mb-2 flex items-center gap-3">
        <span className="font-mono text-xs font-semibold text-primary/70">{beat}</span>
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      </div>
      <p className="text-sm text-gray-600 leading-relaxed mb-3">{blurb}</p>
      <Link
        href={ruleHref}
        className="inline-flex items-center gap-1.5 font-mono text-2xs text-primary hover:text-primary-light"
      >
        {rule}
        <span aria-hidden>→</span>
      </Link>
    </div>
  );
}

function GetStarted() {
  return (
    <section className="px-6 py-20 bg-surface-100 border-t border-gray-200">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 text-balance leading-tight">
          Run the same check on your repo.
        </h2>
        <p className="text-lg text-gray-600 leading-relaxed mb-8">
          One command, no install, no cloud roundtrip. See the same four
          categories scored against your own code.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <code className="rounded-xl bg-gray-950 px-5 py-3 font-mono text-sm text-gray-100">
            npx deslint scan
          </code>
          <Link
            href="/docs/getting-started"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:border-gray-300 hover:bg-gray-50 motion-safe:transition-colors"
          >
            Or read the getting-started guide
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
