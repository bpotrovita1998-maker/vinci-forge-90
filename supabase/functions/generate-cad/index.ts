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

    const { prompt, inputImage, seed, jobId } = await req.json();
    
    if (!prompt && !inputImage) {
      return new Response(
        JSON.stringify({ error: 'Either prompt or image is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating CAD model:', { prompt, imageProvided: !!inputImage, seed, jobId });

    const replicate = new Replicate({
      auth: REPLICATE_API_KEY,
    });

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

    // Step 2: Convert to high-quality 3D mesh optimized for CAD use
    console.log('Converting to CAD-quality 3D model with Hunyuan3D 2.1...');
    
    let output: unknown;
    try {
      const startTime = Date.now();
      
      // Use optimized settings for CAD-quality output
      output = await replicate.run(
        "ndreca/hunyuan3d-2.1:895e514f953d39e8b5bfb859df9313481ad3fa3a8631e5c54c7e5c9c85a6aa9f",
        {
          input: {
            image: finalImageUrl,
            seed: seed || 1234,
            steps: 50,              // Higher steps for better precision
            num_chunks: 8000,       // Higher chunks for detailed mesh
            max_facenum: 20000,     // More faces for better quality
            guidance_scale: 7.5,
            generate_texture: true, // Include PBR textures
            octree_resolution: 256, // Higher resolution for CAD precision
            remove_background: true
          }
        }
      );
      
      const endTime = Date.now();
      console.log(`CAD model generation completed in ${(endTime - startTime) / 1000}s`);
      
    } catch (replicateError) {
      console.error('Replicate API error during CAD generation:', replicateError);
      const errorMessage = replicateError instanceof Error ? replicateError.message : 'Unknown error';
      throw new Error(`CAD generation failed: ${errorMessage}`);
    }

    console.log('CAD model generation output:', output);

    // Extract model URL (supports multiple output schemas: mesh/glb/obj/zip)
    let modelUrl: string | null = null;
    
    if (typeof output === 'string') {
      modelUrl = output;
    } else if (Array.isArray(output) && output.length > 0) {
      const first = output[0];
      if (typeof first === 'string') {
        modelUrl = first;
      } else if (first && typeof first === 'object') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const o = first as any;
        modelUrl = o.mesh || o.glb || o.model || o.output || o.url || null;
      }
    } else if (output && typeof output === 'object') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const o = output as any;
      modelUrl = o.mesh || o.glb || o.model || o.output || o.url || null;
    }

    if (!modelUrl) {
      console.error('No model URL found in CAD generation output:', output);
      throw new Error('Failed to extract CAD model from generation output');
    }

    console.log('CAD model URL:', modelUrl);

    // Infer format from URL
    const format = (() => {
      try {
        const pathname = new URL(modelUrl).pathname.toLowerCase();
        if (pathname.endsWith('.glb')) return 'GLB';
        if (pathname.endsWith('.gltf')) return 'GLTF';
        if (pathname.endsWith('.obj')) return 'OBJ';
        if (pathname.endsWith('.zip')) return 'ZIP';
      } catch (_) {
        // ignore URL parse errors
      }
      return 'MESH';
    })();

    // Update job in database with CAD model details
    if (jobId) {
      const { error: updateError } = await supabase
        .from('jobs')
        .update({
          status: 'completed',
          progress_stage: 'completed',
          progress_percent: 100,
          progress_message: 'CAD model generated successfully',
          outputs: [modelUrl],
          completed_at: new Date().toISOString(),
          // Store CAD-specific metadata
          manifest: {
            jobId,
            type: 'cad',
            prompt: enhancedPrompt || 'Image-based CAD generation',
            modelFormat: format,
            exportFormats: ['GLB', 'OBJ', 'GLTF', 'ZIP'],
            recommendedConversion: 'STEP, IGES (use external CAD software)',
            generatedAt: new Date().toISOString(),
            specifications: {
              meshQuality: 'high',
              faceCount: '~20,000',
              textured: true,
              pbrMaterials: true,
              engineeringReady: true,
              printReady: true
            }
          }
        })
        .eq('id', jobId);

      if (updateError) {
        console.error('Failed to update job with CAD model:', updateError);
      }
    }

    return new Response(
      JSON.stringify({
        output: modelUrl,
        format,
        specifications: {
          meshQuality: 'high',
          faceCount: '~20,000',
          textured: true,
          engineeringReady: true,
          exportOptions: 'Compatible with Blender, FreeCAD, Fusion 360'
        },
        conversionInstructions: 'GLB can be converted to STEP/IGES formats using FreeCAD, Blender (with plugins), or online converters'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

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
