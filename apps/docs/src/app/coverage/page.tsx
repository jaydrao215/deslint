import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { AccessibilitySection } from '@/components/AccessibilitySection';
import { FrameworkMatrix } from '@/components/FrameworkMatrix';

export const metadata = {
  title: 'Framework & WCAG Coverage · Deslint',
  description:
    'Every framework Deslint parses and every WCAG 2.2 AA criterion it statically detects, side by side. The reference cards previously embedded on the homepage.',
};

export default function CoveragePage() {
  return (
    <>
      <Navbar />
      <main>
        <CoverageHero />
        <AccessibilitySection />
        <FrameworkMatrix />
      </main>
      <Footer />
    </>
  );
}

function CoverageHero() {
  return (
    <section className="px-6 pt-32 pb-12">
      <div className="mx-auto max-w-3xl text-center">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary">
          Coverage reference
        </p>
        <h1 className="mb-4 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          Frameworks parsed,{' '}
          <span className="gradient-text-hero">criteria mapped.</span>
        </h1>
        <p className="text-base text-gray-500 sm:text-lg">
          Five frameworks under one config and every WCAG 2.2 AA criterion
          Deslint statically detects, both side by side. This is the spec — the
          rest of the marketing site shows the proof.
        </p>
      </div>
    </section>
  );
}
