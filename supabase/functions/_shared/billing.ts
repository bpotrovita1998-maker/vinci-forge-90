import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { calculateCost, type CostInput } from "./pricing.ts";

export type ChargeResult =
  | { ok: true; jobRef: string; chargedNow: boolean }
  | { ok: false; status: number; error: string };

interface ClaimResponse {
  status: "ok" | "missing" | "used" | "refunded" | "underpaid";
  units?: number;
}

/**
 * Makes sure a generation step is paid for before an AI provider is called.
 * - If the job was paid earlier (check-and-deduct-tokens), the step is claimed once.
 * - Otherwise the price is charged now on the server.
 */
export async function requireCharge(
  admin: SupabaseClient,
  params: { userId: string; jobRef?: string | null; step: string; cost: CostInput; minUnits?: number },
): Promise<ChargeResult> {
  const jobRef = params.jobRef || crypto.randomUUID();
  let chargedNow = false;

  const claim = async (): Promise<ClaimResponse> => {
    const { data, error } = await admin.rpc("claim_generation_step", {
      _user_id: params.userId,
      _job_ref: jobRef,
      _step: params.step,
      _min_units: params.minUnits ?? 1,
    });
    if (error) throw new Error(error.message);
    return data as ClaimResponse;
  };

  let result = await claim();

  if (result.status === "missing") {
    const price = calculateCost(params.cost);
    const { error } = await admin.rpc("charge_generation", {
      _user_id: params.userId,
      _job_ref: jobRef,
      _action_type: price.actionType,
      _credits: price.credits,
      _units: price.units,
    });
    if (error) return { ok: false, status: 402, error: error.message };
    chargedNow = true;
    result = await claim();
  }

  if (result.status === "used") {
    return { ok: false, status: 409, error: "This generation was already used. Start a new one." };
  }
  if (result.status === "refunded") {
    return { ok: false, status: 402, error: "This generation was refunded. Start a new one." };
  }
  if (result.status === "underpaid") {
    return { ok: false, status: 402, error: "You paid for fewer items than requested. Start a new generation." };
  }
  if (result.status !== "ok") {
    return { ok: false, status: 402, error: "Payment for this generation could not be confirmed." };
  }

  return { ok: true, jobRef, chargedNow };
}

export async function refundCharge(admin: SupabaseClient, jobRef: string, reason: string): Promise<void> {
  const { error } = await admin.rpc("refund_generation", { _job_ref: jobRef, _reason: reason.slice(0, 300) });
  if (error) console.error("Refund failed:", error.message);
}

export interface BillingState {
  jobRef: string | null;
  admin: SupabaseClient | null;
}

export const PROVIDER_EMPTY_MESSAGE =
  "Video generation is paused for a few minutes, your credits were not used.";

/** True when an AI provider error says the account has no money left (HTTP 402). */
export function isProviderOutOfCredit(text: string): boolean {
  return /insufficient credit|payment required|\b402\b|billing.*(required|limit)/i.test(text);
}

async function reportProviderEmpty(admin: SupabaseClient): Promise<void> {
  const { error } = await admin
    .from("provider_balance")
    .update({ empty_reported_at: new Date().toISOString() })
    .eq("provider", "replicate");
  if (error) console.error("Could not report empty provider balance:", error.message);
}

/** Wraps a request handler so a paid generation is refunded when it ends in an error. */
export function withRefundOnFailure(
  handler: (req: Request, billing: BillingState) => Promise<Response>,
  corsHeaders: Record<string, string>,
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    const billing: BillingState = { jobRef: null, admin: null };
    let response: Response;
    try {
      response = await handler(req, billing);
    } catch (error) {
      response = new Response(
        JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (response.status >= 400) {
      const body = await response.clone().text().catch(() => "");
      if (isProviderOutOfCredit(body)) {
        // The owner's Replicate balance is empty: tell the owner and give the user a clear message
        if (billing.admin) await reportProviderEmpty(billing.admin);
        response = new Response(
          JSON.stringify({ error: PROVIDER_EMPTY_MESSAGE, code: "provider_balance_empty" }),
          { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (billing.jobRef && billing.admin) {
        await refundCharge(billing.admin, billing.jobRef, `Generation failed (${response.status})`);
      }
    }
    return response;
  };
}

/**
 * Records one AI provider job with its estimated real cost, so the owner can
 * compare provider spend with the credits users paid. Never blocks generation.
 */
export async function recordProviderRun(
  admin: SupabaseClient,
  params: { jobRef: string | null | undefined; model: string; predictionId: string; costUsd: number },
): Promise<void> {
  try {
    let userId: string | null = null;
    let credits = 0;
    let ownerMode = false;
    if (params.jobRef) {
      const { data } = await admin
        .from("usage_logs")
        .select("user_id, tokens_used, cost_breakdown")
        .eq("cost_breakdown->>job_ref", params.jobRef)
        .neq("action_type", "refund")
        .limit(1)
        .maybeSingle();
      if (data) {
        userId = data.user_id as string;
        credits = Number(data.tokens_used ?? 0);
        ownerMode = (data.cost_breakdown as { source?: string } | null)?.source === "owner";
      }
    }
    if (!userId) return;
    await admin.from("provider_runs").insert({
      user_id: userId,
      job_ref: params.jobRef,
      provider_model: params.model,
      prediction_id: params.predictionId,
      estimated_cost_usd: params.costUsd,
      credits_charged: credits,
      owner_mode: ownerMode,
    });
  } catch (error) {
    console.error("Could not record provider run:", error instanceof Error ? error.message : error);
  }
}
