// Single source of truth for subscription plans and credit packs.
// Pure TypeScript so it runs in edge functions, the browser and unit tests.

const GB = 1024 ** 3;

export type PlanId = "free" | "creator" | "studio" | "business";

export interface SubscriptionPlan {
  id: Exclude<PlanId, "free">;
  name: string;
  priceId: string;
  priceCents: number;
  monthlyCredits: number;
  quotaBytes: number;
  storageLabel: string;
}

export const FREE_QUOTA_BYTES = 2 * GB;

export const SUBSCRIPTION_PLANS: readonly SubscriptionPlan[] = [
  { id: "creator", name: "Creator", priceId: "price_1UYRGXE6ku5aODnpNCVcpIkd", priceCents: 2499, monthlyCredits: 1500, quotaBytes: 50 * GB, storageLabel: "50 GB" },
  { id: "studio", name: "Studio", priceId: "price_1UYRGmE6ku5aODnpcTDidDxm", priceCents: 6999, monthlyCredits: 4000, quotaBytes: 250 * GB, storageLabel: "250 GB" },
  { id: "business", name: "Business", priceId: "price_1UYRH3E6ku5aODnphwwmw5bJ", priceCents: 19900, monthlyCredits: 11000, quotaBytes: 1024 * GB, storageLabel: "1 TB" },
];

export interface CreditPack {
  id: string;
  priceId: string;
  priceCents: number;
  credits: number;
}

export const CREDIT_PACKS: readonly CreditPack[] = [
  { id: "pack-10", priceId: "price_1UYRHME6ku5aODnpVRfaJrUu", priceCents: 1000, credits: 1000 },
  { id: "pack-25", priceId: "price_1UYRISE6ku5aODnp5eZpBNTh", priceCents: 2500, credits: 2600 },
  { id: "pack-50", priceId: "price_1UYRJhE6ku5aODnpfL4ppUkA", priceCents: 5000, credits: 5300 },
  { id: "pack-100", priceId: "price_1UYRJsE6ku5aODnpXzaHEvZN", priceCents: 10000, credits: 11000 },
];

export const getPlanById = (id: string | null | undefined): SubscriptionPlan | undefined =>
  SUBSCRIPTION_PLANS.find((p) => p.id === id);

export const getPlanByPriceId = (priceId: string | null | undefined): SubscriptionPlan | undefined =>
  SUBSCRIPTION_PLANS.find((p) => p.priceId === priceId);

export const getPackById = (id: string | null | undefined): CreditPack | undefined =>
  CREDIT_PACKS.find((p) => p.id === id);

export const getPackByPriceId = (priceId: string | null | undefined): CreditPack | undefined =>
  CREDIT_PACKS.find((p) => p.priceId === priceId);

/** Storage quota for a plan id; unknown or inactive plans get the free quota. */
export const quotaForPlan = (planId: string | null | undefined): number =>
  getPlanById(planId)?.quotaBytes ?? FREE_QUOTA_BYTES;
