import { AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { useOwnerBalance } from "@/hooks/use-owner-balance";
import { formatUsd } from "@/lib/provider-balance";

/** Red warning for the GM when the Replicate balance is low or empty. Hidden for everyone else. */
export function OwnerBalanceBanner() {
  const owner = useOwnerBalance();
  if (!owner || (!owner.low && !owner.empty)) return null;

  const text = owner.empty
    ? "Replicate rejected a generation because your balance is empty. Customers' credits were refunded. Top up Replicate now."
    : `Your Replicate balance is about ${formatUsd(owner.remainingUsd ?? 0)}, below your ${formatUsd(owner.thresholdUsd)} limit. Top up soon so generations keep working.`;

  return (
    <div role="alert" data-testid="owner-balance-banner" className="fixed inset-x-0 top-20 z-40 border-b border-destructive/40 bg-destructive px-4 py-2 text-sm text-destructive-foreground">
      <div className="container mx-auto flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 shrink-0" />{text}</span>
        <span className="flex gap-3 font-semibold">
          <a href="https://replicate.com/account/billing" target="_blank" rel="noreferrer" className="underline">Top up Replicate</a>
          <Link to="/history" className="underline">Update balance</Link>
        </span>
      </div>
    </div>
  );
}
