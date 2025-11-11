import { useState } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { motion } from 'framer-motion';
import { Sparkles, Wand2, Image, Video, Box } from 'lucide-react';
import { GenerationOptions, JobType } from '@/types/job';
import { useJobs } from '@/contexts/JobContext';
import { toast } from '@/hooks/use-toast';
import AdvancedOptions from './AdvancedOptions';
import { z } from 'zod';

const promptSchema = z.string()
  .trim()
  .min(3, "Prompt must be at least 3 characters")
  .max(1000, "Prompt too long")
  .refine(
    (val) => {
      // Check if prompt looks like a question
      const questionWords = ['how', 'what', 'when', 'where', 'who', 'why', 'can you', 'could you', 'please'];
      const lowerPrompt = val.toLowerCase();
      const startsWithQuestion = questionWords.some(word => lowerPrompt.startsWith(word));
      const hasQuestionMark = lowerPrompt.includes('?');
      
      return !(startsWithQuestion || hasQuestionMark);
    },
    { message: "Please describe what you want to create, not ask a question. Example: 'A futuristic city at sunset'" }
  )
  .refine(
    (val) => {
      // Ensure prompt has descriptive content (at least 2 words)
      const words = val.trim().split(/\s+/).filter(w => w.length > 0);
      return words.length >= 2;
    },
    { message: "Please provide a more descriptive prompt with at least 2 words" }
  );

export default function Hero() {
  const { submitJob } = useJobs();
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [options, setOptions] = useState<Partial<GenerationOptions>>({
    type: 'image',
    width: 1024,
    height: 1024,
    threeDMode: 'none',
    steps: 20,
    cfgScale: 7.5,
    numImages: 1,
    duration: 5,
    fps: 24,
  });

  const handleGenerate = async () => {
    try {
      // Validate prompt
      promptSchema.parse(prompt);
      
      setIsGenerating(true);
      
      const fullOptions: GenerationOptions = {
        prompt: prompt.trim(),
        negativePrompt: options.negativePrompt?.trim(),
        type: options.type || 'image',
        width: options.width || 1024,
        height: options.height || 1024,
        threeDMode: options.threeDMode || 'none',
        steps: options.steps || 20,
        cfgScale: options.cfgScale || 7.5,
        seed: options.seed,
        numImages: options.numImages || 1,
        duration: options.duration,
        fps: options.fps,
      };

      const jobId = await submitJob(fullOptions);
      
      toast({
        title: "Job Submitted!",
        description: `Job ${jobId.slice(0, 8)}... has been queued for processing.`,
      });

      // Clear prompt after successful submission
      setPrompt('');
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Invalid Input",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to submit job. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-20 relative">
      {/* Glowing orb effect */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="max-w-4xl w-full space-y-8 text-center"
      >
        {/* Logo/Title */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="space-y-4"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-primary/20 mb-6">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">Powered by Renaissance AI</span>
          </div>
          
          <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-primary via-primary-glow to-accent bg-clip-text text-transparent">
              VinciAI
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
            Create stunning images and videos with the power of artificial intelligence
          </p>
        </motion.div>

        {/* Prompt Input */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="space-y-4"
        >
          <div className="glass rounded-2xl p-6 space-y-4 shadow-[0_0_40px_rgba(201,169,97,0.15)]">
            <div className="space-y-2">
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe what you want to create... (e.g., 'A majestic dragon flying over snow-capped mountains at dawn')"
                className="min-h-[120px] resize-none bg-background/50 border-border/50 text-lg placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary/50"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && prompt.trim()) {
                    handleGenerate();
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                💡 <span className="font-medium">Tip:</span> Be descriptive! Include details about subjects, style, lighting, colors, and mood.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                size="lg"
                onClick={handleGenerate}
                disabled={!prompt.trim() || isGenerating}
                className="flex-1 bg-primary hover:bg-primary-glow text-primary-foreground font-semibold text-lg h-14 shadow-[0_0_30px_rgba(201,169,97,0.3)] hover:shadow-[0_0_40px_rgba(201,169,97,0.5)] transition-all"
              >
                <Wand2 className={`w-5 h-5 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
                {isGenerating ? 'Submitting...' : 'Generate'}
              </Button>
              
              <div className="flex gap-2">
                <Button
                  variant={options.type === 'image' ? 'default' : 'outline'}
                  size="lg"
                  onClick={() => setOptions(prev => ({ ...prev, type: 'image' }))}
                  className={`flex-1 sm:flex-none ${
                    options.type === 'image' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'glass border-primary/20 hover:bg-primary/10 hover:border-primary/30'
                  }`}
                >
                  <Image className="w-5 h-5 sm:mr-2" />
                  <span className="hidden sm:inline">Image</span>
                </Button>
                <Button
                  variant={options.type === 'video' ? 'default' : 'outline'}
                  size="lg"
                  onClick={() => setOptions(prev => ({ ...prev, type: 'video' }))}
                  className={`flex-1 sm:flex-none ${
                    options.type === 'video' 
                      ? 'bg-accent text-accent-foreground' 
                      : 'glass border-accent/20 hover:bg-accent/10 hover:border-accent/30'
                  }`}
                >
                  <Video className="w-5 h-5 sm:mr-2" />
                  <span className="hidden sm:inline">Video</span>
                </Button>
                <Button
                  variant={options.type === '3d' ? 'default' : 'outline'}
                  size="lg"
                  onClick={() => setOptions(prev => ({ ...prev, type: '3d' }))}
                  className={`flex-1 sm:flex-none ${
                    options.type === '3d' 
                      ? 'bg-secondary text-secondary-foreground' 
                      : 'glass border-secondary/20 hover:bg-secondary/10 hover:border-secondary/30'
                  }`}
                >
                  <Box className="w-5 h-5 sm:mr-2" />
                  <span className="hidden sm:inline">3D</span>
                </Button>
              </div>
            </div>
          </div>

          <AdvancedOptions options={options} onChange={setOptions} />
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-8"
        >
          {[
            { title: 'Full HD Quality', desc: 'Up to 1920×1080 resolution' },
            { title: 'Long Videos', desc: 'Create videos up to 30 minutes' },
            { title: '3D Rendering', desc: 'Stereoscopic and object 3D' },
          ].map((feature, i) => (
            <div
              key={i}
              className="glass rounded-xl p-4 border border-border/30 hover:border-primary/30 transition-colors"
            >
              <h3 className="font-semibold text-foreground mb-1">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.desc}</p>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}
