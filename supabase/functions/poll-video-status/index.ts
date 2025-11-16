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
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Polling video generation status...");

    // Find all running video jobs with prediction IDs
    const { data: runningJobs, error: fetchError } = await supabase
      .from('jobs')
      .select('*')
      .eq('type', 'video')
      .eq('status', 'running')
      .not('manifest->predictionId', 'is', null);

    if (fetchError) {
      console.error("Error fetching running jobs:", fetchError);
      throw fetchError;
    }

    if (!runningJobs || runningJobs.length === 0) {
      console.log("No running video jobs to poll");
      return new Response(JSON.stringify({ message: "No jobs to poll" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${runningJobs.length} running jobs to check`);

    // Check status for each running job
    for (const job of runningJobs) {
      try {
        const manifest = job.manifest as any;
        const predictionId = manifest?.predictionId;

        if (!predictionId) continue;

        console.log(`Checking status for job ${job.id}, prediction ${predictionId}`);

        // Call generate-video to check status
        const { data: statusData, error: statusError } = await supabase.functions.invoke('generate-video', {
          body: {
            jobId: job.id,
            predictionId: predictionId
          }
        });

        if (statusError) {
          console.error(`Error checking status for ${job.id}:`, statusError);
          continue;
        }

        console.log(`Job ${job.id} status: ${statusData?.status}`);
        
        // If video completed and there are more scenes to generate, trigger next scene
        if (statusData?.status === 'succeeded' && statusData?.allScenesComplete === false) {
          console.log(`Scene completed for job ${job.id}, triggering next scene...`);
          
          // Get updated job data to get the scenePrompts
          const { data: updatedJob } = await supabase
            .from('jobs')
            .select('manifest, prompt, negative_prompt, duration, width, height')
            .eq('id', job.id)
            .single();
            
          if (!updatedJob) {
            console.error(`Could not fetch job data for ${job.id}`);
            continue;
          }
            
          const updatedManifest = updatedJob.manifest as any;
          const scenePrompts = updatedManifest?.scenePrompts;
          
          // Calculate proper aspect ratio format for Pixverse
          const calculateAspectRatio = (width: number, height: number): string => {
            const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
            const divisor = gcd(width, height);
            const ratioWidth = width / divisor;
            const ratioHeight = height / divisor;
            
            // Map to Pixverse supported formats: 16:9, 9:16, or 1:1
            if (ratioWidth === ratioHeight) return "1:1";
            if (ratioWidth > ratioHeight) {
              const ratio = ratioWidth / ratioHeight;
              if (Math.abs(ratio - 16/9) < 0.1) return "16:9";
              return "16:9";
            } else {
              return "9:16";
            }
          };
          
          const aspectRatio = calculateAspectRatio(updatedJob.width, updatedJob.height);
          console.log(`Calculated aspect ratio for next scene: ${aspectRatio} from ${updatedJob.width}x${updatedJob.height}`);
          
          if (scenePrompts && scenePrompts.length > 0) {
            // Trigger next scene generation
            await supabase.functions.invoke('generate-video', {
              body: {
                jobId: job.id,
                scenePrompts: scenePrompts,
                duration: updatedJob.duration || 5,
                aspectRatio: aspectRatio,
                negativePrompt: updatedJob.negative_prompt
              }
            });
            
            console.log(`Next scene generation triggered for job ${job.id}`);
          }
        }
      } catch (error) {
        console.error(`Error processing job ${job.id}:`, error);
        // Continue to next job even if one fails
      }
    }

    return new Response(JSON.stringify({ 
      message: "Status polling complete",
      jobsChecked: runningJobs.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error in poll-video-status:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Polling failed"
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
