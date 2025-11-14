import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not set');
    }

    const body = await req.json();
    console.log("Edit image request received");

    // Validate required fields
    if (!body.imageUrl || !body.prompt) {
      return new Response(
        JSON.stringify({ 
          error: "Missing required fields: imageUrl and prompt are required" 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    console.log("Editing image with prompt:", body.prompt);
    console.log("Image URL:", body.imageUrl);

    // Validate that the URL is an image, not a video
    const imageUrl = body.imageUrl.toLowerCase();
    if (imageUrl.includes('.mp4') || imageUrl.includes('.mov') || imageUrl.includes('.avi') || imageUrl.includes('video')) {
      return new Response(
        JSON.stringify({ 
          error: "Cannot edit video files. Please select an image scene." 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Ensure it's a proper HTTP(S) URL
    if (!body.imageUrl.startsWith('http://') && !body.imageUrl.startsWith('https://')) {
      return new Response(
        JSON.stringify({ 
          error: "Image must be a valid HTTP(S) URL" 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

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
              { type: "text", text: body.prompt },
              {
                type: "image_url",
                image_url: { url: body.imageUrl }
              }
            ]
          }
        ],
        modalities: ["image", "text"]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const editedImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!editedImageUrl) {
      throw new Error('No edited image returned from AI');
    }

    console.log("Image edited successfully");
    
    return new Response(JSON.stringify({ editedImageUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error("Error in edit-image function:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to edit image";
    
    return new Response(JSON.stringify({ 
      error: errorMessage
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
