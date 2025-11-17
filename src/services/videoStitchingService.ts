import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { supabase } from '@/integrations/supabase/client';
import { SceneConfig, TransitionType } from '@/types/sceneConfig';

let ffmpegInstance: FFmpeg | null = null;

interface RetryOptions {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

const defaultRetryOptions: RetryOptions = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2
};

const isRetryableError = (error: any): boolean => {
  const errorMessage = error?.message?.toLowerCase() || '';
  
  // Network-related errors
  if (errorMessage.includes('network') || 
      errorMessage.includes('fetch') || 
      errorMessage.includes('timeout') ||
      errorMessage.includes('cors') ||
      errorMessage.includes('connection')) {
    return true;
  }
  
  // Temporary FFmpeg errors
  if (errorMessage.includes('out of memory') ||
      errorMessage.includes('resource temporarily unavailable') ||
      errorMessage.includes('busy')) {
    return true;
  }
  
  return false;
};

const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export const loadFFmpeg = async (): Promise<FFmpeg> => {
  if (ffmpegInstance) {
    console.log('[FFmpeg] Using cached instance');
    return ffmpegInstance;
  }

  console.log('[FFmpeg] Starting initialization...');
  const ffmpeg = new FFmpeg();
  
  // Add logging for debugging
  ffmpeg.on('log', ({ message }) => {
    console.log('[FFmpeg]', message);
  });
  
  ffmpeg.on('progress', ({ progress, time }) => {
    console.log(`[FFmpeg Progress] ${Math.round(progress * 100)}% - Time: ${time}ms`);
  });
  
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
  
  try {
    console.log('[FFmpeg] Loading WASM files from CDN...');
    
    // Create a timeout promise
    const loadTimeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('FFmpeg load timeout after 30 seconds')), 30000);
    });
    
    // Race between loading and timeout
    await Promise.race([
      (async () => {
        const coreURL = await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript');
        console.log('[FFmpeg] Core JS loaded');
        const wasmURL = await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm');
        console.log('[FFmpeg] WASM loaded');
        
        console.log('[FFmpeg] Initializing FFmpeg...');
        await ffmpeg.load({
          coreURL,
          wasmURL,
        });
        console.log('[FFmpeg] Initialization complete');
      })(),
      loadTimeout
    ]);

    ffmpegInstance = ffmpeg;
    return ffmpeg;
  } catch (error) {
    console.error('[FFmpeg] Load failed:', error);
    throw new Error(`Failed to load FFmpeg: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

const getTransitionFilter = (
  transitionType: TransitionType,
  duration: number,
  index: number
): string => {
  switch (transitionType) {
    case 'fade':
      return `[${index}:v]fade=t=out:st=${duration - 0.5}:d=0.5[v${index}fade];[v${index}fade]fade=t=in:st=0:d=0.5[v${index}]`;
    case 'dissolve':
      return `[${index}:v]fade=t=out:st=${duration - 1}:d=1:alpha=1[v${index}fade];[v${index}fade]fade=t=in:st=0:d=1:alpha=1[v${index}]`;
    case 'wipe':
      return `[${index}:v]crop=iw:ih*t/${duration}:0:0[v${index}]`;
    default:
      return `[${index}:v]copy[v${index}]`;
  }
};

const stitchVideosWithScenesInternal = async (
  scenes: SceneConfig[],
  jobId: string,
  userId: string,
  onProgress?: (progress: number) => void
): Promise<string> => {
  console.log('[Stitch] Loading FFmpeg...');
  const ffmpeg = await loadFFmpeg();
  console.log('[Stitch] FFmpeg loaded successfully');

    // Download and process all videos
    onProgress?.(10);
    console.log('Downloading scene videos...');
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      console.log(`Downloading scene ${i + 1}/${scenes.length}: ${scene.videoUrl.substring(0, 50)}...`);
      const videoData = await fetchFile(scene.videoUrl);
      await ffmpeg.writeFile(`input${i}.mp4`, videoData);
      onProgress?.(10 + (i + 1) * (30 / scenes.length));
    }
    console.log('All scenes downloaded');

    onProgress?.(45);

  // Build complex filter for trimming and transitions
  const filterParts: string[] = [];

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const trimDuration = scene.trimEnd - scene.trimStart;
    
    // Trim the video only (drop audio to avoid missing-audio errors)
    filterParts.push(
      `[${i}:v]trim=start=${scene.trimStart}:end=${scene.trimEnd},setpts=PTS-STARTPTS[v${i}trim]`
    );

    // Apply transition if not the last scene
    if (i < scenes.length - 1 && scene.transitionType !== 'none') {
      const nextScene = scenes[i + 1];
      const transDuration = scene.transitionDuration;

      switch (scene.transitionType) {
        case 'fade':
          filterParts.push(
            `[v${i}trim]fade=t=out:st=${trimDuration - transDuration}:d=${transDuration}[v${i}fadeout]`,
            `[v${i + 1}trim]fade=t=in:st=0:d=${transDuration}[v${i + 1}fadein]`
          );
          break;
        case 'dissolve':
          filterParts.push(
            `[v${i}trim][v${i + 1}trim]blend=all_expr='A*(1-T/${transDuration})+B*(T/${transDuration})':shortest=1[v${i}blend]`
          );
          break;
        case 'wipe':
          filterParts.push(
            `[v${i}trim][v${i + 1}trim]xfade=transition=wipeleft:duration=${transDuration}:offset=${trimDuration - transDuration}[v${i}wipe]`
          );
          break;
        default:
          // no-op
      }
    }
  }

  // Concatenate all processed video streams only (drop audio)
  const videoStreams = scenes.map((_, i) => `[v${i}trim]`).join('');
  filterParts.push(
    `${videoStreams}concat=n=${scenes.length}:v=1:a=0[vout]`
  );

  const filterComplex = filterParts.join(';');
  console.log('Filter complex:', filterComplex);

  onProgress?.(60);
  console.log('Executing FFmpeg with video-only pipeline...');

  // Execute FFmpeg with complex filter (video-only, no audio)
  const inputs = scenes.flatMap((_, i) => ['-i', `input${i}.mp4`]);
  await ffmpeg.exec([
    ...inputs,
    '-filter_complex', filterComplex,
    '-map', '[vout]',
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-an', // No audio
    'output.mp4'
  ]);
  console.log('FFmpeg execution completed');

  onProgress?.(80);
  console.log('Reading output file...');

  // Read the output
  const data = await ffmpeg.readFile('output.mp4');
  const uint8Array = data instanceof Uint8Array ? data : new Uint8Array(await (await fetch(data as string)).arrayBuffer());
  const blob = new Blob([uint8Array.buffer as ArrayBuffer], { type: 'video/mp4' });
  console.log(`Output video created: ${(blob.size / 1024 / 1024).toFixed(2)} MB`);

  onProgress?.(85);
  console.log('Uploading to Supabase storage...');

  // Upload to Supabase storage
  const fileName = `${userId}/${jobId}/final_stitched.mp4`;
  const { error: uploadError } = await supabase.storage
    .from('generated-models')
    .upload(fileName, blob, {
      contentType: 'video/mp4',
      upsert: true
    });

  if (uploadError) {
    console.error('Upload error:', uploadError);
    throw uploadError;
  }
  console.log('Upload successful');

  onProgress?.(95);
  console.log('Creating signed URL...');

  // Get signed URL
  const { data: signedUrlData } = await supabase.storage
    .from('generated-models')
    .createSignedUrl(fileName, 604800); // 7 days

  if (!signedUrlData?.signedUrl) {
    throw new Error('Failed to create signed URL');
  }
  console.log('Signed URL created:', signedUrlData.signedUrl.substring(0, 50) + '...');

  onProgress?.(100);
  console.log('Cleaning up temporary files...');

  // Clean up FFmpeg files
  for (let i = 0; i < scenes.length; i++) {
    await ffmpeg.deleteFile(`input${i}.mp4`);
  }
  await ffmpeg.deleteFile('output.mp4');
  console.log('Stitching completed successfully!');

  return signedUrlData.signedUrl;
};

export const stitchVideosWithScenes = async (
  scenes: SceneConfig[],
  jobId: string,
  userId: string,
  onProgress?: (progress: number) => void,
  retryOptions: Partial<RetryOptions> = {}
): Promise<string> => {
  const options = { ...defaultRetryOptions, ...retryOptions };
  let lastError: any;
  
  console.log(`Starting advanced stitching for ${scenes.length} scenes (with retry support)`);
  
  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`Retry attempt ${attempt}/${options.maxRetries}`);
      }
      
      return await stitchVideosWithScenesInternal(scenes, jobId, userId, onProgress);
    } catch (error) {
      lastError = error;
      console.error(`Stitching attempt ${attempt + 1} failed:`, error);
      
      // Check if error is retryable
      if (!isRetryableError(error) || attempt >= options.maxRetries) {
        console.error('Error is not retryable or max retries reached');
        throw error;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        options.initialDelay * Math.pow(options.backoffMultiplier, attempt),
        options.maxDelay
      );
      
      console.log(`Waiting ${delay}ms before retry...`);
      
      // Reset progress to show we're retrying
      onProgress?.(0);
      
      await sleep(delay);
    }
  }
  
  // Should never reach here, but just in case
  throw lastError || new Error('Stitching failed after maximum retries');
};

// Legacy function for simple stitching (backward compatibility)
export const stitchVideos = async (
  videoUrls: string[],
  jobId: string,
  userId: string,
  onProgress?: (progress: number) => void
): Promise<string> => {
  // Convert simple URLs to scene configs
  const scenes: SceneConfig[] = videoUrls.map((url, index) => ({
    id: `scene-${index}`,
    videoUrl: url,
    prompt: `Scene ${index + 1}`,
    duration: 5, // Default duration
    trimStart: 0,
    trimEnd: 5,
    transitionType: 'none' as TransitionType,
    transitionDuration: 0.5,
    order: index,
  }));

  return stitchVideosWithScenes(scenes, jobId, userId, onProgress);
};
