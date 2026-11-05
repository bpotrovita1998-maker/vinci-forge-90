import { describe, expect, it } from "vitest";
import { formatDate, isLowBalance as lowCheck, isProviderEmpty, remainingBalance } from "./provider-balance";

describe("remainingBalance", () => {
  it("subtracts only runs made after the balance was entered", () => {
    const runs = [
      { estimated_cost_usd: 0.5, created_at: "2026-11-05T10:00:00Z" },
      { estimated_cost_usd: 1, created_at: "2026-11-05T12:00:00Z" },
    ];
    expect(remainingBalance(6.68, "2026-11-05T11:00:00Z", runs)).toBe(5.68);
  });
});


describe("formatDate", () => {
  it("uses DD/MM/YYYY", () => {
    expect(formatDate("2026-11-05T09:07:00")).toBe("05/11/2026 09:07");
  });
});


describe("owner balance warnings", () => {
  it("warns below the default 20 dollar limit", () => {
    expect(lowCheck(19.99)).toBe(true);
    expect(lowCheck(20)).toBe(false);
  });

  it("uses the limit the owner chose", () => {
    expect(lowCheck(40, 50)).toBe(true);
    expect(lowCheck(60, 50)).toBe(false);
  });

  it("shows the empty-balance alert until a newer balance is saved", () => {
    expect(isProviderEmpty("2026-11-05T16:00:00Z", "2026-11-05T15:00:00Z")).toBe(true);
    expect(isProviderEmpty("2026-11-05T16:00:00Z", "2026-11-05T17:00:00Z")).toBe(false);
    expect(isProviderEmpty(null, "2026-11-05T17:00:00Z")).toBe(false);
  });
});
