import { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Gift, Sparkles, Timer, CheckCircle, Gamepad2, Target, Trophy } from 'lucide-react';
import { useAdGenerations } from '@/hooks/useAdGenerations';

interface RewardedAdModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdComplete: () => void;
}

// Simple target clicking game component
function TargetGame({ onComplete }: { onComplete: () => void }) {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [targetPosition, setTargetPosition] = useState({ x: 50, y: 50 });
  const [targetSize, setTargetSize] = useState(60);
  const [combo, setCombo] = useState(0);
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const requiredScore = 10;

  // Move target to random position
  const moveTarget = useCallback(() => {
    const newX = 10 + Math.random() * 80;
    const newY = 10 + Math.random() * 80;
    const newSize = 40 + Math.random() * 30;
    setTargetPosition({ x: newX, y: newY });
    setTargetSize(newSize);
  }, []);

  // Handle target click
  const handleTargetClick = () => {
    setScore(prev => prev + 1 + Math.floor(combo / 3));
    setCombo(prev => prev + 1);
    moveTarget();
  };

  // Timer countdown
  useEffect(() => {
    if (timeLeft <= 0) {
      onComplete();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, onComplete]);

  // Check if score requirement met
  useEffect(() => {
    if (score >= requiredScore && timeLeft > 0) {
      onComplete();
    }
  }, [score, timeLeft, onComplete, requiredScore]);

  // Reset combo if no click for 2 seconds
  useEffect(() => {
    const comboTimer = setTimeout(() => {
      setCombo(0);
    }, 2000);

    return () => clearTimeout(comboTimer);
  }, [score]);

  return (
    <div className="space-y-4">
      {/* Game stats */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-yellow-500" />
          <span className="font-bold text-lg">{score}/{requiredScore}</span>
          {combo > 2 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full"
            >
              x{combo} combo!
            </motion.span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Timer className="w-4 h-4 text-muted-foreground" />
          <span className={`font-mono ${timeLeft <= 10 ? 'text-red-500' : ''}`}>
            {timeLeft}s
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-primary to-green-500"
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, (score / requiredScore) * 100)}%` }}
        />
      </div>

      {/* Game area */}
      <div
        ref={gameAreaRef}
        className="relative w-full aspect-video bg-gradient-to-br from-primary/5 to-accent/5 rounded-lg overflow-hidden border border-border cursor-crosshair"
      >
        {/* Target */}
        <motion.button
          onClick={handleTargetClick}
          className="absolute transform -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-red-500 to-orange-500 shadow-lg hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-primary"
          style={{
            left: `${targetPosition.x}%`,
            top: `${targetPosition.y}%`,
            width: targetSize,
            height: targetSize,
          }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileTap={{ scale: 0.8 }}
        >
          <Target className="w-full h-full p-2 text-white" />
        </motion.button>

        {/* Click effects */}
        <div className="absolute inset-0 pointer-events-none">
          <p className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-muted-foreground">
            Click the targets! Reach {requiredScore} points to unlock generations
          </p>
        </div>
      </div>
    </div>
  );
}

export default function RewardedAdModal({ open, onOpenChange, onAdComplete }: RewardedAdModalProps) {
  const { grantGenerations, generationsPerAd } = useAdGenerations();
  const [adState, setAdState] = useState<'ready' | 'playing' | 'complete'>('ready');

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setAdState('ready');
    }
  }, [open]);

  const startGame = () => {
    setAdState('playing');
  };

  const handleGameComplete = useCallback(() => {
    setAdState('complete');
  }, []);

  const handleClaimReward = () => {
    grantGenerations();
    onAdComplete();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      // Only allow closing if not in the middle of playing
      if (!isOpen && adState === 'playing') return;
      onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-primary" />
            Play to Unlock Free Generations
          </DialogTitle>
          <DialogDescription>
            Play a quick 30-second game to unlock {generationsPerAd} free image generations
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
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
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full animate-pulse" />
                  <div className="absolute inset-4 bg-gradient-to-br from-primary/30 to-accent/30 rounded-full flex items-center justify-center">
                    <Gamepad2 className="w-12 h-12 text-primary" />
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-lg font-medium">
                    Get <span className="text-primary">{generationsPerAd} free</span> generations!
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Play a quick target-clicking game (30 seconds max)
                  </p>
                </div>

                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <p className="text-sm font-medium">How to play:</p>
                  <ul className="text-xs text-muted-foreground space-y-1 text-left">
                    <li>• Click the red targets as fast as you can</li>
                    <li>• Reach 10 points to win instantly</li>
                    <li>• Build combos for bonus points</li>
                    <li>• Complete within 30 seconds</li>
                  </ul>
                </div>

                <Button 
                  onClick={startGame} 
                  className="w-full gap-2"
                  size="lg"
                >
                  <Play className="w-4 h-4" />
                  Start Game
                </Button>
              </motion.div>
            )}

            {adState === 'playing' && (
              <motion.div
                key="playing"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <TargetGame onComplete={handleGameComplete} />
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
                    Game Complete!
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
