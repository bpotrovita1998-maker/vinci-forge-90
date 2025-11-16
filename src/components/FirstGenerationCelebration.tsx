import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, PartyPopper, Zap } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { useSubscription } from '@/hooks/useSubscription';

const ConfettiPiece = ({ delay }: { delay: number }) => (
  <motion.div
    initial={{ y: -20, opacity: 1, rotate: 0 }}
    animate={{
      y: [null, 300],
      x: [null, Math.random() * 200 - 100],
      rotate: [null, Math.random() * 360],
      opacity: [null, 0],
    }}
    transition={{
      duration: 2,
      delay,
      ease: "easeOut",
    }}
    className="absolute top-0 left-1/2"
    style={{
      width: '10px',
      height: '10px',
      backgroundColor: `hsl(${Math.random() * 360}, 70%, 60%)`,
      borderRadius: Math.random() > 0.5 ? '50%' : '0%',
    }}
  />
);

export default function FirstGenerationCelebration() {
  const { tokenBalance, subscription } = useSubscription();
  const [showCelebration, setShowCelebration] = useState(false);
  const [hasShownBefore, setHasShownBefore] = useState(false);

  useEffect(() => {
    // Check if we've shown the celebration before
    const celebrationShown = localStorage.getItem('first_generation_celebrated');
    if (celebrationShown) {
      setHasShownBefore(true);
      return;
    }

    // Show celebration when user has used exactly 1 free token (completed first generation)
    if (tokenBalance?.free_tokens_used === 1 && !hasShownBefore) {
      setShowCelebration(true);
      localStorage.setItem('first_generation_celebrated', 'true');
      setHasShownBefore(true);
    }
  }, [tokenBalance, hasShownBefore]);

  const handleClose = () => {
    setShowCelebration(false);
  };

  return (
    <Dialog open={showCelebration} onOpenChange={setShowCelebration}>
      <DialogContent className="max-w-md overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 30 }).map((_, i) => (
            <ConfettiPiece key={i} delay={i * 0.05} />
          ))}
        </div>

        <DialogHeader>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ 
              type: "spring",
              stiffness: 260,
              damping: 20,
              delay: 0.1 
            }}
            className="flex justify-center mb-4"
          >
            <div className="relative">
              <motion.div
                animate={{ 
                  rotate: [0, 10, -10, 10, 0],
                }}
                transition={{ 
                  duration: 0.5,
                  repeat: 2,
                  delay: 0.3
                }}
                className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center"
              >
                <PartyPopper className="w-10 h-10 text-primary-foreground" />
              </motion.div>
              
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="absolute -top-2 -right-2"
              >
                <Sparkles className="w-6 h-6 text-primary fill-primary" />
              </motion.div>
              
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="absolute -bottom-2 -left-2"
              >
                <Zap className="w-6 h-6 text-primary fill-primary" />
              </motion.div>
            </div>
          </motion.div>

          <DialogTitle className="text-center text-2xl">
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="block"
            >
              🎉 Congratulations! 🎉
            </motion.span>
          </DialogTitle>
          
          <DialogDescription className="text-center space-y-4">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-base"
            >
              You've created your first AI-generated image!
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="p-4 rounded-lg bg-primary/10 border border-primary/20"
            >
              <p className="text-sm text-foreground">
                You have <strong className="text-primary">{(tokenBalance?.free_tokens_granted || 5) - (tokenBalance?.free_tokens_used || 0)}</strong> free images remaining
              </p>
            </motion.div>
            
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="text-sm text-muted-foreground"
            >
              Keep exploring and create amazing visuals with AI! ✨
            </motion.p>
          </DialogDescription>
        </DialogHeader>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="flex justify-center mt-4"
        >
          <Button 
            onClick={handleClose}
            className="bg-primary hover:bg-primary/90"
          >
            Continue Creating
          </Button>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
