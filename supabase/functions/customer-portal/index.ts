import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { adminClient, corsHeaders, getUser, json } from "../_shared/auth-user.ts";
import { createStripe, findCustomerId } from "../_shared/subscription-sync.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const admin = adminClient();
    const user = await getUser(req, admin);
    if (!user) return json({ error: "Please sign in" }, 401);

    const stripe = createStripe();
    const customerId = await findCustomerId(stripe, user.email);
    if (!customerId) return json({ error: "You don't have a plan yet. Choose one below to get started.", code: "no_customer" }, 404);

    const origin = req.headers.get("origin") ?? "https://vinci-forge-ai.lovable.app";
    const portal = await stripe.billingPortal.sessions.create({ customer: customerId, return_url: `${origin}/pricing` });
    return json({ url: portal.url });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
