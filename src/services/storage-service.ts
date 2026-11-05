import { supabase } from "@/integrations/supabase/client";
import { FREE_QUOTA_BYTES, quotaForPlan } from "@/lib/subscription-plans";

export interface StorageStatus {
  planId: string;
  usedBytes: number;
  quotaBytes: number;
  periodEnd: string | null;
}

export const fetchStorageStatus = async (userId: string): Promise<StorageStatus> => {
  const [usage, sub] = await Promise.all([
    supabase.rpc("get_my_storage_usage"),
    supabase.from("subscriptions").select("plan, status, current_period_end").eq("user_id", userId).maybeSingle(),
  ]);
  if (usage.error) throw usage.error;
  const active = sub.data?.status === "active";
  const planId = active ? sub.data?.plan ?? "free" : "free";
  return {
    planId,
    usedBytes: Number(usage.data ?? 0),
    quotaBytes: active ? quotaForPlan(planId) : FREE_QUOTA_BYTES,
    periodEnd: active ? sub.data?.current_period_end ?? null : null,
  };
};
