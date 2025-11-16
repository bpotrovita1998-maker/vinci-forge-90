import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const REPLICATE_API_KEY = Deno.env.get('REPLICATE_API_KEY');
    if (!REPLICATE_API_KEY) {
      console.error('REPLICATE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Upscaling service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { imageUrl, scale = 4 } = await req.json();
    
    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: 'imageUrl is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Starting upscale for image:', imageUrl, 'scale:', scale);

    // Start the upscaling prediction
    const startResponse = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${REPLICATE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: 'f121d640bd286e1fdc67f9799164c1d5be36ff74576ee11c803ae5b665dd46aa',
        input: {
          image: imageUrl,
          scale: scale,
          face_enhance: false
        }
      }),
    });

    if (!startResponse.ok) {
      const error = await startResponse.text();
      console.error('Failed to start upscaling:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to start upscaling', details: error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const prediction = await startResponse.json();
    console.log('Upscaling started, prediction ID:', prediction.id);

    // Poll for completion
    let attempts = 0;
    const maxAttempts = 60;
    let finalPrediction = prediction;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const checkResponse = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
        headers: { 'Authorization': `Bearer ${REPLICATE_API_KEY}` }
      });

      if (!checkResponse.ok) {
        console.error('Failed to check status:', await checkResponse.text());
        attempts++;
        continue;
      }

      finalPrediction = await checkResponse.json();
      console.log('Upscaling status:', finalPrediction.status);

      if (finalPrediction.status === 'succeeded') {
        console.log('Upscaling completed successfully');
        return new Response(
          JSON.stringify({ 
            success: true, 
            upscaledImageUrl: finalPrediction.output 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (finalPrediction.status === 'failed') {
        console.error('Upscaling failed:', finalPrediction.error);
        return new Response(
          JSON.stringify({ 
            error: 'Upscaling failed', 
            details: finalPrediction.error 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      attempts++;
    }

    console.error('Upscaling timeout');
    return new Response(
      JSON.stringify({ error: 'Upscaling timeout' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in upscale-image function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
