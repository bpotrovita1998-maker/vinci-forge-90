import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchStorageStatus } from "@/services/storage-service";

export const useStorageStatus = () => {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setUserId(session?.user.id ?? null));
    return () => listener.subscription.unsubscribe();
  }, []);

  const query = useQuery({
    queryKey: ["storage-status", userId],
    queryFn: () => fetchStorageStatus(userId as string),
    enabled: Boolean(userId),
    staleTime: 60_000,
  });

  return { ...query, isSignedIn: Boolean(userId) };
};
