import { Navbar } from '@/components/Navbar';
import { Hero } from '@/components/Hero';
import { ProductShowcase } from '@/components/ProductShowcase';
import { WhatItCatches } from '@/components/WhatItCatches';
import { AccessibilitySection } from '@/components/AccessibilitySection';
import { FrameworkMatrix } from '@/components/FrameworkMatrix';
import { ProofBar } from '@/components/ProofBar';
import { Cta } from '@/components/Cta';
import { Footer } from '@/components/Footer';

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <ProductShowcase />
        <WhatItCatches />
        <AccessibilitySection />
        <FrameworkMatrix />
        <ProofBar />
        <Cta />
      </main>
      <Footer />
    </>
  );
}
