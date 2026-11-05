import { supabase } from "@/integrations/supabase/client";

export interface ProviderRun {
  id: string;
  user_id: string;
  provider_model: string;
  prediction_id: string | null;
  estimated_cost_usd: number;
  credits_charged: number;
  owner_mode: boolean;
  created_at: string;
}

export interface UsageEntry {
  id: string;
  action_type: string;
  tokens_used: number;
  created_at: string;
  cost_breakdown: { source?: string; refunded?: boolean } | null;
}

export const fetchMyUsage = async (userId: string): Promise<UsageEntry[]> => {
  const { data, error } = await supabase
    .from("usage_logs")
    .select("id, action_type, tokens_used, created_at, cost_breakdown")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return (data ?? []) as UsageEntry[];
};

/** Own runs for users; every user's runs for the owner (row access decides). */
export const fetchProviderRuns = async (onlyUserId?: string): Promise<ProviderRun[]> => {
  let query = supabase
    .from("provider_runs")
    .select("id, user_id, provider_model, prediction_id, estimated_cost_usd, credits_charged, owner_mode, created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  if (onlyUserId) query = query.eq("user_id", onlyUserId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as ProviderRun[];
};

export interface ProviderBalance {
  balance_usd: number;
  set_at: string;
}

export const fetchProviderBalance = async (): Promise<ProviderBalance | null> => {
  const { data, error } = await supabase
    .from("provider_balance")
    .select("balance_usd, set_at")
    .eq("provider", "replicate")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as ProviderBalance | null;
};

export const saveProviderBalance = async (balanceUsd: number): Promise<void> => {
  const { error } = await supabase
    .from("provider_balance")
    .upsert({ provider: "replicate", balance_usd: balanceUsd, set_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
};
