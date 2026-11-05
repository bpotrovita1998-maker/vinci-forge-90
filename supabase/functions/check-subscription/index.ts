import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { adminClient, corsHeaders, getUser, json } from "../_shared/auth-user.ts";
import { createStripe, findCustomerId, syncSubscription } from "../_shared/subscription-sync.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const admin = adminClient();
    const user = await getUser(req, admin);
    if (!user) return json({ error: "Please sign in" }, 401);

    const stripe = createStripe();
    const customerId = await findCustomerId(stripe, user.email);
    if (!customerId) {
      await admin.from("subscriptions").update({ status: "inactive", plan: "free", updated_at: new Date().toISOString() }).eq("user_id", user.id);
      return json({ subscribed: false, plan: "free", subscription_end: null });
    }
    const result = await syncSubscription(stripe, admin, user.id, customerId);
    return json({
      subscribed: result.subscribed,
      plan: result.plan,
      subscription_end: result.subscriptionEnd,
      credits_granted: result.creditsGranted,
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
