// Storage plans sold in the app. Keep in sync with supabase/functions/_shared/storage-plans.ts
export type StoragePlanId = "free" | "creator" | "studio" | "business";

export interface StoragePlan {
  id: StoragePlanId;
  name: string;
  quotaBytes: number;
  priceEur: number;
  priceId: string | null;
  description: string;
}

const GB = 1024 ** 3;

export const STORAGE_PLANS: readonly StoragePlan[] = [
  { id: "free", name: "Free", quotaBytes: 2 * GB, priceEur: 0, priceId: null, description: "Try it out with your first creations." },
  { id: "creator", name: "Creator", quotaBytes: 50 * GB, priceEur: 4.99, priceId: "price_1UYQYsE6ku5aODnpc4CGErtc", description: "About 7.000 HD video clips." },
  { id: "studio", name: "Studio", quotaBytes: 250 * GB, priceEur: 19.99, priceId: "price_1UYQZkE6ku5aODnpNvuDPbjR", description: "For busy creators and small teams." },
  { id: "business", name: "Business", quotaBytes: 1024 * GB, priceEur: 59.99, priceId: "price_1UYQZyE6ku5aODnp6RjQrDLS", description: "For agencies and brands with large libraries." },
];

export const getStoragePlan = (id: string): StoragePlan =>
  STORAGE_PLANS.find((plan) => plan.id === id) ?? STORAGE_PLANS[0];

export const hasStorageRoom = (usedBytes: number, quotaBytes: number, incomingBytes = 0): boolean =>
  usedBytes + incomingBytes <= quotaBytes;

export const usagePercent = (usedBytes: number, quotaBytes: number): number =>
  quotaBytes <= 0 ? 100 : Math.min(100, Math.round((usedBytes / quotaBytes) * 100));

export const formatBytes = (bytes: number): string => {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toLocaleString("de-DE", { maximumFractionDigits: 1 })} ${units[index]}`;
};

export const formatEur = (amount: number): string =>
  amount.toLocaleString("de-DE", { style: "currency", currency: "EUR" });
