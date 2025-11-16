import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Replicate from "https://esm.sh/replicate@0.25.2";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let body: any = {};
  
  try {
    const REPLICATE_API_KEY = Deno.env.get('REPLICATE_API_KEY');
    if (!REPLICATE_API_KEY) {
      throw new Error('REPLICATE_API_KEY is not set');
    }

    console.log("Initializing Replicate client");
    const replicate = new Replicate({
      auth: REPLICATE_API_KEY,
    });

    body = await req.json();
    console.log("Request body:", JSON.stringify(body, null, 2));

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if this is a status check request
    if (body.predictionId) {
      console.log("Checking status for prediction:", body.predictionId);
      const prediction = await replicate.predictions.get(body.predictionId);
      console.log("Prediction status:", prediction.status);
      
      // If completed, persist the video to storage
      if (prediction.status === 'succeeded' && prediction.output) {
        const videoUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
        console.log("Video URL from Replicate:", videoUrl);
        
        // Get job details to find user_id
        const { data: jobData, error: jobError } = await supabase
          .from('jobs')
          .select('user_id, id')
          .eq('id', body.jobId)
          .maybeSingle();

        if (jobError || !jobData) {
          console.error("Failed to fetch job:", jobError);
          return new Response(JSON.stringify(prediction), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        try {
          // Download video from Replicate
          console.log("Downloading video from Replicate...");
          const videoResponse = await fetch(videoUrl);
          if (!videoResponse.ok) {
            throw new Error(`Failed to download video: ${videoResponse.statusText}`);
          }
          
          const videoBlob = await videoResponse.blob();
          const videoBuffer = await videoBlob.arrayBuffer();
          console.log("Video downloaded, size:", videoBuffer.byteLength);

          // Upload to Supabase storage
          const fileName = `${jobData.user_id}/${body.jobId}/video.mp4`;
          console.log("Uploading to storage:", fileName);
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('generated-models')
            .upload(fileName, videoBuffer, {
              contentType: 'video/mp4',
              upsert: true
            });

          if (uploadError) {
            console.error("Storage upload error:", uploadError);
            throw uploadError;
          }

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('generated-models')
            .getPublicUrl(fileName);

          console.log("Video stored at:", publicUrl);

          // Update job with permanent URL
          const { error: updateError } = await supabase
            .from('jobs')
            .update({
              outputs: [publicUrl],
              status: 'completed',
              progress_stage: 'completed',
              progress_percent: 100,
              progress_message: 'Video generation complete!',
              completed_at: new Date().toISOString()
            })
            .eq('id', body.jobId);

          if (updateError) {
            console.error("Failed to update job:", updateError);
          }

          // Return prediction with permanent URL
          return new Response(JSON.stringify({
            ...prediction,
            output: publicUrl
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } catch (error) {
          console.error("Error persisting video:", error);
          // Return original prediction even if storage fails
          return new Response(JSON.stringify(prediction), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
      
      return new Response(JSON.stringify(prediction), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate required fields for generation
    if (!body.prompt) {
      return new Response(
        JSON.stringify({ 
          error: "Missing required field: prompt is required" 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    console.log("Generating video with prompt:", body.prompt);
    
    // Start prediction without waiting (async)
    const prediction = await replicate.predictions.create({
      version: "minimax/video-01-director",
      input: {
        prompt: body.prompt
      }
    });

    console.log("Video prediction started:", prediction.id);
    
    // Get existing manifest and save predictionId
    const { data: jobData } = await supabase
      .from('jobs')
      .select('manifest')
      .eq('id', body.jobId)
      .single();

    const existingManifest = jobData?.manifest || {};
    
    // Update job with prediction ID and mark as running
    const { error: updateError } = await supabase
      .from('jobs')
      .update({
        manifest: {
          ...existingManifest,
          predictionId: prediction.id,
        },
        status: 'running',
        progress_stage: 'Generating video',
        started_at: new Date().toISOString(),
      })
      .eq('id', body.jobId);

    if (updateError) {
      console.error("Error updating job with predictionId:", updateError);
    }
    
    return new Response(JSON.stringify({ 
      predictionId: prediction.id,
      status: prediction.status 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error("Error in generate-video function:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to generate video";
    
    // Check for specific Replicate errors
    let userFriendlyMessage = errorMessage;
    let statusCode = 500;
    if (errorMessage.includes('402') || errorMessage.includes('Insufficient credit')) {
      userFriendlyMessage = "Insufficient Replicate credits. Please add credits at replicate.com/account/billing";
      statusCode = 402;
    } else if (errorMessage.includes('429') || errorMessage.includes('throttled') || errorMessage.includes('rate limit')) {
      userFriendlyMessage = "Rate limit exceeded. Please add a payment method at replicate.com/account/billing to increase limits";
      statusCode = 429;
    }

    // Update job status to failed if we have a jobId (body was parsed before the error)
    if (body?.jobId) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        console.log(`Marking job ${body.jobId} as failed due to: ${userFriendlyMessage}`);
        
        await supabase
          .from('jobs')
          .update({
            status: 'failed',
            progress_stage: 'failed',
            error: userFriendlyMessage,
            completed_at: new Date().toISOString()
          })
          .eq('id', body.jobId);
          
        console.log(`Job ${body.jobId} marked as failed`);
      } catch (updateError) {
        console.error("Failed to update job status:", updateError);
      }
    }
    
    return new Response(JSON.stringify({ 
      error: userFriendlyMessage
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: statusCode,
    });
  }
});
