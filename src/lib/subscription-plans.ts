export {
  SUBSCRIPTION_PLANS,
  CREDIT_PACKS,
  FREE_QUOTA_BYTES,
  getPlanById,
  getPackById,
  quotaForPlan,
} from "../../supabase/functions/_shared/subscription-plans";
export type { SubscriptionPlan, CreditPack, PlanId } from "../../supabase/functions/_shared/subscription-plans";
export { CREDIT_PRICES, videoClipCredits, VIDEO_CREDITS_PER_SECOND } from "../../supabase/functions/_shared/pricing";

const eur = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });
const num = new Intl.NumberFormat("de-DE");

export const formatCents = (cents: number): string => eur.format(cents / 100);
export const formatNumber = (n: number): string => num.format(n);

/** How many of an item a credit amount buys, rounded down. */
export const itemsFor = (credits: number, pricePerItem: number): number =>
  pricePerItem > 0 ? Math.floor(credits / pricePerItem) : 0;
