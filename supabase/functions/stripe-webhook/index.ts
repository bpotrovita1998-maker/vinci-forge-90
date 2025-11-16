import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Get webhook signature from headers
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      throw new Error("No signature provided");
    }

    // Get raw body for signature verification
    const body = await req.text();
    
    // Verify webhook signature
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!webhookSecret) {
      throw new Error("STRIPE_WEBHOOK_SECRET not configured");
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      logStep("Webhook signature verified", { type: event.type });
    } catch (err) {
      logStep("Webhook signature verification failed", { error: err.message });
      return new Response(JSON.stringify({ error: `Webhook Error: ${err.message}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create Supabase admin client for database operations
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Process event in background to respond quickly to Stripe
    const processEvent = async () => {
      try {
        switch (event.type) {
          case "checkout.session.completed": {
            const session = event.data.object as Stripe.Checkout.Session;
            logStep("Processing checkout.session.completed", { sessionId: session.id, mode: session.mode });

            const userId = session.metadata?.user_id;
            if (!userId) {
              logStep("No user_id in session metadata");
              break;
            }

            if (session.mode === "subscription") {
              // Handle subscription purchase
              const subscriptionId = session.subscription as string;
              const customerId = session.customer as string;
              
              const subscription = await stripe.subscriptions.retrieve(subscriptionId);
              
              await supabase
                .from("subscriptions")
                .update({
                  status: "active",
                  stripe_customer_id: customerId,
                  stripe_subscription_id: subscriptionId,
                  current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
                  current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                  updated_at: new Date().toISOString(),
                })
                .eq("user_id", userId);

              logStep("Subscription activated", { userId, subscriptionId });
            } else if (session.mode === "payment") {
              // Handle token purchase
              const tokens = parseInt(session.metadata?.tokens || "0");
              const amount = parseInt(session.metadata?.amount || "0");

              if (tokens > 0) {
                // Get current balance
                const { data: currentBalance } = await supabase
                  .from("token_balances")
                  .select("balance, total_purchased")
                  .eq("user_id", userId)
                  .single();

                if (currentBalance) {
                  await supabase
                    .from("token_balances")
                    .update({
                      balance: currentBalance.balance + tokens,
                      total_purchased: currentBalance.total_purchased + tokens,
                      updated_at: new Date().toISOString(),
                    })
                    .eq("user_id", userId);

                  logStep("Tokens added", { userId, tokens, amount });
                }
              }
            }
            break;
          }

          case "customer.subscription.updated": {
            const subscription = event.data.object as Stripe.Subscription;
            logStep("Processing customer.subscription.updated", { subscriptionId: subscription.id, status: subscription.status });

            const customerId = subscription.customer as string;
            
            await supabase
              .from("subscriptions")
              .update({
                status: subscription.status === "active" ? "active" : "inactive",
                current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
                current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq("stripe_subscription_id", subscription.id);

            logStep("Subscription updated", { subscriptionId: subscription.id, status: subscription.status });
            break;
          }

          case "customer.subscription.deleted": {
            const subscription = event.data.object as Stripe.Subscription;
            logStep("Processing customer.subscription.deleted", { subscriptionId: subscription.id });

            await supabase
              .from("subscriptions")
              .update({
                status: "inactive",
                current_period_start: null,
                current_period_end: null,
                updated_at: new Date().toISOString(),
              })
              .eq("stripe_subscription_id", subscription.id);

            logStep("Subscription cancelled", { subscriptionId: subscription.id });
            break;
          }

          case "invoice.payment_succeeded": {
            const invoice = event.data.object as Stripe.Invoice;
            logStep("Processing invoice.payment_succeeded", { invoiceId: invoice.id });

            if (invoice.subscription) {
              const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
              
              await supabase
                .from("subscriptions")
                .update({
                  status: "active",
                  current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
                  current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                  updated_at: new Date().toISOString(),
                })
                .eq("stripe_subscription_id", invoice.subscription as string);

              logStep("Subscription renewed", { subscriptionId: invoice.subscription });
            }
            break;
          }

          case "invoice.payment_failed": {
            const invoice = event.data.object as Stripe.Invoice;
            logStep("Processing invoice.payment_failed", { invoiceId: invoice.id });

            if (invoice.subscription) {
              await supabase
                .from("subscriptions")
                .update({
                  status: "past_due",
                  updated_at: new Date().toISOString(),
                })
                .eq("stripe_subscription_id", invoice.subscription as string);

              logStep("Subscription payment failed", { subscriptionId: invoice.subscription });
            }
            break;
          }

          default:
            logStep("Unhandled event type", { type: event.type });
        }
      } catch (error) {
        logStep("ERROR processing event", { type: event.type, error: error.message });
      }
    };

    // Process event in background
    EdgeRuntime.waitUntil(processEvent());

    // Return success immediately to Stripe
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
