import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Replicate from "https://esm.sh/replicate@0.25.2";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { predictionId, sceneId } = await req.json();
    
    if (!predictionId || !sceneId) {
      throw new Error('Missing required parameters: predictionId and sceneId');
    }

    const REPLICATE_API_KEY = Deno.env.get('REPLICATE_API_KEY');
    if (!REPLICATE_API_KEY) {
      throw new Error('REPLICATE_API_KEY is not set');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Fetching prediction ${predictionId} from Replicate...`);
    const replicate = new Replicate({ auth: REPLICATE_API_KEY });
    const prediction = await replicate.predictions.get(predictionId);

    if (prediction.status !== 'succeeded' || !prediction.output) {
      throw new Error(`Prediction is not ready. Status: ${prediction.status}`);
    }

    const videoUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
    console.log(`Video URL from Replicate: ${videoUrl}`);

    // Get scene details
    const { data: sceneData, error: sceneError } = await supabase
      .from('storyboard_scenes')
      .select('*, storyboards!inner(user_id)')
      .eq('id', sceneId)
      .single();

    if (sceneError || !sceneData) {
      throw new Error(`Scene not found: ${sceneError?.message}`);
    }

    const userId = sceneData.storyboards.user_id;

    // Download video from Replicate
    console.log("Downloading video from Replicate...");
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) {
      throw new Error(`Failed to download video: ${videoResponse.statusText}`);
    }

    const videoBlob = await videoResponse.blob();
    const videoBuffer = await videoBlob.arrayBuffer();
    console.log(`Video downloaded, size: ${videoBuffer.byteLength} bytes`);

    // Upload to Supabase storage
    const fileName = `${userId}/${sceneId}/imported_video.mp4`;
    console.log(`Uploading to storage: ${fileName}`);

    const { error: uploadError } = await supabase.storage
      .from('generated-models')
      .upload(fileName, videoBuffer, {
        contentType: 'video/mp4',
        upsert: true
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      throw uploadError;
    }

    // Get signed URL (7 days expiry)
    const { data: signedUrlData } = await supabase.storage
      .from('generated-models')
      .createSignedUrl(fileName, 604800);

    const publicUrl = signedUrlData?.signedUrl;
    if (!publicUrl) throw new Error('Failed to create signed URL');

    console.log(`Video stored at: ${publicUrl}`);

    // Update scene with video URL
    const { error: updateError } = await supabase
      .from('storyboard_scenes')
      .update({
        video_url: publicUrl,
        status: 'ready'
      })
      .eq('id', sceneId);

    if (updateError) {
      console.error("Failed to update scene:", updateError);
      throw updateError;
    }

    console.log(`Scene ${sceneId} updated successfully with imported video`);

    return new Response(JSON.stringify({
      success: true,
      videoUrl: publicUrl,
      sceneId: sceneId
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error importing Replicate video:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Import failed"
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
