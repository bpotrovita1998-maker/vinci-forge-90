import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Replicate from "https://esm.sh/replicate@0.25.2";

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

    const { prompt, imageUrl, inputImage, seed } = await req.json();
    
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

    // Helper to try multiple input schemas against a specific model:version
    const tryModel = async (modelVersion: string) => {
      const variants = [
        { front_image: finalImageUrl },
        { image: finalImageUrl },
        { input_image: finalImageUrl },
        { images: [finalImageUrl] },
        { image_path: finalImageUrl }
      ];
      let lastErr: unknown = null;
      for (const input of variants) {
        try {
          console.log(`Attempting ${modelVersion} with input keys: ${Object.keys(input).join(',')}`);
          // deno-lint-ignore no-explicit-any
          const out: any = await replicate.run(modelVersion, { input });
          return out;
        } catch (e) {
          lastErr = e;
          console.warn(`Failed ${modelVersion} with ${Object.keys(input).join(',')}:`, e);
        }
      }
      throw lastErr ?? new Error(`All input variants failed for ${modelVersion}`);
    };

    let output: unknown;
    try {
      // Preferred official model with pinned version
      output = await tryModel("tencent/hunyuan3d-2mv:71798fbc3c9f7b7097e3bb85496e5a797d8b8f616b550692e7c3e176a8e9e5db");
    } catch (primaryErr) {
      console.warn('Primary model failed, falling back to ImageDream...', primaryErr);
      try {
        // Fallback 1: ImageDream (text/image to 3D)
        output = await tryModel("adirik/imagedream");
      } catch (fallbackErr) {
        console.error('All 3D models failed:', fallbackErr);
        return new Response(
          JSON.stringify({ error: '3D generation failed', details: (fallbackErr as Error)?.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log('3D generation response:', output);

    // Resolve a usable model URL (GLB) from various possible shapes
    // deno-lint-ignore no-explicit-any
    const o: any = output;
    const modelUrl = Array.isArray(o)
      ? o[0]
      : (typeof o === 'string')
        ? o
        : (o?.glb || o?.mesh || o?.model || o?.file || (Array.isArray(o?.output) ? o.output[0] : undefined) || o?.assets?.glb || o?.assets?.model || o?.assets?.file);

    if (!modelUrl) {
      return new Response(
        JSON.stringify({ error: '3D model URL not found in response', raw: output }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        output,
        modelUrl,
        format: 'glb'
      }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Error in generate-3d function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
