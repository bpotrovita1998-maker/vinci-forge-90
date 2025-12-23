import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt } = await req.json();
    
    if (!prompt || typeof prompt !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Prompt is required', translatedPrompt: prompt }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if prompt is likely already in English (basic heuristic)
    const isLikelyEnglish = /^[a-zA-Z0-9\s\-_,.!?'"()[\]{}:;@#$%^&*+=<>\/\\|~`]+$/.test(prompt.trim());
    
    // If it looks like pure English/ASCII, return as-is to save API calls
    if (isLikelyEnglish && prompt.length > 10) {
      console.log('Prompt appears to be English, skipping translation');
      return new Response(
        JSON.stringify({ 
          translatedPrompt: prompt, 
          originalPrompt: prompt,
          wasTranslated: false,
          detectedLanguage: 'en'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured, returning original prompt');
      return new Response(
        JSON.stringify({ 
          translatedPrompt: prompt, 
          originalPrompt: prompt,
          wasTranslated: false,
          error: 'Translation service not configured'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Translating prompt to English:', prompt.substring(0, 100) + '...');

    // Use Gemini Flash for fast and accurate translation
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
            role: 'system',
            content: `You are a translation assistant specialized in translating AI image/video generation prompts. 
Your task is to translate the user's prompt into English while:
1. Preserving the visual description and creative intent
2. Keeping any technical terms, art styles, or quality descriptors
3. Maintaining the same level of detail and specificity
4. If the text is already in English, return it unchanged

IMPORTANT: 
- Only output the translated prompt, nothing else
- Do not add explanations or notes
- Do not modify or enhance the prompt, just translate it accurately
- Preserve formatting like commas, periods, and structure`
          },
          {
            role: 'user',
            content: `Translate this image/video generation prompt to English. If it's already in English, return it unchanged:\n\n${prompt}`
          }
        ],
        temperature: 0.1, // Low temperature for accurate translation
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Translation API error:', response.status, errorText);
      // Return original prompt on error
      return new Response(
        JSON.stringify({ 
          translatedPrompt: prompt, 
          originalPrompt: prompt,
          wasTranslated: false,
          error: 'Translation failed, using original'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const translatedPrompt = data.choices?.[0]?.message?.content?.trim() || prompt;

    // Check if translation is different from original
    const wasTranslated = translatedPrompt.toLowerCase() !== prompt.toLowerCase();

    console.log('Translation result:', {
      original: prompt.substring(0, 50) + '...',
      translated: translatedPrompt.substring(0, 50) + '...',
      wasTranslated
    });

    return new Response(
      JSON.stringify({ 
        translatedPrompt, 
        originalPrompt: prompt,
        wasTranslated,
        detectedLanguage: wasTranslated ? 'other' : 'en'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Translation error:', error);
    // On any error, return the original prompt to not block generation
    const body = await req.clone().json().catch(() => ({ prompt: '' }));
    return new Response(
      JSON.stringify({ 
        translatedPrompt: body.prompt || '', 
        originalPrompt: body.prompt || '',
        wasTranslated: false,
        error: error instanceof Error ? error.message : 'Translation failed'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
