import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const regenerateSchema = z.object({
  jobId: z.string().uuid(),
  sceneIndex: z.number().min(0),
  scenePrompt: z.string().min(1),
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse and validate request
    const body = await req.json();
    const validationResult = regenerateSchema.safeParse(body);
    
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid parameters', 
          details: validationResult.error.issues 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { jobId, sceneIndex, scenePrompt } = validationResult.data;

    console.log(`Regenerating scene ${sceneIndex} for job ${jobId}`);

    // Get job details
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      throw new Error('Job not found');
    }

    const manifest = job.manifest as any || {};
    const scenePrompts = manifest.scenePrompts as string[] || [];

    if (!scenePrompts || sceneIndex >= scenePrompts.length) {
      throw new Error('Invalid scene index');
    }

    // Update manifest to mark this scene for regeneration
    const updatedManifest = {
      ...manifest,
      regeneratingSceneIndex: sceneIndex,
      currentSceneIndex: sceneIndex,
      scenePrompts: scenePrompts,
    };

    // Update job status
    await supabase
      .from('jobs')
      .update({
        status: 'running',
        progress_stage: `Regenerating scene ${sceneIndex + 1}`,
        progress_percent: 10,
        progress_message: `Regenerating scene ${sceneIndex + 1} of ${scenePrompts.length}...`,
        manifest: updatedManifest
      })
      .eq('id', jobId);

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
        return "16:9";
      } else {
        // Portrait - default to 9:16
        return "9:16";
      }
    };
    
    const aspectRatio = calculateAspectRatio(job.width, job.height);
    console.log(`Calculated aspect ratio for regeneration: ${aspectRatio} from ${job.width}x${job.height}`);
    
    // Start scene generation
    const { error: generateError } = await supabase.functions.invoke('generate-video', {
      body: {
        jobId,
        scenePrompts: scenePrompts,
        duration: job.duration || 5,
        aspectRatio: aspectRatio,
        negativePrompt: job.negative_prompt,
        seed: job.seed
      }
    });

    if (generateError) {
      console.error('Error starting generation:', generateError);
      throw generateError;
    }

    console.log(`Scene ${sceneIndex} regeneration started successfully`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Scene ${sceneIndex + 1} regeneration started` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in regenerate-scene:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to regenerate scene' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
