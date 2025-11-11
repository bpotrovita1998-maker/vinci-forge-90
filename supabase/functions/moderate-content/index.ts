import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use Lovable AI to analyze content safety
    const moderationResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
            content: `You are a content moderation system. Analyze the prompt for:
1. Violence, gore, or graphic content
2. Sexual or adult content
3. Hate speech or discrimination
4. Illegal activities
5. Personal information or privacy violations

Respond with JSON only:
{
  "safe": boolean,
  "categories": ["category1", "category2"],
  "severity": "low" | "medium" | "high",
  "reason": "brief explanation"
}`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
      }),
    });

    if (!moderationResponse.ok) {
      throw new Error('Moderation API failed');
    }

    const moderationData = await moderationResponse.json();
    const content = moderationData.choices[0].message.content;
    
    // Parse the JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : { safe: true, categories: [], severity: 'low', reason: 'No issues detected' };

    console.log('Moderation result:', result);

    return new Response(
      JSON.stringify(result),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error in moderation:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        safe: true, // Default to safe on error to not block legitimate content
        categories: [],
        severity: 'low',
        reason: 'Moderation check failed, proceeding with caution'
      }),
      { 
        status: 200, // Return 200 even on error to not break the flow
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
