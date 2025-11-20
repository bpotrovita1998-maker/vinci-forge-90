import { useState, useRef } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { motion } from 'framer-motion';
import { Sparkles, Wand2, Image, Video, Box, Cuboid, Paperclip, X } from 'lucide-react';
import { GenerationOptions, JobType } from '@/types/job';
import { useJobs } from '@/contexts/JobContext';
import { toast } from '@/hooks/use-toast';
import AdvancedOptions from './AdvancedOptions';
import CADTemplates from './CADTemplates';
import PromptEnhancer from './PromptEnhancer';
import { z } from 'zod';
import { useSubscription } from '@/hooks/useSubscription';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

const promptSchema = z.string()
  .trim()
  .min(3, "Prompt must be at least 3 characters")
  .refine(
    (val) => {
      // Check if prompt looks like a question or conversational text
      const conversationalStarts = [
        'how', 'what', 'when', 'where', 'who', 'why', 'can you', 'could you', 
        'please', 'this is', 'that is', 'i want', 'i would', 'do you',
        'are you', 'is this', 'thank', 'thanks', 'hello', 'hi', 'hey'
      ];
      const lowerPrompt = val.toLowerCase();
      const isConversational = conversationalStarts.some(word => lowerPrompt.startsWith(word));
      const hasQuestionMark = lowerPrompt.includes('?');
      
      return !(isConversational || hasQuestionMark);
    },
    { message: "Please describe a visual scene you want to create, not conversational text. Example: 'A majestic dragon flying over mountains'" }
  )
  .refine(
    (val) => {
      // Ensure prompt has descriptive content (at least 2 substantial words)
      const words = val.trim().split(/\s+/).filter(w => w.length > 2);
      return words.length >= 2;
    },
    { message: "Please provide a more detailed visual description (at least 2 descriptive words)" }
  )
  .refine(
    (val) => {
      // Check for requests to create images of real people
      const realPersonIndicators = [
        'photo of', 'picture of', 'image of', 'portrait of',
        'from facebook', 'from instagram', 'from twitter', 'from social media',
        'celebrity', 'famous person', 'real person'
      ];
      const lowerPrompt = val.toLowerCase();
      const mentionsRealPerson = realPersonIndicators.some(indicator => lowerPrompt.includes(indicator));
      
      // Also check for specific social media platform names
      const hasSocialMedia = /\b(facebook|instagram|twitter|tiktok|linkedin)\b/i.test(lowerPrompt);
      
      return !(mentionsRealPerson && hasSocialMedia);
    },
    { message: "Cannot create images of real people from social media. Please describe a fictional character or scene instead." }
  );

