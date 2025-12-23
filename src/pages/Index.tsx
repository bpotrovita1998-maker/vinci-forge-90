import { useState, createContext, useContext } from 'react';
import ParticleBackground from "@/components/ParticleBackground";
import Hero from "@/components/Hero";
import JobQueue from "@/components/JobQueue";
import FreeTokenCounter from "@/components/FreeTokenCounter";
import FirstGenerationCelebration from "@/components/FirstGenerationCelebration";
import AdBanner from "@/components/AdBanner";
import AdGenerationCounter from "@/components/AdGenerationCounter";
import RewardedAdModal from "@/components/RewardedAdModal";
import { useSubscription } from "@/hooks/useSubscription";

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

const Index = () => {
  const { isAdmin, subscription } = useSubscription();
  const isPro = isAdmin || subscription?.status === 'active';
  const [showAdModalState, setShowAdModalState] = useState(false);
  const [adWatchedCallback, setAdWatchedCallback] = useState<(() => void) | null>(null);

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
          
          {/* Top Banner Ad for Free Users */}
          {!isPro && (
            <div className="max-w-6xl mx-auto px-4 mb-6 flex justify-center">
              <AdBanner format="horizontal" className="w-full" />
            </div>
          )}
          
          {/* Job Queue Section */}
          <div className="max-w-6xl mx-auto px-4 py-12">
            <JobQueue />
          </div>
          
          {/* Bottom Banner Ad for Free Users */}
          {!isPro && (
            <div className="max-w-6xl mx-auto px-4 pb-8 flex justify-center">
              <AdBanner format="horizontal" className="w-full" />
            </div>
          )}
        </div>
        
        {/* First Generation Celebration */}
        <FirstGenerationCelebration />
        
        {/* Rewarded Ad Modal */}
        <RewardedAdModal 
          open={showAdModalState} 
          onOpenChange={setShowAdModalState}
          onAdComplete={onAdWatched}
        />
      </div>
    </AdModalContext.Provider>
  );
};

export default Index;
