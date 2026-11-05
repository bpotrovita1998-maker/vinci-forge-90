import { supabase } from "@/integrations/supabase/client";
import { extractFunctionError } from "@/lib/function-error";

/** Pays for one scene video on the server; the price is decided there. */
export const payForSceneVideo = async (jobId: string, durationSeconds: number): Promise<void> => {
  const { data, error } = await supabase.functions.invoke<{ error?: string }>("check-and-deduct-tokens", {
    body: { jobId, type: "video", videoModel: "animatediff", numVideos: 1, durationSeconds, resolution: "720p" },
  });
  if (error) throw new Error(await extractFunctionError(error, data));
};

/** Saves a still frame permanently so a new clip can start from it. */
export const uploadStartFrame = async (userId: string, frame: Blob): Promise<string> => {
  const path = `${userId}/frames/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage
    .from("generated-models")
    .upload(path, frame, { contentType: "image/jpeg", upsert: false });
  if (error) throw new Error(error.message);
  return supabase.storage.from("generated-models").getPublicUrl(path).data.publicUrl;
};
