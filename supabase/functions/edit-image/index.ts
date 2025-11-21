import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Only block ACTUAL code injection attempts
const DANGEROUS_PATTERNS = [
  /<script[^>]*>[\s\S]*?<\/script>/gi,
  /<iframe[^>]*>[\s\S]*?<\/iframe>/gi,
  /javascript:\s*void\s*\(|javascript:\s*alert\s*\(|javascript:\s*eval\s*\(/gi,
  /<[^>]+on(load|error|click|mouse|key)\s*=\s*["'][^"']*["'][^>]*>/gi,
  /eval\s*\(\s*["'`]|Function\s*\(\s*["'`]/gi,
  /;\s*(DROP|DELETE|INSERT|UPDATE|ALTER)\s+(TABLE|DATABASE|FROM)/gi,
  /UNION\s+SELECT|UNION\s+ALL\s+SELECT/gi,
];

// Sanitize input to prevent injection attacks
function sanitizePrompt(input: string): string {
  if (!input || typeof input !== 'string') {
    throw new Error('Invalid prompt');
  }
  
  let sanitized = input.replace(/\0/g, '').trim();
  
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(sanitized)) {
      throw new Error('Prompt contains code injection. Remove script tags, SQL injection syntax, or JavaScript execution attempts.');
    }
  }
  
  return sanitized;
}

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

    // Sanitize the prompt
    const sanitizedPrompt = sanitizePrompt(body.prompt);
    console.log("Editing image with sanitized prompt");
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

    // Ensure it's a valid URL (HTTP(S) or data URL for base64)
    if (!body.imageUrl.startsWith('http://') && 
        !body.imageUrl.startsWith('https://') && 
        !body.imageUrl.startsWith('data:image/')) {
      return new Response(
        JSON.stringify({ 
          error: "Image must be a valid HTTP(S) URL or base64 data URL" 
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
              { type: "text", text: sanitizedPrompt },
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
    console.log("AI response data:", JSON.stringify(data, null, 2));
    
    // Try multiple possible response structures
    let editedImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    // Fallback: check if image is in content
    if (!editedImageUrl && data.choices?.[0]?.message?.content) {
      const content = data.choices[0].message.content;
      // Check if content contains a base64 image
      if (typeof content === 'string' && content.includes('data:image/')) {
        editedImageUrl = content.match(/data:image\/[^;]+;base64,[^\s"')]+/)?.[0];
      }
    }
    
    // Fallback: check if there's an image array directly in message
    if (!editedImageUrl && Array.isArray(data.choices?.[0]?.message?.images)) {
      const firstImage = data.choices[0].message.images[0];
      editedImageUrl = firstImage?.url || firstImage?.image_url?.url;
    }

    if (!editedImageUrl) {
      console.error('No edited image found in response. Full response:', JSON.stringify(data, null, 2));
      throw new Error('No edited image returned from AI. The model may not support image editing.');
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
