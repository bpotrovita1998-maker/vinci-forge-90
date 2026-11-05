import { useState, useEffect, createContext, useContext } from 'react';
import { AnimatePresence } from 'framer-motion';
import ParticleBackground from "@/components/ParticleBackground";
import Hero from "@/components/Hero";
import JobQueue from "@/components/JobQueue";
import FreeTokenCounter from "@/components/FreeTokenCounter";
import FirstGenerationCelebration from "@/components/FirstGenerationCelebration";
import OnboardingWizard from "@/components/OnboardingWizard";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/contexts/AuthContext";
const ONBOARDING_STORAGE_KEY = 'vinciai_onboarding_completed';

const Index = () => {
  const { isAdmin, subscription } = useSubscription();
  const { user } = useAuth();
  const isPro = isAdmin || subscription?.status === 'active';
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Check if user should see onboarding
  useEffect(() => {
    if (user) {
      const hasCompletedOnboarding = localStorage.getItem(ONBOARDING_STORAGE_KEY);
      if (!hasCompletedOnboarding) {
        // Small delay to let the page load first
        const timer = setTimeout(() => setShowOnboarding(true), 500);
        return () => clearTimeout(timer);
      }
    }
  }, [user]);

  const handleOnboardingComplete = () => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    setShowOnboarding(false);
  };

  const handleOnboardingSkip = () => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    setShowOnboarding(false);
  };

  return (
    <>
      <div className="relative min-h-screen overflow-hidden">
        <ParticleBackground />
        
        <div className="relative z-10 pt-20">
          <Hero />
          
          <FreeTokenCounter />
          
          {/* Job Queue Section */}
          <div className="max-w-6xl mx-auto px-4 py-12">
            <JobQueue />
          </div>
        </div>
        
        {/* First Generation Celebration */}
        <FirstGenerationCelebration />
        
        {/* Onboarding Wizard */}
        <AnimatePresence>
          {showOnboarding && (
            <OnboardingWizard 
              onComplete={handleOnboardingComplete}
              onSkip={handleOnboardingSkip}
            />
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export default Index;
