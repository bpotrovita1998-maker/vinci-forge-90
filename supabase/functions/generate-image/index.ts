import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const generateImageSchema = z.object({
  prompt: z.string().min(1).max(2000),
  width: z.number().min(256).max(2048).optional().default(1024),
  height: z.number().min(256).max(2048).optional().default(1024),
  numImages: z.number().min(1).max(8).optional().default(1),
  jobId: z.string().uuid().optional(),
});

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Authenticate with user's JWT
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Authenticated user:', user.id);

    // Parse and validate request body
    const requestBody = await req.json();
    const validationResult = generateImageSchema.safeParse(requestBody);
    
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid input parameters', 
          details: validationResult.error.issues 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { prompt, width, height, numImages, jobId } = validationResult.data;
    const userId = user.id; // Derive from authenticated user
    
    // Initialize Supabase client with service role for database operations
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Image generation service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating image with Lovable AI:', { prompt, width, height, numImages });

    // Enhance prompt for high quality image generation with resolution details
    const imagePrompt = `Generate a high-quality, detailed, sharp ${width}x${height} image of: ${prompt}. Ultra high resolution, 4K quality, highly detailed.`;

    // Define fallback models in order of preference (cost-effective to powerful)
    const imageModels = [
      'google/gemini-2.5-flash-image',     // Most cost-effective (~$0.01/image)
      'google/gemini-2.5-flash-lite',      // Fallback option 1
      'google/gemini-2.5-flash',           // Fallback option 2
    ];

    let response: Response | null = null;
    let lastError: string = '';
    let successfulModel: string = '';

    // Generate multiple images by making separate requests
    const allGeneratedImages: string[] = [];
    
    // Try each Lovable AI model in sequence
    for (const model of imageModels) {
      console.log(`Attempting to generate ${numImages} image(s) with model: ${model}`);
      
      let modelSuccess = true;
      const modelImages: string[] = [];
      
      // Generate each image separately
      for (let imgIndex = 0; imgIndex < numImages; imgIndex++) {
        try {
          console.log(`Generating image ${imgIndex + 1}/${numImages} with ${model}`);
          
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
            const data = await response.json();
            const generatedImages = data.choices?.[0]?.message?.images || [];
            const imageUrl = generatedImages[0]?.image_url?.url;
            
            if (imageUrl) {
              modelImages.push(imageUrl);
              console.log(`Successfully generated image ${imgIndex + 1}/${numImages} with ${model}`);
            } else {
              console.error(`No image in response for image ${imgIndex + 1}`);
              modelSuccess = false;
              break;
            }
          } else {
            const errorText = await response.text();
            lastError = errorText;
            console.error(`Model ${model} failed for image ${imgIndex + 1}:`, response.status, errorText);
            modelSuccess = false;
            
            // If credits exhausted or rate-limited, try next model
            if (response.status === 402 || response.status === 429) {
              console.log(`Model ${model} unavailable (${response.status}), trying next model...`);
              break;
            }
            
            // For other errors, also try next model
            console.log(`Model ${model} returned error ${response.status}, trying next model...`);
            break;
          }
        } catch (error) {
          console.error(`Exception with model ${model} for image ${imgIndex + 1}:`, error);
          lastError = error instanceof Error ? error.message : String(error);
          modelSuccess = false;
          break;
        }
      }
      
      // If all images generated successfully with this model, use them
      if (modelSuccess && modelImages.length === numImages) {
        allGeneratedImages.push(...modelImages);
        successfulModel = model;
        response = { ok: true } as Response; // Mark as successful
        break; // Success! Exit the model loop
      }
      
      // Otherwise, try next model
      console.log(`Model ${model} failed to generate all images, trying next model...`);
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
                
                const { data: signedUrlData } = await supabase.storage
                  .from('generated-models')
                  .createSignedUrl(fileName, 604800); // 7 days expiry
                
                if (signedUrlData?.signedUrl) {
                  finalUrls.push(signedUrlData.signedUrl);
                } else {
                  console.error('Failed to create signed URL');
                  finalUrls.push(imageUrl);
                }
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

      // Use the collected images from successful generation
      let images = allGeneratedImages;
      
      if (images.length === 0) {
        console.error('No images were generated');
        return new Response(
          JSON.stringify({ error: 'No images generated. Please ensure your prompt describes a visual scene without sensitive content.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Successfully generated', images.length, 'image(s) with', successfulModel);

      // Upscale images if dimensions don't match 1024x1024 (default AI output)
      if (width !== 1024 || height !== 1024) {
        console.log(`Upscaling images from 1024x1024 to ${width}x${height}`);
        const upscaledImages: string[] = [];
        
        for (let i = 0; i < images.length; i++) {
          try {
            console.log(`Upscaling image ${i + 1}/${images.length}`);
            const upscaleResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${LOVABLE_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: 'google/gemini-2.5-flash-image',
                messages: [
                  {
                    role: 'user',
                    content: [
                      {
                        type: 'text',
                        text: `Upscale and enhance this image to ${width}x${height} resolution with maximum quality and detail. Maintain the exact same content and composition, just increase the resolution and enhance details.`
                      },
                      {
                        type: 'image_url',
                        image_url: {
                          url: images[i]
                        }
                      }
                    ]
                  }
                ],
                modalities: ['image', 'text']
              }),
            });

            if (upscaleResponse.ok) {
              const upscaleData = await upscaleResponse.json();
              const upscaledImageUrl = upscaleData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
              if (upscaledImageUrl) {
                upscaledImages.push(upscaledImageUrl);
                console.log(`Successfully upscaled image ${i + 1}/${images.length}`);
              } else {
                console.warn(`Failed to upscale image ${i + 1}, using original`);
                upscaledImages.push(images[i]);
              }
            } else {
              console.warn(`Upscale failed for image ${i + 1}, using original`);
              upscaledImages.push(images[i]);
            }
          } catch (error) {
            console.error(`Error upscaling image ${i + 1}:`, error);
            upscaledImages.push(images[i]);
          }
        }
        
        images = upscaledImages;
        console.log('Upscaling complete');
      }

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
            const { data: signedUrlData } = await supabase.storage
              .from('generated-models')
              .createSignedUrl(fileName, 604800); // 7 days expiry
            
            if (signedUrlData?.signedUrl) {
              console.log('Image stored at:', signedUrlData.signedUrl);
              finalUrls.push(signedUrlData.signedUrl);
            } else {
              console.error('Failed to create signed URL');
              finalUrls.push(images[i]);
            }
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
