// deno-lint-ignore-file no-explicit-any
import Stripe from "https://esm.sh/stripe@14.21.0";
import { getPlanByPriceId, type PlanId } from "./subscription-plans.ts";

export const createStripe = (): Stripe =>
  new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", { apiVersion: "2023-10-16" });

export interface SyncResult {
  subscribed: boolean;
  plan: PlanId;
  subscriptionEnd: string | null;
  creditsGranted: number;
}

/**
 * Reads the user's active Stripe subscription, stores the plan, and grants the
 * plan's monthly credits once per paid invoice (safe to call any number of times).
 */
export async function syncSubscription(
  stripe: Stripe,
  admin: any,
  userId: string,
  customerId: string,
): Promise<SyncResult> {
  const subs = await stripe.subscriptions.list({ customer: customerId, status: "active", limit: 5 });
  const sub = subs.data.find((s) => getPlanByPriceId(s.items.data[0]?.price.id));

  if (!sub) {
    await admin.from("subscriptions").update({
      status: "inactive",
      plan: "free",
      stripe_customer_id: customerId,
      stripe_subscription_id: null,
      current_period_start: null,
      current_period_end: null,
      updated_at: new Date().toISOString(),
    }).eq("user_id", userId);
    return { subscribed: false, plan: "free", subscriptionEnd: null, creditsGranted: 0 };
  }

  const plan = getPlanByPriceId(sub.items.data[0].price.id)!;
  const subscriptionEnd = new Date(sub.current_period_end * 1000).toISOString();

  await admin.from("subscriptions").upsert({
    user_id: userId,
    status: "active",
    plan: plan.id,
    stripe_customer_id: customerId,
    stripe_subscription_id: sub.id,
    current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
    current_period_end: subscriptionEnd,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });

  let creditsGranted = 0;
  const invoiceId = typeof sub.latest_invoice === "string" ? sub.latest_invoice : sub.latest_invoice?.id;
  if (invoiceId) {
    const invoice = await stripe.invoices.retrieve(invoiceId);
    if (invoice.status === "paid") {
      const { data: granted, error } = await admin.rpc("grant_credits", {
        _user_id: userId,
        _ref: `invoice:${invoice.id}`,
        _credits: plan.monthlyCredits,
        _kind: `plan:${plan.id}`,
      });
      if (error) throw new Error(error.message);
      if (granted) creditsGranted = plan.monthlyCredits;
    }
  }

  return { subscribed: true, plan: plan.id, subscriptionEnd, creditsGranted };
}

export async function findCustomerId(stripe: Stripe, email: string): Promise<string | null> {
  const customers = await stripe.customers.list({ email, limit: 1 });
  return customers.data[0]?.id ?? null;
}
