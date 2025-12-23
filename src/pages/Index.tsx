import { useState } from 'react';
import ParticleBackground from "@/components/ParticleBackground";
import Hero from "@/components/Hero";
import JobQueue from "@/components/JobQueue";
import FreeTokenCounter from "@/components/FreeTokenCounter";
import FirstGenerationCelebration from "@/components/FirstGenerationCelebration";
import AdBanner from "@/components/AdBanner";
import AdGenerationCounter from "@/components/AdGenerationCounter";
import RewardedAdModal from "@/components/RewardedAdModal";
import { useSubscription } from "@/hooks/useSubscription";

const Index = () => {
  const { isAdmin, subscription } = useSubscription();
  const isPro = isAdmin || subscription?.status === 'active';
  const [showAdModal, setShowAdModal] = useState(false);

  return (
    <div className="relative min-h-screen overflow-hidden">
      <ParticleBackground />
      
      <div className="relative z-10 pt-20">
        <Hero />
        
        {/* Free Token Counter (legacy) or Ad Generation Counter */}
        <div className="max-w-6xl mx-auto px-4 mb-4">
          {!isPro && (
            <AdGenerationCounter onWatchAd={() => setShowAdModal(true)} />
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
        open={showAdModal} 
        onOpenChange={setShowAdModal}
        onAdComplete={() => {
          // Generations are granted in the modal
        }}
      />
    </div>
  );
};

export default Index;
