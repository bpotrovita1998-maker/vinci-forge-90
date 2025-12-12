import { LandingHero } from '@/components/landing/LandingHero';
import { UseCasesCarousel } from '@/components/landing/UseCasesCarousel';
import { BenefitsSection } from '@/components/landing/BenefitsSection';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { FeatureShowcase } from '@/components/landing/FeatureShowcase';
import { CommunityShowcase } from '@/components/landing/CommunityShowcase';
import { CTASection } from '@/components/landing/CTASection';
import { Footer } from '@/components/landing/Footer';

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <LandingHero />
      <UseCasesCarousel />
      <BenefitsSection />
      <HowItWorks />
      <FeatureShowcase />
      <CommunityShowcase />
      <CTASection />
      <Footer />
    </div>
  );
}
