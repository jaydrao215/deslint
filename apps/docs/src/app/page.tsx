import { Hero } from '@/components/Hero';
import { BeforeAfter } from '@/components/BeforeAfter';
import { FeatureBlocks } from '@/components/FeatureBlocks';
import { Cta } from '@/components/Cta';
import { Footer } from '@/components/Footer';

export default function Home() {
  return (
    <main>
      <Hero />
      <BeforeAfter />
      <FeatureBlocks />
      <Cta />
      <Footer />
    </main>
  );
}
