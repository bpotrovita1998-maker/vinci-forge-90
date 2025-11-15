import { useState } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Wand2, Loader2, Sparkles, Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { JobType } from '@/types/job';

interface PromptEnhancerProps {
  type: JobType;
  onPromptGenerated: (prompt: string) => void;
}

const promptTemplates = {
  image: [
    "A professional product photograph with studio lighting",
    "A cinematic scene with dramatic composition",
    "A vibrant digital art illustration",
    "A photorealistic landscape with golden hour lighting",
    "An abstract geometric design with bold colors"
  ],
  video: [
    "Dynamic camera movement showcasing the subject",
    "Smooth cinematic sequence with transitions",
    "Engaging story-driven narrative",
    "Action-packed scene with motion effects",
    "Atmospheric mood piece with lighting changes"
  ],
  '3d': [
    "Detailed 3D model with realistic materials",
    "Low-poly stylized character design",
    "Architectural visualization with proper scale",
    "Product render with perfect lighting",
    "Game asset with optimized topology"
  ],
  cad: [
    "Precision mechanical part with exact dimensions",
    "Functional assembly with moving components",
    "Industrial component with standard tolerances",
    "Structural element with load-bearing design",
    "Mechanical system with clear specifications"
  ]
};

export default function PromptEnhancer({ type, onPromptGenerated }: PromptEnhancerProps) {
  const { toast } = useToast();
  const [idea, setIdea] = useState('');
  const [enhancedPrompt, setEnhancedPrompt] = useState('');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [copied, setCopied] = useState(false);

  const enhancePrompt = async () => {
    if (!idea.trim()) {
      toast({
        title: "Error",
        description: "Please describe your idea first",
        variant: "destructive"
      });
      return;
    }

    setIsEnhancing(true);

    try {
      const { data, error } = await supabase.functions.invoke('enhance-prompt', {
        body: { idea: idea.trim(), type }
      });

      if (error) throw error;

      if (data?.enhancedPrompt) {
        setEnhancedPrompt(data.enhancedPrompt);
        toast({
          title: "Prompt Enhanced!",
          description: "AI has improved your prompt for better results"
        });
      } else {
        throw new Error('No enhanced prompt received');
      }
    } catch (error) {
      console.error('Error enhancing prompt:', error);
      toast({
        title: "Enhancement Failed",
        description: error instanceof Error ? error.message : "Failed to enhance prompt",
        variant: "destructive"
      });
    } finally {
      setIsEnhancing(false);
    }
  };

  const useEnhancedPrompt = () => {
    if (enhancedPrompt) {
      onPromptGenerated(enhancedPrompt);
      toast({
        title: "Prompt Applied",
        description: "Enhanced prompt has been added to the generator"
      });
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(enhancedPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Copied!",
      description: "Prompt copied to clipboard"
    });
  };

  const templates = promptTemplates[type] || promptTemplates.image;

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          AI Prompt Assistant
        </CardTitle>
        <CardDescription>
          Describe your idea and let AI create the perfect prompt for {type} generation
          <div className="mt-2 p-2 bg-orange-500/10 border border-orange-500/20 rounded text-xs text-orange-600 dark:text-orange-400">
            ⚠️ Avoid: Violence, weapons, gore, adult content, hate symbols, or other sensitive topics
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Your Idea</label>
          <Textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder={`Describe what you want to create... (e.g., "${templates[0]}")`}
            className="min-h-[100px] resize-none bg-background/50"
          />
        </div>

        <div className="flex gap-2">
          <Button
            onClick={enhancePrompt}
            disabled={isEnhancing || !idea.trim()}
            className="flex-1"
          >
            {isEnhancing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enhancing...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4 mr-2" />
                Enhance Prompt
              </>
            )}
          </Button>
        </div>

        {enhancedPrompt && (
          <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
            <label className="text-sm font-medium text-primary">Enhanced Prompt</label>
            <div className="relative">
              <Textarea
                value={enhancedPrompt}
                readOnly
                className="min-h-[120px] resize-none bg-primary/5 border-primary/20 pr-10"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2"
                onClick={copyToClipboard}
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
            <Button
              onClick={useEnhancedPrompt}
              className="w-full"
              variant="default"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Use This Prompt
            </Button>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Quick Templates</label>
          <div className="grid grid-cols-1 gap-2">
            {templates.map((template, idx) => (
              <Button
                key={idx}
                variant="outline"
                size="sm"
                className="justify-start h-auto py-2 px-3 text-left"
                onClick={() => setIdea(template)}
              >
                <Sparkles className="w-3 h-3 mr-2 flex-shrink-0" />
                <span className="text-xs">{template}</span>
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
