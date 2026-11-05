import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { calculateCost } from '../_shared/pricing.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// The browser only says WHAT it wants to generate. The price is decided here.
const BodySchema = z.object({
  jobId: z.string().uuid(),
  type: z.enum(['image', 'video', '3d', 'cad']),
  videoModel: z.string().max(40).optional(),
  numImages: z.number().int().min(1).max(8).optional(),
  numVideos: z.number().int().min(1).max(4).optional(),
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Unauthorized' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return json({ error: 'Unauthorized' }, 401);

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return json({ error: 'Invalid generation request', details: parsed.error.flatten().fieldErrors }, 400);
    }

    const price = calculateCost(parsed.data);
    const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

    const { data, error } = await admin.rpc('charge_generation', {
      _user_id: user.id,
      _job_ref: parsed.data.jobId,
      _action_type: price.actionType,
      _credits: price.credits,
      _units: price.units,
    });

    if (error) {
      return json({ error: error.message, code: 'insufficient_credits' }, 402);
    }

    return json({ success: true, charged: price.credits, units: price.units, result: data });
  } catch (error) {
    console.error('check-and-deduct-tokens error:', error);
    return json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});
