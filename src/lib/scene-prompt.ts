export interface ScenePromptOptions {
  base: string;
  characters?: string;
  motion?: string;
  style?: string;
  storyboardCharacter?: string;
  storyboardStyle?: string;
  storyboardBrand?: string;
}

const clean = (value: string | undefined): string => (value ?? "").replace(/\s+/g, " ").trim();

/**
 * Combines the scene prompt with characters, motion and art style.
 * Values chosen for this one generation win over the storyboard-wide settings.
 */
export function buildScenePrompt(options: ScenePromptOptions): string {
  const characters = clean(options.characters) || clean(options.storyboardCharacter);
  const style = clean(options.style) || clean(options.storyboardStyle);
  const parts = [
    clean(options.base),
    characters && `Characters: ${characters}`,
    clean(options.motion) && `Camera and motion: ${clean(options.motion)}`,
    style && `Art style: ${style}`,
    clean(options.storyboardBrand) && `Brand: ${clean(options.storyboardBrand)}`,
  ].filter(Boolean);
  return parts.join(". ").slice(0, 2000);
}

/** Wan 2.5 only renders 5 or 10 second clips. */
export const normalizeClipDuration = (seconds: number | undefined): 5 | 10 => (Number(seconds) >= 10 ? 10 : 5);

/** Order indexes after inserting a continuation right after the scene at `afterIndex`. */
export function insertAfter<T>(items: T[], afterIndex: number, item: T): T[] {
  const index = Math.min(Math.max(afterIndex + 1, 0), items.length);
  return [...items.slice(0, index), item, ...items.slice(index)];
}

/** Grabs the last frame of a video as a JPEG, so the next clip can start from it. */
export function extractLastFrame(videoUrl: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.preload = "auto";
    video.playsInline = true;
    const fail = () => reject(new Error("Could not read the last frame of this video"));
    video.onerror = fail;
    video.onloadedmetadata = () => {
      video.currentTime = Math.max(0, video.duration - 0.05);
    };
    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext("2d");
      if (!context || !canvas.width) return fail();
      context.drawImage(video, 0, 0);
      canvas.toBlob((blob) => (blob ? resolve(blob) : fail()), "image/jpeg", 0.92);
    };
    video.src = videoUrl;
  });
}
