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
          
          if (scenePrompts && scenePrompts.length > 0) {
            // Trigger next scene generation
            await supabase.functions.invoke('generate-video', {
              body: {
                jobId: job.id,
                scenePrompts: scenePrompts,
                duration: updatedJob.duration || 5,
                aspectRatio: `${updatedJob.width}:${updatedJob.height}`,
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
