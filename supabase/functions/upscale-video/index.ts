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
        JSON.stringify({ error: 'Video upscaling service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { videoUrl, targetFps = 60, upscaleTo4K = true } = await req.json();
    
    if (!videoUrl) {
      return new Response(
        JSON.stringify({ error: 'videoUrl is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Starting video upscale:', { videoUrl, targetFps, upscaleTo4K });

    // Use Replicate's Real-ESRGAN video upscaling model
    const startResponse = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${REPLICATE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: '3e56ce4b57863bd03048b42bc09bdd4db20d427cca5fde9d8ae4dc60e1bb4775',
        input: {
          video_path: videoUrl,
          scale: upscaleTo4K ? 4 : 2, // 4x for 4K, 2x for HD
        }
      }),
    });

    if (!startResponse.ok) {
      const error = await startResponse.text();
      console.error('Failed to start video upscaling:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to start video upscaling', details: error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const prediction = await startResponse.json();
    console.log('Video upscaling started, prediction ID:', prediction.id);

    // Poll for completion
    let attempts = 0;
    const maxAttempts = 120; // Videos take longer to process
    let finalPrediction = prediction;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 3000)); // Check every 3 seconds
      
      const checkResponse = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
        headers: { 'Authorization': `Bearer ${REPLICATE_API_KEY}` }
      });

      if (!checkResponse.ok) {
        console.error('Failed to check status:', await checkResponse.text());
        attempts++;
        continue;
      }

      finalPrediction = await checkResponse.json();
      console.log('Video upscaling status:', finalPrediction.status, 'progress:', finalPrediction.progress);

      if (finalPrediction.status === 'succeeded') {
        console.log('Video upscaling completed successfully');
        return new Response(
          JSON.stringify({ 
            success: true, 
            upscaledVideoUrl: finalPrediction.output 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (finalPrediction.status === 'failed') {
        console.error('Video upscaling failed:', finalPrediction.error);
        return new Response(
          JSON.stringify({ 
            error: 'Video upscaling failed', 
            details: finalPrediction.error 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      attempts++;
    }

    console.error('Video upscaling timeout');
    return new Response(
      JSON.stringify({ error: 'Video upscaling timeout' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in upscale-video function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
