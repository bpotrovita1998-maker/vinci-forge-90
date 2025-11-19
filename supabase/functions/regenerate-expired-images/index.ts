import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Checking expired images for user:', user.id);

    // Get service role client for database operations
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all completed image jobs for this user
    const { data: imageJobs, error: fetchError } = await supabase
      .from('jobs')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', 'image')
      .eq('status', 'completed')
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('Error fetching jobs:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch jobs' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!imageJobs || imageJobs.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No image jobs found', expiredCount: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${imageJobs.length} image jobs, checking for expired URLs...`);

    // Check which images have expired URLs
    const expiredJobs: typeof imageJobs = [];
    
    for (const job of imageJobs) {
      const outputs = job.outputs as string[];
      if (!outputs || outputs.length === 0) continue;

      // Check if URL is from Replicate (temporary) or contains expired signed URLs
      const firstUrl = outputs[0];
      const isReplicateUrl = firstUrl.includes('replicate.delivery');
      const isExpiredSignedUrl = firstUrl.includes('token=') && firstUrl.includes('supabase.co/storage');
      const isNotPublicUrl = !firstUrl.includes('supabase.co/storage/v1/object/public/');

      if (isReplicateUrl || (isExpiredSignedUrl && isNotPublicUrl)) {
        expiredJobs.push(job);
      }
    }

    console.log(`Found ${expiredJobs.length} jobs with expired URLs`);

    if (expiredJobs.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No expired images found',
          expiredCount: 0,
          totalChecked: imageJobs.length
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Start background regeneration process
    const regenerationPromises = expiredJobs.map(async (job) => {
      try {
        console.log(`Regenerating job ${job.id} with prompt: ${job.prompt.substring(0, 50)}...`);
        
        // Update job status to processing
        await supabase
          .from('jobs')
          .update({
            status: 'processing',
            progress_stage: 'regenerating',
            progress_percent: 0,
            error: null
          })
          .eq('id', job.id);

        // Call generate-image function with the original parameters
        const generateResponse = await fetch(`${supabaseUrl}/functions/v1/generate-image`, {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: job.prompt,
            width: job.width || 1024,
            height: job.height || 1024,
            numImages: job.num_images || 1,
            jobId: job.id
          })
        });

        if (!generateResponse.ok) {
          const errorText = await generateResponse.text();
          console.error(`Failed to regenerate job ${job.id}:`, errorText);
          
          // Mark job as failed
          await supabase
            .from('jobs')
            .update({
              status: 'failed',
              error: `Regeneration failed: ${errorText}`,
              progress_stage: 'failed'
            })
            .eq('id', job.id);
          
          return { jobId: job.id, success: false, error: errorText };
        }

        const result = await generateResponse.json();
        console.log(`Successfully regenerated job ${job.id}`);
        
        return { jobId: job.id, success: true, images: result.images };
      } catch (error) {
        console.error(`Error regenerating job ${job.id}:`, error);
        
        await supabase
          .from('jobs')
          .update({
            status: 'failed',
            error: `Regeneration error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            progress_stage: 'failed'
          })
          .eq('id', job.id);
        
        return { 
          jobId: job.id, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    });

    // Start regeneration process in background
    // Note: We respond immediately and process in background
    const regenerateInBackground = async () => {
      const results = await Promise.allSettled(regenerationPromises);
      console.log(`Regeneration complete. Processed ${results.length} jobs`);
    };

    // Start background process without blocking
    regenerateInBackground();

    // Return immediate response
    return new Response(
      JSON.stringify({ 
        message: 'Regeneration started',
        expiredCount: expiredJobs.length,
        totalChecked: imageJobs.length,
        jobIds: expiredJobs.map(j => j.id)
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in regenerate-expired-images:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
