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
    const { idea, type } = await req.json();

    if (!idea || idea.trim().length < 5) {
      return new Response(
        JSON.stringify({ error: "Please provide a more detailed idea (at least 5 characters)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    console.log("Enhancing prompt for type:", type, "with idea:", idea);

    // Create type-specific system prompts
    const systemPrompts: Record<string, string> = {
      image: `You are an expert prompt engineer for AI image generation. Transform user ideas into detailed, vivid prompts that produce stunning images. Include:
- Visual style and artistic direction
- Lighting and atmosphere
- Color palette and mood
- Composition and framing
- Quality keywords (4K, highly detailed, professional, etc.)

CRITICAL: Avoid prompts with violence, weapons, gore, adult content, hate symbols, or sensitive topics. Focus on creative, peaceful, or artistic scenes.
Keep prompts concise but descriptive (2-3 sentences max).`,
      
      video: `You are an expert prompt engineer for AI video generation. Transform user ideas into cinematic prompts that create engaging videos. Include:
- Camera movements and angles
- Scene transitions and pacing
- Visual effects and atmosphere
- Action and motion description
- Duration considerations

CRITICAL: Avoid prompts with violence, weapons, gore, adult content, or sensitive topics. Focus on dynamic but safe content.
Keep prompts clear and action-focused (2-3 sentences max).`,
      
      '3d': `You are an expert prompt engineer for 3D model generation. Transform user ideas into precise 3D modeling prompts. Include:
- Object structure and geometry
- Materials and textures
- Scale and proportions
- Style (realistic, stylized, low-poly, etc.)
- Topology and detail level

CRITICAL: Avoid prompts for weapons, violent objects, or adult content. Focus on creative, functional, or artistic models.
Keep prompts technical but clear (2-3 sentences max).`,
      
      cad: `You are an expert prompt engineer for CAD/technical modeling. Transform user ideas into precise engineering prompts. Include:
- Exact dimensions and measurements
- Material specifications
- Tolerances and standards
- Functional requirements
- Manufacturing considerations

CRITICAL: Focus on industrial, mechanical, or architectural components. Avoid weapon designs or harmful devices.
Keep prompts technical and specific (2-3 sentences max).`
    };

    const systemPrompt = systemPrompts[type as string] || systemPrompts.image;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: `Enhance this ${type} generation prompt: "${idea}"\n\nProvide ONLY the enhanced prompt, nothing else. No explanations or additional text.`
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error("Failed to enhance prompt");
    }

    const data = await response.json();
    const enhancedPrompt = data.choices?.[0]?.message?.content?.trim();

    if (!enhancedPrompt) {
      throw new Error("No enhanced prompt received");
    }

    console.log("Enhanced prompt:", enhancedPrompt);

    return new Response(
      JSON.stringify({ enhancedPrompt }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in enhance-prompt function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to enhance prompt" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
