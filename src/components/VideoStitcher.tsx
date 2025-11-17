import { useState, useEffect } from 'react';
import { stitchVideos } from '@/services/videoStitchingService';
import { supabase } from '@/integrations/supabase/client';
import { Progress } from './ui/progress';
import { useToast } from '@/hooks/use-toast';

interface VideoStitcherProps {
  jobId: string;
  videoUrls: string[];
  userId: string;
  onComplete: (stitchedUrl: string) => void;
}

export const VideoStitcher = ({ jobId, videoUrls, userId, onComplete }: VideoStitcherProps) => {
  const [progress, setProgress] = useState(0);
  const [isStitching, setIsStitching] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const performStitching = async () => {
      if (videoUrls.length < 2 || isStitching) return;

      setIsStitching(true);
      
      try {
        // Update job status
        await supabase
          .from('jobs')
          .update({
            progress_stage: 'encoding',
            progress_message: 'Stitching video scenes together...',
            progress_percent: 80
          })
          .eq('id', jobId);

        const stitchedUrl = await stitchVideos(videoUrls, jobId, userId, setProgress);

        // Update job with final stitched video
        await supabase
          .from('jobs')
          .update({
            outputs: [stitchedUrl],
            status: 'completed',
            progress_stage: 'completed',
            progress_percent: 100,
            progress_message: 'Video stitched successfully!',
            completed_at: new Date().toISOString()
          })
          .eq('id', jobId);

        onComplete(stitchedUrl);
        
        toast({
          title: "Video Ready",
          description: "Your scenes have been stitched together successfully!",
        });
      } catch (error) {
        console.error('Stitching error:', error);
        
        await supabase
          .from('jobs')
          .update({
            status: 'failed',
            error: 'Failed to stitch videos',
            progress_message: 'Video stitching failed'
          })
          .eq('id', jobId);

        toast({
          title: "Stitching Failed",
          description: "Failed to stitch video scenes together. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsStitching(false);
      }
    };

    performStitching();
  }, [jobId, videoUrls, userId, onComplete, toast, isStitching]);

  if (!isStitching) return null;

  return (
    <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
      <p className="text-sm text-muted-foreground">Stitching video scenes together...</p>
      <Progress value={progress} className="w-full" />
      <p className="text-xs text-muted-foreground text-center">{progress}%</p>
    </div>
  );
};
