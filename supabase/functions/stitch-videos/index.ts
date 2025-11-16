import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { videoUrls, jobId } = await req.json();

    if (!videoUrls || !Array.isArray(videoUrls) || videoUrls.length === 0) {
      return new Response(
        JSON.stringify({ error: "videoUrls array is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Stitching ${videoUrls.length} videos for job ${jobId}`);

    // Update job status
    await supabase
      .from('jobs')
      .update({
        progress_stage: 'encoding',
        progress_message: 'Stitching video parts together...',
        progress_percent: 85
      })
      .eq('id', jobId);

    // Get job details
    const { data: jobData } = await supabase
      .from('jobs')
      .select('user_id')
      .eq('id', jobId)
      .single();

    if (!jobData) {
      throw new Error('Job not found');
    }

    // Download all video parts
    console.log("Downloading video parts...");
    const videoBlobs: Uint8Array[] = [];
    
    for (let i = 0; i < videoUrls.length; i++) {
      console.log(`Downloading video part ${i + 1}/${videoUrls.length}...`);
      const response = await fetch(videoUrls[i]);
      if (!response.ok) {
        throw new Error(`Failed to download video ${i + 1}: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      videoBlobs.push(new Uint8Array(arrayBuffer));
    }

    console.log("All video parts downloaded, concatenating...");

    // Create FFmpeg concat file list
    const fileListContent = videoBlobs.map((_, i) => `file 'video${i}.mp4'`).join('\n');
    
    // Use FFmpeg to concatenate videos
    // Note: This is a simplified approach. For production, consider using:
    // 1. A proper FFmpeg Deno module
    // 2. A containerized FFmpeg service
    // 3. A cloud-based video processing service
    
    // For now, we'll use a workaround: write videos to temp files and use FFmpeg CLI
    const tempDir = await Deno.makeTempDir();
    
    try {
      // Write video files
      for (let i = 0; i < videoBlobs.length; i++) {
        await Deno.writeFile(`${tempDir}/video${i}.mp4`, videoBlobs[i]);
      }
      
      // Write concat list
      await Deno.writeTextFile(`${tempDir}/filelist.txt`, fileListContent);
      
      // Run FFmpeg concat
      console.log("Running FFmpeg concatenation...");
      const ffmpegProcess = new Deno.Command("ffmpeg", {
        args: [
          "-f", "concat",
          "-safe", "0",
          "-i", `${tempDir}/filelist.txt`,
          "-c", "copy",
          `${tempDir}/output.mp4`
        ],
        stdout: "piped",
        stderr: "piped"
      });
      
      const { code, stdout, stderr } = await ffmpegProcess.output();
      
      if (code !== 0) {
        const errorOutput = new TextDecoder().decode(stderr);
        console.error("FFmpeg error:", errorOutput);
        
        // Fallback: Use first video if FFmpeg fails
        console.log("FFmpeg failed, using first video as fallback");
        const fallbackVideo = videoBlobs[0];
        const fileName = `${jobData.user_id}/${jobId}/final_stitched.mp4`;
        
        const { error: uploadError } = await supabase.storage
          .from('generated-models')
          .upload(fileName, fallbackVideo.buffer, {
            contentType: 'video/mp4',
            upsert: true
          });

        if (uploadError) throw uploadError;

        const { data: signedUrlData } = await supabase.storage
          .from('generated-models')
          .createSignedUrl(fileName, 604800);

        const finalUrl = signedUrlData?.signedUrl;
        if (!finalUrl) throw new Error('Failed to create signed URL');

        await supabase
          .from('jobs')
          .update({
            outputs: [finalUrl],
            status: 'completed',
            progress_stage: 'completed',
            progress_percent: 100,
            progress_message: 'Video generation complete! (Note: Scenes not stitched)',
            completed_at: new Date().toISOString()
          })
          .eq('id', jobId);

        return new Response(
          JSON.stringify({ 
            success: true, 
            videoUrl: finalUrl,
            stitched: false 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Read the stitched output
      console.log("FFmpeg concatenation successful, uploading...");
      const stitchedVideo = await Deno.readFile(`${tempDir}/output.mp4`);
      
      // Upload final stitched video
      const fileName = `${jobData.user_id}/${jobId}/final_stitched.mp4`;
      const { error: uploadError } = await supabase.storage
        .from('generated-models')
        .upload(fileName, stitchedVideo.buffer, {
          contentType: 'video/mp4',
          upsert: true
        });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        throw uploadError;
      }

      // Get signed URL
      const { data: signedUrlData } = await supabase.storage
        .from('generated-models')
        .createSignedUrl(fileName, 604800);

      const finalUrl = signedUrlData?.signedUrl;
      if (!finalUrl) throw new Error('Failed to create signed URL');

      console.log("Final stitched video stored at:", finalUrl);

      // Update job with final video
      await supabase
        .from('jobs')
        .update({
          outputs: [finalUrl],
          status: 'completed',
          progress_stage: 'completed',
          progress_percent: 100,
          progress_message: 'Video stitched successfully!',
          completed_at: new Date().toISOString()
        })
        .eq('id', jobId);

      return new Response(
        JSON.stringify({ 
          success: true, 
          videoUrl: finalUrl,
          stitched: true 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
      
    } finally {
      // Cleanup temp files
      try {
        await Deno.remove(tempDir, { recursive: true });
      } catch (e) {
        console.error("Failed to cleanup temp directory:", e);
      }
    }

  } catch (error) {
    console.error("Error stitching videos:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Failed to stitch videos" 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
