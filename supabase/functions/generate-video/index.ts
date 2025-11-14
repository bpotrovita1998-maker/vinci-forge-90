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
    
    // Build input object, only include image if it's a valid HTTP(S) URL
    const input: any = {
      prompt: body.prompt,
      duration: body.duration && body.duration > 5 ? 8 : 5, // Only 5 or 8 allowed
    };

    // Only add optional parameters if they have valid values
    if (body.negativePrompt) {
      input.negative_prompt = body.negativePrompt;
    }
    if (body.seed) {
      input.seed = body.seed;
    }
    
    // Only include inputImage if it's a valid HTTP/HTTPS URL (not a data URL)
    if (body.inputImage && (body.inputImage.startsWith('http://') || body.inputImage.startsWith('https://'))) {
      input.image = body.inputImage;
    }

    console.log("Video generation input:", JSON.stringify(input, null, 2));
    
    // Use PixVerse v5 for video generation
    const output = await replicate.run(
      "pixverse/pixverse-v5",
      { input }
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
    let statusCode = 500;
    if (errorMessage.includes('402') || errorMessage.includes('Insufficient credit')) {
      userFriendlyMessage = "Insufficient Replicate credits. Please add credits at replicate.com/account/billing";
      statusCode = 402;
    } else if (errorMessage.includes('429') || errorMessage.includes('throttled')) {
      userFriendlyMessage = "Rate limit exceeded. Please add a payment method at replicate.com/account/billing to increase limits";
      statusCode = 429;
    }
    
    return new Response(JSON.stringify({ 
      error: userFriendlyMessage
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: statusCode,
    });
  }
});
