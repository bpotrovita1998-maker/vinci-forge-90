import { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Timer, CheckCircle, Eye, Loader2 } from 'lucide-react';
import { useAdGenerations } from '@/hooks/useAdGenerations';

interface RewardedAdModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdComplete: () => void;
}

// AdSense configuration
const ADSENSE_CLIENT = 'ca-pub-3352231617';
const ADSENSE_SLOT = '3352231617'; // Use your horizontal banner slot for rewarded ads
const AD_WATCH_DURATION = 15; // Seconds users must watch the ad

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

// AdSense Ad Component for Rewarded Modal
function RewardedAdUnit({ onAdLoaded }: { onAdLoaded: () => void }) {
  const adRef = useRef<HTMLDivElement>(null);
  const [adError, setAdError] = useState(false);

  useEffect(() => {
    const loadAd = () => {
      try {
        if (adRef.current && window.adsbygoogle) {
          // Clear any existing ads
          adRef.current.innerHTML = '';
          
          // Create new ins element
          const ins = document.createElement('ins');
          ins.className = 'adsbygoogle';
          ins.style.display = 'block';
          ins.style.width = '100%';
          ins.style.height = '250px';
          ins.setAttribute('data-ad-client', ADSENSE_CLIENT);
          ins.setAttribute('data-ad-slot', ADSENSE_SLOT);
          ins.setAttribute('data-ad-format', 'auto');
          ins.setAttribute('data-full-width-responsive', 'true');
          
          adRef.current.appendChild(ins);
          
          // Push the ad
          (window.adsbygoogle = window.adsbygoogle || []).push({});
          
          // Consider ad as loaded after a short delay
          setTimeout(() => {
            onAdLoaded();
          }, 1000);
        }
      } catch (error) {
        console.error('Error loading rewarded ad:', error);
        setAdError(true);
        // Still allow user to proceed even if ad fails
        onAdLoaded();
      }
    };

    // Small delay to ensure modal is rendered
    const timer = setTimeout(loadAd, 500);
    
    return () => {
      clearTimeout(timer);
    };
  }, [onAdLoaded]);

  if (adError) {
    return (
      <div className="w-full h-[250px] bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg flex items-center justify-center border border-border">
        <div className="text-center text-muted-foreground">
          <Eye className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Advertisement</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={adRef}
      className="w-full min-h-[250px] bg-muted/30 rounded-lg overflow-hidden flex items-center justify-center"
    >
      <div className="text-center text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
        <p className="text-xs">Loading advertisement...</p>
      </div>
    </div>
  );
}

export default function RewardedAdModal({ open, onOpenChange, onAdComplete }: RewardedAdModalProps) {
  const { grantGenerations, generationsPerAd } = useAdGenerations();
  const [adState, setAdState] = useState<'loading' | 'watching' | 'complete'>('loading');
  const [countdown, setCountdown] = useState(AD_WATCH_DURATION);
  const [adLoaded, setAdLoaded] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setAdState('loading');
      setCountdown(AD_WATCH_DURATION);
      setAdLoaded(false);
    }
  }, [open]);

  // Handle ad loaded
  const handleAdLoaded = useCallback(() => {
    setAdLoaded(true);
    setAdState('watching');
  }, []);

  // Countdown timer
  useEffect(() => {
    if (adState !== 'watching' || countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          setAdState('complete');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [adState, countdown]);

  const handleClaimReward = () => {
    grantGenerations();
    onAdComplete();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      // Only allow closing if ad viewing is complete
      if (!isOpen && adState !== 'complete') return;
      onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary" />
            Watch Ad for Free Generations
          </DialogTitle>
          <DialogDescription>
            Watch this short advertisement to unlock {generationsPerAd} free image generations
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <AnimatePresence mode="wait">
            {(adState === 'loading' || adState === 'watching') && (
              <motion.div
                key="ad"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                {/* Ad unit */}
                <RewardedAdUnit onAdLoaded={handleAdLoaded} />

                {/* Countdown and status */}
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Gift className="w-4 h-4" />
                    <span>Reward: {generationsPerAd} generations</span>
                  </div>
                  
                  {adState === 'watching' && (
                    <div className="flex items-center gap-2">
                      <Timer className="w-4 h-4 text-primary" />
                      <span className="font-mono text-sm font-medium">
                        {countdown}s remaining
                      </span>
                    </div>
                  )}
                  
                  {adState === 'loading' && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Loading...</span>
                    </div>
                  )}
                </div>

                {/* Progress bar */}
                {adState === 'watching' && (
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-primary to-green-500"
                      initial={{ width: '0%' }}
                      animate={{ 
                        width: `${((AD_WATCH_DURATION - countdown) / AD_WATCH_DURATION) * 100}%` 
                      }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                )}

                {/* Info text */}
                <p className="text-xs text-center text-muted-foreground">
                  Please watch the advertisement above for {AD_WATCH_DURATION} seconds
                </p>
              </motion.div>
            )}

            {adState === 'complete' && (
              <motion.div
                key="complete"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-center space-y-6"
              >
                <motion.div 
                  className="w-24 h-24 mx-auto rounded-full bg-green-500/20 flex items-center justify-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', bounce: 0.5 }}
                >
                  <CheckCircle className="w-12 h-12 text-green-500" />
                </motion.div>

                <div className="space-y-2">
                  <p className="text-xl font-semibold text-green-500">
                    Thank You!
                  </p>
                  <p className="text-muted-foreground">
                    You have earned {generationsPerAd} free image generations
                  </p>
                </div>

                <Button 
                  onClick={handleClaimReward} 
                  className="w-full gap-2 bg-green-500 hover:bg-green-600"
                  size="lg"
                >
                  <Gift className="w-4 h-4" />
                  Claim Reward
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
