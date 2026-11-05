import { useState } from "react";
import { HardDrive, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useStorageStatus } from "@/hooks/use-storage-status";
import { startStorageCheckout } from "@/services/storage-service";
import { STORAGE_PLANS, formatBytes, formatEur, usagePercent } from "@/lib/storage-plans";

export const StorageUsageBar = () => {
  const { data } = useStorageStatus();
  if (!data) return null;
  const percent = usagePercent(data.usedBytes, data.quotaBytes);
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="flex items-center gap-2"><HardDrive className="h-4 w-4 text-primary" />Storage used</span>
        <span className="text-muted-foreground">{formatBytes(data.usedBytes)} of {formatBytes(data.quotaBytes)}</span>
      </div>
      <Progress value={percent} aria-label="Storage used" />
      {percent >= 90 && <p className="text-sm text-destructive">Your storage is almost full. Upgrade to keep creating.</p>}
    </div>
  );
};

export const StoragePlansSection = () => {
  const { data, isSignedIn } = useStorageStatus();
  const { toast } = useToast();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleChoose = async (planId: string) => {
    setLoadingPlan(planId);
    try {
      const url = await startStorageCheckout(planId);
      window.open(url, "_blank");
    } catch (error) {
      toast({ title: "Checkout unavailable", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <section aria-labelledby="storage-plans-heading" className="space-y-6">
      <div className="text-center space-y-2">
        <h2 id="storage-plans-heading" className="text-2xl font-bold">Storage plans</h2>
        <p className="text-muted-foreground">Keep every image and video you create, safely stored and ready to download.</p>
      </div>
      {isSignedIn && <Card className="p-4"><StorageUsageBar /></Card>}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {STORAGE_PLANS.map((plan) => {
          const isCurrent = (data?.planId ?? "free") === plan.id;
          return (
            <Card key={plan.id} className={isCurrent ? "border-primary" : "border-border/50"}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{plan.name}</CardTitle>
                  {isCurrent && <Badge>Your plan</Badge>}
                </div>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="text-3xl font-bold">{formatBytes(plan.quotaBytes)}</div>
                <div className="text-muted-foreground">{plan.priceEur === 0 ? "Free" : `${formatEur(plan.priceEur)} per month`}</div>
              </CardContent>
              <CardFooter>
                {plan.priceId && (
                  <Button className="w-full" disabled={!isSignedIn || isCurrent || loadingPlan !== null} onClick={() => handleChoose(plan.id)}>
                    {loadingPlan === plan.id ? <Loader2 className="h-4 w-4 animate-spin" /> : isCurrent ? "Current plan" : `Choose ${plan.name}`}
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>
      <p className="text-center text-sm text-muted-foreground">
        Need more for your company? Contact us for an Enterprise plan with custom storage.
      </p>
    </section>
  );
};
