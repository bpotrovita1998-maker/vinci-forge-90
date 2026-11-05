import { describe, expect, it } from "vitest";
import { CREDIT_PACKS, CREDIT_PRICES, getPlanById, quotaForPlan, FREE_QUOTA_BYTES } from "./subscription-plans";

const GB = 1024 ** 3;

describe("subscription plans", () => {
  it("Creator costs €24,99 with 50 GB and 1.500 credits", () => {
    expect(getPlanById("creator")).toMatchObject({ priceCents: 2499, monthlyCredits: 1500, quotaBytes: 50 * GB });
  });
  it("Studio costs €69,99 with 250 GB and 4.000 credits", () => {
    expect(getPlanById("studio")).toMatchObject({ priceCents: 6999, monthlyCredits: 4000, quotaBytes: 250 * GB });
  });
  it("Business costs €199 with 1 TB and 11.000 credits", () => {
    expect(getPlanById("business")).toMatchObject({ priceCents: 19900, monthlyCredits: 11000, quotaBytes: 1024 * GB });
  });
  it("free or unknown plans get 2 GB", () => {
    expect(quotaForPlan("free")).toBe(FREE_QUOTA_BYTES);
    expect(quotaForPlan("pro")).toBe(2 * GB);
  });
});

describe("credit packs", () => {
  it("give 1.000 / 2.600 / 5.300 / 11.000 credits for €10 / €25 / €50 / €100", () => {
    expect(CREDIT_PACKS.map((p) => [p.priceCents, p.credits])).toEqual([
      [1000, 1000], [2500, 2600], [5000, 5300], [10000, 11000],
    ]);
  });
});

describe("generation prices", () => {
  it("match the agreed list", () => {
    expect(CREDIT_PRICES.image).toBe(2);
    expect(CREDIT_PRICES.video).toEqual({ animatediff: 22, haiper: 42, veo: 165 });
    expect(CREDIT_PRICES["3d"]).toBe(15);
    expect(CREDIT_PRICES.cad).toBe(15);
  });
});
