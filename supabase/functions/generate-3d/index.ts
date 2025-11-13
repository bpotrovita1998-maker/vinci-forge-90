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

    // Now convert the image to 3D using TripoSR
    console.log('Converting image to 3D model with TripoSR...');
    
    const output = await replicate.run(
      "stability-ai/triposr",
      {
        input: {
          image: finalImageUrl,
          foreground_ratio: 0.85,
          mc_resolution: 256
        }
      }
    );

    console.log('3D generation response:', output);

    // TripoSR returns a GLB file URL
    return new Response(
      JSON.stringify({ 
        output: output,
        modelUrl: output, // GLB file URL
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
