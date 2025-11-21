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
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { action, data } = await req.json();

    switch (action) {
      case 'save_preference': {
        const { preference_type, preference_key, preference_value } = data;
        
        const { error } = await supabase
          .from('user_preferences')
          .upsert({
            user_id: user.id,
            preference_type,
            preference_key,
            preference_value
          }, {
            onConflict: 'user_id,preference_type,preference_key'
          });

        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'get_preferences': {
        const { preference_type } = data || {};
        
        let query = supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', user.id);
        
        if (preference_type) {
          query = query.eq('preference_type', preference_type);
        }
        
        const { data: preferences, error } = await query;
        if (error) throw error;

        return new Response(JSON.stringify({ preferences }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'save_instruction': {
        const { title, instruction, instruction_type, priority } = data;
        
        const { data: newInstruction, error } = await supabase
          .from('custom_instructions')
          .insert({
            user_id: user.id,
            title,
            instruction,
            instruction_type: instruction_type || 'generation_rule',
            priority: priority || 0,
            is_active: true
          })
          .select()
          .single();

        if (error) throw error;
        return new Response(JSON.stringify({ instruction: newInstruction }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'get_instructions': {
        const { data: instructions, error } = await supabase
          .from('custom_instructions')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('priority', { ascending: false });

        if (error) throw error;
        return new Response(JSON.stringify({ instructions }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'update_instruction': {
        const { id, ...updates } = data;
        
        const { error } = await supabase
          .from('custom_instructions')
          .update(updates)
          .eq('id', id)
          .eq('user_id', user.id);

        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'delete_instruction': {
        const { id } = data;
        
        const { error } = await supabase
          .from('custom_instructions')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);

        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'record_pattern': {
        const { pattern_type, pattern_data } = data;
        
        // Check if pattern exists
        const { data: existing } = await supabase
          .from('generation_patterns')
          .select('*')
          .eq('user_id', user.id)
          .eq('pattern_type', pattern_type)
          .single();

        if (existing) {
          // Update usage count
          const { error } = await supabase
            .from('generation_patterns')
            .update({
              usage_count: existing.usage_count + 1,
              last_used_at: new Date().toISOString(),
              pattern_data
            })
            .eq('id', existing.id);

          if (error) throw error;
        } else {
          // Create new pattern
          const { error } = await supabase
            .from('generation_patterns')
            .insert({
              user_id: user.id,
              pattern_type,
              pattern_data,
              usage_count: 1
            });

          if (error) throw error;
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'get_patterns': {
        const { data: patterns, error } = await supabase
          .from('generation_patterns')
          .select('*')
          .eq('user_id', user.id)
          .order('usage_count', { ascending: false })
          .limit(10);

        if (error) throw error;
        return new Response(JSON.stringify({ patterns }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      default:
        throw new Error('Invalid action');
    }
  } catch (error) {
    console.error('Error in manage-memory:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});