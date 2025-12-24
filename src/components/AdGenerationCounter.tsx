import { motion } from 'framer-motion';
import { Sparkles, Play, Crown } from 'lucide-react';
import { Button } from './ui/button';
import { useAdGenerations } from '@/hooks/useAdGenerations';
import { useNavigate } from 'react-router-dom';

interface AdGenerationCounterProps {
  onWatchAd: () => void;
}

export default function AdGenerationCounter({ onWatchAd }: AdGenerationCounterProps) {
  const { remaining, needsAd, isPro, generationsPerAd, totalEarned } = useAdGenerations();
  const navigate = useNavigate();

  // Don't show for PRO users
  if (isPro) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-lg border border-primary/20"
    >
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-full bg-primary/20">
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
        <div className="text-sm">
          <span className="font-medium text-foreground">{remaining}</span>
          <span className="text-muted-foreground ml-1">free generations</span>
        </div>
      </div>

      {needsAd ? (
        <Button
          onClick={onWatchAd}
          size="sm"
          variant="outline"
          className="gap-1.5 border-primary/50 text-primary hover:bg-primary/10"
        >
          <Play className="w-3.5 h-3.5" />
          Watch Ad (+{generationsPerAd})
        </Button>
      ) : (
        <div className="flex items-center gap-2">
          {remaining <= 1 && (
            <Button
              onClick={onWatchAd}
              size="sm"
              variant="ghost"
              className="gap-1 text-xs text-muted-foreground hover:text-primary"
            >
              <Play className="w-3 h-3" />
              +{generationsPerAd}
            </Button>
          )}
        </div>
      )}

      <Button
        onClick={() => navigate('/pricing')}
        size="sm"
        variant="ghost"
        className="gap-1 text-xs text-muted-foreground hover:text-primary ml-auto"
      >
        <Crown className="w-3 h-3" />
        Go PRO
      </Button>
    </motion.div>
  );
}
