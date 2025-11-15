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
        JSON.stringify({ error: '3D generation service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client for database updates
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { prompt, imageUrl, inputImage, seed, jobId } = await req.json();
    
    // Support both inputImage and imageUrl for flexibility
    const actualImageUrl = inputImage || imageUrl;
    
    if (!prompt && !actualImageUrl) {
      return new Response(
        JSON.stringify({ error: 'Either prompt or image is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating 3D model with TripoSR:', { prompt, imageUrl: actualImageUrl, seed });

    const replicate = new Replicate({
      auth: REPLICATE_API_KEY,
    });

    // Use TripoSR for text/image-to-3D generation
    // If prompt is provided, we'll use stable-diffusion to generate an image first, then convert to 3D
    let finalImageUrl = actualImageUrl;
    
    if (prompt && !actualImageUrl) {
      console.log('First generating image from prompt for 3D conversion...');
      
      // Generate image using flux-schnell
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
      console.log('Generated image for 3D conversion:', finalImageUrl);
    }

    // Now convert the image to 3D with robust fallbacks
    console.log('Converting image to 3D model...');

    // Use Hunyuan3D 2.1 with optimized settings for faster generation
    console.log('Generating 3D model with Hunyuan3D 2.1 (PBR-enabled, optimized)...');
    
    let output: unknown;
    try {
      // Optimized settings: faster generation while maintaining PBR quality
      console.log('Starting Replicate API call with optimized parameters...');
      const startTime = Date.now();
      
      output = await replicate.run(
        "ndreca/hunyuan3d-2.1:895e514f953d39e8b5bfb859df9313481ad3fa3a8631e5c54c7e5c9c85a6aa9f",
        {
          input: {
            image: finalImageUrl,
            seed: seed || 1234,
            steps: 30,              // Reduced from 50 for faster generation
            num_chunks: 4000,       // Reduced from 8000 for speed
            max_facenum: 15000,     // Reduced from 20000 for speed
            guidance_scale: 7.5,
            generate_texture: true, // Keep PBR textures enabled
            octree_resolution: 196, // Valid values: 196, 256, 384, 512
            remove_background: true
          }
        }
      );
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`3D generation completed in ${duration}s`);
    } catch (primaryErr) {
      console.error('Hunyuan3D 2.1 failed:', primaryErr);
      console.error('Error details:', JSON.stringify(primaryErr, null, 2));
      
      // Update job as failed if jobId provided
      if (jobId) {
        await supabase
          .from('jobs')
          .update({
            status: 'failed',
            error: (primaryErr as Error)?.message || 'Unknown error during 3D generation',
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', jobId);
      }
      
      return new Response(
        JSON.stringify({ 
          error: '3D generation failed', 
          details: (primaryErr as Error)?.message || 'Unknown error during 3D generation'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log the full output structure for debugging
    console.log('3D generation raw output type:', typeof output);
    console.log('3D generation raw output:', JSON.stringify(output, null, 2));
    
    // Resolve mesh URL from Hunyuan3D 2.1 output
    // According to schema: output should be { mesh: "uri" }
    // deno-lint-ignore no-explicit-any
    const o: any = output;
    
    console.log('Checking output properties:', {
      hasMesh: 'mesh' in o,
      isArray: Array.isArray(o),
      isString: typeof o === 'string',
      keys: Object.keys(o || {})
    });
    
    const modelUrl = o?.mesh || (Array.isArray(o) ? o[0] : null) || (typeof o === 'string' ? o : null);
    
    console.log('Extracted model URL:', modelUrl);
    console.log('Model URL type:', typeof modelUrl);

    if (!modelUrl) {
      console.error('FAILED to extract model URL');
      console.error('Output type:', typeof output);
      console.error('Output is array:', Array.isArray(output));
      console.error('Full output structure:', JSON.stringify(output, null, 2));
      
      // Update job as failed if jobId provided
      if (jobId) {
        await supabase
          .from('jobs')
          .update({
            status: 'failed',
            error: '3D model URL not found in response',
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', jobId);
      }
      
      return new Response(
        JSON.stringify({ error: '3D model URL not found in response', raw: output }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update job as completed in database
    if (jobId) {
      console.log(`Updating job ${jobId} as completed with model URL: ${modelUrl}`);
      console.log(`Model URL type: ${typeof modelUrl}`);
      
      // Ensure modelUrl is a string
      const urlString = typeof modelUrl === 'string' ? modelUrl : String(modelUrl);

      // Try to persist the model file to permanent storage so links never expire
      let finalUrl = urlString;
      try {
        // Get the user id for folder scoping
        const { data: jobRow } = await supabase
          .from('jobs')
          .select('user_id')
          .eq('id', jobId)
          .single();
        const userId = jobRow?.user_id || 'anonymous';

        const urlObj = new URL(urlString);
        const pathname = urlObj.pathname.toLowerCase();
        const ext = pathname.endsWith('.gltf') ? 'gltf' : pathname.endsWith('.obj') ? 'obj' : 'glb';
        const filename = `model.${ext}`;

        const resp = await fetch(urlString);
        if (!resp.ok) throw new Error(`Failed to download model for persistence: ${resp.status}`);
        const contentType = resp.headers.get('content-type') || (ext === 'glb' ? 'model/gltf-binary' : 'application/octet-stream');
        const buffer = await resp.arrayBuffer();

        const storagePath = `${userId}/${jobId}/${filename}`;
        const { error: uploadError } = await supabase.storage
          .from('generated-models')
          .upload(storagePath, new Blob([buffer], { type: contentType }), { upsert: true });

        if (uploadError) {
          console.error('Failed to upload model to storage:', uploadError);
        } else {
          const { data: pub } = supabase.storage.from('generated-models').getPublicUrl(storagePath);
          if (pub?.publicUrl) finalUrl = pub.publicUrl;
        }
      } catch (persistErr) {
        console.error('Non-fatal: persisting model to storage failed, falling back to original URL', persistErr);
      }
      
      const { error: updateError } = await supabase
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
      
      if (updateError) {
        console.error('Failed to update job in database:', updateError);
      } else {
        console.log(`Successfully updated job ${jobId} in database`);
      }
    }

    return new Response(
      JSON.stringify({ 
        output,
        modelUrl: typeof modelUrl === 'string' ? modelUrl : String(modelUrl),
        format: 'glb'
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
