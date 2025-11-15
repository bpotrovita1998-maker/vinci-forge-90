import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { jobIds } = await req.json();
    
    console.log(`Migrating ${jobIds?.length || 'all'} 3D models...`);

    // Get all 3D models with Replicate URLs that need migration
    let query = supabase
      .from('jobs')
      .select('id, user_id, outputs, prompt')
      .eq('type', '3d')
      .eq('status', 'completed');

    if (jobIds && Array.isArray(jobIds) && jobIds.length > 0) {
      query = query.in('id', jobIds);
    }

    const { data: jobs, error: fetchError } = await query;

    if (fetchError) throw fetchError;

    const results = [];

    for (const job of jobs || []) {
      try {
        const output = job.outputs?.[0];
        
        // Check if it's a Replicate URL (needs migration)
        if (!output || typeof output !== 'string' || !output.includes('replicate.delivery')) {
          console.log(`Skipping job ${job.id} - already migrated or invalid URL`);
          results.push({ jobId: job.id, status: 'skipped', reason: 'Not a Replicate URL' });
          continue;
        }

        console.log(`Checking if URL is accessible for job ${job.id}: ${output}`);
        
        // Check if URL is still accessible
        const headResp = await fetch(output, { method: 'HEAD' });
        
        if (headResp.ok) {
          console.log(`URL still accessible, downloading for job ${job.id}...`);
          
          // Download the model
          const modelResp = await fetch(output);
          if (!modelResp.ok) throw new Error(`Failed to download model: ${modelResp.status}`);
          
          const buffer = await modelResp.arrayBuffer();
          const contentType = modelResp.headers.get('content-type') || 'model/gltf-binary';
          
          console.log(`Downloaded ${buffer.byteLength} bytes, uploading to storage...`);
          
          // Upload to Supabase storage
          const userId = job.user_id || 'anonymous';
          const storagePath = `${userId}/${job.id}/model.glb`;
          
          const { error: uploadError } = await supabase.storage
            .from('generated-models')
            .upload(storagePath, new Blob([buffer], { type: contentType }), { upsert: true });

          if (uploadError) throw uploadError;

          // Get public URL
          const { data: pubData } = supabase.storage
            .from('generated-models')
            .getPublicUrl(storagePath);

          if (!pubData?.publicUrl) throw new Error('Failed to get public URL');

          // Update job with new URL
          const { error: updateError } = await supabase
            .from('jobs')
            .update({ 
              outputs: [pubData.publicUrl],
              updated_at: new Date().toISOString()
            })
            .eq('id', job.id);

          if (updateError) throw updateError;

          console.log(`Successfully migrated job ${job.id} to ${pubData.publicUrl}`);
          results.push({ jobId: job.id, status: 'migrated', newUrl: pubData.publicUrl });
        } else {
          console.log(`URL expired for job ${job.id} (status: ${headResp.status})`);
          
          // Mark as needing regeneration
          const { error: updateError } = await supabase
            .from('jobs')
            .update({ 
              status: 'expired',
              error: 'Model URL expired - regeneration required',
              updated_at: new Date().toISOString()
            })
            .eq('id', job.id);

          if (updateError) console.error(`Failed to mark job as expired: ${updateError}`);
          
          results.push({ jobId: job.id, status: 'expired', reason: 'URL no longer accessible' });
        }
      } catch (err) {
        console.error(`Error migrating job ${job.id}:`, err);
        results.push({ 
          jobId: job.id, 
          status: 'error', 
          error: err instanceof Error ? err.message : 'Unknown error' 
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        migrated: results.filter(r => r.status === 'migrated').length,
        expired: results.filter(r => r.status === 'expired').length,
        errors: results.filter(r => r.status === 'error').length,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Migration error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Migration failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
