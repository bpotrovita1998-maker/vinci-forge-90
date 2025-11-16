import { useState } from 'react';
import { Button } from './ui/button';
import { RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";

interface SceneRegeneratorProps {
  jobId: string;
  sceneIndex: number;
  scenePrompt: string;
  videoUrl: string;
  onRegenerateStart: () => void;
}

export default function SceneRegenerator({ 
  jobId, 
  sceneIndex, 
  scenePrompt, 
  videoUrl,
  onRegenerateStart 
}: SceneRegeneratorProps) {
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    setShowConfirm(false);
    
    try {
      // Call edge function to regenerate specific scene
      const { error } = await supabase.functions.invoke('regenerate-scene', {
        body: {
          jobId,
          sceneIndex,
          scenePrompt
        }
      });

      if (error) throw error;

      toast.success(`Scene ${sceneIndex + 1} regeneration started`);
      onRegenerateStart();
    } catch (error) {
      console.error('Failed to regenerate scene:', error);
      toast.error('Failed to start scene regeneration');
      setIsRegenerating(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowConfirm(true)}
        disabled={isRegenerating}
        className="gap-2"
      >
        <RefreshCw className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} />
        {isRegenerating ? 'Regenerating...' : 'Regenerate'}
      </Button>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate Scene {sceneIndex + 1}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will regenerate this scene with the same prompt. The video will be re-stitched after regeneration completes.
              <div className="mt-3 p-3 bg-muted rounded-md text-sm">
                <strong>Prompt:</strong> {scenePrompt}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRegenerate}>
              Regenerate Scene
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
