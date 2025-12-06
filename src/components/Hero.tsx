import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { motion } from 'framer-motion';
import { Sparkles, Wand2, Image, Video, Box, Cuboid, Paperclip, X, Film, Users, ChevronDown, FolderUp, Loader2 } from 'lucide-react';
import { GenerationOptions, JobType } from '@/types/job';
import { useJobs } from '@/contexts/JobContext';
import { toast } from '@/hooks/use-toast';
import AdvancedOptions from './AdvancedOptions';
import CADTemplates from './CADTemplates';
import PromptEnhancer from './PromptEnhancer';
import ImageComparisonSlider from './ImageComparisonSlider';
import { MemoryIndicator } from './MemoryIndicator';
import { CharacterManager } from './CharacterManager';
import { z } from 'zod';
import { useSubscription } from '@/hooks/useSubscription';
import { moderationService } from '@/services/moderationService';
import { InputSanitizer } from '@/lib/inputSanitization';
import { useMemory } from '@/hooks/useMemory';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';

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
  const { instructions, recordPattern, getPreference, savePreference, analyzeAndLearn } = useMemory();
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showEnhancer, setShowEnhancer] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imageFormat, setImageFormat] = useState<'png' | 'jpeg' | 'webp'>('png');
  const [startFrameImage, setStartFrameImage] = useState<string>('');
  const [endFrameImage, setEndFrameImage] = useState<string>('');
  const [showFrameToFrame, setShowFrameToFrame] = useState(false);
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [showCharacterSection, setShowCharacterSection] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const startFrameInputRef = useRef<HTMLInputElement>(null);
  const endFrameInputRef = useRef<HTMLInputElement>(null);
  const referenceInputRef = useRef<HTMLInputElement>(null);
  const [isProcessingFolder, setIsProcessingFolder] = useState(false);
  const [folderProcessingStatus, setFolderProcessingStatus] = useState<string>('');
  
  const [options, setOptions] = useState<Partial<GenerationOptions>>({
    type: 'image',
    width: 1024,
    height: 1024,
    threeDMode: 'none',
    steps: 20,
    cfgScale: 7.5,
    numImages: 1,
    duration: 8, // Veo 3.1 default
    fps: 24, // Veo 3.1 default (cinematic)
    aspectRatio: "16:9", // Veo 3.1 default
    resolution: '1080p', // Veo 3.1 default
    numVideos: 1,
    videoModel: 'veo', // Default to Veo 3.1 premium model
    upscaleVideo: false,
    upscaleQuality: 4, // Default to 4x balanced quality
    referenceImages: [],
  });

  // Load saved preferences on mount
  useEffect(() => {
    const savedWidth = getPreference('default_settings', 'width');
    const savedHeight = getPreference('default_settings', 'height');
    const savedSteps = getPreference('default_settings', 'steps');
    
    if (savedWidth || savedHeight || savedSteps) {
      setOptions(prev => ({
        ...prev,
        width: savedWidth || prev.width,
        height: savedHeight || prev.height,
        steps: savedSteps || prev.steps,
      }));
    }
  }, []);

  // Apply custom instructions to prompt
  const applyCustomInstructions = (basePrompt: string): string => {
    if (instructions.length === 0) return basePrompt;
    
    const relevantInstructions = instructions
      .filter(i => i.is_active)
      .sort((a, b) => b.priority - a.priority);
    
    if (relevantInstructions.length === 0) return basePrompt;
    
    const instructionsText = relevantInstructions
      .map(i => i.instruction)
      .join('. ');
    
    return `${basePrompt}. ${instructionsText}`;
  };

  const convertImageFormat = async (file: File, targetFormat: 'png' | 'jpeg' | 'webp'): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = document.createElement('img');
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }
          ctx.drawImage(img, 0, 0);
          
          const mimeType = targetFormat === 'jpeg' ? 'image/jpeg' : `image/${targetFormat}`;
          const quality = targetFormat === 'jpeg' ? 0.92 : undefined;
          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error('Failed to convert image'));
              return;
            }
            const convertedReader = new FileReader();
            convertedReader.onloadend = () => resolve(convertedReader.result as string);
            convertedReader.readAsDataURL(blob);
          }, mimeType, quality);
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    // Validate all files
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not an image file`,
          variant: "destructive",
        });
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds 10MB limit`,
          variant: "destructive",
        });
        return;
      }
    }

    try {
      const convertedImages = await Promise.all(
        files.map(file => convertImageFormat(file, imageFormat))
      );
      
      setImageFiles(prev => [...prev, ...files]);
      setUploadedImages(prev => [...prev, ...convertedImages]);
      
      toast({
        title: "Images uploaded",
        description: `${files.length} image(s) uploaded as ${imageFormat.toUpperCase()}`,
      });
    } catch (error) {
      toast({
        title: "Conversion failed",
        description: "Failed to convert image format",
        variant: "destructive",
      });
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
    setImageFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleFolderUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    // Filter for image files only
    const folderImages = files.filter(file => file.type.startsWith('image/'));
    
    if (folderImages.length === 0) {
      toast({
        title: "No images found",
        description: "The folder doesn't contain any image files",
        variant: "destructive",
      });
      return;
    }

    // Check total size (5MB limit)
    const totalSize = folderImages.reduce((acc, file) => acc + file.size, 0);
    const maxSize = 5 * 1024 * 1024; // 5MB
    
    if (totalSize > maxSize) {
      toast({
        title: "Folder too large",
        description: `Total size ${(totalSize / 1024 / 1024).toFixed(2)}MB exceeds 5MB limit`,
        variant: "destructive",
      });
      return;
    }

    setIsProcessingFolder(true);
    setFolderProcessingStatus(`Loading ${folderImages.length} images...`);

    try {
      // Convert all images to base64 and add as references
      const convertedImages: string[] = [];
      for (let i = 0; i < folderImages.length; i++) {
        setFolderProcessingStatus(`Converting image ${i + 1}/${folderImages.length}...`);
        const converted = await convertImageFormat(folderImages[i], imageFormat);
        convertedImages.push(converted);
      }

      // Add all images as reference images
      setUploadedImages(prev => [...prev, ...convertedImages]);
      setImageFiles(prev => [...prev, ...folderImages]);
      
      toast({
        title: "Folder uploaded",
        description: `${folderImages.length} images added as references`,
      });

    } catch (error: any) {
      console.error('Folder upload error:', error);
      toast({
        title: "Folder upload failed",
        description: error.message || "Failed to load folder images",
        variant: "destructive",
      });
    } finally {
      setIsProcessingFolder(false);
      setFolderProcessingStatus('');
      if (folderInputRef.current) {
        folderInputRef.current.value = '';
      }
    }
  };

  const handleFrameUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'start' | 'end') => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Image exceeds 10MB limit",
        variant: "destructive",
      });
      return;
    }

    try {
      const convertedImage = await convertImageFormat(file, imageFormat);
      
      if (type === 'start') {
        setStartFrameImage(convertedImage);
      } else {
        setEndFrameImage(convertedImage);
      }
      
      toast({
        title: `${type === 'start' ? 'Start' : 'End'} frame uploaded`,
        description: `Frame uploaded as ${imageFormat.toUpperCase()}`,
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to process frame image",
        variant: "destructive",
      });
    }

    if (type === 'start' && startFrameInputRef.current) {
      startFrameInputRef.current.value = '';
    } else if (type === 'end' && endFrameInputRef.current) {
      endFrameInputRef.current.value = '';
    }
  };

  const handleGenerate = async () => {
    try {
      // Validate input
      if (!prompt.trim() && uploadedImages.length === 0) {
        toast({
          title: "Missing input",
          description: "Please enter a prompt or upload images",
          variant: "destructive",
        });
        return;
      }
      
      // Sanitize and validate prompt
      const sanitizationResult = InputSanitizer.sanitizePrompt(prompt);
      if (!sanitizationResult.isValid) {
        toast({
          title: "Invalid input",
          description: sanitizationResult.reason || "Please provide valid input",
          variant: "destructive",
        });
        return;
      }

      // Validate prompt (allow empty if image is uploaded)
      if (uploadedImages.length === 0) {
        promptSchema.parse(sanitizationResult.sanitized);
      } else if (sanitizationResult.sanitized.length === 0) {
        toast({
          title: 'Add a description',
          description: 'Please describe what you want to generate from these images',
          variant: 'destructive',
        });
        return;
      }

      // Content moderation check (silent, no toast)
      setIsGenerating(true);

      const moderationResult = await moderationService.moderatePrompt(sanitizationResult.sanitized);
      
      if (!moderationResult.safe) {
        setIsGenerating(false);
        toast({
          title: "Content policy violation",
          description: moderationResult.reason || "Your prompt contains content that violates our policies. Please modify and try again.",
          variant: "destructive",
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
      
      // Apply custom instructions to prompt
      const enhancedPrompt = applyCustomInstructions(sanitizationResult.sanitized);
      
      const fullOptions: GenerationOptions = {
        prompt: enhancedPrompt,
        negativePrompt: options.negativePrompt ? InputSanitizer.sanitizeText(options.negativePrompt, 2000) : undefined,
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
        videoModel: options.videoModel, // Pass video model selection
        upscaleQuality: options.upscaleQuality,
        aspectRatio: options.aspectRatio,
        resolution: options.resolution,
        imageUrl: uploadedImages[0] || undefined,
        imageUrls: uploadedImages.length > 0 ? uploadedImages : undefined,
        imageFormat,
        // Veo 3.1 specific options
        referenceImages: options.type === 'video' && referenceImages.length > 0 
          ? referenceImages // Up to 3 reference images for video
          : undefined,
        startFrame: startFrameImage || undefined,
        endFrame: endFrameImage || undefined,
        extendFromVideo: options.extendFromVideo,
      };

      const jobId = await submitJob(fullOptions);
      
      // Record generation patterns for learning
      await recordPattern('generation_settings', {
        type: fullOptions.type,
        width: fullOptions.width,
        height: fullOptions.height,
        steps: fullOptions.steps,
        cfgScale: fullOptions.cfgScale,
      });
      
      // Save frequently used settings as preferences (silently, no toasts)
      await Promise.all([
        savePreference('default_settings', 'width', fullOptions.width, true),
        savePreference('default_settings', 'height', fullOptions.height, true),
        savePreference('default_settings', 'steps', fullOptions.steps, true),
      ]);
      
      // Automatically analyze and learn from this generation (runs in background)
      analyzeAndLearn(sanitizationResult.sanitized, fullOptions.type, {
        width: fullOptions.width,
        height: fullOptions.height,
        steps: fullOptions.steps,
        cfgScale: fullOptions.cfgScale,
      });
      
      toast({
        title: "Job Submitted!",
        description: instructions.length > 0 
          ? `Job ${jobId.slice(0, 8)}... queued with your custom instructions. AI is learning your style!`
          : `Job ${jobId.slice(0, 8)}... has been queued. AI is learning your preferences!`,
      });

      // Clear prompt and image after successful submission
      setPrompt('');
      setUploadedImages([]);
      setImageFiles([]);
      setStartFrameImage('');
      setEndFrameImage('');
      setReferenceImages([]);
      
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
            {/* Memory Indicator */}
            <div className="flex justify-center">
              <MemoryIndicator />
            </div>
            
            <div className="space-y-2">
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={uploadedImages.length > 0 && options.type === 'image' 
                  ? "Describe the changes you want to make to the images..." 
                  : "A futuristic cityscape at sunset with flying cars..."}
                className="min-h-[120px] resize-none bg-background/50 border-border/50 text-lg placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary/50"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && prompt.trim()) {
                    handleGenerate();
                  }
                }}
              />
              
              {/* Hidden file input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                multiple
                className="hidden"
              />
              
              {/* Hidden folder input */}
              <input
                type="file"
                ref={folderInputRef}
                onChange={handleFolderUpload}
                accept="image/*"
                multiple
                // @ts-ignore - webkitdirectory is not in React types
                webkitdirectory=""
                // @ts-ignore
                directory=""
                className="hidden"
              />
              
              <div className="flex items-center gap-3 flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2"
                >
                  <Paperclip className="h-4 w-4" />
                  Add Images
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => folderInputRef.current?.click()}
                  disabled={isProcessingFolder}
                  className="gap-2"
                >
                  {isProcessingFolder ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FolderUp className="h-4 w-4" />
                  )}
                  {isProcessingFolder ? 'Processing...' : 'Upload Folder'}
                </Button>
                
                <select
                  value={imageFormat}
                  onChange={(e) => setImageFormat(e.target.value as 'png' | 'jpeg' | 'webp')}
                  className="h-9 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="png">PNG</option>
                  <option value="jpeg">JPEG</option>
                  <option value="webp">WebP</option>
                </select>
                
                {uploadedImages.length > 0 && (
                  <span className="text-sm text-muted-foreground">
                    {uploadedImages.length} image(s) uploaded
                  </span>
                )}
              </div>
              
              {isProcessingFolder && folderProcessingStatus && (
                <div className="flex items-center gap-2 text-sm text-primary">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {folderProcessingStatus}
                </div>
              )}
              
              {uploadedImages.length > 0 && options.type === 'image' && (
                <span className="text-sm text-muted-foreground">
                  ✨ Edit mode: Your images will be modified based on your prompt
                </span>
              )}
              
              {uploadedImages.length > 0 && options.type === 'video' && (
                <span className="text-sm text-muted-foreground">
                  🎬 Reference mode: Up to 3 images will guide video appearance, style & character consistency
                </span>
              )}
              
              {uploadedImages.length > 0 && (
                <ImageComparisonSlider 
                  images={uploadedImages}
                  onRemoveImage={handleRemoveImage}
                />
              )}
              
              <p className="text-xs text-muted-foreground">
                💡 <span className="font-medium">Tip:</span> {options.type === 'video' 
                  ? 'Upload up to 3 reference images for Veo 3.1 to maintain character consistency and visual style across your video.' 
                  : 'Upload a folder (up to 5MB) with multiple images to create an AI-enhanced replica with improved quality, or add individual images for editing.'}
              </p>
            </div>
            
            <div className="flex flex-col gap-3">
              <Button
                size="lg"
                onClick={handleGenerate}
                disabled={(!prompt.trim() && uploadedImages.length === 0) || isGenerating}
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
              
              <div className="grid grid-cols-4 gap-2">
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

          {/* Frame-to-Frame Generation - Show when Video is selected */}
          {options.type === 'video' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="glass rounded-xl p-6 border border-border/30"
            >
              <Collapsible open={showFrameToFrame} onOpenChange={setShowFrameToFrame}>
                <CollapsibleTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-between glass border border-border/30 hover:border-primary/30"
                  >
                    <div className="flex items-center gap-2">
                      <Film className="w-4 h-4" />
                      <span>Frame-to-Frame Generation</span>
                    </div>
                    <Sparkles className={`w-4 h-4 transition-transform ${showFrameToFrame ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>

                <CollapsibleContent className="space-y-4 mt-4">
                  <p className="text-sm text-muted-foreground">
                    Upload start and end frames to generate smooth transitions between them. Veo 3.1 will create seamless motion connecting your two frames.
                  </p>

                  {/* Hidden file inputs */}
                  <input
                    type="file"
                    ref={startFrameInputRef}
                    onChange={(e) => handleFrameUpload(e, 'start')}
                    accept="image/*"
                    className="hidden"
                  />
                  <input
                    type="file"
                    ref={endFrameInputRef}
                    onChange={(e) => handleFrameUpload(e, 'end')}
                    accept="image/*"
                    className="hidden"
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Start Frame */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Start Frame</label>
                      <div className="space-y-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => startFrameInputRef.current?.click()}
                          className="w-full gap-2"
                        >
                          <Paperclip className="h-4 w-4" />
                          {startFrameImage ? 'Change Start Frame' : 'Upload Start Frame'}
                        </Button>
                        
                        {startFrameImage && (
                          <div className="relative rounded-lg overflow-hidden border border-border/30">
                            <img 
                              src={startFrameImage} 
                              alt="Start frame" 
                              className="w-full h-40 object-cover"
                            />
                            <Button
                              variant="destructive"
                              size="icon"
                              className="absolute top-2 right-2 h-6 w-6"
                              onClick={() => setStartFrameImage('')}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* End Frame */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">End Frame</label>
                      <div className="space-y-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => endFrameInputRef.current?.click()}
                          className="w-full gap-2"
                        >
                          <Paperclip className="h-4 w-4" />
                          {endFrameImage ? 'Change End Frame' : 'Upload End Frame'}
                        </Button>
                        
                        {endFrameImage && (
                          <div className="relative rounded-lg overflow-hidden border border-border/30">
                            <img 
                              src={endFrameImage} 
                              alt="End frame" 
                              className="w-full h-40 object-cover"
                            />
                            <Button
                              variant="destructive"
                              size="icon"
                              className="absolute top-2 right-2 h-6 w-6"
                              onClick={() => setEndFrameImage('')}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {(startFrameImage || endFrameImage) && (
                    <p className="text-xs text-muted-foreground">
                      🎬 <span className="font-medium">Tip:</span> Upload both start and end frames for best results. Veo 3.1 will generate smooth transitions between them with your prompt guiding the motion and style.
                    </p>
                  )}
                </CollapsibleContent>
              </Collapsible>
            </motion.div>
          )}

          {/* Character & Reference Images Section */}
          {options.type === 'video' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="glass rounded-xl p-6 border border-border/30"
            >
              <Collapsible open={showCharacterSection} onOpenChange={setShowCharacterSection}>
                <CollapsibleTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-between glass border border-border/30 hover:border-primary/30"
                  >
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span>Character & Style References</span>
                      {referenceImages.length > 0 && (
                        <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                          {referenceImages.length} selected
                        </span>
                      )}
                    </div>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showCharacterSection ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>

                <CollapsibleContent className="space-y-4 mt-4">
                  <p className="text-sm text-muted-foreground">
                    Upload or select saved characters to maintain consistent appearance, style, and visual continuity across your videos
                  </p>

                  <Tabs defaultValue="upload" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="upload">Upload Images</TabsTrigger>
                      <TabsTrigger value="library">Character Library</TabsTrigger>
                    </TabsList>

                    <TabsContent value="upload" className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">
                          Reference Images (up to 3)
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Upload images to guide character appearance, style, and consistency
                        </p>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => referenceInputRef.current?.click()}
                            disabled={referenceImages.length >= 3}
                          >
                            <Paperclip className="h-4 w-4 mr-2" />
                            Add Reference
                          </Button>
                          {referenceImages.length > 0 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setReferenceImages([])}
                            >
                              Clear All
                            </Button>
                          )}
                        </div>
                        <input
                          ref={referenceInputRef}
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={async (e) => {
                            const files = e.target.files;
                            if (!files || files.length === 0) return;
                            
                            const newImages: string[] = [];
                            const maxFiles = Math.min(files.length, 3 - referenceImages.length);
                            
                            for (let i = 0; i < maxFiles; i++) {
                              const file = files[i];
                              const reader = new FileReader();
                              
                              await new Promise((resolve) => {
                                reader.onload = (event) => {
                                  if (event.target?.result) {
                                    newImages.push(event.target.result as string);
                                  }
                                  resolve(null);
                                };
                                reader.readAsDataURL(file);
                              });
                            }
                            
                            setReferenceImages([...referenceImages, ...newImages]);
                            if (referenceInputRef.current) {
                              referenceInputRef.current.value = "";
                            }
                            
                            toast({
                              title: "Reference images added",
                              description: `${newImages.length} image(s) added for character consistency`,
                            });
                          }}
                        />
                        {referenceImages.length > 0 && (
                          <div className="grid grid-cols-3 gap-2 mt-2">
                            {referenceImages.map((img, idx) => (
                              <div key={idx} className="relative aspect-square">
                                <img
                                  src={img}
                                  alt={`Reference ${idx + 1}`}
                                  className="w-full h-full object-cover rounded border border-border"
                                />
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="destructive"
                                  className="absolute top-1 right-1 h-6 w-6"
                                  onClick={() => setReferenceImages(referenceImages.filter((_, i) => i !== idx))}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="library" className="mt-4">
                      <CharacterManager
                        onSelectCharacter={(images) => {
                          setReferenceImages(images.slice(0, 3));
                          toast({
                            title: "Character selected",
                            description: "Reference images loaded for consistent character generation",
                          });
                        }}
                      />
                    </TabsContent>
                  </Tabs>
                </CollapsibleContent>
              </Collapsible>
            </motion.div>
          )}

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
            { title: 'Multi-Image Input', desc: 'Upload multiple reference images' },
            { title: 'Format Options', desc: 'PNG, JPEG, or WebP conversion' },
            { title: 'Image Editing', desc: 'Transform images with AI' },
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
