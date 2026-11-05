import { supabase } from "@/integrations/supabase/client";
import { STORAGE_PLANS, getStoragePlan } from "@/lib/storage-plans";

export interface StorageStatus {
  planId: string;
  usedBytes: number;
  quotaBytes: number;
  periodEnd: string | null;
}

export const fetchStorageStatus = async (userId: string): Promise<StorageStatus> => {
  const [usage, plan] = await Promise.all([
    supabase.rpc("get_my_storage_usage"),
    supabase.from("storage_subscriptions").select("plan, quota_bytes, status, current_period_end").eq("user_id", userId).maybeSingle(),
  ]);
  if (usage.error) throw usage.error;
  const active = plan.data && plan.data.status === "active";
  const planId = active ? plan.data!.plan : "free";
  return {
    planId,
    usedBytes: Number(usage.data ?? 0),
    quotaBytes: active ? Number(plan.data!.quota_bytes) : STORAGE_PLANS[0].quotaBytes,
    periodEnd: active ? plan.data!.current_period_end : null,
  };
};

export const startStorageCheckout = async (planId: string): Promise<string> => {
  const priceId = getStoragePlan(planId).priceId;
  if (!priceId) throw new Error("This plan is free and needs no checkout.");
  const { data, error } = await supabase.functions.invoke<{ url?: string; error?: string }>("create-storage-checkout", {
    body: { priceId },
  });
  if (error || !data?.url) throw new Error(data?.error ?? "We couldn't open the checkout. Please try again.");
  return data.url;
};
