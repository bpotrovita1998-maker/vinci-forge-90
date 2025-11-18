import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StitchRequest {
  scenes: Array<{
    videoUrl: string;
    duration: number;
    order: number;
  }>;
  jobId: string;
  userId: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[Stitch] Request received');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    const body = await req.json() as StitchRequest;
    const { scenes, jobId, userId } = body;

    console.log('[Stitch] Starting video stitching for job:', jobId);
    console.log('[Stitch] Number of scenes:', scenes.length);

    if (!scenes || scenes.length === 0) {
      throw new Error('No scenes provided');
    }

    // Sort scenes by order
    const sortedScenes = [...scenes].sort((a, b) => a.order - b.order);

    // For single scene, return as-is
    if (sortedScenes.length === 1) {
      console.log('[Stitch] Single scene detected, returning directly');
      return new Response(
        JSON.stringify({
          success: true,
          stitchedUrl: sortedScenes[0].videoUrl,
          sceneCount: 1,
          message: 'Single scene - no stitching needed'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Create a manifest file for sequential playback
    const manifestFilename = `${jobId}/playlist.json`;
    const manifest = {
      type: 'video-playlist',
      scenes: sortedScenes.map((scene, index) => ({
        url: scene.videoUrl,
        duration: scene.duration,
        order: index
      })),
      totalDuration: sortedScenes.reduce((acc, s) => acc + s.duration, 0),
      sceneCount: sortedScenes.length,
      createdAt: new Date().toISOString()
    };

    console.log('[Stitch] Creating playlist manifest...');

    // Upload manifest to storage
    const { error: uploadError } = await supabaseClient
      .storage
      .from('generated-models')
      .upload(
        `${userId}/${manifestFilename}`,
        JSON.stringify(manifest, null, 2),
        {
          contentType: 'application/json',
          upsert: true
        }
      );

    if (uploadError) {
      console.error('[Stitch] Error uploading manifest:', uploadError);
      throw uploadError;
    }

    // Get signed URL for the manifest (7 days expiry)
    const { data: signedData, error: signError } = await supabaseClient
      .storage
      .from('generated-models')
      .createSignedUrl(`${userId}/${manifestFilename}`, 604800); // 7 days

    if (signError || !signedData) {
      console.error('[Stitch] Error creating signed URL:', signError);
      throw signError || new Error('Failed to create signed URL');
    }

    console.log('[Stitch] Playlist manifest created successfully');

    // Return the first scene as primary output and manifest URL for playlist
    return new Response(
      JSON.stringify({
        success: true,
        stitchedUrl: sortedScenes[0].videoUrl,
        manifestUrl: signedData.signedUrl,
        sceneCount: sortedScenes.length,
        totalDuration: manifest.totalDuration,
        allScenes: sortedScenes.map(s => s.videoUrl),
        message: `Processed ${sortedScenes.length} scenes. Videos can be played sequentially.`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('[Stitch] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to process videos';
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
