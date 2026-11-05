import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { adminClient, corsHeaders, getUser, json } from "../_shared/auth-user.ts";

// Admin-only: moves base64 images embedded in jobs rows into file storage,
// a few jobs per call so each call stays small.
const BATCH = 3;

const dataUrlPattern = /^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabase = adminClient();
    const user = await getUser(req, supabase);
    if (!user) return json({ error: "Unauthorized" }, 401);
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const { data: ids, error } = await supabase.rpc("jobs_with_base64_outputs", { _limit: BATCH });
    if (error) throw error;

    const upload = async (userId: string, jobId: string, key: string, value: unknown): Promise<unknown> => {
      if (typeof value !== "string") return value;
      const m = value.match(dataUrlPattern);
      if (!m) return value;
      const [, format, content] = m;
      const bin = atob(content);
      const bytes = new Uint8Array(bin.length);
      for (let j = 0; j < bin.length; j++) bytes[j] = bin.charCodeAt(j);
      const path = `${userId}/${jobId}/migrated_${key}.${format}`;
      const { error: upErr } = await supabase.storage
        .from("generated-models")
        .upload(path, bytes, { contentType: `image/${format}`, upsert: true });
      if (upErr) throw upErr;
      return supabase.storage.from("generated-models").getPublicUrl(path).data.publicUrl;
    };

    let migrated = 0;
    for (const row of (ids ?? []) as { id: string }[]) {
      const { data: job } = await supabase
        .from("jobs").select("id, user_id, outputs, compressed_outputs").eq("id", row.id).single();
      if (!job) continue;
      const outs = Array.isArray(job.outputs) ? job.outputs : [];
      const comp = Array.isArray(job.compressed_outputs) ? job.compressed_outputs : null;
      const newOuts = [];
      for (let i = 0; i < outs.length; i++) newOuts.push(await upload(job.user_id, job.id, `image_${i}`, outs[i]));
      let newComp = comp;
      if (comp) {
        newComp = [];
        for (let i = 0; i < comp.length; i++) {
          // Compressed copy identical to original: reuse the uploaded URL
          newComp.push(comp[i] === outs[i] ? newOuts[i] : await upload(job.user_id, job.id, `compressed_${i}`, comp[i]));
        }
      }
      const { error: updErr } = await supabase
        .from("jobs").update({ outputs: newOuts, compressed_outputs: newComp }).eq("id", job.id);
      if (updErr) throw updErr;
      await supabase.from("user_files").update({ file_url: newOuts[0] as string })
        .eq("job_id", job.id).like("file_url", "data:%");
      migrated++;
    }

    const { data: left } = await supabase.rpc("jobs_with_base64_outputs", { _limit: 1000 });
    return json({ migrated, remaining: (left ?? []).length });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
