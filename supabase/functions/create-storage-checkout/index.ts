import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@17.5.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { STORAGE_PLAN_BY_PRICE } from "../_shared/storage-plans.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BodySchema = z.object({ priceId: z.string().min(1).max(100) });

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Please sign in first." }, 401);

    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "");
    const { data } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    const user = data.user;
    if (!user?.email) return json({ error: "Please sign in first." }, 401);

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success || !STORAGE_PLAN_BY_PRICE[parsed.data.priceId]) {
      return json({ error: "Unknown storage plan." }, 400);
    }
    const { priceId } = parsed.data;
    const plan = STORAGE_PLAN_BY_PRICE[priceId];

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    const customerId = customers.data[0]?.id;
    const origin = req.headers.get("origin") ?? "";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${origin}/pricing?storage=success`,
      cancel_url: `${origin}/pricing`,
      metadata: { user_id: user.id, kind: "storage", plan: plan.plan },
      subscription_data: { metadata: { user_id: user.id, kind: "storage", plan: plan.plan } },
    });

    return json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[CREATE-STORAGE-CHECKOUT]", message);
    return json({ error: message }, 500);
  }
});
