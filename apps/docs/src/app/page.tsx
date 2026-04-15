import { Navbar } from '@/components/Navbar';
import { Hero } from '@/components/Hero';
import { TrustBanner } from '@/components/TrustBanner';
import { getGitHubStars } from '@/lib/github-stars';
import { VisualProofSection } from '@/components/VisualProofSection';
import { McpLoopSection } from '@/components/McpLoopSection';
import { ProductShowcase } from '@/components/ProductShowcase';
import { WhatItCatches } from '@/components/WhatItCatches';
import { ComparisonStrip } from '@/components/ComparisonStrip';
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
        <TrustBanner />
        <VisualProofSection />
        <McpLoopSection />
        <ProductShowcase />
        <WhatItCatches />
        <ComparisonStrip />
        <QuickStart />
        <Cta />
      </main>
      <Footer />
    </>
  );
}
