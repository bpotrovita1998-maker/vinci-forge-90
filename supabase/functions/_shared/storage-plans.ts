// deno-lint-ignore-file no-explicit-any
import { FREE_QUOTA_BYTES, quotaForPlan } from "./subscription-plans.ts";

export { FREE_QUOTA_BYTES };

/** Returns null when the user has room, otherwise a friendly error message. */
export async function checkStorageRoom(admin: any, userId: string): Promise<string | null> {
  const [{ data: used }, { data: sub }, { data: legacy }] = await Promise.all([
    admin.rpc("get_storage_usage", { _user_id: userId }),
    admin.from("subscriptions").select("plan, status").eq("user_id", userId).maybeSingle(),
    admin.from("storage_subscriptions").select("quota_bytes, status").eq("user_id", userId).maybeSingle(),
  ]);
  const planQuota = sub && sub.status === "active" ? quotaForPlan(sub.plan) : FREE_QUOTA_BYTES;
  const legacyQuota = legacy && legacy.status === "active" ? Number(legacy.quota_bytes) : 0;
  const quota = Math.max(planQuota, legacyQuota);
  if (Number(used ?? 0) < quota) return null;
  return "Your storage is full. Upgrade your plan or delete older creations to keep generating.";
}
