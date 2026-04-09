import { Navbar } from '@/components/Navbar';
import { Hero } from '@/components/Hero';
import { Surfaces } from '@/components/Surfaces';
import { WhatItCatches } from '@/components/WhatItCatches';
import { HowItWorks } from '@/components/HowItWorks';
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
        <Surfaces />
        <WhatItCatches />
        <HowItWorks />
        <AccessibilitySection />
        <FrameworkMatrix />
        <ProofBar />
        <Cta />
      </main>
      <Footer />
    </>
  );
}
