import { Navbar } from '@/components/Navbar';
import { Hero } from '@/components/Hero';
import { BeforeAfter } from '@/components/BeforeAfter';
import { FeatureBlocks } from '@/components/FeatureBlocks';
import { HowItWorks } from '@/components/HowItWorks';
import { Frameworks } from '@/components/Frameworks';
import { Cta } from '@/components/Cta';
import { Footer } from '@/components/Footer';

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <BeforeAfter />
        <FeatureBlocks />
        <HowItWorks />
        <Frameworks />
        <Cta />
      </main>
      <Footer />
    </>
  );
}
