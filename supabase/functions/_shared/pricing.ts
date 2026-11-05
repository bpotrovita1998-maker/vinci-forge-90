// Single source of truth for generation prices (1 credit = €0,01).
// Pure TypeScript so it can run in edge functions and unit tests.

export type GenerationType = "image" | "edit" | "video" | "3d" | "cad";
export type VideoModel = "animatediff" | "haiper" | "veo";
export type ActionType = "image_generation" | "video_generation" | "vectorization";

export const CREDIT_PRICES = {
  image: 2,
  edit: 2,
  video: { animatediff: 22, haiper: 42, veo: 165 } as Record<VideoModel, number>,
  "3d": 15,
  cad: 15,
} as const;

export interface CostInput {
  type: GenerationType;
  videoModel?: string;
  numImages?: number;
  numVideos?: number;
}

export interface CostResult {
  credits: number;
  units: number;
  actionType: ActionType;
}

const clampCount = (value: number | undefined, max: number): number => {
  const n = Math.floor(Number(value ?? 1));
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, max);
};

export const normalizeVideoModel = (model: string | undefined): VideoModel => {
  if (model === "haiper" || model === "animatediff") return model;
  return "veo";
};

export function calculateCost(input: CostInput): CostResult {
  switch (input.type) {
    case "image": {
      const units = clampCount(input.numImages, 8);
      return { credits: CREDIT_PRICES.image * units, units, actionType: "image_generation" };
    }
    case "edit":
      return { credits: CREDIT_PRICES.edit, units: 1, actionType: "image_generation" };
    case "video": {
      const units = clampCount(input.numVideos, 4);
      const model = normalizeVideoModel(input.videoModel);
      return { credits: CREDIT_PRICES.video[model] * units, units, actionType: "video_generation" };
    }
    case "3d":
      return { credits: CREDIT_PRICES["3d"], units: 1, actionType: "vectorization" };
    case "cad":
      return { credits: CREDIT_PRICES.cad, units: 1, actionType: "vectorization" };
    default:
      throw new Error("Unknown generation type");
  }
}
