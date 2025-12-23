import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Gift, Sparkles, Timer, CheckCircle } from 'lucide-react';
import { useAdGenerations } from '@/hooks/useAdGenerations';

interface RewardedAdModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdComplete: () => void;
}

export default function RewardedAdModal({ open, onOpenChange, onAdComplete }: RewardedAdModalProps) {
  const { grantGenerations, generationsPerAd } = useAdGenerations();
  const [adState, setAdState] = useState<'ready' | 'watching' | 'complete'>('ready');
  const [countdown, setCountdown] = useState(5);
  const [adProgress, setAdProgress] = useState(0);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setAdState('ready');
      setCountdown(5);
      setAdProgress(0);
    }
  }, [open]);

  // Simulate ad watching (replace with real ad SDK)
  const startWatchingAd = useCallback(() => {
    setAdState('watching');
    setCountdown(5);
    setAdProgress(0);

    // Simulate ad progress
    const progressInterval = setInterval(() => {
      setAdProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 2;
      });
    }, 100);

    // Countdown timer
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          clearInterval(progressInterval);
          setAdState('complete');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(progressInterval);
      clearInterval(countdownInterval);
    };
  }, []);

  const handleClaimReward = () => {
    grantGenerations();
    onAdComplete();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" />
            Watch Ad for Free Generations
          </DialogTitle>
          <DialogDescription>
            Watch a short ad to unlock {generationsPerAd} free image generations
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          <AnimatePresence mode="wait">
            {adState === 'ready' && (
              <motion.div
                key="ready"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-center space-y-6"
              >
                <div className="relative w-32 h-32 mx-auto">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full" />
                  <div className="absolute inset-4 bg-gradient-to-br from-primary/30 to-primary/10 rounded-full flex items-center justify-center">
                    <Play className="w-12 h-12 text-primary" />
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-lg font-medium">
                    Get <span className="text-primary">{generationsPerAd} free</span> generations!
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Watch a 5-second ad to continue creating
                  </p>
                </div>

                <Button 
                  onClick={startWatchingAd} 
                  className="w-full gap-2"
                  size="lg"
                >
                  <Play className="w-4 h-4" />
                  Watch Ad
                </Button>
              </motion.div>
            )}

            {adState === 'watching' && (
              <motion.div
                key="watching"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-center space-y-6"
              >
                {/* Ad placeholder - replace with actual ad content */}
                <div className="relative bg-muted rounded-lg overflow-hidden aspect-video">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center space-y-2">
                      <div className="w-16 h-16 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
                        <Sparkles className="w-8 h-8 text-primary animate-pulse" />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Ad playing...
                      </p>
                    </div>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted-foreground/20">
                    <motion.div
                      className="h-full bg-primary"
                      initial={{ width: 0 }}
                      animate={{ width: `${adProgress}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Timer className="w-4 h-4" />
                  <span>Reward in {countdown}s...</span>
                </div>
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
                    Ad Complete!
                  </p>
                  <p className="text-muted-foreground">
                    You've earned {generationsPerAd} free image generations
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
