import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { fetchMyUsage, fetchProviderBalance, fetchProviderRuns, saveProviderBalance } from "@/services/usage-service";
import { formatDate, formatUsd, isLowBalance, remainingBalance } from "@/lib/provider-balance";

const ACTION_LABELS: Record<string, string> = {
  image_generation: "Image",
  video_generation: "Video",
  vectorization: "3D / CAD",
  refund: "Refund",
};

function GenerationHistory() {
  const { user } = useAuth();
  const { isAdmin } = useSubscription();
  const queryClient = useQueryClient();
  const [balanceInput, setBalanceInput] = useState("");
  const [thresholdInput, setThresholdInput] = useState("");

  const usage = useQuery({
    queryKey: ["my-usage", user?.id],
    enabled: !!user,
    queryFn: () => fetchMyUsage(user!.id),
  });

  const allRuns = useQuery({
    queryKey: ["provider-runs", isAdmin],
    enabled: !!user && isAdmin,
    queryFn: () => fetchProviderRuns(),
  });

  const balance = useQuery({
    queryKey: ["provider-balance"],
    enabled: !!user && isAdmin,
    queryFn: fetchProviderBalance,
  });

  const saveBalance = useMutation({
    mutationFn: (v: { balance: number; threshold?: number }) => saveProviderBalance(v.balance, v.threshold),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider-balance"] });
      setBalanceInput("");
      setThresholdInput("");
      toast({ title: "Replicate balance saved" });
    },
    onError: (e: Error) => toast({ title: "Could not save", description: e.message, variant: "destructive" }),
  });

  const perUser = useMemo(() => {
    const map = new Map<string, { runs: number; cost: number; credits: number; owner: boolean }>();
    for (const r of allRuns.data ?? []) {
      const row = map.get(r.user_id) ?? { runs: 0, cost: 0, credits: 0, owner: false };
      row.runs += 1;
      row.cost += Number(r.estimated_cost_usd);
      row.credits += Number(r.credits_charged);
      row.owner = row.owner || r.owner_mode;
      map.set(r.user_id, row);
    }
    return [...map.entries()].sort((a, b) => b[1].cost - a[1].cost);
  }, [allRuns.data]);

  const remaining = balance.data
    ? remainingBalance(Number(balance.data.balance_usd), balance.data.set_at, allRuns.data ?? [])
    : null;

  return (
    <div className="min-h-screen">
      <div className="h-20" />
      <div className="container mx-auto max-w-6xl space-y-6 px-4 py-8">
        <div>
          <h1 className="text-3xl font-bold">Generation history</h1>
          <p className="text-muted-foreground">Every generation on your account and the credits it used.</p>
        </div>

        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle>Replicate spend (owner)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-end">
                <div className="flex-1 space-y-1">
                  <p className="text-sm text-muted-foreground">Estimated Replicate balance</p>
                  {remaining === null ? (
                    <p className="text-sm">Enter your current Replicate balance to track it.</p>
                  ) : (
                    <p className="flex items-center gap-2 text-2xl font-semibold">
                      {formatUsd(remaining)}
                      {isLowBalance(remaining, Number(balance.data?.low_balance_threshold_usd ?? 20)) && (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="h-3 w-3" /> Top up soon
                        </Badge>
                      )}
                    </p>
                  )}
                  {balance.data && (
                    <p className="text-xs text-muted-foreground">
                      Entered {formatUsd(Number(balance.data.balance_usd))} on {formatDate(balance.data.set_at)}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Input
                    aria-label="Current Replicate balance in dollars"
                    inputMode="decimal"
                    placeholder="6,68"
                    value={balanceInput}
                    onChange={(e) => setBalanceInput(e.target.value)}
                    className="w-32"
                  />
                  <Input
                    aria-label="Warn me below this many dollars"
                    inputMode="decimal"
                    placeholder={`Warn below ${balance.data?.low_balance_threshold_usd ?? 20}`}
                    value={thresholdInput}
                    onChange={(e) => setThresholdInput(e.target.value)}
                    className="w-40"
                  />
                  <Button
                    disabled={!balanceInput || saveBalance.isPending}
                    onClick={() => {
                      const value = Number(balanceInput.replace(",", "."));
                      const threshold = thresholdInput ? Number(thresholdInput.replace(",", ".")) : undefined;
                      if (!Number.isFinite(value) || value < 0) return;
                      if (threshold !== undefined && (!Number.isFinite(threshold) || threshold < 0)) return;
                      saveBalance.mutate({ balance: value, threshold });
                    }}
                  >
                    Save balance
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead className="text-right">Generations</TableHead>
                      <TableHead className="text-right">Credits paid</TableHead>
                      <TableHead className="text-right">Replicate cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {perUser.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-muted-foreground">No generations recorded yet.</TableCell>
                      </TableRow>
                    )}
                    {perUser.map(([userId, row]) => (
                      <TableRow key={userId}>
                        <TableCell className="font-mono text-xs">
                          {userId === user?.id ? "You (owner mode)" : `${userId.slice(0, 8)}…`}
                        </TableCell>
                        <TableCell className="text-right">{row.runs}</TableCell>
                        <TableCell className="text-right">{row.credits.toLocaleString("de-DE")}</TableCell>
                        <TableCell className="text-right">{formatUsd(row.cost)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Your generations</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Paid with</TableHead>
                  <TableHead className="text-right">Credits</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(usage.data ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground">
                      {usage.isLoading ? "Loading..." : "No generations yet."}
                    </TableCell>
                  </TableRow>
                )}
                {(usage.data ?? []).map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>{formatDate(u.created_at)}</TableCell>
                    <TableCell>{ACTION_LABELS[u.action_type] ?? u.action_type}</TableCell>
                    <TableCell>
                      {u.cost_breakdown?.source === "owner"
                        ? "Owner (Replicate)"
                        : u.cost_breakdown?.source === "free_tokens"
                          ? "Free generations"
                          : "Credits"}
                    </TableCell>
                    <TableCell className="text-right">{Number(u.tokens_used).toLocaleString("de-DE")}</TableCell>
                    <TableCell>
                      {u.cost_breakdown?.refunded ? <Badge variant="outline">Refunded</Badge> : <Badge variant="secondary">Done</Badge>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export { GenerationHistory };
export default GenerationHistory;
