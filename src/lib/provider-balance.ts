export const LOW_BALANCE_USD = 5;

interface RunCost {
  estimated_cost_usd: number;
  created_at: string;
}

/** Owner-entered balance minus the estimated cost of every run since it was entered. */
export function remainingBalance(balanceUsd: number, setAt: string, runs: RunCost[]): number {
  const since = new Date(setAt).getTime();
  const spent = runs
    .filter((r) => new Date(r.created_at).getTime() >= since)
    .reduce((sum, r) => sum + Number(r.estimated_cost_usd || 0), 0);
  return Math.round((balanceUsd - spent) * 100) / 100;
}

export const isLowBalance = (remaining: number): boolean => remaining < LOW_BALANCE_USD;

export const formatUsd = (value: number): string =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "USD" }).format(value);

export const formatDate = (iso: string): string => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
