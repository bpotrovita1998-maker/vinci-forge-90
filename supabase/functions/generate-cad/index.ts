import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Replicate from "https://esm.sh/replicate@0.25.2";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Dangerous patterns that could indicate injection attacks
const DANGEROUS_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|DECLARE|CAST)\b)/gi,
  /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=\s*["'][^"']*["']/gi,
];

// Sanitize input to prevent injection attacks
function sanitizePrompt(input: string): string {
  if (!input || typeof input !== 'string') return '';
  
  let sanitized = input.replace(/\0/g, '').trim();
  
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(sanitized)) {
      throw new Error('Prompt contains potentially harmful code. Please use descriptive text only.');
    }
  }
  
  const specialCharCount = (sanitized.match(/[^a-zA-Z0-9\s.,!?'-]/g) || []).length;
  const ratio = specialCharCount / sanitized.length;
  if (ratio > 0.3) {
    throw new Error('Prompt contains too many special characters');
  }
  
  return sanitized;
}

// Input validation schema
const generateCADSchema = z.object({
  prompt: z.string().min(1).max(2000).transform(sanitizePrompt).optional(),
  inputImage: z.string().optional(),
  seed: z.number().optional(),
  jobId: z.string().uuid().optional(),
  predictionId: z.string().optional(),
  cancel: z.boolean().optional(),
});

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

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
      console.error('REPLICATE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'CAD generation service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse and validate request body
    const requestBody = await req.json();
    const validationResult = generateCADSchema.safeParse(requestBody);
    
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid input parameters', 
          details: validationResult.error.issues 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = validationResult.data;
    const { prompt, inputImage, seed, jobId, predictionId, cancel } = body;

    // Use service role key for database operations
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const replicate = new Replicate({
      auth: REPLICATE_API_KEY,
    });

    // Helper function to retry API calls with exponential backoff
    async function retryWithBackoff<T>(
      fn: () => Promise<T>,
      maxRetries = 3,
      initialDelay = 1000
    ): Promise<T> {
      let lastError: Error | null = null;
      
      for (let i = 0; i < maxRetries; i++) {
        try {
          return await fn();
        } catch (error) {
          lastError = error as Error;
          const errorMessage = error instanceof Error ? error.message : String(error);
          const isTimeout = errorMessage.includes('504') || errorMessage.toLowerCase().includes('timeout');
          
          if (i < maxRetries - 1 && isTimeout) {
            const delay = initialDelay * Math.pow(2, i);
            console.log(`Attempt ${i + 1} failed with timeout, retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          } else {
            throw error;
          }
        }
      }
      
      throw lastError;
    }
    
    // Handle cancellation requests
    if (cancel && predictionId) {
      console.log('Cancelling CAD prediction:', predictionId);
      
      try {
        await replicate.predictions.cancel(predictionId);
        console.log('CAD prediction cancelled successfully');
        
        // Update job status
        if (jobId) {
          await supabase
            .from('jobs')
            .update({
              status: 'failed',
              error: 'Cancelled by user',
              completed_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', jobId);
        }
        
        return new Response(
          JSON.stringify({ success: true, message: 'CAD prediction cancelled' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        console.error('Error cancelling CAD prediction:', error);
        return new Response(
          JSON.stringify({ error: error instanceof Error ? error.message : 'Cancellation failed' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
    if (!predictionId && !prompt && !inputImage) {
      return new Response(
        JSON.stringify({ error: 'Either prompt or image is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating CAD model:', { prompt, imageProvided: !!inputImage, seed, jobId, predictionId });
    
    // Get webhook URL for this deployment
    const webhookUrl = `${supabaseUrl}/functions/v1/replicate-webhook`;

    // If a predictionId is provided, return its current status (async polling pattern)
    if (predictionId) {
      try {
        console.log('Checking CAD prediction status:', predictionId);
        
        // First check if job is already completed in DB (avoids stale Replicate data)
        if (jobId) {
          const { data: jobCheck } = await supabase
            .from('jobs')
            .select('status, outputs')
            .eq('id', jobId)
            .maybeSingle();
          
          if (jobCheck?.status === 'completed' && jobCheck.outputs) {
            console.log('Job already completed in DB, returning cached result');
            const outputs = jobCheck.outputs as string[];
            return new Response(
              JSON.stringify({ 
                status: 'succeeded', 
                output: outputs[0] || null,
                format: 'GLB',
                cached: true,
                timestamp: Date.now()
              }),
              { 
                headers: { 
                  ...corsHeaders, 
                  'Content-Type': 'application/json',
                  'Cache-Control': 'no-cache, no-store, must-revalidate'
                } 
              }
            );
          }
        }
        
        // Use retry logic to handle network errors when checking prediction status
        // @ts-ignore - types from Replicate
        const prediction = await retryWithBackoff(
          () => replicate.predictions.get(predictionId),
          3,
          2000 // 2s, 4s, 8s delays
        );
        
        // Log the full prediction object to debug stale data
        console.log('Full prediction response:', JSON.stringify({
          id: (prediction as any).id,
          status: (prediction as any).status,
          output: (prediction as any).output,
          error: (prediction as any).error,
          logs: (prediction as any).logs?.slice(-200) // Last 200 chars of logs
        }));
        
        console.log('Prediction status:', (prediction as any).status);
        
        // Update progress based on prediction status
        if (jobId) {
          const predStatus = (prediction as any).status;
          let updateData: any = null;
          
          if (predStatus === 'starting') {
            updateData = {
              status: 'running',
              progress_stage: 'running',
              progress_percent: 10,
              progress_message: 'Starting CAD generation pipeline...'
            };
          } else if (predStatus === 'processing') {
            updateData = {
              status: 'running',
              progress_stage: 'running',
              progress_percent: 50,
              progress_message: 'AI model processing 3D geometry...'
            };
          }
          
          if (updateData) {
            try {
              await supabase
                .from('jobs')
                .update(updateData)
                .eq('id', jobId);
            } catch (dbErr) {
              console.error('Non-fatal: failed to update processing status:', dbErr);
            }
          }
        }
        
        // Extract potential output URL
        let modelUrl: string | null = null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pOut: any = (prediction as any).output;
        if (typeof pOut === 'string') {
          modelUrl = pOut;
        } else if (Array.isArray(pOut) && pOut.length > 0) {
          const first = pOut[0];
          if (typeof first === 'string') modelUrl = first; else if (first && typeof first === 'object') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const o: any = first;
            modelUrl = o.mesh || o.glb || o.model || o.output || o.url || null;
          }
        } else if (pOut && typeof pOut === 'object') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const o: any = pOut;
          modelUrl = o.mesh || o.glb || o.model || o.output || o.url || null;
        }

        let format = 'MESH';
        if (modelUrl) {
          try {
            const pathname = new URL(modelUrl).pathname.toLowerCase();
            if (pathname.endsWith('.glb')) format = 'GLB';
            else if (pathname.endsWith('.gltf')) format = 'GLTF';
            else if (pathname.endsWith('.obj')) format = 'OBJ';
            else if (pathname.endsWith('.zip')) format = 'ZIP';
          } catch (_) {}
        }

        // Track the final URL (will be updated to Supabase storage URL if archival succeeds)
        let finalUrl: string | null = null;
        let archivalError: Error | null = null;

        // If the prediction finished successfully and we have a jobId, persist file and update DB
        if ((prediction as any).status === 'succeeded' && jobId) {
          try {
            // Persist to storage so URL never expires
            const { data: jobRow, error: jobError } = await supabase
              .from('jobs')
              .select('user_id')
              .eq('id', jobId)
              .maybeSingle();
            
            if (jobError) {
              console.error('Failed to fetch job for user_id:', jobError);
              throw new Error(`Database error fetching job: ${jobError.message}`);
            }
            
            if (!jobRow) {
              console.error('CAD job not found in database:', jobId);
              throw new Error('Job not found - cannot determine storage path');
            }
            
            const userId = jobRow.user_id || 'anonymous';

            if (!modelUrl) {
              console.error('Prediction succeeded but no model URL found in output');
              throw new Error('No model URL found in prediction output');
            }
            
            console.log('Downloading and archiving CAD model to permanent storage...');
            const urlObj = new URL(modelUrl);
            const pathname = urlObj.pathname.toLowerCase();
            const ext = pathname.endsWith('.gltf') ? 'gltf' : pathname.endsWith('.obj') ? 'obj' : pathname.endsWith('.zip') ? 'zip' : 'glb';
            const filename = `model.${ext}`;

            // Download the model from Replicate
            const resp = await fetch(modelUrl);
            if (!resp.ok) {
              console.error(`Failed to download model: ${resp.status} ${resp.statusText}`);
              throw new Error(`Failed to download model for archiving: ${resp.status}`);
            }
            const contentType = resp.headers.get('content-type') || (ext === 'glb' ? 'model/gltf-binary' : 'application/octet-stream');
            const buffer = await resp.arrayBuffer();
            console.log(`Downloaded ${buffer.byteLength} bytes`);

            // Upload to permanent storage
            const storagePath = `${userId}/${jobId}/${filename}`;
            const { error: uploadError } = await supabase.storage
              .from('generated-models')
              .upload(storagePath, new Blob([buffer], { type: contentType }), { upsert: true });
            
            if (uploadError) {
              console.error('Failed to upload CAD model to storage:', uploadError);
              throw new Error(`Storage upload failed: ${uploadError.message}`);
            }
            
            // Get permanent public URL (bucket is now public)
            const { data: publicUrlData } = supabase.storage
              .from('generated-models')
              .getPublicUrl(storagePath);
            
            if (!publicUrlData?.publicUrl) {
              console.error('Failed to get public URL for stored model');
              throw new Error('Failed to generate public URL for archived model');
            }
            
            finalUrl = publicUrlData.publicUrl;
            console.log('Model archived successfully with permanent URL:', finalUrl);
            
            // Record file in user_files table for tracking
            const { error: fileRecordError } = await supabase
              .from('user_files')
              .insert({
                user_id: userId,
                job_id: jobId,
                file_url: finalUrl,
                file_type: contentType,
                file_size_bytes: buffer.byteLength,
                expires_at: null // Never expires
              });
            
            if (fileRecordError) {
              console.warn('Failed to record file in user_files:', fileRecordError);
            }
          } catch (persistErr) {
            console.error('CRITICAL: Failed to archive CAD model to permanent storage:', persistErr);
            archivalError = persistErr instanceof Error ? persistErr : new Error(String(persistErr));
            // Mark job as failed
            await supabase
              .from('jobs')
              .update({
                status: 'failed',
                error: `Model archiving failed: ${archivalError.message}`,
                progress_stage: 'failed',
                progress_percent: 0,
                progress_message: 'Failed to archive model to permanent storage',
              })
              .eq('id', jobId);
          }
        }

        // If archival failed, return error
        if (archivalError) {
          return new Response(
            JSON.stringify({ 
              error: `Model archiving failed: ${archivalError.message}. Temporary URLs are not supported.`,
              status: 'failed'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
          );
        }

        // Only check for finalUrl if the prediction is completed
        if ((prediction as any).status === 'succeeded' && !finalUrl && jobId) {
          console.error('No finalUrl after successful generation - archival may have failed silently');
          return new Response(
            JSON.stringify({ 
              error: 'Model generation succeeded but archival failed',
              status: 'failed'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
          );
        }

        // Update job as completed with permanent URL
        if (finalUrl && jobId) {
          // First update to show mesh generation is happening
          try {
            await supabase
              .from('jobs')
              .update({
                status: 'upscaling',
                progress_stage: 'upscaling',
                progress_percent: 90,
                progress_message: 'Generating CAD-quality mesh...'
              })
              .eq('id', jobId);
          } catch (dbErr) {
            console.error('Non-fatal: failed to update mesh generation status:', dbErr);
          }
          
          // Then update to completed
          const { data: updatedJob, error: updateError } = await supabase
            .from('jobs')
            .update({
              status: 'completed',
              progress_stage: 'completed',
              progress_percent: 100,
              progress_message: 'CAD model generated successfully',
              outputs: [finalUrl],
              completed_at: new Date().toISOString(),
              manifest: {
                jobId,
                type: 'cad',
                prompt: (prompt || 'Image-based CAD generation'),
                modelFormat: format,
                exportFormats: ['GLB', 'OBJ', 'GLTF', 'ZIP'],
                recommendedConversion: 'STEP, IGES (use external CAD software)',
                generatedAt: new Date().toISOString()
              }
            })
            .eq('id', jobId)
            .select()
            .maybeSingle();

          if (updateError) console.error('Failed to update job from status check:', updateError);
          else console.log('Job completed with permanent URL:', updatedJob);
        }

        // Return successful response with permanent URL
        const response = {
          status: (prediction as any).status,
          output: finalUrl || modelUrl,
          format,
          timestamp: Date.now(),
          predictionId
        };
        
        console.log('Returning response with finalUrl:', response);
        
        return new Response(
          JSON.stringify(response),
          { 
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache, no-store, must-revalidate'
            } 
          }
        );
      } catch (err) {
        console.error('Prediction status check error:', err);
        return new Response(
          JSON.stringify({ error: err instanceof Error ? err.message : 'Status check failed' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Enhance prompt with CAD-specific details for engineering precision
    const enhancedPrompt = prompt ? 
      `${prompt}. Engineering CAD model with precise geometry, clean edges, symmetrical features, technical specifications, professional industrial design, solid construction, suitable for 3D printing and manufacturing, clear topology, optimized mesh` : 
      prompt;

    // Step 1: Generate reference image if not provided
    let finalImageUrl = inputImage;
    
    if (enhancedPrompt && !inputImage) {
      console.log('Generating reference image with CAD-optimized prompt...');
      
      const imageOutput = await replicate.run(
        "black-forest-labs/flux-schnell",
        {
          input: {
            prompt: `${enhancedPrompt}. Clean white background, isometric view, technical drawing style, high precision, centered, professional product photography, engineering blueprint aesthetic`,
            go_fast: true,
            megapixels: "1",
            num_outputs: 1,
            aspect_ratio: "1:1",
            output_format: "webp",
            output_quality: 90, // Higher quality for CAD precision
            num_inference_steps: 4
          }
        }
      ) as string[];

      if (!imageOutput || imageOutput.length === 0) {
        throw new Error('Failed to generate reference image for CAD conversion');
      }

      finalImageUrl = imageOutput[0];
      console.log('Reference image generated for CAD conversion:', finalImageUrl);
    }

    // Step 2: Start async prediction and return predictionId for client-side polling
    console.log('Creating CAD prediction with Hunyuan3D 2.1...');

    try {
      // Using predictions API because this model can take several minutes
      // @ts-ignore - replicate types don't always include predictions
      let prediction;
      try {
        prediction = await retryWithBackoff(async () => {
          return await (replicate as any).predictions.create({
            version: "ndreca/hunyuan3d-2.1:895e514f953d39e8b5bfb859df9313481ad3fa3a8631e5c54c7e5c9c85a6aa9f",
            input: {
              image: finalImageUrl,
              seed: seed || 1234,
              steps: 50,
              num_chunks: 8000,
              max_facenum: 20000,
              guidance_scale: 7.5,
              generate_texture: true,
              octree_resolution: 256,
              remove_background: true
            },
            webhook: webhookUrl,
            webhook_events_filter: ["completed"]
          });
        }, 3, 2000); // 3 retries with 2 second initial delay
      } catch (retryError) {
        const errorMessage = retryError instanceof Error ? retryError.message : String(retryError);
        const isTimeout = errorMessage.includes('504') || errorMessage.toLowerCase().includes('timeout');
        if (isTimeout) {
          throw new Error('CAD generation service is currently experiencing high load. Please try again in a few minutes.');
        }
        throw retryError;
      }

      console.log('Prediction created:', (prediction as any).id, 'status:', (prediction as any).status);

      // Update DB to reflect prediction submitted and store predictionId
      if (jobId) {
        try {
          await supabase
            .from('jobs')
            .update({
              status: 'queued',
              progress_stage: 'queued',
              progress_percent: 5,
              progress_message: 'CAD prediction queued, waiting to start...',
              manifest: {
                prompt: prompt || 'Image-based CAD generation',
                predictionId: (prediction as any).id,
                webhookConfigured: true
              }
            })
            .eq('id', jobId);
        } catch (dbStageErr) {
          console.error('Non-fatal: failed to update job stage:', dbStageErr);
        }
      }

      // Return prediction id so the client can poll this function
      return new Response(
        JSON.stringify({ predictionId: (prediction as any).id, status: (prediction as any).status || 'starting' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (replicateError) {
      console.error('Replicate API error during CAD prediction create:', replicateError);
      const errorMessage = replicateError instanceof Error ? replicateError.message : 'Unknown error';
      return new Response(
        JSON.stringify({ error: `CAD prediction failed: ${errorMessage}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Error in generate-cad function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'CAD generation failed',
        details: 'Failed to generate CAD model. Please try again or adjust your prompt for better CAD-suitable descriptions.'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
