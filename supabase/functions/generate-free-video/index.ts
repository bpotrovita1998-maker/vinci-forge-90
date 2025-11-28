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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const REPLICATE_API_KEY = Deno.env.get('REPLICATE_API_KEY');
    if (!REPLICATE_API_KEY) {
      throw new Error('REPLICATE_API_KEY is not set');
    }

    const replicate = new Replicate({ auth: REPLICATE_API_KEY });
    const body = await req.json();
    
    console.log("Free video generation request:", body);

    // Check if this is a status check
    if (body.predictionId) {
      console.log("Checking status for prediction:", body.predictionId);
      const prediction = await replicate.predictions.get(body.predictionId);
      console.log("Prediction status:", prediction.status);
      
      // If completed, start post-processing pipeline
      if (prediction.status === 'succeeded' && prediction.output) {
        const videoUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
        console.log("Raw video URL from Zeroscope:", videoUrl);
        
        const { data: jobData } = await supabase
          .from('jobs')
          .select('user_id, id')
          .eq('id', body.jobId)
          .single();

        if (!jobData) {
          return new Response(JSON.stringify(prediction), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        try {
          // Update status to show post-processing
          await supabase
            .from('jobs')
            .update({
              progress_stage: 'enhancing',
              progress_message: 'Enhancing video quality (FFmpeg + ESRGAN)...',
              progress_percent: 60
            })
            .eq('id', body.jobId);

          // Call enhanced upscale function (FFmpeg + ESRGAN pipeline)
          console.log("Starting enhancement pipeline...");
          const { data: enhancedData, error: enhanceError } = await supabase.functions.invoke(
            'upscale-video',
            {
              body: {
                videoUrl: videoUrl,
                targetResolution: '1920x1080',
                enhanceQuality: true // Enable ESRGAN after FFmpeg
              }
            }
          );
          
          if (enhanceError || !enhancedData?.upscaledVideoUrl) {
            console.error("Enhancement failed, using original:", enhanceError);
            throw new Error('Failed to enhance video');
          }
          
          const enhancedUrl = enhancedData.upscaledVideoUrl;
          console.log("Video enhanced successfully:", enhancedUrl);
          
          // Download enhanced video
          const videoResponse = await fetch(enhancedUrl);
          if (!videoResponse.ok) {
            throw new Error(`Failed to download enhanced video: ${videoResponse.statusText}`);
          }
          
          const videoBlob = await videoResponse.blob();
          const videoBuffer = await videoBlob.arrayBuffer();
          
          // Upload to storage
          const fileName = `${jobData.user_id}/${body.jobId}/free_enhanced.mp4`;
          const { error: uploadError } = await supabase.storage
            .from('generated-models')
            .upload(fileName, videoBuffer, {
              contentType: 'video/mp4',
              upsert: true
            });

          if (uploadError) throw uploadError;

          // Get signed URL
          const { data: signedUrlData } = await supabase.storage
            .from('generated-models')
            .createSignedUrl(fileName, 604800);

          const publicUrl = signedUrlData?.signedUrl;
          if (!publicUrl) throw new Error('Failed to create signed URL');
          
          // Update job with final result
          await supabase
            .from('jobs')
            .update({
              outputs: [publicUrl],
              status: 'completed',
              progress_stage: 'completed',
              progress_percent: 100,
              progress_message: 'Free video enhanced successfully! (Zeroscope + FFmpeg + ESRGAN)',
              completed_at: new Date().toISOString()
            })
            .eq('id', body.jobId);

          return new Response(JSON.stringify({
            ...prediction,
            output: publicUrl,
            enhanced: true
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } catch (error) {
          console.error("Error in post-processing pipeline:", error);
          await supabase
            .from('jobs')
            .update({
              status: 'failed',
              error: 'Enhancement pipeline failed',
              completed_at: new Date().toISOString()
            })
            .eq('id', body.jobId);
          throw error;
        }
      }
      
      return new Response(JSON.stringify(prediction), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Start new video generation with Zeroscope v2 XL
    if (!body.prompt) {
      return new Response(
        JSON.stringify({ error: "Missing required field: prompt" }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    console.log("Starting Zeroscope v2 XL generation with prompt:", body.prompt);
    
    // Zeroscope v2 XL generates 576x320 videos, which we'll enhance
    const prediction = await replicate.predictions.create({
      version: "9f747673945c62801b13b84701c783929c0ee784e4748ec062204894dda1a351", // Zeroscope v2 XL
      input: {
        prompt: body.prompt,
        negative_prompt: body.negativePrompt || "blur, low quality, distorted",
        num_frames: 24, // ~1 second at 24fps
        num_inference_steps: 50,
        guidance_scale: 17.5,
        width: 576,
        height: 320,
        fps: 24
      }
    });

    console.log("Zeroscope prediction started:", prediction.id);
    
    // Update job with prediction ID
    await supabase
      .from('jobs')
      .update({
        manifest: {
          predictionId: prediction.id,
          model: 'zeroscope-v2-xl',
          enhancementPipeline: 'ffmpeg+esrgan'
        },
        progress_stage: 'generating',
        progress_message: 'Generating free video with Zeroscope v2 XL...',
        progress_percent: 20
      })
      .eq('id', body.jobId);

    return new Response(JSON.stringify(prediction), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error("Error in generate-free-video:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
