import { Navbar } from '@/components/Navbar';
import { Hero } from '@/components/Hero';
import { MetricsBanner } from '@/components/MetricsBanner';
import { getGitHubStars } from '@/lib/github-stars';
import { VisualProofSection } from '@/components/VisualProofSection';
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

export default async function Home() {
  const stars = await getGitHubStars();
  return (
    <>
      <Navbar />
      <main>
        <Hero stars={stars} />
        <MetricsBanner />
        <PrivacyTrust />
        <VisualProofSection />
        <McpLoopSection />
        <ProductShowcase />
        <WhatItCatches />
        <ComparisonTable />
        <AccessibilitySection />
        <FrameworkMatrix />
        <QuickStart />
        <Cta />
      </main>
      <Footer />
    </>
  );
}
