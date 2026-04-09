import { Navbar } from '@/components/Navbar';
import { Hero } from '@/components/Hero';
import { MetricsBanner } from '@/components/MetricsBanner';
import { VisualProofSection } from '@/components/VisualProofSection';
import { BeforeAfter } from '@/components/BeforeAfter';
import { McpLoopSection } from '@/components/McpLoopSection';
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
        <VisualProofSection />
        <BeforeAfter />
        <McpLoopSection />
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
