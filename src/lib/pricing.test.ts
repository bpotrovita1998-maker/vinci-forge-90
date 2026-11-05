import { describe, expect, it } from "vitest";
import { calculateCost, CREDIT_PRICES } from "../../supabase/functions/_shared/pricing";

describe("server price list", () => {
  it("charges one image price per image", () => {
    expect(calculateCost({ type: "image", numImages: 4 })).toEqual({
      credits: CREDIT_PRICES.image * 4,
      units: 4,
      actionType: "image_generation",
    });
  });

  it("charges Veo 3.1 for two videos at exactly twice the Veo price", () => {
    expect(calculateCost({ type: "video", videoModel: "veo", numVideos: 2 }).credits).toBe(
      CREDIT_PRICES.video.veo * 2,
    );
  });

  it("uses the model the user picked for video", () => {
    expect(calculateCost({ type: "video", videoModel: "haiper" }).credits).toBe(40);
    expect(calculateCost({ type: "video", videoModel: "animatediff" }).credits).toBe(75);
  });

  it("falls back to the most expensive video model for unknown names", () => {
    expect(calculateCost({ type: "video", videoModel: "free-please" }).credits).toBe(CREDIT_PRICES.video.veo);
  });

  it("never prices a generation at zero, even with a zero or negative count", () => {
    expect(calculateCost({ type: "image", numImages: 0 }).credits).toBeGreaterThan(0);
    expect(calculateCost({ type: "video", numVideos: -3 }).credits).toBeGreaterThan(0);
  });

  it("caps counts so one request cannot ask for unlimited items", () => {
    expect(calculateCost({ type: "image", numImages: 999 }).units).toBe(8);
    expect(calculateCost({ type: "video", numVideos: 999 }).units).toBe(4);
  });

  it("charges 3D and CAD models their own prices", () => {
    expect(calculateCost({ type: "3d" }).credits).toBe(35);
    expect(calculateCost({ type: "cad" }).credits).toBe(40);
  });

  it("charges images 6 credits each", () => {
    expect(calculateCost({ type: "image" }).credits).toBe(6);
  });

  it("charges Wan 2.5 by length and quality", () => {
    expect(calculateCost({ type: "video", videoModel: "animatediff", durationSeconds: 10 }).credits).toBe(150);
    expect(calculateCost({ type: "video", videoModel: "animatediff", durationSeconds: 5, resolution: "1080p" }).credits).toBe(110);
    expect(calculateCost({ type: "video", videoModel: "animatediff", durationSeconds: 10, resolution: "1080p" }).credits).toBe(220);
  });

  it("charges Veo 3.1 with sound 480 credits for 8 seconds", () => {
    expect(calculateCost({ type: "video", videoModel: "veo", durationSeconds: 8 }).credits).toBe(480);
  });

  it("never charges less than the Replicate cost (credit = 0,01 EUR, 1 USD = 0,93 EUR)", () => {
    const wanCostEur = 0.1 * 5 * 0.93;
    expect(calculateCost({ type: "video", videoModel: "animatediff" }).credits * 0.0091).toBeGreaterThan(wanCostEur);
    const veoCostEur = 0.4 * 8 * 0.93;
    expect(calculateCost({ type: "video", videoModel: "veo" }).credits * 0.0091).toBeGreaterThan(veoCostEur);
  });
});
