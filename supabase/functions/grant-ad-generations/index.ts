import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GENERATIONS_PER_AD = 3;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      throw new Error('No authorization header');
    }

    // Create client with user's token for authentication
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    );

    // Verify user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      console.error('Auth error:', authError);
      throw new Error('Unauthorized');
    }

    console.log(`User ${user.id} requesting ad generations`);

    // Create admin client for database operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Grant ad generations using the database function
    const { data, error } = await supabase.rpc('grant_ad_generations', {
      _user_id: user.id,
      _amount: GENERATIONS_PER_AD
    });

    if (error) {
      console.error('Error granting ad generations:', error);
      throw new Error(error.message);
    }

    // Get updated balance
    const { data: balanceData, error: balanceError } = await supabase
      .from('token_balances')
      .select('ad_generations_remaining, ad_generations_total_earned')
      .eq('user_id', user.id)
      .single();

    if (balanceError) {
      console.error('Error fetching balance:', balanceError);
    }

    console.log(`Granted ${GENERATIONS_PER_AD} ad generations to user ${user.id}. New balance:`, balanceData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        granted: GENERATIONS_PER_AD,
        remaining: balanceData?.ad_generations_remaining ?? GENERATIONS_PER_AD,
        totalEarned: balanceData?.ad_generations_total_earned ?? GENERATIONS_PER_AD
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
