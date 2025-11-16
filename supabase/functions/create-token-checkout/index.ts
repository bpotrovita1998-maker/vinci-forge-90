import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-TOKEN-CHECKOUT] ${step}${detailsStr}`);
};

// Token package price IDs
const TOKEN_PACKAGES: Record<number, string> = {
  20: "price_1SU46PE6ku5aODnpnGe9AknB",  // $20 for 2000 tokens
  30: "price_1SU46mE6ku5aODnpHSSdAF2X",  // $30 for 3000 tokens
  50: "price_1SU478E6ku5aODnpxYms7AR3",  // $50 for 5000 tokens
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    
    if (!user?.email) {
      throw new Error("User not authenticated or email not available");
    }
    
    const { amount, tokens } = await req.json();
    
    if (!amount || !tokens) {
      throw new Error("Amount and tokens are required");
    }

    logStep("User authenticated", { userId: user.id, email: user.email, amount, tokens });

    const priceId = TOKEN_PACKAGES[amount];
    if (!priceId) {
      throw new Error(`Invalid amount: ${amount}. Must be 20, 30, or 50`);
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    } else {
      logStep("No existing customer found");
    }

    // Create checkout session for token package (one-time payment)
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/pricing?token_session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/pricing`,
      metadata: {
        user_id: user.id,
        tokens: tokens.toString(),
        amount: amount.toString(),
      },
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
