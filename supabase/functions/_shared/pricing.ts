// Single source of truth for generation prices (1 credit = €0,01).
// Pure TypeScript so it can run in edge functions and unit tests.

export type GenerationType = "image" | "edit" | "video" | "3d" | "cad";
export type VideoModel = "animatediff" | "haiper" | "veo";
export type ActionType = "image_generation" | "video_generation" | "vectorization";

// Rule: credits = real Replicate cost x 1,6 (about 35% profit after Stripe fees).
// Replicate prices checked 05/11/2026: Wan 2.5 $0,10/s (720p) and $0,15/s (1080p),
// Veo 3.1 $0,40/s with sound, Hunyuan3D 2.1 about $0,23 per model.
export type VideoResolution = "720p" | "1080p";

/** Credits per second of video, by model and resolution. */
export const VIDEO_CREDITS_PER_SECOND: Record<VideoModel, Record<VideoResolution, number>> = {
  animatediff: { "720p": 15, "1080p": 22 },
  haiper: { "720p": 8, "1080p": 8 },
  veo: { "720p": 60, "1080p": 60 },
};

/** Default clip length when the request does not say. */
export const DEFAULT_VIDEO_SECONDS: Record<VideoModel, number> = { animatediff: 5, haiper: 5, veo: 8 };

export const CREDIT_PRICES = {
  image: 6,
  edit: 6,
  /** Price of one default-length 720p clip, used for labels. */
  video: {
    animatediff: VIDEO_CREDITS_PER_SECOND.animatediff["720p"] * DEFAULT_VIDEO_SECONDS.animatediff,
    haiper: VIDEO_CREDITS_PER_SECOND.haiper["720p"] * DEFAULT_VIDEO_SECONDS.haiper,
    veo: VIDEO_CREDITS_PER_SECOND.veo["720p"] * DEFAULT_VIDEO_SECONDS.veo,
  } as Record<VideoModel, number>,
  "3d": 35,
  cad: 40,
} as const;

const clampSeconds = (model: VideoModel, value: number | undefined): number => {
  const n = Math.round(Number(value ?? DEFAULT_VIDEO_SECONDS[model]));
  if (!Number.isFinite(n) || n < 1) return DEFAULT_VIDEO_SECONDS[model];
  return Math.min(n, 10);
};

/** Credits for one clip of a given model, length and resolution. */
export function videoClipCredits(model: string | undefined, durationSeconds?: number, resolution?: string): number {
  const m = normalizeVideoModel(model);
  const res: VideoResolution = resolution === "1080p" ? "1080p" : "720p";
  return VIDEO_CREDITS_PER_SECOND[m][res] * clampSeconds(m, durationSeconds);
}

export interface CostInput {
  type: GenerationType;
  videoModel?: string;
  numImages?: number;
  numVideos?: number;
  durationSeconds?: number;
  resolution?: string;
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
      return { credits: videoClipCredits(model, input.durationSeconds, input.resolution) * units, units, actionType: "video_generation" };
    }
    case "3d":
      return { credits: CREDIT_PRICES["3d"], units: 1, actionType: "vectorization" };
    case "cad":
      return { credits: CREDIT_PRICES.cad, units: 1, actionType: "vectorization" };
    default:
      throw new Error("Unknown generation type");
  }
}

/**
 * Estimated real Replicate cost in USD per second of output video, by model and
 * resolution. Used only for owner spend reports and the low-balance warning.
 */
export const PROVIDER_USD_PER_SECOND: Record<VideoModel, { "720p": number; "1080p": number }> = {
  animatediff: { "720p": 0.1, "1080p": 0.15 },
  haiper: { "720p": 0.05, "1080p": 0.05 },
  veo: { "720p": 0.4, "1080p": 0.4 },
};

export function estimateProviderCostUsd(model: string | undefined, resolution: string | undefined, durationSeconds: number | undefined): number {
  const rates = PROVIDER_USD_PER_SECOND[normalizeVideoModel(model)];
  const rate = resolution === "1080p" ? rates["1080p"] : rates["720p"];
  const seconds = Math.max(1, Math.min(Number(durationSeconds ?? 5) || 5, 20));
  return Math.round(rate * seconds * 10000) / 10000;
}
