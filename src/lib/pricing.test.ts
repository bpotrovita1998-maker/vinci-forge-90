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
    expect(calculateCost({ type: "video", videoModel: "haiper" }).credits).toBe(30);
    expect(calculateCost({ type: "video", videoModel: "animatediff" }).credits).toBe(15);
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
    expect(calculateCost({ type: "3d" }).credits).toBe(10);
    expect(calculateCost({ type: "cad" }).credits).toBe(10);
  });
});
