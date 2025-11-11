import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Replicate from "https://esm.sh/replicate@0.25.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const REPLICATE_API_KEY = Deno.env.get('REPLICATE_API_KEY');
    if (!REPLICATE_API_KEY) {
      throw new Error('REPLICATE_API_KEY is not set');
    }

    console.log("Initializing Replicate client for 3D generation");
    const replicate = new Replicate({
      auth: REPLICATE_API_KEY,
    });

    const body = await req.json();
    console.log("Request body:", JSON.stringify(body, null, 2));

    // Check if this is a status check request
    if (body.predictionId) {
      console.log("Checking status for 3D prediction:", body.predictionId);
      const prediction = await replicate.predictions.get(body.predictionId);
      console.log("Prediction status:", prediction.status);
      
      return new Response(JSON.stringify(prediction), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate required fields for generation
    if (!body.inputImage) {
      return new Response(
        JSON.stringify({ 
          error: "Missing required field: inputImage is required for 3D generation" 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    console.log("Generating 3D model from image");
    
    // Use TripoSR for image-to-3D conversion
    // This model converts a single image into a 3D mesh
    const output = await replicate.run(
      "stability-ai/triposr:b3c95b3be5f7188bdb4ac399f3dea9c8661cc62e2c0d42e3f3710a9f4be4d2e4",
      {
        input: {
          image: body.inputImage,
          foreground_ratio: body.foregroundRatio || 0.85,
          mc_resolution: body.mcResolution || 256,
        }
      }
    );

    console.log("3D generation response:", output);
    
    return new Response(JSON.stringify({ output }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error("Error in generate-3d function:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to generate 3D model";
    return new Response(JSON.stringify({ 
      error: errorMessage
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
