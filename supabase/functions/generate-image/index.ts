import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

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
    const { prompt, width = 1024, height = 1024, numImages = 1, jobId, userId } = await req.json();
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
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

    // Enhance prompt to ensure image generation (not text response)
    const imagePrompt = `Generate a high-quality image of: ${prompt}`;

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
            content: imagePrompt
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

        const replicateUrls = Array.isArray(result.output) ? result.output : [result.output];
        console.log('Fallback succeeded with', replicateUrls.length, 'image(s)');
        
        // Store Replicate images permanently if jobId and userId provided
        let finalUrls = replicateUrls;
        if (jobId && userId) {
          finalUrls = [];
          for (let i = 0; i < replicateUrls.length; i++) {
            try {
              const imgResp = await fetch(replicateUrls[i]);
              const imgBlob = await imgResp.blob();
              const imgBuffer = await imgBlob.arrayBuffer();
              
              const fileName = `${userId}/${jobId}/image_${i}.webp`;
              const { error: uploadError } = await supabase.storage
                .from('generated-models')
                .upload(fileName, imgBuffer, {
                  contentType: 'image/webp',
                  upsert: true
                });
              
              if (uploadError) {
                console.error('Storage upload error:', uploadError);
                finalUrls.push(replicateUrls[i]); // Use original URL as fallback
              } else {
                const { data: { publicUrl } } = supabase.storage
                  .from('generated-models')
                  .getPublicUrl(fileName);
                finalUrls.push(publicUrl);
              }
            } catch (e) {
              console.error('Error storing image:', e);
              finalUrls.push(replicateUrls[i]); // Use original URL as fallback
            }
          }
        }
        
        return new Response(
          JSON.stringify({ success: true, images: finalUrls, prompt, model: 'replicate/flux-schnell' }),
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

    // Check for safety/content blocks first
    const finishReason = data.choices?.[0]?.finish_reason;
    const nativeFinishReason = data.choices?.[0]?.native_finish_reason;
    
    if (nativeFinishReason === 'IMAGE_SAFETY' || finishReason === 'content_filter') {
      console.error('Content blocked by safety filters:', { finishReason, nativeFinishReason });
      return new Response(
        JSON.stringify({ 
          error: 'Content blocked by safety filters. Please avoid prompts with violence, weapons, gore, adult content, or other sensitive topics. Try describing peaceful or creative scenes instead.',
          reason: 'SAFETY_FILTER'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract base64 images from response
    const generatedImages = data.choices?.[0]?.message?.images || [];
    const images = generatedImages.map((img: any) => img.image_url?.url).filter(Boolean);

    if (images.length === 0) {
      console.error('No images in response:', data);
      
      // Check if there's a text response instead
      const textContent = data.choices?.[0]?.message?.content;
      if (textContent) {
        return new Response(
          JSON.stringify({ 
            error: 'Unable to generate image. The model returned text instead of an image. This may be due to content restrictions or prompt interpretation issues. Try rephrasing your prompt to be more visual and descriptive.',
            details: textContent
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'No images generated. Please ensure your prompt describes a visual scene without sensitive content.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Successfully generated', images.length, 'image(s)');

    // Store base64 images permanently if jobId and userId provided
    let finalUrls = images;
    if (jobId && userId) {
      finalUrls = [];
      for (let i = 0; i < images.length; i++) {
        try {
          const base64Data = images[i];
          // Extract base64 content and determine format
          const matches = base64Data.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
          if (!matches) {
            console.error('Invalid base64 format:', base64Data.substring(0, 50));
            finalUrls.push(base64Data); // Keep original as fallback
            continue;
          }
          
          const [, format, content] = matches;
          const binaryString = atob(content);
          const bytes = new Uint8Array(binaryString.length);
          for (let j = 0; j < binaryString.length; j++) {
            bytes[j] = binaryString.charCodeAt(j);
          }
          
          const fileName = `${userId}/${jobId}/image_${i}.${format}`;
          console.log('Uploading to storage:', fileName);
          
          const { error: uploadError } = await supabase.storage
            .from('generated-models')
            .upload(fileName, bytes.buffer, {
              contentType: `image/${format}`,
              upsert: true
            });
          
          if (uploadError) {
            console.error('Storage upload error:', uploadError);
            finalUrls.push(base64Data); // Keep original as fallback
          } else {
            const { data: { publicUrl } } = supabase.storage
              .from('generated-models')
              .getPublicUrl(fileName);
            console.log('Image stored at:', publicUrl);
            finalUrls.push(publicUrl);
          }
        } catch (e) {
          console.error('Error storing image:', e);
          finalUrls.push(images[i]); // Keep original as fallback
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        images: finalUrls,
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
