import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { images, prompt, mode } = await req.json();
    
    if (!images || !Array.isArray(images) || images.length === 0) {
      return new Response(
        JSON.stringify({ error: "No images provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${images.length} images, mode: ${mode || 'batch-replicate'}`);
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Mode: batch-replicate - create enhanced replica of each image individually
    if (mode === 'batch-replicate') {
      const enhancedImages: { original: string; enhanced: string; index: number }[] = [];
      const errors: { index: number; error: string }[] = [];
      
      // Process images in batches of 5 to avoid rate limits
      const batchSize = 5;
      for (let i = 0; i < images.length; i += batchSize) {
        const batch = images.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (imageUrl: string, batchIndex: number) => {
          const globalIndex = i + batchIndex;
          
          try {
            const replicaPrompt = `${prompt || 'Create a high-quality enhanced replica of this image'}. 
            
Analyze this reference image carefully and generate a new version that:
- Preserves all visual elements, subjects, colors, and composition exactly
- Improves overall image quality, clarity, and detail
- Maintains the exact same style and aesthetic
- Enhances lighting and sharpness

Generate an ultra high resolution perfected version.`;

            const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash-image-preview",
                messages: [
                  {
                    role: "user",
                    content: [
                      { type: "text", text: replicaPrompt },
                      {
                        type: "image_url",
                        image_url: { url: imageUrl }
                      }
                    ]
                  }
                ],
                modalities: ["image", "text"]
              }),
            });

            if (!response.ok) {
              if (response.status === 429) {
                throw new Error("Rate limit exceeded");
              }
              if (response.status === 402) {
                throw new Error("Payment required");
              }
              throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();
            const generatedImage = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

            if (!generatedImage) {
              throw new Error("No image generated");
            }

            return {
              original: imageUrl,
              enhanced: generatedImage,
              index: globalIndex
            };
          } catch (error) {
            console.error(`Error processing image ${globalIndex}:`, error);
            return {
              index: globalIndex,
              error: error instanceof Error ? error.message : "Unknown error"
            };
          }
        });

        const results = await Promise.all(batchPromises);
        
        for (const result of results) {
          if ('enhanced' in result && result.enhanced) {
            enhancedImages.push(result as { original: string; enhanced: string; index: number });
          } else if ('error' in result) {
            errors.push(result as { index: number; error: string });
          }
        }

        // Small delay between batches to avoid rate limits
        if (i + batchSize < images.length) {
          await new Promise(r => setTimeout(r, 1000));
        }
      }

      console.log(`Batch processing complete: ${enhancedImages.length} success, ${errors.length} errors`);

      return new Response(
        JSON.stringify({
          success: true,
          mode: 'batch-replicate',
          enhancedImages: enhancedImages.sort((a, b) => a.index - b.index),
          errors,
          totalProcessed: images.length,
          successCount: enhancedImages.length,
          errorCount: errors.length
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Default mode: analyze all and create single enhanced replica
    console.log("Using default mode: analyze and enhance");
    
    const analysisPrompt = `Analyze these ${images.length} reference images carefully. Identify:
1. Common visual elements (subjects, objects, characters)
2. Consistent style patterns (colors, lighting, composition)
3. Quality aspects that can be improved
4. Key features that should be preserved

Then provide a concise description of what an improved, higher-quality version of these images should look like.`;

    const analysisMessages = [
      {
        role: "user",
        content: [
          { type: "text", text: analysisPrompt },
          ...images.slice(0, 10).map((imageUrl: string) => ({
            type: "image_url",
            image_url: { url: imageUrl }
          }))
        ]
      }
    ];

    const analysisResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: analysisMessages,
      }),
    });

    if (!analysisResponse.ok) {
      if (analysisResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (analysisResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`Analysis failed: ${analysisResponse.status}`);
    }

    const analysisData = await analysisResponse.json();
    const analysis = analysisData.choices?.[0]?.message?.content || "";

    const userEnhancement = prompt ? `. User requested: ${prompt}` : "";
    const enhancementPrompt = `Based on analysis of ${images.length} reference images: ${analysis}

Create a high-quality enhanced replica that:
- Preserves all key visual elements and subjects
- Improves image quality, clarity, and detail
- Maintains consistent style and color palette
- Enhances lighting and composition${userEnhancement}

Generate a perfected, ultra high resolution version.`;

    const generationResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: enhancementPrompt },
              ...images.slice(0, 3).map((imageUrl: string) => ({
                type: "image_url",
                image_url: { url: imageUrl }
              }))
            ]
          }
        ],
        modalities: ["image", "text"]
      }),
    });

    if (!generationResponse.ok) {
      if (generationResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded during generation." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (generationResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`Generation failed: ${generationResponse.status}`);
    }

    const generationData = await generationResponse.json();
    const generatedImage = generationData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    const generationDescription = generationData.choices?.[0]?.message?.content || "";

    if (!generatedImage) {
      throw new Error("Failed to generate enhanced image");
    }

    return new Response(
      JSON.stringify({
        success: true,
        mode: 'single-enhanced',
        analysis,
        enhancedImage: generatedImage,
        description: generationDescription,
        processedCount: images.length
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in enhance-images-batch:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
