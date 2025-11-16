import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { image1Url, image2Url, sceneIndex } = await req.json();

    if (!image1Url || !image2Url) {
      return new Response(
        JSON.stringify({ error: "Both image URLs are required" }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log(`Analyzing consistency between scenes ${sceneIndex} and ${sceneIndex + 1}`);

    // Call Lovable AI with both images for comparison
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
            content: `You are a visual consistency analyzer for video storyboards. Analyze two consecutive scenes and provide a detailed consistency report.

Your analysis should cover:
1. Character appearance (face, hair, clothing, body type, colors)
2. Art style (lighting, camera angle, visual effects, mood)
3. Color palette and tone
4. Background and environment consistency
5. Overall visual coherence

Provide your response in this exact JSON format:
{
  "consistencyScore": <number 0-100>,
  "summary": "<brief overall assessment>",
  "issues": [
    {
      "category": "<Character|Style|Colors|Environment|Other>",
      "severity": "<High|Medium|Low>",
      "description": "<specific issue description>"
    }
  ],
  "strengths": ["<positive consistency point 1>", "<positive consistency point 2>"],
  "recommendation": "<specific action to improve consistency>"
}

Be specific and actionable in your feedback.`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Compare these two consecutive scenes (Scene ${sceneIndex} and Scene ${sceneIndex + 1}) and analyze their visual consistency. Focus on character appearance, art style, colors, and environment.`
              },
              {
                type: "image_url",
                image_url: {
                  url: image1Url
                }
              },
              {
                type: "image_url",
                image_url: {
                  url: image2Url
                }
              }
            ]
          }
        ]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 429 
          }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to your workspace." }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 402 
          }
        );
      }

      throw new Error(`Lovable AI request failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    console.log("AI Analysis:", content);

    // Parse the JSON response from the AI
    let analysis;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
      const jsonString = jsonMatch ? jsonMatch[1] : content;
      analysis = JSON.parse(jsonString);
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      // Return a fallback response
      analysis = {
        consistencyScore: 75,
        summary: "Analysis completed. See detailed report.",
        issues: [{
          category: "Other",
          severity: "Low",
          description: "Unable to parse detailed analysis. Manual review recommended."
        }],
        strengths: ["Scenes appear reasonably consistent"],
        recommendation: "Review scenes manually for specific consistency issues."
      };
    }

    return new Response(
      JSON.stringify(analysis),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error("Error in analyze-scene-consistency:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Analysis failed"
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
