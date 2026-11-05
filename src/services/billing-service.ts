import { supabase } from "@/integrations/supabase/client";
import { extractFunctionError } from "@/lib/function-error";

type UrlResponse = { url?: string; error?: string };

const invokeForUrl = async (name: string, body?: Record<string, unknown>): Promise<string> => {
  const { data, error } = await supabase.functions.invoke<UrlResponse>(name, { body });
  if (error || !data?.url) throw new Error(await extractFunctionError(error, data));
  return data.url;
};

export const startPlanCheckout = (plan: string): Promise<string> =>
  invokeForUrl("create-subscription-checkout", { plan });

export const startCreditPackCheckout = (packId: string): Promise<string> =>
  invokeForUrl("create-token-checkout", { packId });

export const openBillingPortal = (): Promise<string> => invokeForUrl("customer-portal");

export const syncMySubscription = async (): Promise<{ plan?: string; credits_granted?: number }> => {
  const { data, error } = await supabase.functions.invoke<{ plan?: string; credits_granted?: number; error?: string }>("check-subscription");
  if (error) throw new Error(await extractFunctionError(error, data));
  return data ?? {};
};

export const confirmCreditPack = async (sessionId: string): Promise<number> => {
  const { data, error } = await supabase.functions.invoke<{ tokens_added?: number; error?: string }>("verify-token-payment", {
    body: { session_id: sessionId },
  });
  if (error) throw new Error(await extractFunctionError(error, data));
  return data?.tokens_added ?? 0;
};
