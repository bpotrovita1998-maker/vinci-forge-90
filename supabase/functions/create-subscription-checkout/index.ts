import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { adminClient, corsHeaders, getUser, json } from "../_shared/auth-user.ts";
import { getPlanById } from "../_shared/subscription-plans.ts";
import { createStripe, findCustomerId } from "../_shared/subscription-sync.ts";

const BodySchema = z.object({ plan: z.enum(["creator", "studio", "business"]) });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const admin = adminClient();
    const user = await getUser(req, admin);
    if (!user) return json({ error: "Please sign in" }, 401);

    const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: "Choose Creator, Studio or Business" }, 400);
    const plan = getPlanById(parsed.data.plan)!;

    const stripe = createStripe();
    const customerId = await findCustomerId(stripe, user.email);
    if (customerId) {
      const active = await stripe.subscriptions.list({ customer: customerId, status: "active", limit: 1 });
      if (active.data.length > 0) {
        return json({ error: "You already have a plan. Use Manage subscription to switch plans.", code: "already_subscribed" }, 409);
      }
    }

    const origin = req.headers.get("origin") ?? "https://vinci-forge-ai.lovable.app";
    const session = await stripe.checkout.sessions.create({
      customer: customerId ?? undefined,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: plan.priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${origin}/pricing?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing`,
      metadata: { user_id: user.id, plan: plan.id, kind: "plan" },
      subscription_data: { metadata: { user_id: user.id, plan: plan.id } },
    });
    return json({ url: session.url });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
