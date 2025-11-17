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
    const shotstackApiKey = Deno.env.get('SHOTSTACK_API_KEY');
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
        progress_message: 'Stitching video scenes together...',
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

    if (!shotstackApiKey) {
      console.error('SHOTSTACK_API_KEY not configured');
      throw new Error('Video stitching service not configured');
    }

    // Create Shotstack edit for video concatenation
    const clips = videoUrls.map((url: string) => ({
      asset: {
        type: 'video',
        src: url
      }
    }));

    const shotstackPayload = {
      timeline: {
        soundtrack: {
          src: videoUrls[0].replace('.mp4', '_audio.mp3'),
          effect: 'fadeInFadeOut'
        },
        tracks: [
          {
            clips: clips
          }
        ]
      },
      output: {
        format: 'mp4',
        resolution: 'sd'
      }
    };

    console.log('Sending request to Shotstack...');
    const shotstackResponse = await fetch('https://api.shotstack.io/edit/stage/render', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': shotstackApiKey
      },
      body: JSON.stringify(shotstackPayload)
    });

    if (!shotstackResponse.ok) {
      const errorText = await shotstackResponse.text();
      console.error('Shotstack API error:', errorText);
      throw new Error(`Shotstack API error: ${shotstackResponse.statusText}`);
    }

    const shotstackResult = await shotstackResponse.json();
    const renderId = shotstackResult.response.id;
    console.log(`Shotstack render started: ${renderId}`);

    // Poll for completion
    let renderComplete = false;
    let stitchedVideoUrl = '';
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max

    while (!renderComplete && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      attempts++;

      const statusResponse = await fetch(`https://api.shotstack.io/edit/stage/render/${renderId}`, {
        headers: {
          'x-api-key': shotstackApiKey
        }
      });

      if (!statusResponse.ok) {
        console.error('Failed to check render status');
        continue;
      }

      const statusResult = await statusResponse.json();
      const status = statusResult.response.status;

      console.log(`Render status (attempt ${attempts}): ${status}`);

      if (status === 'done') {
        renderComplete = true;
        stitchedVideoUrl = statusResult.response.url;
      } else if (status === 'failed') {
        throw new Error('Video stitching failed');
      }

      // Update progress
      await supabase
        .from('jobs')
        .update({
          progress_message: `Stitching in progress... (${Math.min(85 + attempts, 95)}%)`,
          progress_percent: Math.min(85 + attempts, 95)
        })
        .eq('id', jobId);
    }

    if (!renderComplete) {
      throw new Error('Video stitching timed out');
    }

    console.log('Stitching complete, downloading final video...');

    // Download the stitched video
    const videoResponse = await fetch(stitchedVideoUrl);
    if (!videoResponse.ok) {
      throw new Error('Failed to download stitched video');
    }

    const videoBlob = await videoResponse.arrayBuffer();

    // Upload to Supabase storage
    const fileName = `${jobData.user_id}/${jobId}/final_stitched.mp4`;
    const { error: uploadError } = await supabase.storage
      .from('generated-models')
      .upload(fileName, videoBlob, {
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
        progress_message: 'Video stitched successfully!',
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        videoUrl: finalUrl,
        stitched: true 
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
