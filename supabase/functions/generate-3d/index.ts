import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Replicate from "https://esm.sh/replicate@0.25.2";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const generate3DSchema = z.object({
  prompt: z.string().min(1).max(2000).optional(),
  imageUrl: z.string().url().optional(),
  inputImage: z.string().optional(),
  seed: z.number().optional(),
  jobId: z.string().uuid().optional(),
  statusCheck: z.boolean().optional(),
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
        JSON.stringify({ error: '3D generation service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse and validate request body
    const requestBody = await req.json();
    const validationResult = generate3DSchema.safeParse(requestBody);
    
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid input parameters', 
          details: validationResult.error.issues 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { prompt, imageUrl, inputImage, seed, jobId, statusCheck, predictionId, cancel } = validationResult.data;

    // Use service role key for database operations
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Handle cancellation requests
    if (cancel && predictionId) {
      console.log('Cancelling prediction:', predictionId);
      const replicate = new Replicate({ auth: REPLICATE_API_KEY });
      
      try {
        await replicate.predictions.cancel(predictionId);
        console.log('Prediction cancelled successfully');
        
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
          JSON.stringify({ success: true, message: 'Prediction cancelled' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        console.error('Error cancelling prediction:', error);
        return new Response(
          JSON.stringify({ error: error instanceof Error ? error.message : 'Cancellation failed' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
    // Handle status check requests
    if (statusCheck && predictionId) {
      console.log('Checking status for prediction:', predictionId);
      const replicate = new Replicate({ auth: REPLICATE_API_KEY });
      
      try {
        const prediction = await replicate.predictions.get(predictionId);
        console.log('Prediction status:', prediction.status);
        
        // If succeeded, finalize the job
        if (prediction.status === 'succeeded' && jobId) {
          console.log('Prediction succeeded, finalizing job:', jobId);
          
          // deno-lint-ignore no-explicit-any
          const output: any = prediction.output;
          const modelUrl = output?.mesh || (Array.isArray(output) ? output[0] : null) || (typeof output === 'string' ? output : null);
          
          if (!modelUrl) {
            throw new Error('No model URL in prediction output');
          }
          
          const urlString = typeof modelUrl === 'string' ? modelUrl : String(modelUrl);
          
          // Get user_id for storage path
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
            console.error('Job not found in database:', jobId);
            throw new Error('Job not found - cannot determine storage path');
          }
          
          const userId = jobRow.user_id || 'anonymous';
          const urlObj = new URL(urlString);
          const pathname = urlObj.pathname.toLowerCase();
          const ext = pathname.endsWith('.gltf') ? 'gltf' : pathname.endsWith('.obj') ? 'obj' : 'glb';
          const filename = `model.${ext}`;
          
          // Download and persist to storage
          console.log('Downloading model from Replicate:', urlString);
          const resp = await fetch(urlString);
          if (!resp.ok) throw new Error(`Download failed: ${resp.status}`);
          
          const contentType = resp.headers.get('content-type') || (ext === 'glb' ? 'model/gltf-binary' : 'application/octet-stream');
          const buffer = await resp.arrayBuffer();
          console.log(`Downloaded ${buffer.byteLength} bytes`);
          
          const storagePath = `${userId}/${jobId}/${filename}`;
          const { error: uploadError } = await supabase.storage
            .from('generated-models')
            .upload(storagePath, new Blob([buffer], { type: contentType }), { upsert: true });
          
          if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);
          
          const { data: signedUrlData } = await supabase.storage
            .from('generated-models')
            .createSignedUrl(storagePath, 604800); // 7 days expiry
          
          const finalUrl = signedUrlData?.signedUrl;
          if (!finalUrl) throw new Error('Failed to create signed URL');
          
          console.log('Model persisted to:', finalUrl);
          
          // Update job as completed
          await supabase
            .from('jobs')
            .update({
              status: 'completed',
              progress_percent: 100,
              progress_stage: 'completed',
              progress_message: '3D model generated successfully',
              outputs: [finalUrl],
              completed_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', jobId);
        } else if (prediction.status === 'failed' && jobId) {
          console.error('Prediction failed:', prediction.error);
          await supabase
            .from('jobs')
            .update({
              status: 'failed',
              error: prediction.error || 'Prediction failed',
              completed_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', jobId);
        }
        
        return new Response(
          JSON.stringify({ 
            status: prediction.status,
            prediction: prediction
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        console.error('Error checking prediction status:', error);
        return new Response(
          JSON.stringify({ error: error instanceof Error ? error.message : 'Status check failed' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
    // Support both inputImage and imageUrl for flexibility
    const actualImageUrl = inputImage || imageUrl;
    
    if (!prompt && !actualImageUrl) {
      return new Response(
        JSON.stringify({ error: 'Either prompt or image is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Starting async 3D generation:', { prompt, imageUrl: actualImageUrl, seed, jobId });

    const replicate = new Replicate({
      auth: REPLICATE_API_KEY,
    });

    // Generate image first if needed
    let finalImageUrl = actualImageUrl;
    
    if (prompt && !actualImageUrl) {
      console.log('Generating image from prompt...');
      
      const imageOutput = await replicate.run(
        "black-forest-labs/flux-schnell",
        {
          input: {
            prompt: prompt,
            go_fast: true,
            megapixels: "1",
            num_outputs: 1,
            aspect_ratio: "1:1",
            output_format: "webp",
            output_quality: 80,
            num_inference_steps: 4
          }
        }
      ) as string[];

      if (!imageOutput || imageOutput.length === 0) {
        throw new Error('Failed to generate image for 3D conversion');
      }

      finalImageUrl = imageOutput[0];
      console.log('Image generated:', finalImageUrl);
    }

    // Start async 3D prediction (don't wait for completion)
    console.log('Starting async 3D prediction with Hunyuan3D...');
    
    const prediction = await replicate.predictions.create({
      version: "895e514f953d39e8b5bfb859df9313481ad3fa3a8631e5c54c7e5c9c85a6aa9f",
      input: {
        image: finalImageUrl,
        seed: seed || 1234,
        steps: 30,
        num_chunks: 4000,
        max_facenum: 15000,
        guidance_scale: 7.5,
        generate_texture: true,
        octree_resolution: 196,
        remove_background: true
      }
    });
    
    console.log('Prediction started:', prediction.id, 'Status:', prediction.status);
    
    // Update job with prediction ID for polling
    if (jobId) {
      await supabase
        .from('jobs')
        .update({
          status: 'running',
          progress_percent: 10,
          progress_stage: 'running',
          progress_message: '3D model generation in progress...',
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);
    }

    // Return prediction ID immediately (client will poll for status)
    return new Response(
      JSON.stringify({ 
        predictionId: prediction.id,
        status: prediction.status,
        message: '3D generation started, polling for completion...'
      }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Error in generate-3d function:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace');
    
    // Try to extract jobId from the request to update database
    try {
      const body = await req.clone().json();
      if (body.jobId) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        await supabase
          .from('jobs')
          .update({
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', body.jobId);
      }
    } catch (dbError) {
      console.error('Failed to update job in database:', dbError);
    }
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : String(error)
      }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
