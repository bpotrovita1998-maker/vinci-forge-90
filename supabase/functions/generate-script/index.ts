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
    const { idea } = await req.json();

    if (!idea || idea.trim().length < 10) {
      return new Response(
        JSON.stringify({ error: "Please provide a detailed idea (at least 10 characters)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    console.log("Generating script and shot list for idea:", idea);

    // Call Lovable AI with tool calling for structured output
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
            content: `You are a professional video production scriptwriter and cinematographer. Generate detailed, creative scripts and shot lists for video productions. Each shot should include:
- Shot number and title
- Camera direction (wide, medium, close-up, extreme close-up, over-the-shoulder, etc.)
- Camera movement (static, pan, tilt, dolly, tracking, etc.)
- Duration in seconds
- Detailed visual description for image generation
- Any key dialogue or narration

Be creative and cinematic. Include establishing shots, b-roll, and varied camera angles for visual interest.`
          },
          {
            role: "user",
            content: `Create a professional video script and shot list for this concept:\n\n"${idea}"\n\nGenerate 5-8 shots that tell a complete story. Make it cinematic and engaging.`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_video_script",
              description: "Create a video script with shot list",
              parameters: {
                type: "object",
                properties: {
                  title: {
                    type: "string",
                    description: "Catchy title for the video"
                  },
                  script: {
                    type: "string",
                    description: "Full script with narration and dialogue"
                  },
                  shots: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        shot_number: {
                          type: "integer",
                          description: "Shot number in sequence"
                        },
                        title: {
                          type: "string",
                          description: "Brief title for the shot"
                        },
                        camera_angle: {
                          type: "string",
                          description: "Camera angle (wide, medium, close-up, extreme close-up, etc.)"
                        },
                        camera_movement: {
                          type: "string",
                          description: "Camera movement (static, pan left/right, tilt up/down, dolly in/out, tracking, etc.)"
                        },
                        duration: {
                          type: "integer",
                          description: "Duration in seconds (2-8 seconds)"
                        },
                        visual_description: {
                          type: "string",
                          description: "Detailed visual description for AI image generation"
                        },
                        dialogue: {
                          type: "string",
                          description: "Dialogue or narration for this shot (optional)"
                        }
                      },
                      required: ["shot_number", "title", "camera_angle", "camera_movement", "duration", "visual_description"]
                    }
                  }
                },
                required: ["title", "script", "shots"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "create_video_script" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits depleted. Please add credits in your workspace settings." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI generation failed: ${errorText}`);
    }

    const data = await response.json();
    console.log("AI response received:", JSON.stringify(data, null, 2));

    // Extract tool call arguments
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "create_video_script") {
      throw new Error("Invalid response format from AI");
    }

    const scriptData = JSON.parse(toolCall.function.arguments);
    console.log("Generated script:", scriptData);

    return new Response(
      JSON.stringify(scriptData),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in generate-script function:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Failed to generate script"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
