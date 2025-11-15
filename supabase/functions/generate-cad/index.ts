import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Replicate from "https://esm.sh/replicate@0.25.2";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const REPLICATE_API_KEY = Deno.env.get('REPLICATE_API_KEY');
    if (!REPLICATE_API_KEY) {
      console.error('REPLICATE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'CAD generation service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client for database updates
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const replicate = new Replicate({
      auth: REPLICATE_API_KEY,
    });

    const body = await req.json();
    const { prompt, inputImage, seed, jobId, predictionId, cancel } = body;
    
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

    // If a predictionId is provided, return its current status (async polling pattern)
    if (predictionId) {
      try {
        // @ts-ignore - types from Replicate
        const prediction = await replicate.predictions.get(predictionId);
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

        // If the prediction finished successfully and we have a jobId, persist file and update DB
        if ((prediction as any).status === 'succeeded' && jobId) {
          try {
            // Persist to storage so URL never expires
            let finalUrl = modelUrl || '';
            try {
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

              if (modelUrl) {
                const urlObj = new URL(modelUrl);
                const pathname = urlObj.pathname.toLowerCase();
                const ext = pathname.endsWith('.gltf') ? 'gltf' : pathname.endsWith('.obj') ? 'obj' : pathname.endsWith('.zip') ? 'zip' : 'glb';
                const filename = `model.${ext}`;

                const resp = await fetch(modelUrl);
                if (!resp.ok) throw new Error(`Failed to download model for persistence: ${resp.status}`);
                const contentType = resp.headers.get('content-type') || (ext === 'glb' ? 'model/gltf-binary' : 'application/octet-stream');
                const buffer = await resp.arrayBuffer();

                const storagePath = `${userId}/${jobId}/${filename}`;
                const { error: uploadError } = await supabase.storage
                  .from('generated-models')
                  .upload(storagePath, new Blob([buffer], { type: contentType }), { upsert: true });
                if (uploadError) {
                  console.error('Failed to upload CAD model to storage:', uploadError);
                } else {
                  const { data: pub } = supabase.storage.from('generated-models').getPublicUrl(storagePath);
                  if (pub?.publicUrl) finalUrl = pub.publicUrl;
                }
              }
            } catch (persistErr) {
              console.error('Non-fatal: persisting CAD model to storage failed, falling back to original URL', persistErr);
            }

            const { data: updatedJob, error: updateError } = await supabase
              .from('jobs')
              .update({
                status: 'completed',
                progress_stage: 'completed',
                progress_percent: 100,
                progress_message: 'CAD model generated successfully',
                outputs: finalUrl ? [finalUrl] : [],
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
            else console.log('Job updated from status check:', updatedJob);
          } catch (dbErr) {
            console.error('DB update error during status check:', dbErr);
          }
        }

        return new Response(
          JSON.stringify({ status: (prediction as any).status, output: modelUrl, format }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
      const prediction = await (replicate as any).predictions.create({
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
        }
      });

      console.log('Prediction created:', (prediction as any).id, 'status:', (prediction as any).status);

      // Update DB to reflect long-running stage
      if (jobId) {
        try {
          await supabase
            .from('jobs')
            .update({
              status: 'upscaling',
              progress_stage: 'upscaling',
              progress_percent: 0,
              progress_message: 'Generating CAD-quality mesh...'
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
