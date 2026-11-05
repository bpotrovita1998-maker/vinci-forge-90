import { HardDrive } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useStorageStatus } from "@/hooks/use-storage-status";
import { formatBytes, usagePercent } from "@/lib/storage-plans";

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
