import { Brain, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { useMemory } from '@/hooks/useMemory';
import { Badge } from './ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';

export const MemoryIndicator = () => {
  const { instructions, patterns } = useMemory();

  const activeInstructions = instructions.filter(i => i.is_active).length;
  const learnedPatterns = patterns.length;

  if (activeInstructions === 0 && learnedPatterns === 0) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg glass border border-primary/20 bg-primary/5"
          >
            <div className="relative">
              <Brain className="w-4 h-4 text-primary" />
              <motion.div
                className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [1, 0.8, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                }}
              />
            </div>
            <div className="flex items-center gap-2">
              {activeInstructions > 0 && (
                <Badge variant="secondary" className="text-xs px-2 py-0 bg-primary/20 text-primary border-0">
                  {activeInstructions} rules
                </Badge>
              )}
              {learnedPatterns > 0 && (
                <Badge variant="secondary" className="text-xs px-2 py-0 bg-accent/20 text-accent border-0">
                  {learnedPatterns} patterns
                </Badge>
              )}
            </div>
            <Sparkles className="w-3 h-3 text-accent" />
          </motion.div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="font-semibold">AI Memory Active</p>
            {activeInstructions > 0 && (
              <p className="text-sm">✓ {activeInstructions} custom instruction{activeInstructions > 1 ? 's' : ''} applied</p>
            )}
            {learnedPatterns > 0 && (
              <p className="text-sm">✓ Learned from {learnedPatterns} previous generation{learnedPatterns > 1 ? 's' : ''}</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};