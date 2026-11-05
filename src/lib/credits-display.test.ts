import { describe, expect, it } from "vitest";
import { formatCredits, freeGenerationsLabel, remainingFreeGenerations } from "./credits-display";

describe("credits display", () => {
  it("formats credits the European way", () => {
    expect(formatCredits(1250)).toBe("1.250");
    expect(formatCredits(12.5)).toBe("12,5");
    expect(formatCredits(0)).toBe("0");
  });

  it("adds welcome and ad generations together", () => {
    expect(remainingFreeGenerations({ free_tokens_granted: 5, free_tokens_used: 3, ad_generations_remaining: 5 })).toBe(7);
  });

  it("never shows negative free generations", () => {
    expect(remainingFreeGenerations({ free_tokens_granted: 5, free_tokens_used: 9, ad_generations_remaining: 0 })).toBe(0);
    expect(freeGenerationsLabel({ free_tokens_granted: 5, free_tokens_used: 9 })).toBe("");
  });

  it("uses singular for one free image", () => {
    expect(freeGenerationsLabel({ free_tokens_granted: 1, free_tokens_used: 0 })).toBe("1 free image");
  });
});
