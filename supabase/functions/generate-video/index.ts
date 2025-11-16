import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Replicate from "https://esm.sh/replicate@0.25.2";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation schema
const generateVideoSchema = z.object({
  prompt: z.string().min(1).max(2000).optional(),
  predictionId: z.string().optional(),
  jobId: z.string().uuid().optional(),
  duration: z.number().min(1).max(10).optional(),
  aspectRatio: z.string().optional(),
  characterReference: z.string().url().optional(),
  styleReference: z.string().url().optional(),
});

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let body: any = {};
  
  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Authenticate with user's JWT
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Authenticated user:', user.id);

    const REPLICATE_API_KEY = Deno.env.get('REPLICATE_API_KEY');
    if (!REPLICATE_API_KEY) {
      throw new Error('REPLICATE_API_KEY is not set');
    }

    console.log("Initializing Replicate client");
    const replicate = new Replicate({
      auth: REPLICATE_API_KEY,
    });

    // Parse and validate request body
    const requestBody = await req.json();
    const validationResult = generateVideoSchema.safeParse(requestBody);
    
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid input parameters', 
          details: validationResult.error.issues 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    body = validationResult.data;
    console.log("Request body:", JSON.stringify(body, null, 2));

    // Initialize Supabase client with service role for database operations
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if this is a status check request
    if (body.predictionId) {
      console.log("Checking status for prediction:", body.predictionId);
      const prediction = await replicate.predictions.get(body.predictionId);
      console.log("Prediction status:", prediction.status);
      
      // If completed, persist the video to storage
      if (prediction.status === 'succeeded' && prediction.output) {
        const videoUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
        console.log("Video URL from Replicate:", videoUrl);
        
        // Get job details to find user_id and upscaling preferences
        const { data: jobData, error: jobError } = await supabase
          .from('jobs')
          .select('user_id, id, fps, upscale_video, num_videos, outputs')
          .eq('id', body.jobId)
          .maybeSingle();

        if (jobError || !jobData) {
          console.error("Failed to fetch job:", jobError);
          return new Response(JSON.stringify(prediction), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        try {
          let finalVideoUrl = videoUrl;
          
          // Check if we need to upscale the video
          const needsUpscaling = jobData.fps === 60 || jobData.upscale_video;
          
          if (needsUpscaling) {
            console.log("Upscaling video to 60fps or 4K...");
            
            // Update job status to show upscaling progress
            await supabase
              .from('jobs')
              .update({
                progress_stage: 'upscaling',
                progress_message: 'Upscaling video quality...',
                progress_percent: 70
              })
              .eq('id', body.jobId);
            
            // Call upscale-video function
            const { data: upscaleData, error: upscaleError } = await supabase.functions.invoke(
              'upscale-video',
              {
                body: {
                  videoUrl: videoUrl,
                  targetFps: jobData.fps || 60,
                  upscaleTo4K: jobData.upscale_video || false
                }
              }
            );
            
            if (!upscaleError && upscaleData?.upscaledVideoUrl) {
              finalVideoUrl = upscaleData.upscaledVideoUrl;
              console.log("Video upscaled successfully:", finalVideoUrl);
            } else {
              console.error("Failed to upscale video, using original:", upscaleError);
            }
          }
          
          // Download video from Replicate or upscale service
          console.log("Downloading video...");
          const videoResponse = await fetch(finalVideoUrl);
          if (!videoResponse.ok) {
            throw new Error(`Failed to download video: ${videoResponse.statusText}`);
          }
          
          const videoBlob = await videoResponse.blob();
          const videoBuffer = await videoBlob.arrayBuffer();
          console.log("Video downloaded, size:", videoBuffer.byteLength);

          // Get existing outputs array
          const existingOutputs = (jobData.outputs || []) as string[];
          const videoIndex = existingOutputs.length;
          
          // Upload to Supabase storage with index
          const fileName = `${jobData.user_id}/${body.jobId}/video_${videoIndex}.mp4`;
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

          // Get signed URL (7 days expiry)
          const { data: signedUrlData } = await supabase.storage
            .from('generated-models')
            .createSignedUrl(fileName, 604800);

          const publicUrl = signedUrlData?.signedUrl;
          if (!publicUrl) throw new Error('Failed to create signed URL');
          
          console.log("Video stored at:", publicUrl);

          // Add to outputs array
          const updatedOutputs = [...existingOutputs, publicUrl];
          const numVideos = jobData.num_videos || 1;
          
          // Check if all videos are complete
          const allVideosComplete = updatedOutputs.length >= numVideos;
          
          // Update job with new output URL
          const { error: updateError } = await supabase
            .from('jobs')
            .update({
              outputs: updatedOutputs,
              status: allVideosComplete ? 'completed' : 'running',
              progress_stage: allVideosComplete ? 'completed' : 'running',
              progress_percent: allVideosComplete ? 100 : Math.round((updatedOutputs.length / numVideos) * 100),
              progress_message: allVideosComplete 
                ? 'All videos generated successfully!' 
                : `Generated ${updatedOutputs.length} of ${numVideos} videos...`,
              completed_at: allVideosComplete ? new Date().toISOString() : null
            })
            .eq('id', body.jobId);

          if (updateError) {
            console.error("Failed to update job:", updateError);
          }

          // Return prediction with permanent URL
          return new Response(JSON.stringify({
            ...prediction,
            output: publicUrl,
            allVideosComplete,
            videoIndex: updatedOutputs.length,
            totalVideos: numVideos
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

    // Handle multi-scene compilation (sceneImages provided)
    if (body.sceneImages && Array.isArray(body.sceneImages)) {
      console.log("Multi-scene video compilation not yet implemented");
      return new Response(
        JSON.stringify({ 
          error: "Multi-scene video compilation is not yet supported. Please generate videos for individual scenes first." 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 501,
        }
      );
    }

    // Validate required fields for single scene generation
    if (!body.prompt) {
      return new Response(
        JSON.stringify({ 
          error: "Missing required field: prompt is required for video generation" 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    console.log("Generating video with Pixverse V5");
    console.log("Prompt:", body.prompt);
    
    // Build enhanced prompt with character/scene consistency
    let enhancedPrompt = body.prompt;
    
    // Add character description if provided for consistency
    if (body.characterDescription) {
      enhancedPrompt = `Character: ${body.characterDescription}. Scene: ${body.prompt}`;
      console.log("Added character description for consistency");
    }
    
    // Add style/brand context if provided
    if (body.styleDescription) {
      enhancedPrompt = `${enhancedPrompt}. Style: ${body.styleDescription}`;
      console.log("Added style description");
    }
    
    // Build Pixverse input parameters
    const pixverseInput: any = {
      prompt: enhancedPrompt,
      duration: 5, // 5 seconds is cheaper ($0.30 vs $0.40 for 8 seconds)
      quality: "540p", // Good balance of quality and cost
      aspect_ratio: body.aspectRatio || "16:9",
    };
    
    // Add reference image for character consistency if provided
    if (body.referenceImage) {
      pixverseInput.image = body.referenceImage;
      console.log("Using reference image for consistency:", body.referenceImage);
    }
    
    // Add negative prompt to avoid deformations and physics issues
    const negativePrompt = "deformed characters, distorted bodies, broken physics, unnatural movements, morphing faces, impossible poses, anatomical errors, glitchy motion";
    if (body.negativePrompt) {
      pixverseInput.negative_prompt = `${body.negativePrompt}, ${negativePrompt}`;
    } else {
      pixverseInput.negative_prompt = negativePrompt;
    }
    
    // Use seed for consistency across scenes if provided
    if (body.seed) {
      pixverseInput.seed = body.seed;
      console.log("Using seed for consistency:", body.seed);
    }
    
    console.log("Pixverse input:", JSON.stringify(pixverseInput, null, 2));
    
    // Start prediction with Pixverse V5 (async)
    const prediction = await replicate.predictions.create({
      model: "pixverse/pixverse-v5",
      input: pixverseInput
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
    
    // Check for specific Replicate errors and provide user-friendly messages
    let userFriendlyMessage = errorMessage;
    let statusCode = 500;
    
    // Check for insufficient credits/balance
    if (errorMessage.includes('402') || errorMessage.includes('Insufficient credit') || errorMessage.includes('payment required')) {
      userFriendlyMessage = "⚠️ Insufficient Replicate balance. Please add credits to your Replicate account to continue generating videos.";
      statusCode = 402;
    } 
    // Check for rate limits
    else if (errorMessage.includes('429') || errorMessage.includes('throttled') || errorMessage.includes('rate limit') || errorMessage.includes('Rate limit exceeded')) {
      userFriendlyMessage = "⏱️ Rate limit reached. Please add payment method to your Replicate account or wait a few minutes before trying again.";
      statusCode = 429;
    }
    // Check for validation errors (aspect ratio, etc.)
    else if (errorMessage.includes('422') || errorMessage.includes('Unprocessable Entity')) {
      // Try to parse aspect ratio errors specifically
      if (errorMessage.includes('aspect_ratio')) {
        userFriendlyMessage = "❌ Invalid video dimensions. The aspect ratio must be 16:9, 9:16, or 1:1. Please adjust your video settings.";
      } else {
        userFriendlyMessage = "❌ Invalid video parameters. Please check your video settings and try again.";
      }
      statusCode = 422;
    }
    // Check for model-specific errors
    else if (errorMessage.includes('Model') || errorMessage.includes('prediction')) {
      userFriendlyMessage = "🔧 Video generation service error. Please try again in a few moments.";
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
