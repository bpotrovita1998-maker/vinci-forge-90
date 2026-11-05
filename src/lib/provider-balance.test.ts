import { describe, expect, it } from "vitest";
import { formatDate, isLowBalance, remainingBalance } from "./provider-balance";

describe("remainingBalance", () => {
  it("subtracts only runs made after the balance was entered", () => {
    const runs = [
      { estimated_cost_usd: 0.5, created_at: "2026-11-05T10:00:00Z" },
      { estimated_cost_usd: 1, created_at: "2026-11-05T12:00:00Z" },
    ];
    expect(remainingBalance(6.68, "2026-11-05T11:00:00Z", runs)).toBe(5.68);
  });
});

describe("isLowBalance", () => {
  it("warns below $5", () => {
    expect(isLowBalance(4.99)).toBe(true);
    expect(isLowBalance(5)).toBe(false);
  });
});

describe("formatDate", () => {
  it("uses DD/MM/YYYY", () => {
    expect(formatDate("2026-11-05T09:07:00")).toBe("05/11/2026 09:07");
  });
});
