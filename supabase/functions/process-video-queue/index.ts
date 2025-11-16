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

    console.log("Processing video generation queue...");

    // Find all queued video jobs, ordered by creation time
    const { data: queuedJobs, error: fetchError } = await supabase
      .from('jobs')
      .select('*')
      .eq('type', 'video')
      .eq('status', 'queued')
      .order('created_at', { ascending: true })
      .limit(1); // Process one at a time to avoid rate limits

    if (fetchError) {
      console.error("Error fetching queued jobs:", fetchError);
      throw fetchError;
    }

    if (!queuedJobs || queuedJobs.length === 0) {
      console.log("No queued video jobs found");
      return new Response(JSON.stringify({ message: "No jobs in queue" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const job = queuedJobs[0];
    console.log(`Processing job: ${job.id}`);

    // Mark job as running
    await supabase
      .from('jobs')
      .update({
        status: 'running',
        progress_stage: 'Preparing video generation',
        started_at: new Date().toISOString()
      })
      .eq('id', job.id);

    // Call the generate-video function
    const { data: result, error: invokeError } = await supabase.functions.invoke('generate-video', {
      body: {
        jobId: job.id,
        prompt: job.prompt,
        duration: job.duration,
        aspectRatio: `${job.width}:${job.height}`
      }
    });

    if (invokeError) {
      console.error("Error invoking generate-video:", invokeError);
      
      // Check if it's a rate limit error
      if (invokeError.message?.includes('429') || invokeError.message?.includes('rate limit')) {
        console.log("Rate limit hit, requeueing job");
        // Requeue the job to try again later
        await supabase
          .from('jobs')
          .update({
            status: 'queued',
            progress_stage: 'Waiting in queue (rate limit)',
            progress_message: 'Waiting for API rate limit to reset...'
          })
          .eq('id', job.id);
      } else {
        // Other error, mark as failed
        await supabase
          .from('jobs')
          .update({
            status: 'failed',
            progress_stage: 'failed',
            error: invokeError.message || 'Failed to generate video',
            completed_at: new Date().toISOString()
          })
          .eq('id', job.id);
      }
    } else {
      console.log(`Job ${job.id} started successfully`);
    }

    return new Response(JSON.stringify({ 
      message: "Queue processed",
      processedJob: job.id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error in process-video-queue:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Queue processing failed"
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

