import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { supabase } from '@/integrations/supabase/client';

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

export const stitchVideos = async (
  videoUrls: string[],
  jobId: string,
  userId: string,
  onProgress?: (progress: number) => void
): Promise<string> => {
  console.log(`Starting client-side stitching for ${videoUrls.length} videos`);
  
  const ffmpeg = await loadFFmpeg();

  // Download all videos
  onProgress?.(10);
  const videoFiles: Uint8Array[] = [];
  for (let i = 0; i < videoUrls.length; i++) {
    const videoData = await fetchFile(videoUrls[i]);
    videoFiles.push(videoData);
    await ffmpeg.writeFile(`input${i}.mp4`, videoData);
    onProgress?.(10 + (i + 1) * (30 / videoUrls.length));
  }

  // Create concat file
  const concatContent = videoUrls.map((_, i) => `file 'input${i}.mp4'`).join('\n');
  await ffmpeg.writeFile('concat.txt', concatContent);

  onProgress?.(45);

  // Stitch videos using concat demuxer
  await ffmpeg.exec([
    '-f', 'concat',
    '-safe', '0',
    '-i', 'concat.txt',
    '-c', 'copy',
    'output.mp4'
  ]);

  onProgress?.(75);

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
  for (let i = 0; i < videoUrls.length; i++) {
    await ffmpeg.deleteFile(`input${i}.mp4`);
  }
  await ffmpeg.deleteFile('concat.txt');
  await ffmpeg.deleteFile('output.mp4');

  return signedUrlData.signedUrl;
};
