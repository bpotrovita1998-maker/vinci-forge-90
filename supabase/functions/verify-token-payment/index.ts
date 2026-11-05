import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { adminClient, corsHeaders, getUser, json } from "../_shared/auth-user.ts";
import { getPackById } from "../_shared/subscription-plans.ts";
import { createStripe } from "../_shared/subscription-sync.ts";

const BodySchema = z.object({ session_id: z.string().startsWith("cs_").max(255) });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const admin = adminClient();
    const user = await getUser(req, admin);
    if (!user) return json({ error: "Please sign in" }, 401);

    const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: "Invalid payment reference" }, 400);

    const session = await createStripe().checkout.sessions.retrieve(parsed.data.session_id);
    if (session.metadata?.user_id !== user.id) return json({ error: "This payment belongs to another account" }, 403);
    if (session.payment_status !== "paid") return json({ error: "Payment not completed yet" }, 402);

    const pack = getPackById(session.metadata?.pack_id);
    if (!pack) return json({ error: "Unknown credit pack" }, 400);

    const { data: granted, error } = await admin.rpc("grant_credits", {
      _user_id: user.id,
      _ref: `checkout:${session.id}`,
      _credits: pack.credits,
      _kind: pack.id,
    });
    if (error) throw new Error(error.message);
    return json({ success: true, tokens_added: granted ? pack.credits : 0, already_added: !granted });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
