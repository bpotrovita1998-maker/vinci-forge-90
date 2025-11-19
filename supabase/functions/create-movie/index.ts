import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Replicate from "https://esm.sh/replicate@0.25.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateMovieRequest {
  scenes: Array<{
    videoUrl: string;
    duration: number;
    order: number;
  }>;
  storyboardId: string;
  userId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[Create Movie] Request received');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const REPLICATE_API_KEY = Deno.env.get('REPLICATE_API_KEY');
    if (!REPLICATE_API_KEY) {
      throw new Error('REPLICATE_API_KEY is not configured');
    }

    const body = await req.json() as CreateMovieRequest;
    const { scenes, storyboardId, userId } = body;

    console.log('[Create Movie] Processing', scenes.length, 'scenes');

    if (!scenes || scenes.length === 0) {
      throw new Error('No scenes provided');
    }

    // Sort scenes by order
    const sortedScenes = [...scenes].sort((a, b) => a.order - b.order);

    // For single scene, just return it
    if (sortedScenes.length === 1) {
      console.log('[Create Movie] Single scene - no stitching needed');
      return new Response(
        JSON.stringify({
          success: true,
          movieUrl: sortedScenes[0].videoUrl,
          duration: sortedScenes[0].duration,
          sceneCount: 1
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Use Replicate to concatenate videos using ffmpeg
    const replicate = new Replicate({ auth: REPLICATE_API_KEY });
    
    console.log('[Create Movie] Starting video concatenation with Replicate');
    
    // Prepare video URLs for concatenation
    const videoUrls = sortedScenes.map(s => s.videoUrl);
    const totalDuration = sortedScenes.reduce((acc, s) => acc + s.duration, 0);

    // Use victor-upmaru/ffmpeg model for video concatenation
    const output = await replicate.run(
      "victor-upmaru/ffmpeg:88b4c96c2f5b8acac8c7a0d7c6e7d3e5c4f3e2d1",
      {
        input: {
          videos: videoUrls,
          output_format: "mp4",
          fps: 24,
          preset: "medium",
        }
      }
    ) as string;

    if (!output) {
      throw new Error('Failed to create movie - no output from Replicate');
    }

    console.log('[Create Movie] Video concatenation complete:', output);

    // Download and store the stitched video
    const movieFilename = `${storyboardId}/movie-${Date.now()}.mp4`;
    
    const videoResponse = await fetch(output);
    if (!videoResponse.ok) {
      throw new Error('Failed to download stitched video');
    }

    const videoBlob = await videoResponse.blob();
    const videoBuffer = await videoBlob.arrayBuffer();

    console.log('[Create Movie] Uploading movie to storage...');

    const { error: uploadError } = await supabaseClient
      .storage
      .from('generated-models')
      .upload(
        `${userId}/${movieFilename}`,
        videoBuffer,
        {
          contentType: 'video/mp4',
          upsert: true
        }
      );

    if (uploadError) {
      console.error('[Create Movie] Upload error:', uploadError);
      throw uploadError;
    }

    // Get signed URL (7 days)
    const { data: signedData, error: signError } = await supabaseClient
      .storage
      .from('generated-models')
      .createSignedUrl(`${userId}/${movieFilename}`, 604800);

    if (signError || !signedData) {
      throw signError || new Error('Failed to create signed URL');
    }

    console.log('[Create Movie] Movie created successfully');

    return new Response(
      JSON.stringify({
        success: true,
        movieUrl: signedData.signedUrl,
        duration: totalDuration,
        sceneCount: sortedScenes.length,
        message: `Successfully created movie from ${sortedScenes.length} scenes`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('[Create Movie] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create movie';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