export default function Hero() {
  const { submitJob } = useJobs();
  const { isAdmin, subscription, tokenBalance } = useSubscription();
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showEnhancer, setShowEnhancer] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [options, setOptions] = useState<Partial<GenerationOptions>>({
    type: 'image',
    width: 1024,
    height: 1024,
    threeDMode: 'none',
    steps: 20,
    cfgScale: 7.5,
    numImages: 1,
    duration: 5,
    fps: 60, // Default to 60 fps for videos
    numVideos: 1,
    upscaleVideo: false,
    upscaleQuality: 4, // Default to 4x balanced quality
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image file (JPG, PNG, WebP)',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please upload an image smaller than 10MB',
        variant: 'destructive',
      });
      return;
    }

    setImageFile(file);

    // Convert to data URL for preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);

    toast({
      title: 'Image uploaded',
      description: 'Your image will be used as input for generation',
    });
  };

  const handleRemoveImage = () => {
    setUploadedImage(null);
    setImageFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleGenerate = async () => {
    try {
      // Validate prompt (allow empty if image is uploaded)
      if (!uploadedImage) {
        promptSchema.parse(prompt);
      } else if (prompt.trim().length === 0) {
        toast({
          title: 'Add a description',
          description: 'Please describe what you want to generate from this image',
          variant: 'destructive',
        });
        return;
      }
      
      // PRO gating and free image guard before hitting backend
      const isPro = isAdmin || subscription?.status === 'active';
      const requestedType = options.type || 'image';
      if (!isPro && requestedType !== 'image') {
        toast({ title: 'Upgrade required', description: 'Upgrade to PRO subscription to enable this feature.', variant: 'destructive' });
        return;
      }
      if (!isPro && requestedType === 'image') {
        const freeGranted = tokenBalance?.free_tokens_granted ?? 5;
        const freeUsed = tokenBalance?.free_tokens_used ?? 0;
        const remaining = Math.max(0, freeGranted - freeUsed);
        const requested = options.numImages || 1;
        if (remaining <= 0 || requested > remaining) {
          toast({ title: 'Free limit reached', description: "You've used all 5 free images. Upgrade to PRO to continue.", variant: 'destructive' });
          return;
        }
      }
      
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
        numVideos: options.numVideos,
        upscaleVideo: options.upscaleVideo,
        videoMode: options.videoMode,
        upscaleQuality: options.upscaleQuality,
        imageUrl: uploadedImage || undefined, // Include uploaded image if available
      };

      const jobId = await submitJob(fullOptions);
      
      toast({
        title: "Job Submitted!",
        description: `Job ${jobId.slice(0, 8)}... has been queued for processing.`,
      });

      // Clear prompt and image after successful submission
      setPrompt('');
      handleRemoveImage();
      
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Invalid Input",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        const msg = typeof error?.message === 'string' ? error.message : '';
        if (msg.includes('PRO subscription')) {
          toast({ title: 'Upgrade required', description: 'Upgrade to PRO subscription to enable this feature.', variant: 'destructive' });
        } else if (msg.includes('Free image limit') || msg.includes('5 free images') || msg.includes('5 images')) {
          toast({ title: 'Free limit reached', description: "You've used all 5 free images. Upgrade to PRO to continue.", variant: 'destructive' });
        } else {
          toast({ title: 'Error', description: 'Failed to submit job. Please try again.', variant: 'destructive' });
        }
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
            Create stunning images, videos, and 3D models with the power of artificial intelligence
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
              {/* Image Upload Preview */}
              {uploadedImage && (
                <div className="relative inline-block mb-2">
                  <img 
                    src={uploadedImage} 
                    alt="Uploaded reference" 
                    className="h-24 w-24 object-cover rounded-lg border-2 border-primary/30"
                  />
                  <button
                    onClick={handleRemoveImage}
                    className="absolute -top-2 -right-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-full p-1 transition-colors"
                    aria-label="Remove image"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={uploadedImage 
                  ? "Describe what you want to generate from this image..." 
                  : "Describe what you want to create... (e.g., 'A majestic dragon flying over snow-capped mountains at dawn')"
                }
                className="min-h-[120px] resize-none bg-background/50 border-border/50 text-lg placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary/50"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && prompt.trim()) {
                    handleGenerate();
                  }
                }}
              />
              
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2"
                >
                  <Paperclip className="w-4 h-4" />
                  {uploadedImage ? 'Change Image' : 'Add Image'}
                </Button>
                {uploadedImage && (
                  <span className="text-xs text-muted-foreground">
                    Image will be used as input for generation
                  </span>
                )}
              </div>
              
              <p className="text-xs text-muted-foreground">
                💡 <span className="font-medium">Tip:</span> Describe visual scenes (nouns, adjectives, settings). Avoid questions or instructions.
                <br />
                <span className="text-primary/80">Good:</span> "A cyberpunk city at night with neon lights" • 
                <span className="text-destructive/80">Bad:</span> "Can you make me a city?" or "This is great!"
              </p>
            </div>
            
            <div className="flex flex-col gap-3">
              <Button
                size="lg"
                onClick={handleGenerate}
                disabled={(!prompt.trim() && !uploadedImage) || isGenerating}
                className="w-full bg-primary hover:bg-primary-glow text-primary-foreground font-semibold text-lg h-14 shadow-[0_0_30px_rgba(201,169,97,0.3)] hover:shadow-[0_0_40px_rgba(201,169,97,0.5)] transition-all"
              >
                <Wand2 className={`w-5 h-5 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
                {isGenerating ? 'Submitting...' : 'Generate'}
              </Button>

              <Collapsible open={showEnhancer} onOpenChange={setShowEnhancer}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full">
                    <Sparkles className="w-4 h-4 mr-2" />
                    {showEnhancer ? 'Hide' : 'Show'} AI Prompt Assistant
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4">
                  <PromptEnhancer 
                    type={options.type || 'image'}
                    onPromptGenerated={(enhancedPrompt) => {
                      setPrompt(enhancedPrompt);
                      setShowEnhancer(false);
                    }}
                  />
                </CollapsibleContent>
              </Collapsible>
              
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={options.type === 'image' ? 'default' : 'outline'}
                  size="lg"
                  onClick={() => setOptions(prev => ({ ...prev, type: 'image' }))}
                  className={`${
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
                  className={`${
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
                  className={`${
                    options.type === '3d' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'glass border-primary/20 hover:bg-primary/10 hover:border-primary/30'
                  }`}
                >
                  <Box className="w-5 h-5 sm:mr-2" />
                  <span className="hidden sm:inline">3D</span>
                </Button>
                <Button
                  variant={options.type === 'cad' ? 'default' : 'outline'}
                  size="lg"
                  onClick={() => setOptions(prev => ({ ...prev, type: 'cad' }))}
                  className={`${
                    options.type === 'cad' 
                      ? 'bg-accent text-accent-foreground' 
                      : 'glass border-accent/20 hover:bg-accent/10 hover:border-accent/30'
                  }`}
                >
                  <Cuboid className="w-5 h-5 sm:mr-2" />
                  <span className="hidden sm:inline">CAD</span>
                </Button>
              </div>
            </div>
          </div>

          {/* CAD Templates - Show when CAD is selected */}
          {options.type === 'cad' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <CADTemplates onSelectTemplate={(templatePrompt) => setPrompt(templatePrompt)} />
            </motion.div>
          )}

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
