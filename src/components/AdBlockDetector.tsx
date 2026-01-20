import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, X, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/hooks/useSubscription';

interface AdBlockDetectorProps {
  onAdBlockDetected?: (blocked: boolean) => void;
}

export default function AdBlockDetector({ onAdBlockDetected }: AdBlockDetectorProps) {
  const [adBlockDetected, setAdBlockDetected] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const { isAdmin, subscription } = useSubscription();
  const isPro = isAdmin || subscription?.status === 'active';

  useEffect(() => {
    const detectAdBlock = async () => {
      try {
        // Method 1: Try to fetch a known ad script
        const testUrl = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
        const response = await fetch(testUrl, {
          method: 'HEAD',
          mode: 'no-cors',
          cache: 'no-store',
        });
        
        // If we get here without error, ads might be allowed
        // But we need additional checks
      } catch {
        // Fetch failed - likely blocked
        setAdBlockDetected(true);
        onAdBlockDetected?.(true);
        return;
      }

      // Method 2: Create a bait element that ad blockers typically hide
      const bait = document.createElement('div');
      bait.className = 'adsbox ad-banner adsbygoogle pub_300x250 pub_300x250m pub_728x90 text-ad textAd text_ad text_ads text-ads text-ad-links ad-text adSense adBlock';
      bait.style.cssText = 'position: absolute; top: -10px; left: -10px; width: 1px; height: 1px;';
      bait.innerHTML = '&nbsp;';
      document.body.appendChild(bait);

      // Wait a moment for ad blockers to act
      await new Promise(resolve => setTimeout(resolve, 100));

      const isBlocked = 
        bait.offsetHeight === 0 || 
        bait.offsetParent === null || 
        getComputedStyle(bait).display === 'none' ||
        getComputedStyle(bait).visibility === 'hidden';

      document.body.removeChild(bait);

      if (isBlocked) {
        setAdBlockDetected(true);
        onAdBlockDetected?.(true);
      } else {
        // Method 3: Check if adsbygoogle is defined and working
        const hasAdSense = typeof window !== 'undefined' && 
          'adsbygoogle' in window && 
          Array.isArray((window as { adsbygoogle?: unknown[] }).adsbygoogle);
        
        if (!hasAdSense) {
          // AdSense script didn't load - might be blocked
          setAdBlockDetected(true);
          onAdBlockDetected?.(true);
        } else {
          onAdBlockDetected?.(false);
        }
      }
    };

    // Run detection after a short delay to let page load
    const timer = setTimeout(detectAdBlock, 1500);
    return () => clearTimeout(timer);
  }, [onAdBlockDetected]);

  // Don't show for PRO users or if dismissed
  if (isPro || dismissed || !adBlockDetected) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-20 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-md"
      >
        <div className="glass border border-destructive/30 bg-destructive/5 rounded-xl p-4 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-destructive" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-foreground flex items-center gap-2">
                Ad Blocker Detected
              </h4>
              <p className="text-sm text-muted-foreground mt-1">
                Disable your ad blocker to watch rewarded ads and earn{' '}
                <span className="font-medium text-primary">5 free image generations</span>.
              </p>
              
              <div className="flex items-center gap-2 mt-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
                  <Gift className="w-3 h-3 text-primary" />
                  <span>Watch ad → Get 5 generations</span>
                </div>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="flex-shrink-0 h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => setDismissed(true)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
