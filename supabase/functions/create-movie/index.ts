import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Replicate from "https://esm.sh/replicate@0.25.2";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateMovieRequest {
  scenes: Array<{
    videoUrl: string;
    duration: number;
    order: number;
    prompt: string;
  }>;
  jobId: string;
  userId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[CreateMovie] Request received');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const REPLICATE_API_KEY = Deno.env.get('REPLICATE_API_KEY');
    if (!REPLICATE_API_KEY) {
      throw new Error('REPLICATE_API_KEY is not configured');
    }

    const replicate = new Replicate({ auth: REPLICATE_API_KEY });
    const body = await req.json() as CreateMovieRequest;
    const { scenes, jobId, userId } = body;

    console.log('[CreateMovie] Stitching video for job:', jobId);
    console.log('[CreateMovie] Number of scenes:', scenes.length);

    if (!scenes || scenes.length === 0) {
      throw new Error('No scenes provided');
    }

    // Sort scenes by order
    const sortedScenes = [...scenes].sort((a, b) => a.order - b.order);

    // Store individual scenes in database
    for (const scene of sortedScenes) {
      await supabaseClient
        .from('video_scenes')
        .upsert({
          job_id: jobId,
          user_id: userId,
          scene_index: scene.order,
          prompt: scene.prompt,
          video_url: scene.videoUrl,
          duration: scene.duration,
        }, { onConflict: 'job_id,scene_index' });
    }

    // For single scene, just save it as the final video
    if (sortedScenes.length === 1) {
      console.log('[CreateMovie] Single scene, saving directly');
      
      // Get file size
      const response = await fetch(sortedScenes[0].videoUrl);
      const blob = await response.blob();
      const fileSize = blob.size;
      
      await supabaseClient
        .from('long_videos')
        .upsert({
          job_id: jobId,
          user_id: userId,
          stitched_video_url: sortedScenes[0].videoUrl,
          total_duration: sortedScenes[0].duration,
          scene_count: 1,
          file_size_bytes: fileSize,
        }, { onConflict: 'job_id' });
      
      return new Response(
        JSON.stringify({
          success: true,
          videoUrl: sortedScenes[0].videoUrl,
          duration: sortedScenes[0].duration,
          sceneCount: 1,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Use FFmpeg via Replicate to concatenate videos
    console.log('[CreateMovie] Stitching multiple scenes with FFmpeg...');
    
    const prediction = await replicate.predictions.create({
      model: "andreasjansson/ffmpeg",
      input: {
        video_urls: sortedScenes.map(s => s.videoUrl),
        concat_method: "concatenate",
      }
    });

    // Wait for completion (with timeout)
    let result = prediction;
    const maxAttempts = 60;
    let attempts = 0;

    while (result.status !== 'succeeded' && result.status !== 'failed' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      result = await replicate.predictions.get(prediction.id);
      attempts++;
      console.log(`[CreateMovie] Stitching progress: ${result.status}`);
    }

    if (result.status !== 'succeeded' || !result.output) {
      throw new Error(`Video stitching failed: ${result.status}`);
    }

    const stitchedUrl = Array.isArray(result.output) ? result.output[0] : result.output;
    console.log('[CreateMovie] Video stitched successfully:', stitchedUrl);

    // Download and upload to Supabase storage
    const videoResponse = await fetch(stitchedUrl);
    if (!videoResponse.ok) {
      throw new Error('Failed to download stitched video');
    }

    const videoBlob = await videoResponse.blob();
    const videoBuffer = await videoBlob.arrayBuffer();
    const fileSize = videoBuffer.byteLength;

    // Upload to storage
    const fileName = `${userId}/${jobId}/stitched_video.mp4`;
    const { error: uploadError } = await supabaseClient
      .storage
      .from('generated-models')
      .upload(fileName, videoBuffer, {
        contentType: 'video/mp4',
        upsert: true
      });

    if (uploadError) {
      console.error('[CreateMovie] Upload error:', uploadError);
      throw uploadError;
    }

    // Get signed URL (7 days)
    const { data: signedData } = await supabaseClient
      .storage
      .from('generated-models')
      .createSignedUrl(fileName, 604800);

    if (!signedData) {
      throw new Error('Failed to create signed URL');
    }

    const finalUrl = signedData.signedUrl;
    const totalDuration = sortedScenes.reduce((acc, s) => acc + s.duration, 0);

    // Save to long_videos table
    await supabaseClient
      .from('long_videos')
      .upsert({
        job_id: jobId,
        user_id: userId,
        stitched_video_url: finalUrl,
        total_duration: totalDuration,
        scene_count: sortedScenes.length,
        file_size_bytes: fileSize,
      }, { onConflict: 'job_id' });

    console.log('[CreateMovie] Stitched video saved to database');

    return new Response(
      JSON.stringify({
        success: true,
        videoUrl: finalUrl,
        duration: totalDuration,
        sceneCount: sortedScenes.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('[CreateMovie] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create movie'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
