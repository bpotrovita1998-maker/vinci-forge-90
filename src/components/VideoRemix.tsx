import { useState } from 'react';
import { Button } from './ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';

interface VideoRemixProps {
  videoUrl: string;
  originalPrompt: string;
  jobId: string;
  duration: number;
  onRemixStart: () => void;
}

export default function VideoRemix({ 
  videoUrl, 
  originalPrompt,
  jobId,
  duration,
  onRemixStart 
}: VideoRemixProps) {
  const [isRemixing, setIsRemixing] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [remixPrompt, setRemixPrompt] = useState('');

  const handleRemix = async () => {
    if (!remixPrompt.trim()) {
      toast.error('Please enter a prompt for the remix');
      return;
    }

    setIsRemixing(true);
    setShowDialog(false);
    
    try {
      // Call the generate-video function with video extension
      const { data, error } = await supabase.functions.invoke('generate-video', {
        body: {
          prompt: remixPrompt,
          extendFromVideo: videoUrl,
          videoModel: 'veo', // Only Veo supports video extension
          duration: duration,
          jobId: jobId,
        }
      });

      if (error) throw error;

      toast.success('Video remix started! Your extended video will be ready soon.');
      onRemixStart();
    } catch (error) {
      console.error('Failed to start remix:', error);
      toast.error('Failed to start video remix');
      setIsRemixing(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowDialog(true)}
        disabled={isRemixing}
        className="gap-2"
      >
        {isRemixing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Remixing...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            Remix
          </>
        )}
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Remix Video</DialogTitle>
            <DialogDescription>
              Extend this video with a new scene. The AI will continue from where this video ends, creating a longer combined video.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Original Prompt</Label>
              <div className="p-3 bg-muted rounded-md text-sm text-muted-foreground">
                {originalPrompt}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="remix-prompt">What happens next?</Label>
              <Textarea
                id="remix-prompt"
                placeholder="Describe how you want to continue this video..."
                value={remixPrompt}
                onChange={(e) => setRemixPrompt(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Tip: The new scene will maintain visual consistency with the original video
              </p>
            </div>

            <div className="bg-primary/10 border border-primary/30 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div className="text-xs text-foreground space-y-1">
                  <p className="font-medium">Video Extension</p>
                  <p className="text-muted-foreground">
                    Current: {duration}s → Extended: {duration * 2}s (approx)
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleRemix} disabled={!remixPrompt.trim()}>
              <Sparkles className="w-4 h-4 mr-2" />
              Create Extended Video
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
