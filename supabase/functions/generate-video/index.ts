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

    console.log("Initializing Replicate client");
    const replicate = new Replicate({
      auth: REPLICATE_API_KEY,
    });

    const body = await req.json();
    console.log("Request body:", JSON.stringify(body, null, 2));

    // Check if this is a status check request
    if (body.predictionId) {
      console.log("Checking status for prediction:", body.predictionId);
      const prediction = await replicate.predictions.get(body.predictionId);
      console.log("Prediction status:", prediction.status);
      
      return new Response(JSON.stringify(prediction), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate required fields for generation
    if (!body.prompt) {
      return new Response(
        JSON.stringify({ 
          error: "Missing required field: prompt is required" 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    console.log("Generating video with prompt:", body.prompt);
    
    // Use PixVerse v5 for video generation
    // Free tier available on Replicate
    const output = await replicate.run(
      "pixverse/pixverse-v5",
      {
        input: {
          prompt: body.prompt,
          negative_prompt: body.negativePrompt,
          seed: body.seed,
          quality: body.quality || "540p", // 360p, 540p, 720p, 1080p
          duration: body.duration || 5, // 5 or 8 seconds (8 requires 1080p)
          aspect_ratio: body.aspectRatio || "16:9",
          image: body.inputImage, // Optional: first frame image
        }
      }
    );

    console.log("Video generation response:", output);
    
    return new Response(JSON.stringify({ output }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error("Error in generate-video function:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to generate video";
    
    // Check for specific Replicate errors
    let userFriendlyMessage = errorMessage;
    if (errorMessage.includes('402') || errorMessage.includes('Insufficient credit')) {
      userFriendlyMessage = "Insufficient Replicate credits. Please add credits at replicate.com/account/billing";
    } else if (errorMessage.includes('429') || errorMessage.includes('throttled')) {
      userFriendlyMessage = "Rate limit exceeded. Please add a payment method at replicate.com/account/billing to increase limits";
    }
    
    return new Response(JSON.stringify({ 
      error: userFriendlyMessage
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
