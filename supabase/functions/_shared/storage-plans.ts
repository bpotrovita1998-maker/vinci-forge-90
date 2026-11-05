// Server copy of src/lib/storage-plans.ts (edge functions cannot import from src)
// deno-lint-ignore-file no-explicit-any
const GB = 1024 ** 3;

export const STORAGE_PLAN_BY_PRICE: Record<string, { plan: string; quotaBytes: number }> = {
  price_1UYQYsE6ku5aODnpc4CGErtc: { plan: "creator", quotaBytes: 50 * GB },
  price_1UYQZkE6ku5aODnpNvuDPbjR: { plan: "studio", quotaBytes: 250 * GB },
  price_1UYQZyE6ku5aODnp6RjQrDLS: { plan: "business", quotaBytes: 1024 * GB },
};

export const FREE_QUOTA_BYTES = 2 * GB;

/** Returns null when the user has room, otherwise a friendly error message. */
export async function checkStorageRoom(admin: any, userId: string): Promise<string | null> {
  const [{ data: used }, { data: sub }] = await Promise.all([
    admin.rpc("get_storage_usage", { _user_id: userId }),
    admin.from("storage_subscriptions").select("quota_bytes, status").eq("user_id", userId).maybeSingle(),
  ]);
  const quota = sub && sub.status === "active" ? Number(sub.quota_bytes) : FREE_QUOTA_BYTES;
  if (Number(used ?? 0) < quota) return null;
  return "Your storage is full. Upgrade your storage plan or delete older creations to keep generating.";
}
