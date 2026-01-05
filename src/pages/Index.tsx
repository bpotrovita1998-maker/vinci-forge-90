import { useState, useEffect, createContext, useContext } from 'react';
import { AnimatePresence } from 'framer-motion';
import ParticleBackground from "@/components/ParticleBackground";
import Hero from "@/components/Hero";
import JobQueue from "@/components/JobQueue";
import FreeTokenCounter from "@/components/FreeTokenCounter";
import FirstGenerationCelebration from "@/components/FirstGenerationCelebration";
import AdGenerationCounter from "@/components/AdGenerationCounter";
import RewardedAdModal from "@/components/RewardedAdModal";
import OnboardingWizard from "@/components/OnboardingWizard";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/contexts/AuthContext";
// Context to share ad modal state with Hero
interface AdModalContextType {
  showAdModal: () => void;
  onAdWatched: () => void;
  adWatchedCallback: (() => void) | null;
  setAdWatchedCallback: (cb: (() => void) | null) => void;
}

export const AdModalContext = createContext<AdModalContextType | null>(null);

export const useAdModal = () => {
  const context = useContext(AdModalContext);
  if (!context) {
    throw new Error('useAdModal must be used within AdModalProvider');
  }
  return context;
};

const ONBOARDING_STORAGE_KEY = 'vinciai_onboarding_completed';

const Index = () => {
  const { isAdmin, subscription } = useSubscription();
  const { user } = useAuth();
  const isPro = isAdmin || subscription?.status === 'active';
  const [showAdModalState, setShowAdModalState] = useState(false);
  const [adWatchedCallback, setAdWatchedCallback] = useState<(() => void) | null>(null);
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

  const showAdModal = () => setShowAdModalState(true);
  
  const onAdWatched = () => {
    if (adWatchedCallback) {
      adWatchedCallback();
      setAdWatchedCallback(null);
    }
  };

  return (
    <AdModalContext.Provider value={{ 
      showAdModal, 
      onAdWatched, 
      adWatchedCallback,
      setAdWatchedCallback 
    }}>
      <div className="relative min-h-screen overflow-hidden">
        <ParticleBackground />
        
        <div className="relative z-10 pt-20">
          <Hero />
          
          {/* Free Token Counter (legacy) or Ad Generation Counter */}
          <div className="max-w-6xl mx-auto px-4 mb-4">
            {!isPro && (
              <AdGenerationCounter onWatchAd={showAdModal} />
            )}
          </div>
          
          <FreeTokenCounter />
          
          {/* Job Queue Section - No ads on this page per AdSense policy */}
          {/* This is a tool/navigation page, ads should only be on content-rich pages */}
          <div className="max-w-6xl mx-auto px-4 py-12">
            <JobQueue />
          </div>
        </div>
        
        {/* First Generation Celebration */}
        <FirstGenerationCelebration />
        
        {/* Rewarded Ad Modal */}
        <RewardedAdModal 
          open={showAdModalState} 
          onOpenChange={setShowAdModalState}
          onAdComplete={onAdWatched}
        />

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
    </AdModalContext.Provider>
  );
};

export default Index;
