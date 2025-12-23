import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const analyzeCharacterSchema = z.object({
  referenceImages: z.array(z.string()).min(1).max(3),
  options: z.object({
    referenceMatchingEnabled: z.boolean().optional(),
    referenceMatchingStrength: z.number().min(0).max(1).optional(),
    styleTransferEnabled: z.boolean().optional(),
    styleStrength: z.number().min(0).max(1).optional(),
    controlNetEnabled: z.boolean().optional(),
    controlNetType: z.enum(['pose', 'depth', 'canny', 'openpose']).optional(),
    controlNetStrength: z.number().min(0).max(1).optional(),
    poseReferenceImage: z.string().optional(),
    depthReferenceImage: z.string().optional(),
  }).optional(),
  prompt: z.string().optional(),
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse and validate request
    const requestBody = await req.json();
    const validationResult = analyzeCharacterSchema.safeParse(requestBody);
    
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid input', details: validationResult.error.issues }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { referenceImages, options, prompt } = validationResult.data;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Analyzing character from', referenceImages.length, 'reference images');

    // Build analysis prompt based on options
    let analysisPrompt = `Analyze these reference images of a character and extract key visual features for consistency.

Please provide a detailed analysis including:
1. **Physical Features**: Face shape, skin tone, hair color/style, eye color, body type
2. **Distinctive Traits**: Unique features, birthmarks, scars, accessories
3. **Clothing Style**: Typical outfit colors, patterns, style preferences
4. **Color Palette**: Dominant colors associated with this character
5. **Lighting/Mood**: Typical lighting style in the references
6. **Art Style**: If applicable, note any consistent artistic style

Output a JSON object with the following structure:
{
  "characterDescription": "A detailed text description of the character's appearance",
  "keyFeatures": ["list", "of", "distinctive", "features"],
  "colorPalette": ["#hex1", "#hex2", "#hex3"],
  "styleNotes": "Notes about artistic/photographic style",
  "consistencyPrompt": "A prompt modifier to ensure character consistency in generation"
}`;

    if (options?.styleTransferEnabled) {
      analysisPrompt += `\n\nAlso extract style elements for transfer: color grading, lighting style, artistic technique, mood.`;
    }

    if (options?.controlNetEnabled && options.controlNetType) {
      analysisPrompt += `\n\nFor ${options.controlNetType} control: Extract ${options.controlNetType === 'pose' ? 'body pose and positioning' : options.controlNetType === 'depth' ? 'depth layers and spatial arrangement' : 'edge and outline structure'}.`;
    }

    // Build message content with images
    const messageContent: any[] = [
      { type: 'text', text: analysisPrompt }
    ];

    // Add reference images
    for (const imageUrl of referenceImages) {
      messageContent.push({
        type: 'image_url',
        image_url: { url: imageUrl }
      });
    }

    // Add control images if provided
    if (options?.poseReferenceImage) {
      messageContent.push({
        type: 'text',
        text: 'Pose reference image for extraction:'
      });
      messageContent.push({
        type: 'image_url',
        image_url: { url: options.poseReferenceImage }
      });
    }

    if (options?.depthReferenceImage) {
      messageContent.push({
        type: 'text',
        text: 'Depth reference image for extraction:'
      });
      messageContent.push({
        type: 'image_url',
        image_url: { url: options.depthReferenceImage }
      });
    }

    // Call Lovable AI for character analysis
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: messageContent
          }
        ]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI analysis failed:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded, please try again later' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required, please add credits' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI analysis failed: ${errorText}`);
    }

    const data = await response.json();
    const analysisText = data.choices?.[0]?.message?.content || '';

    console.log('Character analysis complete');

    // Try to parse JSON from response
    let characterAnalysis: any = null;
    try {
      // Find JSON in the response
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        characterAnalysis = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.warn('Could not parse JSON from analysis, using raw text');
    }

    // Build enhanced prompt for generation
    let enhancedPrompt = prompt || '';
    
    if (characterAnalysis?.consistencyPrompt) {
      enhancedPrompt = `${characterAnalysis.consistencyPrompt}. ${enhancedPrompt}`;
    } else if (characterAnalysis?.characterDescription) {
      enhancedPrompt = `Character: ${characterAnalysis.characterDescription}. ${enhancedPrompt}`;
    }

    // Apply strength modifiers
    const matchingStrength = options?.referenceMatchingStrength || 0.7;
    const styleStrength = options?.styleStrength || 0.5;
    const controlStrength = options?.controlNetStrength || 0.7;

    // Build consistency instructions based on strength
    let consistencyInstructions = '';
    
    if (options?.referenceMatchingEnabled && matchingStrength > 0) {
      const strengthLevel = matchingStrength > 0.8 ? 'exactly' : matchingStrength > 0.5 ? 'closely' : 'loosely';
      consistencyInstructions += `Match the character appearance ${strengthLevel} to the reference. `;
    }

    if (options?.styleTransferEnabled && styleStrength > 0) {
      const styleLevel = styleStrength > 0.8 ? 'strongly' : styleStrength > 0.5 ? 'moderately' : 'subtly';
      consistencyInstructions += `Apply the visual style ${styleLevel}. `;
    }

    if (options?.controlNetEnabled && controlStrength > 0) {
      const controlLevel = controlStrength > 0.8 ? 'strictly' : controlStrength > 0.5 ? 'closely' : 'loosely';
      consistencyInstructions += `Follow the ${options.controlNetType} reference ${controlLevel}. `;
    }

    return new Response(
      JSON.stringify({
        success: true,
        analysis: characterAnalysis || { rawAnalysis: analysisText },
        enhancedPrompt,
        consistencyInstructions,
        settings: {
          matchingStrength,
          styleStrength,
          controlStrength,
          controlType: options?.controlNetType
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error analyzing character:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Analysis failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
