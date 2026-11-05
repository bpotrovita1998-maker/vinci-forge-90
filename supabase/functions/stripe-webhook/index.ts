import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import type Stripe from "https://esm.sh/stripe@14.21.0";
import { adminClient, corsHeaders, json } from "../_shared/auth-user.ts";
import { getPackById } from "../_shared/subscription-plans.ts";
import { createStripe, syncSubscription } from "../_shared/subscription-sync.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const stripe = createStripe();
  const signature = req.headers.get("stripe-signature");
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!signature || !secret) return json({ error: "Missing signature" }, 400);

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(await req.text(), signature, secret);
  } catch (err) {
    return json({ error: `Webhook Error: ${err instanceof Error ? err.message : String(err)}` }, 400);
  }

  const admin = adminClient();

  // Finds our user for a Stripe customer through the saved subscription row.
  const userForCustomer = async (customerId: string): Promise<string | null> => {
    const { data } = await admin.from("subscriptions").select("user_id").eq("stripe_customer_id", customerId).maybeSingle();
    return data?.user_id ?? null;
  };

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        if (!userId) break;
        if (session.mode === "subscription" && session.customer) {
          await syncSubscription(stripe, admin, userId, session.customer as string);
        } else if (session.mode === "payment" && session.payment_status === "paid") {
          const pack = getPackById(session.metadata?.pack_id);
          if (pack) {
            await admin.rpc("grant_credits", { _user_id: userId, _ref: `checkout:${session.id}`, _credits: pack.credits, _kind: pack.id });
          }
        }
        break;
      }
      case "invoice.paid":
      case "invoice.payment_succeeded":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const obj = event.data.object as { customer?: string | null; metadata?: Record<string, string> | null };
        const customerId = obj.customer as string | undefined;
        if (!customerId) break;
        const userId = obj.metadata?.user_id ?? (await userForCustomer(customerId));
        if (userId) await syncSubscription(stripe, admin, userId, customerId);
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          await admin.from("subscriptions").update({ status: "past_due", updated_at: new Date().toISOString() })
            .eq("stripe_subscription_id", invoice.subscription as string);
        }
        break;
      }
      default:
        break;
    }
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }

  return json({ received: true });
});
