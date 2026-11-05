import { useQuery } from "@tanstack/react-query";
import { useSubscription } from "@/hooks/useSubscription";
import { fetchProviderBalance, fetchProviderCostsSince } from "@/services/usage-service";
import { DEFAULT_LOW_BALANCE_USD, isLowBalance, isProviderEmpty, remainingBalance } from "@/lib/provider-balance";

export interface OwnerBalance {
  remainingUsd: number | null;
  thresholdUsd: number;
  low: boolean;
  empty: boolean;
}

/** The owner's estimated Replicate balance. Only loads for the GM account. */
export function useOwnerBalance(): OwnerBalance | null {
  const { isAdmin } = useSubscription();
  const balance = useQuery({
    queryKey: ["provider-balance"],
    enabled: isAdmin,
    queryFn: fetchProviderBalance,
    refetchInterval: 60_000,
  });
  const setAt = balance.data?.set_at;
  const costs = useQuery({
    queryKey: ["provider-costs-since", setAt],
    enabled: isAdmin && !!setAt,
    queryFn: () => fetchProviderCostsSince(setAt!),
    refetchInterval: 60_000,
  });

  if (!isAdmin) return null;
  const data = balance.data;
  if (!data) return { remainingUsd: null, thresholdUsd: DEFAULT_LOW_BALANCE_USD, low: false, empty: false };
  const thresholdUsd = Number(data.low_balance_threshold_usd ?? DEFAULT_LOW_BALANCE_USD);
  const remainingUsd = remainingBalance(Number(data.balance_usd), data.set_at, costs.data ?? []);
  return {
    remainingUsd,
    thresholdUsd,
    low: isLowBalance(remainingUsd, thresholdUsd),
    empty: isProviderEmpty(data.empty_reported_at, data.set_at),
  };
}
