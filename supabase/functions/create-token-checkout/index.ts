import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { adminClient, corsHeaders, getUser, json } from "../_shared/auth-user.ts";
import { getPackById } from "../_shared/subscription-plans.ts";
import { createStripe, findCustomerId } from "../_shared/subscription-sync.ts";

const BodySchema = z.object({ packId: z.string().min(1).max(32) });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const admin = adminClient();
    const user = await getUser(req, admin);
    if (!user) return json({ error: "Please sign in" }, 401);

    const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
    const pack = parsed.success ? getPackById(parsed.data.packId) : undefined;
    if (!pack) return json({ error: "Unknown credit pack" }, 400);

    const { data: allowed } = await admin.rpc("can_use_service", { _user_id: user.id });
    if (!allowed) return json({ error: "Credit packs need an active plan. Choose Creator, Studio or Business first.", code: "plan_required" }, 403);

    const stripe = createStripe();
    const customerId = await findCustomerId(stripe, user.email);
    const origin = req.headers.get("origin") ?? "https://vinci-forge-ai.lovable.app";
    const session = await stripe.checkout.sessions.create({
      customer: customerId ?? undefined,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: pack.priceId, quantity: 1 }],
      mode: "payment",
      success_url: `${origin}/pricing?token_session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing`,
      metadata: { user_id: user.id, pack_id: pack.id, kind: "credits" },
    });
    return json({ url: session.url });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
