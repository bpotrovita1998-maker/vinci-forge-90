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
    const { images, prompt } = await req.json();
    
    if (!images || !Array.isArray(images) || images.length === 0) {
      return new Response(
        JSON.stringify({ error: "No images provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${images.length} images for enhancement`);
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // First, analyze all images to understand common patterns, style, and subjects
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

    console.log("Analyzing images to understand patterns...");
    
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
      const errorText = await analysisResponse.text();
      console.error("Analysis API error:", analysisResponse.status, errorText);
      throw new Error(`Analysis failed: ${analysisResponse.status}`);
    }

    const analysisData = await analysisResponse.json();
    const analysis = analysisData.choices?.[0]?.message?.content || "";
    
    console.log("Image analysis complete:", analysis.substring(0, 200) + "...");

    // Now generate an enhanced replica using the image generation model
    const userEnhancement = prompt ? `. User requested improvements: ${prompt}` : "";
    const enhancementPrompt = `Based on my analysis of ${images.length} reference images: ${analysis}

Create a single high-quality enhanced replica that:
- Preserves all the key visual elements and subjects from the originals
- Improves image quality, clarity, and detail
- Maintains consistent style and color palette
- Enhances lighting and composition${userEnhancement}

Generate a perfected, ultra high resolution version that captures the essence of all reference images combined.`;

    console.log("Generating enhanced replica...");

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
              // Include a few reference images to guide generation
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
          JSON.stringify({ error: "Rate limit exceeded during generation. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (generationResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await generationResponse.text();
      console.error("Generation API error:", generationResponse.status, errorText);
      throw new Error(`Generation failed: ${generationResponse.status}`);
    }

    const generationData = await generationResponse.json();
    const generatedImage = generationData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    const generationDescription = generationData.choices?.[0]?.message?.content || "";

    if (!generatedImage) {
      console.error("No image in response:", JSON.stringify(generationData));
      throw new Error("Failed to generate enhanced image");
    }

    console.log("Enhanced image generated successfully");

    return new Response(
      JSON.stringify({
        success: true,
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
