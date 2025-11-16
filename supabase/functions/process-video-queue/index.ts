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

    // Extract storyboard settings for consistency
    let characterDescription = '';
    let styleDescription = '';
    let referenceImage = '';
    let seed: number | undefined;

    const manifest = job.manifest as any;
    if (manifest?.storyboard_id) {
      console.log(`Loading storyboard settings: ${manifest.storyboard_id}`);
      const { data: storyboard } = await supabase
        .from('storyboards')
        .select('settings')
        .eq('id', manifest.storyboard_id)
        .single();

      if (storyboard?.settings) {
        const settings = storyboard.settings as any;
        characterDescription = [
          settings.character,
          settings.brand
        ].filter(Boolean).join(', ');
        
        styleDescription = settings.style || '';
        
        // Use a consistent seed based on storyboard ID for cross-scene consistency
        seed = parseInt(manifest.storyboard_id.replace(/-/g, '').slice(0, 8), 16);
        console.log(`Using seed ${seed} for consistency across storyboard`);
      }
    }

    // Try to find a reference image from a previous completed scene in the same storyboard
    if (manifest?.storyboard_id) {
      const { data: previousScenes } = await supabase
        .from('storyboard_scenes')
        .select('image_url, order_index')
        .eq('storyboard_id', manifest.storyboard_id)
        .eq('status', 'ready')
        .not('image_url', 'is', null)
        .order('order_index', { ascending: true })
        .limit(1);

      if (previousScenes && previousScenes.length > 0) {
        referenceImage = previousScenes[0].image_url!;
        console.log(`Using reference image for character consistency: ${referenceImage}`);
      }
    }

    // Call the generate-video function with consistency parameters
    // Handle multiple videos by calling generate-video multiple times
    const numVideos = job.num_videos || 1;
    console.log(`Generating ${numVideos} video(s) for job ${job.id}`);
    console.log(`Job details - FPS: ${job.fps}, Duration: ${job.duration}, Dimensions: ${job.width}x${job.height}`);
    
    // Calculate proper aspect ratio format for Pixverse
    const calculateAspectRatio = (width: number, height: number): string => {
      const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
      const divisor = gcd(width, height);
      const ratioWidth = width / divisor;
      const ratioHeight = height / divisor;
      
      // Map to Pixverse supported formats: 16:9, 9:16, or 1:1
      if (ratioWidth === ratioHeight) return "1:1";
      if (ratioWidth > ratioHeight) {
        // Landscape - check if it's close to 16:9
        const ratio = ratioWidth / ratioHeight;
        if (Math.abs(ratio - 16/9) < 0.1) return "16:9";
        // Default to 16:9 for other landscape ratios
        return "16:9";
      } else {
        // Portrait - default to 9:16
        return "9:16";
      }
    };
    
    const aspectRatio = calculateAspectRatio(job.width, job.height);
    console.log(`Calculated aspect ratio: ${aspectRatio} from ${job.width}x${job.height}`);
    
    // Generate all videos with the same prompt but different seeds for variation
    for (let i = 0; i < numVideos; i++) {
      const videoSeed = seed ? seed + i : undefined; // Vary seed for each video
      console.log(`Starting generation ${i + 1} of ${numVideos} with seed: ${videoSeed}...`);
      
      try {
        const { data: result, error: invokeError } = await supabase.functions.invoke('generate-video', {
          body: {
            jobId: job.id,
            prompt: job.prompt,
            duration: job.duration,
            aspectRatio: aspectRatio,
            characterDescription,
            styleDescription,
            referenceImage,
            seed: videoSeed
          }
        });

        if (invokeError) {
          console.error(`Error invoking generate-video for video ${i + 1}:`, JSON.stringify(invokeError));
          // Continue with other videos even if one fails
        } else {
          console.log(`Video ${i + 1} generation started successfully:`, JSON.stringify(result));
        }
      } catch (error) {
        console.error(`Exception calling generate-video for video ${i + 1}:`, error);
      }
      
      // Add a small delay between starting multiple generations to avoid rate limits
      if (i < numVideos - 1) {
        console.log(`Waiting 1 second before starting video ${i + 2}...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`Finished processing queue for job ${job.id}`);

    return new Response(JSON.stringify({ 
      message: "Queue processed",
      processedJob: job.id,
      numVideos: numVideos,
      success: true
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

