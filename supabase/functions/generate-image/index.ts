import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, width = 1024, height = 1024, numImages = 1 } = await req.json();
    
    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Image generation service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating image with Lovable AI:', { prompt, width, height, numImages });

    // Generate images using Lovable AI Gateway (Gemini Nano banana model)
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        modalities: ['image', 'text']
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);

      // If credits exhausted or rate-limited on Lovable AI, fallback to Replicate automatically
      if (response.status === 402 || response.status === 429) {
        const REPLICATE_API_KEY = Deno.env.get('REPLICATE_API_KEY');
        if (!REPLICATE_API_KEY) {
          const msg = response.status === 402
            ? 'Payment required. Please add credits to your Lovable AI workspace.'
            : 'Rate limits exceeded, please try again later.';
          return new Response(
            JSON.stringify({ error: msg }),
            { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('Falling back to Replicate (flux-schnell)');

        // Map dimensions to aspect ratio
        let aspectRatio = '1:1';
        if (width > height) aspectRatio = '16:9';
        else if (height > width) aspectRatio = '9:16';

        // Kick off prediction
        const start = await fetch('https://api.replicate.com/v1/predictions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${REPLICATE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            version: 'f2ab8a5bfe79f02f0789a146cf5e73d2a4ff2684a98c2b303d1e1ff3814271db',
            input: {
              prompt: prompt,
              go_fast: true,
              megapixels: '1',
              num_outputs: numImages,
              aspect_ratio: aspectRatio,
              output_format: 'webp',
              output_quality: 80,
              num_inference_steps: 4
            }
          }),
        });

        if (!start.ok) {
          const t = await start.text();
          console.error('Replicate start error:', start.status, t);
          return new Response(
            JSON.stringify({ error: 'Failed to start fallback generation' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const prediction = await start.json();
        console.log('Replicate prediction id:', prediction.id);

        // Poll for completion
        let result = prediction;
        let attempts = 0;
        const maxAttempts = 60;
        while (result.status !== 'succeeded' && result.status !== 'failed' && attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          const statusResp = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
            headers: { 'Authorization': `Bearer ${REPLICATE_API_KEY}` },
          });
          result = await statusResp.json();
          attempts++;
          console.log(`Replicate poll ${attempts}:`, result.status);
        }

        if (result.status !== 'succeeded') {
          console.error('Replicate generation failed or timed out:', result);
          return new Response(
            JSON.stringify({ error: 'Image generation failed' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const imgs = Array.isArray(result.output) ? result.output : [result.output];
        console.log('Fallback succeeded with', imgs.length, 'image(s)');
        return new Response(
          JSON.stringify({ success: true, images: imgs, prompt, model: 'replicate/flux-schnell' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Other errors from Lovable AI
      return new Response(
        JSON.stringify({ error: 'Failed to generate image' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('Lovable AI response received');

    // Extract base64 images from response
    const generatedImages = data.choices?.[0]?.message?.images || [];
    const images = generatedImages.map((img: any) => img.image_url?.url).filter(Boolean);

    if (images.length === 0) {
      console.error('No images in response:', data);
      return new Response(
        JSON.stringify({ error: 'No images generated' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Successfully generated', images.length, 'image(s)');

    return new Response(
      JSON.stringify({ 
        success: true,
        images: images,
        prompt,
        model: 'google/gemini-2.5-flash-image-preview'
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in generate-image function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
