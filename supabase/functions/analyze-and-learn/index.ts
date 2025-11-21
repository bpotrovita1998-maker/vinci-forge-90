import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authHeader = req.headers.get('Authorization')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { prompt, type, settings } = await req.json();

    // Get recent conversation history (last 10 interactions)
    const { data: recentMemory } = await supabase
      .from('conversation_memory')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    const conversationContext = recentMemory
      ?.reverse()
      .map(m => `${m.role}: ${m.content}`)
      .join('\n') || '';

    // Analyze the prompt and extract learnings using AI
    const analysisPrompt = `Analyze this creative generation request and extract key insights:

User Prompt: "${prompt}"
Generation Type: ${type}
Settings: ${JSON.stringify(settings)}

Recent Context:
${conversationContext}

Extract:
1. Style preferences (colors, mood, artistic style)
2. Common themes or subjects
3. Technical preferences (resolution, quality settings)
4. Any patterns in their creative direction

Respond in JSON format:
{
  "style_preferences": ["list", "of", "styles"],
  "themes": ["list", "of", "themes"],
  "technical_patterns": {"key": "value"},
  "suggested_instruction": "A single sentence instruction that could improve future generations based on this pattern"
}`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are an AI that analyzes creative patterns and extracts learning insights. Always respond with valid JSON.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ]
      })
    });

    if (!aiResponse.ok) {
      console.error('AI analysis failed:', await aiResponse.text());
      // Continue without analysis
      await saveConversation(supabase, user.id, prompt, type);
      return new Response(JSON.stringify({ success: true, analyzed: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const aiData = await aiResponse.json();
    const analysisText = aiData.choices?.[0]?.message?.content || '{}';
    
    let analysis;
    try {
      analysis = JSON.parse(analysisText);
    } catch (e) {
      console.error('Failed to parse AI response:', analysisText);
      analysis = {};
    }

    // Save conversation memory
    await saveConversation(supabase, user.id, prompt, type);

    // Record patterns
    if (analysis.style_preferences?.length > 0) {
      await supabase.from('generation_patterns').upsert({
        user_id: user.id,
        pattern_type: 'style_preference',
        pattern_data: { styles: analysis.style_preferences },
        usage_count: 1
      });
    }

    if (analysis.themes?.length > 0) {
      await supabase.from('generation_patterns').upsert({
        user_id: user.id,
        pattern_type: 'common_themes',
        pattern_data: { themes: analysis.themes },
        usage_count: 1
      });
    }

    // Auto-suggest instructions if pattern is strong
    if (analysis.suggested_instruction && analysis.style_preferences?.length >= 3) {
      const { data: existingInstruction } = await supabase
        .from('custom_instructions')
        .select('*')
        .eq('user_id', user.id)
        .eq('instruction_type', 'generation_rule')
        .eq('title', 'Auto-learned Style')
        .single();

      if (!existingInstruction) {
        await supabase.from('custom_instructions').insert({
          user_id: user.id,
          title: 'Auto-learned Style',
          instruction: analysis.suggested_instruction,
          instruction_type: 'generation_rule',
          priority: 5,
          is_active: true
        });
      } else {
        // Update existing auto-learned instruction
        await supabase
          .from('custom_instructions')
          .update({ instruction: analysis.suggested_instruction })
          .eq('id', existingInstruction.id);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      analyzed: true,
      insights: analysis 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in analyze-and-learn:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function saveConversation(
  supabase: any,
  userId: string,
  prompt: string,
  type: string
) {
  await supabase.from('conversation_memory').insert({
    user_id: userId,
    role: 'user',
    content: prompt,
    metadata: { type, timestamp: new Date().toISOString() }
  });
}