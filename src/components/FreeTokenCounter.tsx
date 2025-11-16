import { useSubscription } from '@/hooks/useSubscription';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { Card } from './ui/card';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';

export default function FreeTokenCounter() {
  const { tokenBalance, isAdmin, subscription } = useSubscription();
  const navigate = useNavigate();
  
  // Don't show for admins or users with active subscription
  if (isAdmin || subscription?.status === 'active') {
    return null;
  }
  
  if (!tokenBalance) {
    return null;
  }
  
  const freeTokensGranted = tokenBalance.free_tokens_granted || 5;
  const freeTokensUsed = tokenBalance.free_tokens_used || 0;
  const freeTokensRemaining = Math.max(0, freeTokensGranted - freeTokensUsed);
  
  // Only show if user has free tokens (either used some or has all remaining)
  if (freeTokensGranted === 0) {
    return null;
  }
  
  const percentage = (freeTokensRemaining / freeTokensGranted) * 100;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-6xl mx-auto px-4 mb-8"
    >
      <Card className="p-6 bg-gradient-to-r from-primary/10 via-primary/5 to-background border-primary/20">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/20">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Free Trial</h3>
              <p className="text-sm text-muted-foreground">
                {freeTokensRemaining} of {freeTokensGranted} free images remaining
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Progress bar */}
            <div className="hidden sm:flex flex-col gap-1 min-w-[200px]">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-primary to-primary/60"
                />
              </div>
              <p className="text-xs text-muted-foreground text-right">
                {percentage.toFixed(0)}% remaining
              </p>
            </div>
            
            {freeTokensRemaining === 0 && (
              <Button
                onClick={() => navigate('/pricing')}
                className="bg-primary hover:bg-primary/90"
              >
                Upgrade Now
              </Button>
            )}
            
            {freeTokensRemaining > 0 && freeTokensRemaining <= 2 && (
              <Button
                onClick={() => navigate('/pricing')}
                variant="outline"
                className="border-primary text-primary hover:bg-primary/10"
              >
                View Plans
              </Button>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
