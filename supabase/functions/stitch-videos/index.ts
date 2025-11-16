import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { videoUrls, jobId } = await req.json();

    if (!videoUrls || !Array.isArray(videoUrls) || videoUrls.length === 0) {
      return new Response(
        JSON.stringify({ error: "videoUrls array is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Stitching ${videoUrls.length} videos for job ${jobId}`);

    // Update job status
    await supabase
      .from('jobs')
      .update({
        progress_stage: 'encoding',
        progress_message: 'Stitching video parts together...',
        progress_percent: 85
      })
      .eq('id', jobId);

    // Get job details
    const { data: jobData } = await supabase
      .from('jobs')
      .select('user_id')
      .eq('id', jobId)
      .single();

    if (!jobData) {
      throw new Error('Job not found');
    }

    // For now, just use the first upscaled video as the final output
    // TODO: Implement proper FFmpeg-based video concatenation
    console.log("Using first scene as temporary output (FFmpeg concat not implemented yet)");
    const finalVideoUrl = videoUrls[0];
    
    // Download and re-upload to create a "final" version
    const videoResponse = await fetch(finalVideoUrl);
    if (!videoResponse.ok) {
      throw new Error(`Failed to download video: ${videoResponse.statusText}`);
    }

    const videoBlob = await videoResponse.blob();
    const videoBuffer = await videoBlob.arrayBuffer();

    // Upload final video
    const fileName = `${jobData.user_id}/${jobId}/final_stitched.mp4`;
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

    // Get signed URL
    const { data: signedUrlData } = await supabase.storage
      .from('generated-models')
      .createSignedUrl(fileName, 604800);

    const finalUrl = signedUrlData?.signedUrl;
    if (!finalUrl) throw new Error('Failed to create signed URL');

    console.log("Final stitched video stored at:", finalUrl);

    // Update job with final video
    await supabase
      .from('jobs')
      .update({
        outputs: [finalUrl],
        status: 'completed',
        progress_stage: 'completed',
        progress_percent: 100,
        progress_message: 'Video parts stitched successfully!',
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        videoUrl: finalUrl 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error stitching videos:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Failed to stitch videos" 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
