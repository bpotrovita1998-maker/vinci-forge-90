import { useState, useEffect, useCallback } from 'react';
import { Job } from '@/types/job';
import { 
  compressImage, 
  compressVideoThumbnail, 
  compress3DPoster, 
  uploadCompressedFile 
} from '@/services/compressionService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface CompressionState {
  isCompressing: boolean;
  progress: number;
  compressedOutputs: string[];
}

export function useOutputCompression(job: Job) {
  const [state, setState] = useState<CompressionState>({
    isCompressing: false,
    progress: 0,
    compressedOutputs: []
  });

  // Load existing compressed outputs from database
  useEffect(() => {
    const loadCompressedOutputs = async () => {
      if (!job.id) return;
      
      const { data, error } = await supabase
        .from('jobs')
        .select('compressed_outputs')
        .eq('id', job.id)
        .single();

      if (!error && data?.compressed_outputs) {
        const outputs = Array.isArray(data.compressed_outputs) 
          ? data.compressed_outputs 
          : JSON.parse(data.compressed_outputs as any);
        setState(prev => ({ ...prev, compressedOutputs: outputs }));
      }
    };

    loadCompressedOutputs();
  }, [job.id]);

  const compressOutputs = useCallback(async () => {
    if (!job.outputs || job.outputs.length === 0) return;
    if (state.isCompressing) return;

    setState(prev => ({ ...prev, isCompressing: true, progress: 0 }));

    try {
      const compressedUrls: string[] = [];
      const totalFiles = job.outputs.length;

      for (let i = 0; i < job.outputs.length; i++) {
        const outputUrl = job.outputs[i];
        setState(prev => ({ 
          ...prev, 
          progress: Math.round(((i + 0.5) / totalFiles) * 100) 
        }));

        try {
          let compressionResult;
          
          if (job.options.type === 'image') {
            compressionResult = await compressImage(outputUrl);
          } else if (job.options.type === 'video') {
            compressionResult = await compressVideoThumbnail(outputUrl);
          } else if (job.options.type === '3d' || job.options.type === 'cad') {
            // For 3D/CAD, we'll use a poster/thumbnail approach
            // Skip compression as we already have poster caching
            compressedUrls.push(outputUrl);
            continue;
          } else {
            compressedUrls.push(outputUrl);
            continue;
          }

          // Upload compressed version
          const compressedUrl = await uploadCompressedFile(
            compressionResult.compressedBlob,
            outputUrl,
            job.options.type
          );

          compressedUrls.push(compressedUrl);
          
          console.log(
            `Compressed ${job.options.type} ${i + 1}/${totalFiles}: ` +
            `${(compressionResult.originalSize / 1024).toFixed(0)}KB → ` +
            `${(compressionResult.compressedSize / 1024).toFixed(0)}KB`
          );
        } catch (error) {
          console.error(`Failed to compress output ${i}:`, error);
          // Fallback to original if compression fails
          compressedUrls.push(outputUrl);
        }

        setState(prev => ({ 
          ...prev, 
          progress: Math.round(((i + 1) / totalFiles) * 100) 
        }));
      }

      // Update database with compressed outputs
      const { error } = await supabase
        .from('jobs')
        .update({ compressed_outputs: compressedUrls })
        .eq('id', job.id);

      if (error) throw error;

      setState(prev => ({ 
        ...prev, 
        compressedOutputs: compressedUrls,
        isCompressing: false,
        progress: 100
      }));

      console.log('Compression complete for job', job.id);
    } catch (error) {
      console.error('Compression failed:', error);
      setState(prev => ({ 
        ...prev, 
        isCompressing: false,
        progress: 0
      }));
      toast({
        title: 'Compression Failed',
        description: 'Using original files. Your download speed may be slower.',
        variant: 'destructive'
      });
    }
  }, [job.id, job.outputs, job.options.type, state.isCompressing]);

  return {
    ...state,
    compressOutputs,
    hasCompressedOutputs: state.compressedOutputs.length > 0,
    getDisplayUrl: (index: number) => {
      // Use compressed version for display if available, otherwise use original
      return state.compressedOutputs[index] || job.outputs[index];
    },
    getDownloadUrl: (index: number) => {
      // Always use original for downloads
      return job.outputs[index];
    }
  };
}
