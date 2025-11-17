import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { supabase } from '@/integrations/supabase/client';
import { SceneConfig, TransitionType } from '@/types/sceneConfig';

let ffmpegInstance: FFmpeg | null = null;

export const loadFFmpeg = async (): Promise<FFmpeg> => {
  if (ffmpegInstance) return ffmpegInstance;

  const ffmpeg = new FFmpeg();
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
  
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });

  ffmpegInstance = ffmpeg;
  return ffmpeg;
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

export const stitchVideosWithScenes = async (
  scenes: SceneConfig[],
  jobId: string,
  userId: string,
  onProgress?: (progress: number) => void
): Promise<string> => {
  console.log(`Starting advanced stitching for ${scenes.length} scenes`);
  
  const ffmpeg = await loadFFmpeg();

  // Download and process all videos
  onProgress?.(10);
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const videoData = await fetchFile(scene.videoUrl);
    await ffmpeg.writeFile(`input${i}.mp4`, videoData);
    onProgress?.(10 + (i + 1) * (30 / scenes.length));
  }

  onProgress?.(45);

  // Build complex filter for trimming and transitions
  const filterParts: string[] = [];
  const trimmedInputs: string[] = [];

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const trimDuration = scene.trimEnd - scene.trimStart;
    
    // Trim the video
    filterParts.push(
      `[${i}:v]trim=start=${scene.trimStart}:end=${scene.trimEnd},setpts=PTS-STARTPTS[v${i}trim]`
    );
    filterParts.push(
      `[${i}:a]atrim=start=${scene.trimStart}:end=${scene.trimEnd},asetpts=PTS-STARTPTS[a${i}trim]`
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
          trimmedInputs.push(`[v${i}fadeout]`, `[a${i}trim]`);
          break;
        case 'dissolve':
          filterParts.push(
            `[v${i}trim][v${i + 1}trim]blend=all_expr='A*(1-T/${transDuration})+B*(T/${transDuration})':shortest=1[v${i}blend]`
          );
          trimmedInputs.push(`[v${i}blend]`, `[a${i}trim]`);
          break;
        case 'wipe':
          filterParts.push(
            `[v${i}trim][v${i + 1}trim]xfade=transition=wipeleft:duration=${transDuration}:offset=${trimDuration - transDuration}[v${i}wipe]`
          );
          trimmedInputs.push(`[v${i}wipe]`, `[a${i}trim]`);
          break;
        default:
          trimmedInputs.push(`[v${i}trim]`, `[a${i}trim]`);
      }
    } else {
      trimmedInputs.push(`[v${i}trim]`, `[a${i}trim]`);
    }
  }

  // Concatenate all processed streams
  const videoStreams = scenes.map((_, i) => `[v${i}trim]`).join('');
  const audioStreams = scenes.map((_, i) => `[a${i}trim]`).join('');
  filterParts.push(
    `${videoStreams}concat=n=${scenes.length}:v=1:a=0[vout]`,
    `${audioStreams}concat=n=${scenes.length}:v=0:a=1[aout]`
  );

  const filterComplex = filterParts.join(';');
  console.log('Filter complex:', filterComplex);

  onProgress?.(60);

  // Execute FFmpeg with complex filter
  const inputs = scenes.flatMap((_, i) => ['-i', `input${i}.mp4`]);
  await ffmpeg.exec([
    ...inputs,
    '-filter_complex', filterComplex,
    '-map', '[vout]',
    '-map', '[aout]',
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-c:a', 'aac',
    'output.mp4'
  ]);

  onProgress?.(80);

  // Read the output
  const data = await ffmpeg.readFile('output.mp4');
  const uint8Array = data instanceof Uint8Array ? data : new Uint8Array(await (await fetch(data as string)).arrayBuffer());
  const blob = new Blob([uint8Array.buffer as ArrayBuffer], { type: 'video/mp4' });

  onProgress?.(85);

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

  onProgress?.(95);

  // Get signed URL
  const { data: signedUrlData } = await supabase.storage
    .from('generated-models')
    .createSignedUrl(fileName, 604800); // 7 days

  if (!signedUrlData?.signedUrl) {
    throw new Error('Failed to create signed URL');
  }

  onProgress?.(100);

  // Clean up FFmpeg files
  for (let i = 0; i < scenes.length; i++) {
    await ffmpeg.deleteFile(`input${i}.mp4`);
  }
  await ffmpeg.deleteFile('output.mp4');

  return signedUrlData.signedUrl;
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
