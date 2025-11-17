import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HardDrive, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface StorageData {
  storage_bytes_used: number;
  storage_limit_bytes: number;
}

export const StorageUsage = () => {
  const { user } = useAuth();
  const { isAdmin } = useSubscription();
  const [storageData, setStorageData] = useState<StorageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchStorageData = async () => {
      const { data, error } = await supabase
        .from("token_balances")
        .select("storage_bytes_used, storage_limit_bytes")
        .eq("user_id", user.id)
        .single();

      if (error) {
        console.error("Error fetching storage data:", error);
      } else {
        setStorageData(data);
      }
      setLoading(false);
    };

    fetchStorageData();

    // Set up real-time subscription for storage updates
    const channel = supabase
      .channel("storage_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "token_balances",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchStorageData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Don't show storage usage for admins (they have unlimited storage)
  if (isAdmin) {
    return null;
  }

  if (loading || !storageData) {
    return null;
  }

  const usedGB = (storageData.storage_bytes_used / 1073741824).toFixed(2);
  const limitGB = (storageData.storage_limit_bytes / 1073741824).toFixed(0);
  const percentUsed = (storageData.storage_bytes_used / storageData.storage_limit_bytes) * 100;
  const isNearLimit = percentUsed >= 80;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HardDrive className="h-5 w-5" />
          Storage Usage
        </CardTitle>
        <CardDescription>
          Files are automatically deleted after 90 days. Download important files before they expire.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Used</span>
            <span className="font-medium">
              {usedGB} GB / {limitGB} GB
            </span>
          </div>
          <Progress value={percentUsed} className="h-2" />
        </div>

        {isNearLimit && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You're running low on storage space. Consider downloading and deleting old files.
            </AlertDescription>
          </Alert>
        )}

        {percentUsed >= 100 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Storage limit reached! Delete some files or wait for old files to auto-delete after 90 days.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
