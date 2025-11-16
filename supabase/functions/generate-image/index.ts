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

    // Define fallback models in order of preference (cost-effective to powerful)
    const imageModels = [
      'google/gemini-2.5-flash-image',     // Most cost-effective (~$0.01/image)
      'google/gemini-2.5-flash-lite',      // Fallback option 1
      'google/gemini-2.5-flash',           // Fallback option 2
    ];

    let response: Response | null = null;
    let lastError: string = '';
    let successfulModel: string = '';

    // Try each Lovable AI model in sequence
    for (const model of imageModels) {
      console.log(`Attempting generation with model: ${model}`);
      
      try {
        response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: 'user',
                content: imagePrompt
              }
            ],
            modalities: ['image', 'text']
          }),
        });

        if (response.ok) {
          console.log(`Successfully generated with model: ${model}`);
          successfulModel = model;
          break; // Success! Exit the loop
        }

        const errorText = await response.text();
        lastError = errorText;
        console.error(`Model ${model} failed:`, response.status, errorText);

        // If credits exhausted or rate-limited, try next model
        if (response.status === 402 || response.status === 429) {
          console.log(`Model ${model} unavailable (${response.status}), trying next model...`);
          continue;
        }

        // For other errors (400, 500, etc.), also try next model
        console.log(`Model ${model} returned error ${response.status}, trying next model...`);
      } catch (error) {
        console.error(`Exception with model ${model}:`, error);
        lastError = error instanceof Error ? error.message : String(error);
        continue;
      }
    }

    // If all Lovable AI models failed, fallback to Replicate
    if (!response || !response.ok) {
      console.log('All Lovable AI models failed, falling back to Replicate');
      const REPLICATE_API_KEY = Deno.env.get('REPLICATE_API_KEY');
      
      if (!REPLICATE_API_KEY) {
        const msg = response?.status === 402
          ? 'Payment required. Please add credits to your Lovable AI workspace.'
          : response?.status === 429
          ? 'Rate limits exceeded, please try again later.'
          : 'All image generation models failed. Please try again.';
        return new Response(
          JSON.stringify({ error: msg, details: lastError }),
          { status: response?.status || 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Using Replicate (flux-schnell) as final fallback');

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
        const error = await start.text();
        console.error('Replicate start error:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to start Replicate generation', details: error }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const prediction = await start.json();
      console.log('Replicate prediction started:', prediction.id);

      // Poll for completion
      let attempts = 0;
      const maxAttempts = 60;
      let finalPrediction = prediction;

      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const check = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
          headers: { 'Authorization': `Bearer ${REPLICATE_API_KEY}` }
        });

        if (!check.ok) {
          console.error('Replicate check error:', await check.text());
          attempts++;
          continue;
        }

        finalPrediction = await check.json();
        console.log('Replicate status:', finalPrediction.status);

        if (finalPrediction.status === 'succeeded') {
          const replicateImages = finalPrediction.output || [];
          
          // Store Replicate images if jobId and userId provided
          let finalUrls = replicateImages;
          if (jobId && userId) {
            finalUrls = [];
            for (let i = 0; i < replicateImages.length; i++) {
              try {
                const imageUrl = replicateImages[i];
                const imageResponse = await fetch(imageUrl);
                const imageBlob = await imageResponse.arrayBuffer();
                
                const fileName = `${userId}/${jobId}/image_${i}.webp`;
                console.log('Uploading Replicate image to storage:', fileName);
                
                const { error: uploadError } = await supabase.storage
                  .from('generated-models')
                  .upload(fileName, imageBlob, {
                    contentType: 'image/webp',
                    upsert: true
                  });
                
                if (uploadError) {
                  console.error('Storage upload error:', uploadError);
                  finalUrls.push(imageUrl);
                  continue;
                }
                
                const { data: { publicUrl } } = supabase.storage
                  .from('generated-models')
                  .getPublicUrl(fileName);
                
                finalUrls.push(publicUrl);
              } catch (error) {
                console.error('Error storing Replicate image:', error);
                finalUrls.push(replicateImages[i]);
              }
            }

            // Update job with outputs
            if (finalUrls.length > 0) {
              await supabase
                .from('jobs')
                .update({ outputs: finalUrls })
                .eq('id', jobId);
            }
          }

          return new Response(
            JSON.stringify({ success: true, images: finalUrls, prompt, model: 'replicate/flux-schnell' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (finalPrediction.status === 'failed') {
          console.error('Replicate generation failed:', finalPrediction.error);
          return new Response(
            JSON.stringify({ error: 'Replicate generation failed', details: finalPrediction.error }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        attempts++;
      }

      return new Response(
        JSON.stringify({ error: 'Replicate generation timeout' }),
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
      
      // Update job status to completed
      const { error: updateError } = await supabase
        .from('jobs')
        .update({
          status: 'completed',
          progress_stage: 'completed',
          progress_percent: 100,
          outputs: finalUrls,
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId);
      
      if (updateError) {
        console.error('Error updating job status:', updateError);
      } else {
        console.log('Job marked as completed:', jobId);
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
