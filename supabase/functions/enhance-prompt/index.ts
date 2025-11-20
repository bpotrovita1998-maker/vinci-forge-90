import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') return '';
  
  // Remove null bytes
  let sanitized = input.replace(/\0/g, '').trim();
  
  // Check for dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(sanitized)) {
      throw new Error('Input contains code injection. Remove script tags, SQL injection syntax, or JavaScript execution attempts.');
    }
  }
  
  // Limit length
  if (sanitized.length > 10000) {
    sanitized = sanitized.slice(0, 10000);
  }
  
  return sanitized;
}

// Input validation schema
const enhancePromptSchema = z.object({
  idea: z.string().min(5).max(10000).transform(sanitizeInput),
  type: z.enum(['image', 'video', '3d', 'cad']).optional(),
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
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
    const validationResult = enhancePromptSchema.safeParse(requestBody);
    
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid input parameters', 
          details: validationResult.error.issues 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { idea, type } = validationResult.data;

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
      
      cad: `You are an expert industrial CAD prompt engineer specializing in precision engineering and mechanical design. Your role is to preserve and enhance technical specifications for CAD model generation.

CORE PRINCIPLES:
1. PRESERVE ALL EXACT DIMENSIONS - Never approximate or round measurements
2. MAINTAIN MATERIAL SPECIFICATIONS - Keep exact alloy grades, standards, treatments
3. RETAIN GEOMETRIC DETAILS - Preserve radii, fillets, chamfers, cross-sections
4. KEEP MANUFACTURING CONTEXT - CNC, machining, forming, tolerances
5. MAINTAIN ENGINEERING TERMINOLOGY - Use precise technical language

INPUT ANALYSIS:
- If input contains exact dimensions (mm, inches, etc.), preserve them exactly
- If input specifies materials (6061-T6, stainless steel, etc.), keep specifications
- If input describes geometry (radius, fillet, chamfer, etc.), maintain all details
- If input mentions manufacturing (CNC, bending, machining), keep process info
- If input is vague, enhance with reasonable engineering assumptions

OUTPUT FORMAT:
For detailed engineering inputs: Preserve all specifications, enhance clarity and structure
For basic inputs: Add engineering details while keeping creative intent
Always output as a single technical paragraph suitable for CAD generation

CRITICAL: Never remove dimensions, materials, or technical specifications. Focus on industrial components only.`
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
