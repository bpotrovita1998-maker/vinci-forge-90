import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Replicate from "https://esm.sh/replicate@0.25.2";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { splitPromptIntoScenes } from "../_shared/promptSplitter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Only block ACTUAL code injection attempts
const DANGEROUS_PATTERNS = [
  /<script[^>]*>[\s\S]*?<\/script>/gi,
  /<iframe[^>]*>[\s\S]*?<\/iframe>/gi,
  /javascript:\s*void\s*\(|javascript:\s*alert\s*\(|javascript:\s*eval\s*\(/gi,
  /<[^>]+on(load|error|click|mouse|key)\s*=\s*["'][^"']*["'][^>]*>/gi,
  /eval\s*\(\s*["'`]|Function\s*\(\s*["'`]/gi,
  /;\s*(DROP|DELETE|INSERT|UPDATE|ALTER)\s+(TABLE|DATABASE|FROM)/gi,
  /UNION\s+SELECT|UNION\s+ALL\s+SELECT/gi,
];

// Sanitize input to prevent injection attacks
function sanitizePrompt(input: string): string {
  if (!input || typeof input !== 'string') return '';
  
  let sanitized = input.replace(/\0/g, '').trim();
  
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(sanitized)) {
      throw new Error('Prompt contains code injection. Remove script tags, SQL injection syntax, or JavaScript execution attempts.');
    }
  }
  
  return sanitized;
}

// Input validation schema
const generateVideoSchema = z.object({
  prompt: z.string().min(1).max(2000).transform(sanitizePrompt).optional(),
  predictionId: z.string().optional(),
  jobId: z.string().uuid().optional(),
  duration: z.number().min(4).max(8).optional(),
  aspectRatio: z.string().optional(),
  resolution: z.enum(['720p', '1080p']).optional(),
  videoModel: z.enum(['veo', 'haiper', 'animatediff']).optional(),
  characterReference: z.string().url().optional(),
  styleReference: z.string().url().optional(),
  referenceImages: z.array(z.string().url()).max(3).optional(),
  startFrame: z.string().url().optional(),
  endFrame: z.string().url().optional(),
  extendFromVideo: z.string().url().optional(),
  scenePrompts: z.array(z.string().min(1).max(2000).transform(sanitizePrompt)).optional(),
  sceneIndex: z.number().optional(),
});

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let body: any = {};
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Initialize Supabase client with service role for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Optional user authentication (for direct client calls)
    const authHeader = req.headers.get('Authorization');
    let authenticatedUserId: string | null = null;
    
    if (authHeader) {
      const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
      const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
      if (!authError && user) {
        authenticatedUserId = user.id;
        console.log('Authenticated user:', user.id);
      }
    }

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
      console.error('Validation error:', validationResult.error.issues);
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
          .select('user_id, id, fps, upscale_video, num_videos, outputs, manifest')
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

          // Get existing outputs array and manifest
          const existingOutputs = (jobData.outputs || []) as string[];
          const manifest = jobData.manifest as any || {};
          const regeneratingIndex = manifest.regeneratingSceneIndex;
          const sceneIndex = regeneratingIndex !== undefined ? regeneratingIndex : (manifest.currentSceneIndex || 0);
          
          // Upload to Supabase storage with scene index
          const fileName = `${jobData.user_id}/${body.jobId}/scene_${sceneIndex}.mp4`;
          console.log("Uploading scene video to storage:", fileName);
          
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

          // Add to outputs array or replace if regenerating
          let updatedOutputs: string[];
          if (regeneratingIndex !== undefined) {
            // Replace the specific scene
            updatedOutputs = [...existingOutputs];
            updatedOutputs[regeneratingIndex] = publicUrl;
            console.log(`Replaced scene ${regeneratingIndex} in outputs`);
          } else {
            // Add new scene
            updatedOutputs = [...existingOutputs, publicUrl];
          }
          
          const scenePrompts = manifest.scenePrompts as string[] | undefined;
          const totalScenes = scenePrompts ? scenePrompts.length : (jobData.num_videos || 1);
          
          // Check if all scenes are complete
          const allScenesComplete = updatedOutputs.length >= totalScenes;
          
          // Update manifest with per-scene progress tracking
          const sceneProgress = manifest.sceneProgress || {};
          const currentSceneKey = regeneratingIndex !== undefined ? regeneratingIndex : sceneIndex;
          sceneProgress[currentSceneKey] = {
            status: 'completed',
            progress: 100,
            completedAt: new Date().toISOString()
          };
          
          const updatedManifest = {
            ...manifest,
            currentSceneIndex: regeneratingIndex !== undefined ? regeneratingIndex : (sceneIndex + 1),
            regeneratingSceneIndex: undefined, // Clear regenerating flag
            sceneProgress
          };
          
          // If regenerating, we need to re-stitch
          const needsRestitching = regeneratingIndex !== undefined && scenePrompts && scenePrompts.length > 1;
          
          // Update job with new output URL
          const { error: updateError } = await supabase
            .from('jobs')
            .update({
              outputs: updatedOutputs,
              manifest: updatedManifest,
              status: (allScenesComplete && !needsRestitching) ? 'encoding' : (needsRestitching ? 'encoding' : 'running'),
              progress_stage: needsRestitching ? 'encoding' : (allScenesComplete ? 'encoding' : 'running'),
              progress_percent: allScenesComplete ? 80 : Math.round((updatedOutputs.length / totalScenes) * 70),
              progress_message: needsRestitching 
                ? 'Re-stitching video with regenerated scene...'
                : (allScenesComplete 
                  ? 'All scenes generated! Stitching video parts...' 
                  : `Generated scene ${updatedOutputs.length} of ${totalScenes}...`),
            })
            .eq('id', body.jobId);

          if (updateError) {
            console.error("Failed to update job:", updateError);
          }

          // If all scenes are complete and we have multiple parts, stitch them together
          if ((allScenesComplete || needsRestitching) && scenePrompts && scenePrompts.length > 1) {
            console.log(needsRestitching ? "Re-stitching with regenerated scene..." : "All scenes complete, initiating stitching...");
            
            // Prepare scene data with prompts for database storage
            const scenesData = updatedOutputs.map((url, index) => ({
              videoUrl: url,
              duration: 8,
              order: index,
              prompt: scenePrompts[index] || ''
            }));
            
            // Call create-movie function to stitch and store in database
            const { data: movieData, error: stitchError } = await supabase.functions.invoke(
              'create-movie',
              {
                body: {
                  scenes: scenesData,
                  jobId: body.jobId,
                  userId: jobData.user_id
                }
              }
            );
            
            if (stitchError) {
              console.error("Failed to create movie:", stitchError);
              // Mark job as failed
              await supabase
                .from('jobs')
                .update({
                  status: 'failed',
                  error: 'Failed to stitch video scenes together',
                  completed_at: new Date().toISOString()
                })
                .eq('id', body.jobId);
            } else if (movieData?.success) {
              console.log("Movie created successfully:", movieData.videoUrl);
              // Update job with final stitched video
              await supabase
                .from('jobs')
                .update({
                  outputs: [movieData.videoUrl], // Replace with single stitched video
                  status: 'completed',
                  progress_stage: 'completed',
                  progress_percent: 100,
                  progress_message: `15-second video created successfully with ${movieData.sceneCount} scenes!`,
                  completed_at: new Date().toISOString()
                })
                .eq('id', body.jobId);
            }
          } else if (allScenesComplete) {
            // Single scene video, mark as completed
            await supabase
              .from('jobs')
              .update({
                status: 'completed',
                progress_stage: 'completed',
                progress_percent: 100,
                progress_message: 'Video generated successfully!',
                completed_at: new Date().toISOString()
              })
              .eq('id', body.jobId);
          }

          // Return prediction with permanent URL
          return new Response(JSON.stringify({
            ...prediction,
            output: publicUrl,
            allScenesComplete,
            sceneIndex: regeneratingIndex !== undefined ? regeneratingIndex : updatedOutputs.length,
            totalScenes,
            regenerated: regeneratingIndex !== undefined
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

    // Check if this is multi-scene generation
    const { data: jobData } = await supabase
      .from('jobs')
      .select('manifest, num_videos')
      .eq('id', body.jobId)
      .single();

    const manifest = jobData?.manifest as any || {};
    let scenePrompts = body.scenePrompts || manifest.scenePrompts;
    
    // AUTO-SPLIT: If no scene prompts provided, automatically split the prompt into 2 scenes
    if (!scenePrompts && body.prompt) {
      console.log('[Auto-Split] Splitting prompt into 2 continuous scenes for 15-second video');
      const { scene1, scene2, baseContext } = splitPromptIntoScenes(body.prompt);
      scenePrompts = [scene1, scene2];
      console.log('[Auto-Split] Scene 1:', scene1);
      console.log('[Auto-Split] Scene 2:', scene2);
      console.log('[Auto-Split] Base context:', baseContext);
      
      // Save scene prompts to manifest for tracking
      await supabase
        .from('jobs')
        .update({
          manifest: {
            ...manifest,
            scenePrompts,
            baseContext,
            autoSplit: true
          },
          num_videos: 2
        })
        .eq('id', body.jobId);
    }
    
    const currentSceneIndex = manifest.currentSceneIndex || 0;
    
    // Determine which prompt to use
    let promptToUse = body.prompt;
    
    if (scenePrompts && scenePrompts.length > 0) {
      // Multi-scene generation
      if (currentSceneIndex >= scenePrompts.length) {
        return new Response(
          JSON.stringify({ 
            error: "All scenes have been generated" 
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }
      
      promptToUse = scenePrompts[currentSceneIndex];
      console.log(`Generating scene ${currentSceneIndex + 1} of ${scenePrompts.length}`);
      console.log("Scene prompt:", promptToUse);
      
      // Initialize scene progress tracking on first scene
      if (currentSceneIndex === 0) {
        const sceneProgress: Record<number, any> = {};
        for (let i = 0; i < scenePrompts.length; i++) {
          sceneProgress[i] = {
            status: 'pending',
            progress: 0
          };
        }
        
        await supabase
          .from('jobs')
          .update({
            manifest: {
              ...manifest,
              scenePrompts,
              currentSceneIndex: 0,
              sceneProgress
            }
          })
          .eq('id', body.jobId);
      }
      
      // Mark current scene as running
      const updatedSceneProgress = manifest.sceneProgress || {};
      updatedSceneProgress[currentSceneIndex] = {
        status: 'running',
        progress: 0,
        startedAt: new Date().toISOString()
      };
      
      await supabase
        .from('jobs')
        .update({
          manifest: {
            ...manifest,
            sceneProgress: updatedSceneProgress
          }
        })
        .eq('id', body.jobId);
    } else {
      // Single video generation
      if (!promptToUse) {
        return new Response(
          JSON.stringify({ 
            error: "Missing required field: prompt is required for video generation" 
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }
      const videoModel = body.videoModel || 'animatediff';
      console.log(`Generating single video with ${videoModel} model`);
      console.log("Prompt:", promptToUse);
    }
    
    // Determine which model to use
    const videoModel = body.videoModel || 'animatediff';
    console.log(`Using video model: ${videoModel}`);
    
    // Build enhanced prompt with character/scene consistency
    let enhancedPrompt = promptToUse;
    
    // Add character description if provided for consistency
    if (body.characterDescription) {
      enhancedPrompt = `Character: ${body.characterDescription}. Scene: ${promptToUse}`;
      console.log("Added character description for consistency");
    }
    
    // Add style/brand context if provided
    if (body.styleDescription) {
      enhancedPrompt = `${enhancedPrompt}. Style: ${body.styleDescription}`;
      console.log("Added style description");
    }
    
    // Build model-specific input parameters
    let modelName: string;
    let modelInput: any;
    
    if (videoModel === 'animatediff') {
      // AnimateDiff model
      modelName = "lucataco/animatediff";
      modelInput = {
        prompt: enhancedPrompt,
        n_prompt: "worst quality, low quality", // negative prompt
        steps: 25,
        guidance_scale: 7.5,
      };
      console.log("Using AnimateDiff model");
    } else if (videoModel === 'haiper') {
      // Haiper model
      modelName = "haiper-ai/haiper-video-2";
      modelInput = {
        prompt: enhancedPrompt,
        duration: 4, // Haiper supports 2 or 4 seconds
        aspect_ratio: body.aspectRatio === "9:16" ? "9:16" : "16:9",
      };
      console.log("Using Haiper model");
    } else {
      // Veo 3.1 (default)
      modelName = "google/veo-3.1-fast";
      let aspectRatio = body.aspectRatio || "16:9";
      if (aspectRatio !== "16:9" && aspectRatio !== "9:16") {
        aspectRatio = "16:9";
      }
      
      const resolution = body.resolution || '1080p';
      
      modelInput = {
        prompt: enhancedPrompt,
        aspect_ratio: aspectRatio,
        duration: body.duration || 8,
        resolution: resolution,
      };
      console.log("Using Veo 3.1 model");
    }
    
    // Add advanced features for Veo 3.1 only
    if (videoModel === 'veo') {
      // Add reference images for visual consistency (up to 3)
      if (body.referenceImages && body.referenceImages.length > 0) {
        modelInput.reference_images = body.referenceImages.slice(0, 3);
        console.log("Using reference images for consistency:", body.referenceImages.length);
      }
      
      // Frame-to-frame generation
      if (body.startFrame && body.endFrame) {
        modelInput.start_frame = body.startFrame;
        modelInput.end_frame = body.endFrame;
        console.log("Frame-to-frame generation enabled");
      }
      
      // Scene extension (extend from previous video)
      if (body.extendFromVideo) {
        modelInput.extend_from = body.extendFromVideo;
        console.log("Extending from video:", body.extendFromVideo);
      }
      
      // Add reference image for visual consistency if provided (legacy support)
      if (body.referenceImage && !body.referenceImages) {
        modelInput.image = body.referenceImage;
        console.log("Using reference image for consistency:", body.referenceImage);
      }
    }
    
    // Use seed for consistency across scenes if provided
    if (body.seed) {
      modelInput.seed = body.seed;
      console.log("Using seed for consistency:", body.seed);
    }
    
    console.log(`${videoModel} input:`, JSON.stringify(modelInput, null, 2));
    
    // Start prediction with selected model (async)
    const prediction = await replicate.predictions.create({
      model: modelName,
      input: modelInput
    });

    console.log("Video prediction started:", prediction.id);
    
    // Update job with prediction ID and mark as running
    const { error: updateError } = await supabase
      .from('jobs')
      .update({
        manifest: {
          ...manifest,
          predictionId: prediction.id,
          currentSceneIndex: currentSceneIndex,
        },
        status: 'running',
        progress_stage: scenePrompts ? `Generating scene ${currentSceneIndex + 1}` : 'Generating video',
        started_at: currentSceneIndex === 0 ? new Date().toISOString() : undefined,
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
