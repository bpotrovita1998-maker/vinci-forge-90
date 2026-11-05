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
    if (response.status >= 400 && billing.jobRef && billing.admin) {
      await refundCharge(billing.admin, billing.jobRef, `Generation failed (${response.status})`);
    }
    return response;
  };
}
