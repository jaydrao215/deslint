import { Navbar } from '@/components/Navbar';
import { Hero } from '@/components/Hero';
import { MetricsBanner } from '@/components/MetricsBanner';
import { BeforeAfter } from '@/components/BeforeAfter';
import { ProductShowcase } from '@/components/ProductShowcase';
import { WhatItCatches } from '@/components/WhatItCatches';
import { ComparisonTable } from '@/components/ComparisonTable';
import { AccessibilitySection } from '@/components/AccessibilitySection';
import { FrameworkMatrix } from '@/components/FrameworkMatrix';
import { PrivacyTrust } from '@/components/PrivacyTrust';
import { QuickStart } from '@/components/QuickStart';
import { Cta } from '@/components/Cta';
import { Footer } from '@/components/Footer';

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <MetricsBanner />
        <BeforeAfter />
        <ProductShowcase />
        <WhatItCatches />
        <ComparisonTable />
        <AccessibilitySection />
        <FrameworkMatrix />
        <PrivacyTrust />
        <QuickStart />
        <Cta />
      </main>
      <Footer />
    </>
  );
}
